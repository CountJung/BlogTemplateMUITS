import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { deletePost, getPostById } from '../../lib/posts';
import { isAdmin } from '../../lib/admin';
import { getClientIp, logAction } from '../../lib/logger';

interface DeletePostRequest extends NextApiRequest {
  query: {
    id: string;
  };
}

interface DeletePostResponse {
  message: string;
  success?: boolean;
}

export default async function handler(
  req: DeletePostRequest,
  res: NextApiResponse<DeletePostResponse>
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // 세션 확인
    const session = await getServerSession(req, res, authOptions);
    const ip = getClientIp(req);
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
    
    if (!session || !session.user?.email) {
      logAction({
        action: 'post.delete',
        outcome: 'denied',
        ip,
        userAgent,
        target: { type: 'post', id: req.query?.id },
        error: 'unauthenticated',
      });
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: '게시글 ID가 필요합니다.' });
    }

    // 게시글 정보 조회
    const post = getPostById(id);
    
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 권한 확인
    const userEmail = session.user.email;
    const isUserAdmin = isAdmin(userEmail);
    const isPostAuthor = post.authorEmail === userEmail;

    // Admin은 모든 글 삭제 가능, Writer는 자신의 글만 삭제 가능
    if (!isUserAdmin && !isPostAuthor) {
      logAction({
        action: 'post.delete',
        outcome: 'denied',
        actor: { email: userEmail, name: session.user.name || null, role: String((session as any).userRole || '') },
        ip,
        userAgent,
        target: { type: 'post', id },
        error: 'forbidden',
      });
      return res.status(403).json({ 
        message: '이 게시글을 삭제할 권한이 없습니다. 자신이 작성한 글만 삭제할 수 있습니다.' 
      });
    }

    // 삭제 권한이 있는지 확인 (Admin이거나 Writer여야 함)
    const permissions = session.permissions;
    if (!permissions || (!permissions.canDelete && !isPostAuthor)) {
      logAction({
        action: 'post.delete',
        outcome: 'denied',
        actor: { email: userEmail, name: session.user.name || null, role: String((session as any).userRole || '') },
        ip,
        userAgent,
        target: { type: 'post', id },
        error: 'insufficient_permissions',
      });
      return res.status(403).json({ 
        message: '삭제 권한이 없습니다.' 
      });
    }

    // 게시글 삭제
    const result = deletePost(id);

    if (result.success) {
      logAction({
        action: 'post.delete',
        outcome: 'success',
        actor: { email: userEmail, name: session.user.name || null, role: String((session as any).userRole || '') },
        ip,
        userAgent,
        target: { type: 'post', id },
        meta: {
          title: post.title,
          date: post.date,
          attachmentsCount: Array.isArray(post.attachments) ? post.attachments.length : 0,
        },
      });
      res.status(200).json({ 
        message: '게시글이 성공적으로 삭제되었습니다.',
        success: true
      });
    } else {
      logAction({
        action: 'post.delete',
        outcome: 'error',
        actor: { email: userEmail, name: session.user.name || null },
        ip,
        userAgent,
        target: { type: 'post', id },
        error: result.error || 'delete_failed',
      });
      res.status(500).json({ 
        message: result.error || '게시글 삭제 중 오류가 발생했습니다.' 
      });
    }
  } catch (error) {
    console.error('Delete post API error:', error);
    try {
      logAction({
        action: 'post.delete',
        outcome: 'error',
        ip: getClientIp(req),
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
        target: { type: 'post', id: req.query?.id },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch {
      // no-op
    }
    res.status(500).json({ 
      message: '서버 내부 오류가 발생했습니다.' 
    });
  }
}