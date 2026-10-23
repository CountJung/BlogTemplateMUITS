import fs from 'fs';
import path from 'path';
import { getAllPosts } from './posts';
import { getUserPermissions } from './admin';
import { atomicWriteJson, readJsonFile, withStoreLock } from './storage';
import { isSafeUploadPath } from './validation';
import { uploadDirectory, legacyUploadDirectory } from './uploads';
import type { FileAttachment } from '../types/blog';

type UploadOwner = { ownerEmail: string; uploadedAt: string };
const indexFile = path.join(process.cwd(), 'data', 'upload-index.json');
function readIndex(): Record<string, UploadOwner> {
  const index = readJsonFile<Record<string, UploadOwner>>(indexFile, () => ({}));
  if (!index || typeof index !== 'object' || Array.isArray(index)) throw new Error('Invalid upload index');
  return index;
}
function relativeUrl(url: string): string | null {
  const relative = url.replace(/^\/(api\/files|uploads)\//, '');
  return relative !== url && isSafeUploadPath(relative) ? relative : null;
}
export function recordUpload(relative: string, email: string): void {
  if (!isSafeUploadPath(relative) || !email) throw new Error('Invalid upload owner');
  withStoreLock(() => {
    const index = readIndex();
    Object.defineProperty(index, relative, { value: { ownerEmail: email, uploadedAt: new Date().toISOString() }, enumerable: true, writable: true, configurable: true });
    atomicWriteJson(indexFile, index);
  });
}

// Unknown legacy files remain readable/referenceable; ownership is never inferred or backfilled.
// Existing references can be retained, including intentional sharing by an administrator.
export function canAttachFiles(files: FileAttachment[], email: string, existing: FileAttachment[] = []): boolean {
  const index = readIndex();
  const retained = new Set(existing.map(file => relativeUrl(file.url)));
  const admin = getUserPermissions(email).canDelete;
  return files.every(file => {
    const relative = relativeUrl(file.url);
    if (!relative) return false;
    const owner = Object.prototype.hasOwnProperty.call(index, relative) ? index[relative] : undefined;
    return !owner || owner.ownerEmail === email || admin || retained.has(relative);
  });
}

export function inspectAttachmentReferences() {
  return withStoreLock(() => {
    const index = readIndex();
    const references = new Map<string, string[]>();
    for (const post of getAllPosts()) for (const attachment of post.attachments || []) {
      const relative = relativeUrl(attachment.url);
      if (relative) references.set(relative, [...(references.get(relative) || []), post.id]);
    }
    const files = new Set<string>();
    const scan = (root: string, prefix = '') => {
      if (!fs.existsSync(/* turbopackIgnore: true */ root)) return;
      for (const entry of fs.readdirSync(/* turbopackIgnore: true */ root, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) scan(path.join(root, entry.name), relative);
        else if (entry.isFile()) files.add(relative);
      }
    };
    scan(uploadDirectory); scan(legacyUploadDirectory);
    const present = new Set(files);
    for (const relative of [...files, ...Object.keys(index), ...references.keys()]) files.add(relative);
    return [...files].sort().map(relative => {
      const tracked = Object.prototype.hasOwnProperty.call(index, relative);
      const referencedBy = references.get(relative) || [];
      return { path: relative, exists: present.has(relative), tracked, referencedBy,
        state: !tracked ? 'untracked' : referencedBy.length ? 'referenced' : 'unreferenced' };
    });
  });
}
