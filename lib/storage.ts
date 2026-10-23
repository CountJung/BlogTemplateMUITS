import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const lockDirectory = path.join(process.cwd(), 'data', '.write-lock');
const pause = new Int32Array(new SharedArrayBuffer(4));
let lockDepth = 0;

// Serializes synchronous transactions across processes sharing this local filesystem.
// A crashed owner's lock is deliberately not stolen: an operator must confirm recovery.
export function withStoreLock<T>(operation: () => T): T {
  if (lockDepth > 0) return operation();
  fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(lockDirectory), { recursive: true });
  const deadline = Date.now() + 5000;
  for (;;) {
    try { fs.mkdirSync(/* turbopackIgnore: true */ lockDirectory, { mode: 0o700 }); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new Error('Storage is busy; inspect data/.write-lock before recovery', { cause: error });
      Atomics.wait(pause, 0, 0, 10);
    }
  }
  lockDepth++;
  try {
    fs.writeFileSync(/* turbopackIgnore: true */ path.join(lockDirectory, 'owner.json'), JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), { mode: 0o600 });
    const result = operation();
    if (result && typeof (result as { then?: unknown }).then === 'function') throw new Error('Storage transactions must be synchronous');
    return result;
  } finally {
    lockDepth--;
    fs.rmSync(/* turbopackIgnore: true */ lockDirectory, { recursive: true });
  }
}

export function readJsonFile<T>(file: string, initial: () => T): T {
  try { return JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, 'utf8')) as T; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return initial();
    // A corrupt file must never become an empty writable database.
    throw error;
  }
}

// Readers see either the previous complete file or the replacement, never truncated JSON/Markdown.
export function atomicWriteText(file: string, text: string): void {
  if (lockDepth === 0) throw new Error('A storage write requires a transaction');
  const directory = path.dirname(file);
  fs.mkdirSync(/* turbopackIgnore: true */ directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    fd = fs.openSync(/* turbopackIgnore: true */ temporary, 'wx', 0o600);
    fs.writeFileSync(/* turbopackIgnore: true */ fd, text, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(/* turbopackIgnore: true */ temporary, file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(/* turbopackIgnore: true */ temporary)) fs.unlinkSync(/* turbopackIgnore: true */ temporary);
  }
}

export function atomicWriteJson(file: string, value: unknown): void {
  atomicWriteText(file, JSON.stringify(value, null, 2));
}
