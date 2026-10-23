const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { Writable } = require('node:stream');
require('tsx/cjs');

const root = path.resolve(__dirname, '..');
const originalCwd = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-regression-'));
process.chdir(scratch);
const originalEnv = { ADMIN_EMAILS: process.env.ADMIN_EMAILS, NEXTAUTH_URL: process.env.NEXTAUTH_URL };
process.env.ADMIN_EMAILS = 'admin@example.test';
process.env.NEXTAUTH_URL = 'http://localhost:65002';
let session = null;
let schedulerCalls = 0;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'next-auth' || request === 'next-auth/next') return { getServerSession: async () => session };
  if (request.includes('[...nextauth]')) return { authOptions: {} };
  if (request.endsWith('/logger')) return { getClientIp: () => '127.0.0.1', logAction() {} };
  if (request.endsWith('/scheduler')) return { initScheduler() { schedulerCalls++; } };
  return originalLoad.call(this, request, parent, isMain);
};
const load = file => require(path.join(root, file));
const { savePost, getPostById, getAllPostIds, deletePost } = load('lib/posts.ts');
const { createOrUpdateUser, updateUserRole } = load('lib/users.ts');
const { getPublicPostPage, toPublicPost } = load('lib/public-posts.ts');
const { resolveUpload, validatedUploadExtension } = load('lib/uploads.ts');
const handlers = Object.fromEntries(['settings/system', 'settings/language', 'posts', 'posts/[id]', 'delete-post', 'comments/[postId]', 'upload', 'files/[...path]', 'posts/[id]/view', 'admin/users', 'admin/migrate-attachments', 'admin/logs/index', 'admin/logs/[filename]'].map(name => [name, load(`pages/api/${name}.ts`).default]));
const { UserRole } = load('types/roles.ts');
for (const [name, role] of [['writer', UserRole.WRITER], ['other', UserRole.WRITER], ['reader', UserRole.READER], ['banned', UserRole.BANNED]]) {
  createOrUpdateUser({ email: `${name}@example.test`, name, image: null });
  updateUserRole(`${name}@example.test`, role);
}
function asUser(name, stale = false) {
  session = name ? { user: { email: `${name}@example.test`, name }, permissions: { canWrite: stale, canDelete: stale, canComment: true }, isAdmin: stale } : null;
}
class Response extends Writable {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.chunks = []; }
  _write(chunk, encoding, callback) { this.chunks.push(Buffer.from(chunk)); callback(); }
  setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this; }
  status(code) { this.statusCode = code; return this; }
  json(body) { this.body = body; return this; }
}
async function call(name, method, body = {}, query = {}, headers = {}) {
  const res = new Response();
  const req = { method, body, query, headers: { host: 'localhost:65002', origin: 'http://localhost:65002', ...headers }, socket: { remoteAddress: '127.0.0.1' } };
  await handlers[name](req, res);
  return res;
}
const input = id => ({ id, title: 'Synthetic post', content: 'Synthetic content', date: '2026-10-23', author: 'writer', authorEmail: 'writer@example.test', excerpt: 'summary', tags: ['test'], attachments: [] });

after(() => {
  Module._load = originalLoad;
  process.chdir(originalCwd);
  fs.rmSync(scratch, { recursive: true, force: true });
  for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});

