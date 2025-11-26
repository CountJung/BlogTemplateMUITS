import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { savePost } from '../../lib/posts';
import { PostsApiResponse, PostFormData } from '../../types/blog';

export default async function handler(req: NextApiRequest, res: NextApiResponse<PostsApiResponse>) {
  if (req.method === 'POST') {
    try {
      // 사용자 인증 확인
      const session = await getServerSession(req, res, authOptions);
      
      if (!session || !session.user?.email) {
        return res.status(401).json({ 
          message: '로그인이 필요합니다.' 
        });
      }

      // 글쓰기 권한 확인 (Writer 또는 Admin만 허용)
      const permissions = session.permissions;
      if (!permissions || !permissions.canWrite) {
        return res.status(403).json({ 
          message: '글쓰기 권한이 없습니다.' 
        });
      }

      // 작성자 이메일 추가
      const postData: PostFormData = {
        ...req.body,
        authorEmail: session.user.email,
      };

      const result = savePost(postData);
      
      if (result.success) {
        res.status(201).json({ 
          message: '게시글이 성공적으로 저장되었습니다.',
          id: result.id 
        });
      } else {
        res.status(500).json({ 
          message: result.error || '게시글 저장 중 오류가 발생했습니다.' 
        });
      }
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ 
        message: '서버 내부 오류가 발생했습니다.' 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}