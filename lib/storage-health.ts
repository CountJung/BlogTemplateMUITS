import fs from 'fs';
import path from 'path';

// Read-only diagnostics: never repair, delete, print JSON contents or follow symlinks.
export function inspectStorage(root = process.cwd()) {
  const result = { locked: false, lockOwner: null as { pid?: number; createdAt?: string } | null,
    jsonFiles: 0, postFiles: 0, invalidJson: [] as string[], temporaryFiles: [] as string[], symlinks: [] as string[], errors: [] as string[] };
  const visit = (relative: string) => {
    const file = path.join(root, relative);
    try {
      const stat = fs.lstatSync(/* turbopackIgnore: true */ file);
      if (stat.isSymbolicLink()) { result.symlinks.push(relative); return; }
      if (relative === 'data/.write-lock') result.locked = true;
      if (stat.isDirectory()) {
        for (const name of fs.readdirSync(/* turbopackIgnore: true */ file)) visit(path.join(relative, name));
        return;
      }
      if (relative.endsWith('.tmp')) result.temporaryFiles.push(relative);
      if (relative.endsWith('.md')) result.postFiles++;
      if (relative.endsWith('.json')) {
        result.jsonFiles++;
        try {
          const value = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, 'utf8'));
          if (relative === 'data/.write-lock/owner.json' && value && typeof value === 'object') {
            result.lockOwner = { ...(Number.isSafeInteger(value.pid) ? { pid: value.pid } : {}), ...(typeof value.createdAt === 'string' ? { createdAt: value.createdAt.slice(0, 40) } : {}) };
          }
        } catch { result.invalidJson.push(relative); }
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') result.errors.push(relative); }
  };
  visit('data'); visit('content/posts');
  return result;
}