for (const endpoint of ['settings/system', 'settings/language']) {
  test(`${endpoint}: anonymous denied, reader/stale-admin denied, admin allowed, cross-origin denied`, async () => {
    const body = endpoint.endsWith('system') ? { logRetentionDays: 30, scheduler: { hour: 1, minute: 2, second: 0 } } : { language: 'en' };
    const target = endpoint.endsWith('system') ? path.join(scratch, 'data/settings.json') : path.join(scratch, '.env');
    const before = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    asUser(null); assert.equal((await call(endpoint, 'POST', body)).statusCode, 401);
    asUser('reader', true); assert.equal((await call(endpoint, 'POST', body)).statusCode, 403);
    assert.equal(fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null, before);
    asUser('admin'); assert.equal((await call(endpoint, 'POST', body, {}, { origin: 'https://foreign.example.test' })).statusCode, 403);
    assert.equal(fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null, before);
    assert.equal((await call(endpoint, 'POST', body)).statusCode, 200);
    assert.ok(fs.existsSync(target));
    if (endpoint.endsWith('language')) assert.match(fs.readFileSync(target, 'utf8'), /NEXT_PUBLIC_LANGUAGE=en/);
    else { assert.equal(JSON.parse(fs.readFileSync(target)).logRetentionDays, 30); assert.equal(schedulerCalls, 1); }
  });
}
test('system rejects noninteger/unbounded settings without changing storage', async () => {
  asUser('admin'); const before = fs.readFileSync('data/settings.json', 'utf8');
  for (const body of [{ logRetentionDays: 1.5, scheduler: { hour: 1, minute: 0, second: 0 } }, { logRetentionDays: 3651, scheduler: { hour: 1, minute: 0, second: 0 } }, { logRetentionDays: 10, scheduler: { hour: 0, minute: 0.2, second: 0 } }, null]) assert.equal((await call('settings/system', 'POST', body)).statusCode, 400);
  assert.equal(fs.readFileSync('data/settings.json', 'utf8'), before);
});
test('create checks auth, validates path/date/types, preserves existing posts and assigns server author', async () => {
  asUser(null); assert.equal((await call('posts', 'POST', input('owned'))).statusCode, 401);
  asUser('reader', true); assert.equal((await call('posts', 'POST', input('owned'))).statusCode, 403);
  asUser('writer');
  for (const body of [{ ...input('../escape') }, { ...input('bad-date'), date: '../../outside' }, { ...input('bad-date'), date: '2026-02-30' }, { ...input('bad-types'), content: {} }, { ...input('bad-tags'), tags: 'tag' }, null]) assert.equal((await call('posts', 'POST', body)).statusCode, 400);
  assert.equal((await call('posts', 'POST', { ...input('owned'), authorEmail: 'spoof@example.test', author: 'spoof', views: 999, unknown: 'secret' })).statusCode, 201);
  const stored = getPostById('owned'); assert.equal(stored.authorEmail, 'writer@example.test'); assert.equal(stored.author, 'writer'); assert.equal(stored.views, 0); assert.equal(stored.unknown, undefined);
  asUser('other'); assert.equal((await call('posts', 'POST', { ...input('owned'), content: 'replacement' })).statusCode, 409);
  assert.equal(getPostById('owned').content.trim(), 'Synthetic content');
  assert.equal(savePost(input('../escape')).success, false);
  assert.equal(savePost({ ...input('owned'), date: '2026-10-24' }).success, false);
});
test('exact ID lookup cannot alias a suffix and recursive IDs include dated posts', () => {
  assert.equal(savePost(input('prefix-suffix')).success, true);
  assert.equal(getPostById('suffix'), null);
  assert.equal(getPostById('../owned'), null);
  assert.ok(getAllPostIds().some(item => item.params.id === 'prefix-suffix'));
});
test('edit/delete forbid nonauthor, downgraded author and banned author despite stale session flags', async () => {
  const body = { ...input('owned'), title: 'Updated', authorEmail: 'spoof@example.test' };
  asUser('other', true); assert.equal((await call('posts/[id]', 'PUT', body, { id: 'owned' })).statusCode, 403);
  assert.equal((await call('delete-post', 'DELETE', {}, { id: 'owned' })).statusCode, 403);
  updateUserRole('writer@example.test', UserRole.READER); asUser('writer', true);
  assert.equal((await call('posts/[id]', 'PUT', body, { id: 'owned' })).statusCode, 403);
  assert.equal((await call('delete-post', 'DELETE', {}, { id: 'owned' })).statusCode, 403);
  updateUserRole('writer@example.test', UserRole.BANNED);
  assert.equal((await call('posts/[id]', 'PUT', body, { id: 'owned' })).statusCode, 403);
  updateUserRole('writer@example.test', UserRole.WRITER); asUser('writer');
  assert.equal((await call('posts/[id]', 'PUT', body, { id: 'owned' })).statusCode, 200);
  assert.equal(getPostById('owned').authorEmail, 'writer@example.test');
  asUser('admin'); assert.equal((await call('posts/[id]', 'PUT', body, { id: 'owned' })).statusCode, 200);
});
test('attachment URLs cannot escape storage; deleting a post cannot remove shared files', async () => {
  asUser('writer');
  const attachment = { filename: 'shared.txt', originalName: 'shared.txt', url: '/api/files/shared.txt', size: 5, mimeType: 'text/plain', uploadedAt: new Date().toISOString() };
  for (const url of ['/api/files/../../secret', '/api/files/%2e%2e/secret', 'javascript:alert(1)', 'https://example.test/api/files/shared.txt']) assert.equal((await call('posts', 'POST', { ...input('bad-attachment'), attachments: [{ ...attachment, url }] })).statusCode, 400);
  fs.mkdirSync('public/uploads', { recursive: true }); fs.writeFileSync('public/uploads/shared.txt', 'shared');
  assert.equal(savePost({ ...input('shared-post'), attachments: [attachment] }).success, true);
  assert.equal(deletePost('shared-post').success, true); assert.equal(fs.readFileSync('public/uploads/shared.txt', 'utf8'), 'shared');
});
test('public post DTO paginates after server search and omits private/content/attachment data', () => {
  for (let i = 0; i < 23; i++) assert.equal(savePost({ ...input(`page-${i}`), content: `Unique needle ${i}` }).success, true);
  for (const page of ['1', '2', '3']) {
    const result = getPublicPostPage({ page, q: 'needle' });
    assert.equal(result.totalPosts, 23); assert.equal(result.totalPages, 3); assert.ok(result.posts.length <= 10);
    assert.equal(/authorEmail|content|attachments/.test(JSON.stringify(result)), false);
  }
  assert.equal(getPublicPostPage({ page: '-2' }).currentPage, 1);
  assert.equal(getPublicPostPage({ page: '99999999999999999999999999' }).currentPage, 1);
  assert.equal(getPublicPostPage({ page: '999', q: 'needle' }).currentPage, 3);
  assert.equal(getPublicPostPage({ q: 'needle', tag: 'absent' }).totalPosts, 0);
  assert.equal(toPublicPost(getPostById('owned')).authorEmail, undefined);
});
test('viewer capabilities and comments omit emails while preserving delete authorization', async () => {
  asUser('reader');
  const created = await call('comments/[postId]', 'POST', { content: 'Synthetic comment' }, { postId: 'owned' });
  assert.equal(created.statusCode, 201); assert.equal(created.body.comment.authorEmail, undefined); assert.equal(created.body.comment.canDelete, true);
  const commentId = created.body.comment.id;
  asUser(null); const publicResult = await call('comments/[postId]', 'GET', {}, { postId: 'owned' });
  assert.equal(publicResult.body.comments[0].canDelete, false); assert.equal(JSON.stringify(publicResult.body).includes('authorEmail'), false);
  assert.equal((await call('posts/[id]', 'GET', {}, { id: 'owned' })).body.canManage, false);
  asUser('writer'); assert.equal((await call('posts/[id]', 'GET', {}, { id: 'owned' })).body.canManage, true);
  asUser('reader'); updateUserRole('reader@example.test', UserRole.BANNED);
  assert.equal((await call('comments/[postId]', 'DELETE', { commentId }, { postId: 'owned' })).statusCode, 403);
  asUser('admin'); assert.equal((await call('comments/[postId]', 'DELETE', { commentId }, { postId: 'owned' })).statusCode, 200);
});
test('upload rejects anonymous and downgraded users before parsing; MIME/extension/magic must agree', async () => {
  asUser(null); assert.equal((await call('upload', 'POST')).statusCode, 401);
  asUser('reader', true); assert.equal((await call('upload', 'POST')).statusCode, 403);
  const file = path.join(scratch, 'fixture'); fs.writeFileSync(file, '<html>synthetic</html>');
  assert.equal(validatedUploadExtension('payload.html', 'text/plain', file), null);
  assert.equal(validatedUploadExtension('payload.png', 'image/png', file), null);
  assert.equal(validatedUploadExtension('safe.txt', 'text/plain', file), '.txt');
  fs.writeFileSync(file, Buffer.from('89504e470d0a1a0a00000000', 'hex'));
  assert.equal(validatedUploadExtension('safe.png', 'image/png', file), '.png');
});
test('file serving rejects traversal/symlinks, forces active content download and adds sandbox/nosniff', async () => {
  fs.mkdirSync('data/uploads', { recursive: true }); fs.writeFileSync('data/uploads/legacy.html', '<html>synthetic</html>');
  fs.writeFileSync('outside.txt', 'outside'); fs.symlinkSync(path.join(scratch, 'outside.txt'), 'data/uploads/link.txt');
  assert.equal(resolveUpload('../outside.txt'), null); assert.equal(resolveUpload('link.txt'), null);
  assert.equal((await call('files/[...path]', 'GET', {}, { path: ['..', 'outside.txt'] })).statusCode, 404);
  const res = await call('files/[...path]', 'GET', {}, { path: ['legacy.html'] });
  assert.equal(res.statusCode, 200); assert.match(res.headers['content-disposition'], /^attachment/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff'); assert.match(res.headers['content-security-policy'], /sandbox/);
  assert.equal(Buffer.concat(res.chunks).toString(), '<html>synthetic</html>');
});

test('view tracking rejects invalid/missing posts and cross-origin requests before writing', async () => {
  asUser(null);
  const target = path.join(scratch, 'data/views/views.json');
  assert.equal(fs.existsSync(target), false);
  assert.equal((await call('posts/[id]/view', 'POST', {}, { id: '../escape' })).statusCode, 400);
  assert.equal((await call('posts/[id]/view', 'POST', {}, { id: 'missing' })).statusCode, 404);
  assert.equal((await call('posts/[id]/view', 'POST', {}, { id: 'owned' }, { origin: 'https://foreign.example.test' })).statusCode, 403);
  assert.equal(fs.existsSync(target), false);
  assert.equal((await call('posts/[id]/view', 'POST', {}, { id: 'owned' })).body.incremented, true);
  assert.equal((await call('posts/[id]/view', 'POST', {}, { id: 'owned' })).body.incremented, false);
});
test('administrator APIs reject anonymous and stale elevated flags on ordinary users', async () => {
  for (const [route, method] of [['admin/users', 'GET'], ['admin/migrate-attachments', 'POST'], ['admin/logs/index', 'GET'], ['admin/logs/[filename]', 'GET']]) {
    asUser(null); assert.ok([401, 403].includes((await call(route, method, {}, { filename: 'app.log' })).statusCode));
    asUser('other', true); assert.equal((await call(route, method, {}, { filename: 'app.log' })).statusCode, 403);
  }
});

test('new upload ownership prevents other writers claiming files; inventory never deletes legacy or orphan files', async () => {
  const { recordUpload, inspectAttachmentReferences } = load('lib/attachments.ts');
  const attachment = { filename: 'owned.txt', originalName: 'owned.txt', url: '/api/files/owned.txt', size: 5, mimeType: 'text/plain', uploadedAt: new Date().toISOString() };
  fs.writeFileSync('data/uploads/owned.txt', 'owned');
  fs.writeFileSync('data/uploads/orphan.txt', 'orphan');
  recordUpload('owned.txt', 'writer@example.test'); recordUpload('orphan.txt', 'writer@example.test');
  asUser('other'); assert.equal((await call('posts', 'POST', { ...input('foreign-file'), attachments: [attachment] })).statusCode, 403);
  asUser('writer'); assert.equal((await call('posts', 'POST', { ...input('owned-file'), attachments: [attachment] })).statusCode, 201);
  asUser('admin'); assert.equal((await call('posts', 'POST', { ...input('admin-shared-file'), attachments: [attachment] })).statusCode, 201);
  const before = fs.readFileSync('data/upload-index.json', 'utf8');
  const inventory = inspectAttachmentReferences();
  assert.deepEqual(inventory.find(item => item.path === 'owned.txt').referencedBy.sort(), ['admin-shared-file', 'owned-file']);
  assert.equal(inventory.find(item => item.path === 'orphan.txt').state, 'unreferenced');
  assert.equal(inventory.find(item => item.path === 'shared.txt').state, 'untracked');
  assert.equal(fs.readFileSync('data/upload-index.json', 'utf8'), before);
  assert.equal(fs.readFileSync('data/uploads/orphan.txt', 'utf8'), 'orphan');
  assert.equal(fs.readFileSync('public/uploads/shared.txt', 'utf8'), 'shared');
});
