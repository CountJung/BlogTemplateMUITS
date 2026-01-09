import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getPostById, updatePost } from '../../../lib/posts';
import { getClientIp, logAction } from '../../../lib/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const ip = getClientIp(req);
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });
  }

  // 세션 확인
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    logAction({
      action: 'post.update',
      outcome: 'denied',
      ip,
      userAgent,
      target: { type: 'post', id },
      error: 'unauthenticated',
    });
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  // 게시글 존재 여부 확인
  const post = getPostById(id);
  if (!post) {
    return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  }

  switch (req.method) {
    case 'PUT':
      // 게시글 수정 권한 확인
      const isAdmin = (session as any).isAdmin || false;
      const isAuthor = post.authorEmail === session.user.email;

      if (!isAdmin && !isAuthor) {
        logAction({
          action: 'post.update',
          outcome: 'denied',
          actor: { email: session.user.email, name: session.user.name || null, role: String((session as any).userRole || '') },
          ip,
          userAgent,
          target: { type: 'post', id },
          error: 'forbidden',
        });
        return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
      }

      try {
        const { title, content, tags, excerpt, attachments } = req.body;

        // 유효성 검사
        if (!title || !content) {
          return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
        }

        const postData = {
          id,
          title,
          content,
          author: post.author, // 기존 작성자 유지
          authorEmail: post.authorEmail, // 기존 작성자 이메일 유지
          date: post.date, // 기존 작성일 유지
          tags: tags || [],
          views: post.views || 0, // 기존 조회수 유지
          excerpt: excerpt || content.substring(0, 200) + '...',
          attachments: attachments || [], // 첨부파일 업데이트
        };

        const result = updatePost(id, postData);

        if (result.success) {
          logAction({
            action: 'post.update',
            outcome: 'success',
            actor: { email: session.user.email, name: session.user.name || null, role: String((session as any).userRole || '') },
            ip,
            userAgent,
            target: { type: 'post', id },
            meta: {
              title,
              attachmentsCount: Array.isArray(attachments) ? attachments.length : 0,
            },
          });
          return res.status(200).json({ 
            message: '게시글이 수정되었습니다.',
            id: result.id 
          });
        } else {
          logAction({
            action: 'post.update',
            outcome: 'error',
            actor: { email: session.user.email, name: session.user.name || null },
            ip,
            userAgent,
            target: { type: 'post', id },
            error: result.error || 'update_failed',
          });
          return res.status(500).json({ message: result.error || '게시글 수정에 실패했습니다.' });
        }
      } catch (error) {
        console.error('Post update error:', error);
        try {
          logAction({
            action: 'post.update',
            outcome: 'error',
            actor: { email: session.user.email, name: session.user.name || null },
            ip,
            userAgent,
            target: { type: 'post', id },
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } catch {
          // no-op
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
      }

    default:
      res.setHeader('Allow', ['PUT']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}
