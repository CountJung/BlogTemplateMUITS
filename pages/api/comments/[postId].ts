import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  getCommentsByPostId,
  createComment,
  deleteComment,
  getCommentById,
} from '../../../lib/comments';
import { getPostById } from '../../../lib/posts';
import { CommentApiResponse } from '../../../types/comment';
import { getClientIp, logAction } from '../../../lib/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommentApiResponse>
) {
  const { postId } = req.query;
  const ip = getClientIp(req);
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

  if (!postId || typeof postId !== 'string') {
    return res.status(400).json({ success: false, error: '유효하지 않은 게시글 ID입니다.' });
  }

  // 게시글 존재 여부 확인
  const post = getPostById(postId);
  if (!post) {
    return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
  }

  const session = await getServerSession(req, res, authOptions);

  switch (req.method) {
    case 'GET':
      // 댓글 목록 조회 (로그인 불필요)
      try {
        const comments = getCommentsByPostId(postId);
        return res.status(200).json({ success: true, comments });
      } catch (error) {
        console.error('Get comments error:', error);
        return res.status(500).json({ success: false, error: '댓글 조회 중 오류가 발생했습니다.' });
      }

    case 'POST':
      // 댓글 작성 (로그인 필수 - READER 이상, BANNED 제외)
      if (!session?.user?.email) {
        logAction({
          action: 'comment.create',
          outcome: 'denied',
          ip,
          userAgent,
          target: { type: 'post', id: postId },
          error: 'unauthenticated',
        });
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }

      // 차단된 사용자 확인
      if (!session.permissions?.canComment) {
        logAction({
          action: 'comment.create',
          outcome: 'denied',
          actor: { email: session.user.email, name: session.user.name || null, role: String((session as any).userRole || '') },
          ip,
          userAgent,
          target: { type: 'post', id: postId },
          error: 'insufficient_permissions',
        });
        return res.status(403).json({ success: false, error: '댓글 작성 권한이 없습니다. 관리자에게 문의하세요.' });
      }

      try {
        const { content } = req.body;

        if (!content || typeof content !== 'string') {
          return res.status(400).json({ success: false, error: '댓글 내용을 입력해주세요.' });
        }

        const result = createComment({
          postId,
          content,
          author: session.user.name || '익명',
          authorEmail: session.user.email,
          authorImage: session.user.image || null,
        });

        if (!result.success) {
          logAction({
            action: 'comment.create',
            outcome: 'error',
            actor: { email: session.user.email, name: session.user.name || null },
            ip,
            userAgent,
            target: { type: 'post', id: postId },
            error: result.error || 'create_failed',
          });
          return res.status(400).json({ success: false, error: result.error });
        }

        logAction({
          action: 'comment.create',
          outcome: 'success',
          actor: { email: session.user.email, name: session.user.name || null, role: String((session as any).userRole || '') },
          ip,
          userAgent,
          target: { type: 'post', id: postId },
          meta: { commentId: result.comment?.id },
        });

        return res.status(201).json({ success: true, comment: result.comment });
      } catch (error) {
        console.error('Create comment error:', error);
        try {
          logAction({
            action: 'comment.create',
            outcome: 'error',
            actor: { email: session.user.email, name: session.user.name || null },
            ip,
            userAgent,
            target: { type: 'post', id: postId },
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } catch {
          // no-op
        }
        return res.status(500).json({ success: false, error: '댓글 작성 중 오류가 발생했습니다.' });
      }

    case 'DELETE':
      // 댓글 삭제
      if (!session?.user?.email) {
        logAction({
          action: 'comment.delete',
          outcome: 'denied',
          ip,
          userAgent,
          target: { type: 'post', id: postId },
          error: 'unauthenticated',
        });
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }

      try {
        const { commentId } = req.body;

        if (!commentId || typeof commentId !== 'string') {
          return res.status(400).json({ success: false, error: '유효하지 않은 댓글 ID입니다.' });
        }

        const comment = getCommentById(postId, commentId);
        if (!comment) {
          return res.status(404).json({ success: false, error: '댓글을 찾을 수 없습니다.' });
        }

        // 권한 확인:
        // 1. 관리자 (ADMIN) - 모든 댓글 삭제 가능
        // 2. 게시글 작성자 - 해당 게시글의 모든 댓글 삭제 가능
        // 3. 댓글 작성자 - 자신의 댓글만 삭제 가능
        const isAdmin = (session as any).isAdmin || false;
        const isPostAuthor = post.authorEmail === session.user.email;
        const isCommentAuthor = comment.authorEmail === session.user.email;

        if (!isAdmin && !isPostAuthor && !isCommentAuthor) {
          logAction({
            action: 'comment.delete',
            outcome: 'denied',
            actor: { email: session.user.email, name: session.user.name || null, role: String((session as any).userRole || '') },
            ip,
            userAgent,
            target: { type: 'comment', id: commentId },
            meta: { postId },
            error: 'forbidden',
          });
          return res.status(403).json({ success: false, error: '댓글을 삭제할 권한이 없습니다.' });
        }

        const result = deleteComment(postId, commentId);

        if (!result.success) {
          logAction({
            action: 'comment.delete',
            outcome: 'error',
            actor: { email: session.user.email, name: session.user.name || null },
            ip,
            userAgent,
            target: { type: 'comment', id: commentId },
            meta: { postId },
            error: result.error || 'delete_failed',
          });
          return res.status(400).json({ success: false, error: result.error });
        }

        logAction({
          action: 'comment.delete',
          outcome: 'success',
          actor: { email: session.user.email, name: session.user.name || null, role: String((session as any).userRole || '') },
          ip,
          userAgent,
          target: { type: 'comment', id: commentId },
          meta: { postId },
        });

        return res.status(200).json({ success: true, message: '댓글이 삭제되었습니다.' });
      } catch (error) {
        console.error('Delete comment error:', error);
        try {
          logAction({
            action: 'comment.delete',
            outcome: 'error',
            actor: { email: session.user.email, name: session.user.name || null },
            ip,
            userAgent,
            target: { type: 'post', id: postId },
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } catch {
          // no-op
        }
        return res.status(500).json({ success: false, error: '댓글 삭제 중 오류가 발생했습니다.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}
