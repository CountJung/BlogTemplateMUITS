import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { addViewRecord } from '../../../../lib/views';
import { incrementViews } from '../../../../lib/posts';

// IP 주소 추출 함수
function getClientIp(req: NextApiRequest): string {
  // Vercel, Netlify 등의 프록시 환경 고려
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  // 로컬 개발 환경
  return req.socket.remoteAddress || '127.0.0.1';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });
  }

  try {
    // 클라이언트 IP 가져오기
    const clientIp = getClientIp(req);
    
    // 세션 정보 가져오기 (로그인 여부)
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.email || undefined;

    // 조회 기록 추가 (중복 체크 포함)
    const viewResult = addViewRecord(id, clientIp, userId);

    // 중복 조회가 아닌 경우에만 조회수 증가
    if (viewResult.success) {
      const incrementResult = incrementViews(id);
      
      if (!incrementResult.success) {
        console.error('Failed to increment views:', incrementResult.error);
      }
      
      return res.status(200).json({ 
        message: '조회수가 증가했습니다.',
        incremented: true 
      });
    } else {
      // 이미 조회한 경우
      return res.status(200).json({ 
        message: '이미 조회한 게시글입니다.',
        incremented: false 
      });
    }
  } catch (error) {
    console.error('View tracking error:', error);
    return res.status(500).json({ message: '조회수 업데이트 중 오류가 발생했습니다.' });
  }
}
