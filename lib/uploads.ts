import { isSafeArchive } from './archive-validation';
import fs from 'fs';
import path from 'path';
import { isSafeUploadPath } from './validation';

export const uploadDirectory = path.join(process.cwd(), 'data', 'uploads');
export const legacyUploadDirectory = path.join(process.cwd(), 'public', 'uploads');

const types: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'], 'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'], 'image/gif': ['.gif'], 'image/webp': ['.webp'],
  'application/pdf': ['.pdf'], 'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'],
  'text/plain': ['.txt'],
};

export function validatedUploadExtension(name: string, mime: string, file: string): string | null {
  const extension = path.extname(name).toLowerCase();
  if (!types[mime]?.includes(extension)) return null;
  const fd = fs.openSync(/* turbopackIgnore: true */ file, 'r');
  const head = Buffer.alloc(12);
  try { fs.readSync(fd, head, 0, head.length, 0); } finally { fs.closeSync(fd); }
  if ((mime === 'image/jpeg' || mime === 'image/jpg') && head.subarray(0, 3).toString('hex') !== 'ffd8ff') return null;
  if (mime === 'image/png' && head.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  if (mime === 'image/gif' && !['GIF87a', 'GIF89a'].includes(head.subarray(0, 6).toString())) return null;
  if (mime === 'image/webp' && (head.subarray(0, 4).toString() !== 'RIFF' || head.subarray(8, 12).toString() !== 'WEBP')) return null;
  if (mime === 'application/pdf' && head.subarray(0, 5).toString() !== '%PDF-') return null;
  if (['.zip', '.docx', '.xlsx'].includes(extension) && !isSafeArchive(file, extension)) return null;
  if (['.doc', '.xls'].includes(extension) && head.subarray(0, 8).toString('hex') !== 'd0cf11e0a1b11ae1') return null;
  return extension;
}

export function resolveUpload(relative: string): string | null {
  if (!isSafeUploadPath(relative)) return null;
  for (const root of [uploadDirectory, legacyUploadDirectory]) {
    if (!fs.existsSync(/* turbopackIgnore: true */ root)) continue;
    const candidate = path.resolve(/* turbopackIgnore: true */ root, relative);
    if (!candidate.startsWith(path.resolve(/* turbopackIgnore: true */ root) + path.sep) || !fs.existsSync(/* turbopackIgnore: true */ candidate)) continue;
    const realRoot = fs.realpathSync(/* turbopackIgnore: true */ root);
    const realFile = fs.realpathSync(/* turbopackIgnore: true */ candidate);
    if (realFile.startsWith(realRoot + path.sep) && fs.statSync(/* turbopackIgnore: true */ realFile).isFile()) return realFile;
  }
  return null;
}
