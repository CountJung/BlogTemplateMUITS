import type { FileAttachment, PostFormData } from '../types/blog';

export function isValidPostId(value: unknown): value is string {
  return typeof value === 'string' && /^[\p{L}\p{N}_-]{1,180}$/u.test(value);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isSafeUploadPath(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 500 && value.split('/').every(
    // eslint-disable-next-line no-control-regex -- Reject control bytes in filesystem paths.
    part => part.length > 0 && part !== '.' && part !== '..' && !/[\\\x00-\x1f\x7f%?#:]/.test(part)
  );
}

export function validatePostInput(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return '게시글 형식이 올바르지 않습니다.';
  const data = input as Partial<PostFormData>;
  if (!isValidPostId(data.id)) return '유효하지 않은 게시글 ID입니다.';
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 300) return '제목은 1~300자여야 합니다.';
  if (typeof data.content !== 'string' || !data.content.trim() || data.content.length > 500000) return '내용은 1~500000자여야 합니다.';
  if (data.date !== undefined && !isValidDate(data.date)) return '유효하지 않은 날짜입니다.';
  if (data.excerpt !== undefined && (typeof data.excerpt !== 'string' || data.excerpt.length > 1000)) return '요약은 1000자 이하여야 합니다.';
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.length > 30 || data.tags.some(tag => typeof tag !== 'string' || tag.length > 100))) return '유효하지 않은 태그입니다.';
  if (data.attachments !== undefined && (!Array.isArray(data.attachments) || data.attachments.length > 30 || data.attachments.some(a => !validAttachment(a)))) return '유효하지 않은 첨부파일입니다.';
  return null;
}

function validAttachment(a: FileAttachment): boolean {
  return !!a && typeof a === 'object' && typeof a.url === 'string' &&
    a.url.startsWith('/api/files/') && isSafeUploadPath(a.url.slice('/api/files/'.length)) &&
    typeof a.filename === 'string' && isSafeUploadPath(a.filename) && !a.filename.includes('/') &&
    typeof a.originalName === 'string' && a.originalName.length <= 255 &&
    typeof a.mimeType === 'string' && a.mimeType.length <= 150 &&
    Number.isSafeInteger(a.size) && a.size >= 0 && a.size <= 10 * 1024 * 1024 &&
    typeof a.uploadedAt === 'string' && Number.isFinite(Date.parse(a.uploadedAt)) &&
    (a.downloadUrl === undefined || a.downloadUrl === `${a.url}?download=true`);
}
