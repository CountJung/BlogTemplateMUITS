import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { migrateAttachmentUrls } from '../../../lib/migrate-attachments';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    // 관리자 권한 확인
    if (!session?.user?.email) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const permissions = (session as any).permissions;
    if (!permissions?.canDelete) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    // 마이그레이션 실행
    migrateAttachmentUrls();
    
    return res.status(200).json({ 
      success: true,
      message: '첨부파일 URL 마이그레이션이 완료되었습니다.' 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      success: false,
      message: '마이그레이션 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
