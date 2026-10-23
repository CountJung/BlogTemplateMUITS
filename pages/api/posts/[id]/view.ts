import { getClientIp } from '../../../../lib/client-ip';
import { allowRequest } from '../../../../lib/rate-limit';
import { withStoreLock } from '../../../../lib/storage';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { addViewRecord } from '../../../../lib/views';
import { incrementViews, getPostById } from '../../../../lib/posts';
import { isValidPostId } from '../../../../lib/validation';
import { isAllowedMutation } from '../../../../lib/request-security';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
  if (!isAllowedMutation(req)) return res.status(403).json({ message: 'Forbidden origin' });

  if (!allowRequest(req, res, 'VIEW')) return;
  const { id } = req.query;

  if (!isValidPostId(id)) {
    return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });
  }

  try {
    // 클라이언트 IP 가져오기
    const clientIp = getClientIp(req);
    
    // 세션 정보 가져오기 (로그인 여부)
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.email || undefined;

    return withStoreLock(() => {
      if (!getPostById(id)) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      // 조회 기록 추가 (중복 체크 포함)
      const viewResult = addViewRecord(id, clientIp, userId);

      // 중복 조회가 아닌 경우에만 조회수 증가
      if (viewResult.success) {
        const incrementResult = incrementViews(id);
      
        if (!incrementResult.success) {
          console.error('Failed to increment views:', incrementResult.error);
          return res.status(500).json({ message: '조회수 업데이트 중 오류가 발생했습니다.' });
        }
      
        return res.status(200).json({
          message: '조회수가 증가했습니다.',
          incremented: true
        });
      } else {
        if (viewResult.error !== 'Already viewed') return res.status(500).json({ message: '조회수 업데이트 중 오류가 발생했습니다.' });
        // 이미 조회한 경우
        return res.status(200).json({
          message: '이미 조회한 게시글입니다.',
          incremented: false
        });
      }
    });
  } catch (error) {
    console.error('View tracking error:', error);
    return res.status(500).json({ message: '조회수 업데이트 중 오류가 발생했습니다.' });
  }
}
