// pages/api/files/[...path].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { path: filePath } = req.query;
    
    if (!filePath || !Array.isArray(filePath)) {
      return res.status(400).json({ message: '파일 경로가 필요합니다.' });
    }

    // 경로 조합
    const fileName = filePath.join('/');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', fileName);

    // 보안: uploads 디렉토리 밖으로 나가는 것 방지
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: '허용되지 않은 경로입니다.' });
    }

    // 파일 존재 확인
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    // 파일 정보
    const stat = fs.statSync(fullPath);
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // 다운로드 파라미터가 있으면 다운로드로 처리
    if (req.query.download === 'true') {
      const originalName = path.basename(fileName).replace(/^\d+-/, ''); // 타임스탬프 제거
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    }

    // 파일 스트림 전송
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File serving error:', error);
    return res.status(500).json({ 
      message: '파일 서빙 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}