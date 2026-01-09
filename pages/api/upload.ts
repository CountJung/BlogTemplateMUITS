import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

// 파일 업로드 설정
export const config = {
  api: {
    bodyParser: false, // formidable이 파싱하도록 비활성화
  },
};

// 업로드 디렉토리 생성
const uploadBaseDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

function normalizePostDate(input: unknown): { year: string; month: string; day: string } {
  const today = new Date().toISOString().split('T')[0];
  const raw = typeof input === 'string' ? input : Array.isArray(input) ? String(input[0] ?? '') : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const [year, month, day] = date.split('-');
  return { year, month, day };
}

// 허용된 파일 타입 및 최대 크기 설정
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FormidableFile extends File {
  filepath: string;
  originalFilename: string | null;
  mimetype: string | null;
  size: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // 로그인 확인
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // 글쓰기 권한 확인
    if (!session.permissions?.canWrite) {
      return res.status(403).json({ message: '파일 업로드 권한이 없습니다.' });
    }

    const form = new IncomingForm({
      uploadDir: uploadBaseDir,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      multiples: false, // 한 번에 하나씩 업로드
    });

    // 파일 파싱
    const data = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const file = Array.isArray(data.files.file) ? data.files.file[0] : data.files.file;
    
    if (!file) {
      return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
    }

    const uploadedFile = file as FormidableFile;

    // 파일 타입 검증
    if (!uploadedFile.mimetype || !ALLOWED_TYPES.includes(uploadedFile.mimetype)) {
      // 업로드된 파일 삭제
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({ 
        message: '허용되지 않는 파일 형식입니다.',
        allowedTypes: ALLOWED_TYPES 
      });
    }

    // 파일 크기 검증
    if (uploadedFile.size > MAX_FILE_SIZE) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({ 
        message: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다.` 
      });
    }

    // 안전한 파일명 생성
    const timestamp = Date.now();
    const originalName = uploadedFile.originalFilename || 'file';
    const ext = path.extname(originalName);
    const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')}`;

    const { year, month, day } = normalizePostDate((data.fields as any)?.postDate);
    const datedDir = path.join(uploadBaseDir, year, month, day);
    if (!fs.existsSync(datedDir)) {
      fs.mkdirSync(datedDir, { recursive: true });
    }

    const relativePath = path.posix.join(year, month, day, safeName);
    const newPath = path.join(datedDir, safeName);

    // 파일 이동
    fs.renameSync(uploadedFile.filepath, newPath);

    // 응답 데이터
    const fileData = {
      filename: safeName,
      originalName: originalName,
      url: `/api/files/${relativePath}`, // API 경로로 변경
      downloadUrl: `/api/files/${relativePath}?download=true`, // 다운로드 전용 URL
      size: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      message: '파일이 성공적으로 업로드되었습니다.',
      file: fileData,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ 
      message: '파일 업로드 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
