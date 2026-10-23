const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const root = path.resolve(__dirname, '..');
require('tsx/cjs');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-store-test-'));
const cwd = process.cwd(); process.chdir(scratch);
const users = require(path.join(root, 'lib/users.ts'));
const comments = require(path.join(root, 'lib/comments.ts'));
const posts = require(path.join(root, 'lib/posts.ts'));
const views = require(path.join(root, 'lib/views.ts'));
after(() => { process.chdir(cwd); fs.rmSync(scratch, { recursive: true, force: true }); });
async function concurrent(action, count = 20, workers = 4) {
  const children = Array.from({ length: workers }, () => fork(path.join(root, 'tests/helpers/store-worker.cjs'), [], { env: { ...process.env, BLOG_STORE_TEST_DIRECTORY: scratch }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }));
  try {
    await Promise.all(children.map(child => new Promise((resolve, reject) => { child.once('message', message => message === 'ready' ? resolve() : reject(new Error('worker not ready'))); child.once('error', reject); child.once('exit', code => reject(new Error(`worker startup exit ${code}`))); })));
    const results = children.map((child, worker) => new Promise((resolve, reject) => {
      let result, stderr = ''; child.stderr.on('data', value => stderr += value);
      child.once('message', message => result = message); child.once('error', reject);
      child.once('exit', code => code === 0 && result && !result.error ? resolve(result.succeeded) : reject(new Error(result?.error || stderr || `worker exit ${code}`)));
      child.send({ action, worker, count });
    }));
    return await Promise.all(results);
  } finally { for (const child of children) { if (child.exitCode === null) child.kill(); } }
}
test('concurrent processes preserve every acknowledged user, comment, view and counter update', async () => {
  const count = 20, workers = 4, total = count * workers;
  await concurrent('users', count, workers); assert.equal(users.getAllUsers().length, total);
  assert.equal(posts.savePost({ id: 'shared', title: 'Synthetic', content: 'Synthetic', date: '2026-10-23', author: 'Synthetic', tags: [], excerpt: '' }).success, true);
  await concurrent('comments', count, workers); assert.equal(comments.getCommentsByPostId('shared').length, total);
  await concurrent('views', count, workers); assert.equal(views.getPostViewRecords('shared').length, total); assert.equal(posts.getPostById('shared').views, total);
});
test('global post IDs remain unique across dates under concurrent creation', async () => {
  const results = await concurrent('duplicate', 1, 4);
  assert.equal(results.reduce((a, b) => a + b, 0), 1);
  assert.equal(posts.getAllPostIds().filter(item => item.params.id === 'duplicate').length, 1);
});

test('failed atomic replacement leaves the original file intact and releases the lock', () => {
  const { atomicWriteText, withStoreLock } = require(path.join(root, 'lib/storage.ts'));
  const target = path.join(scratch, 'data/atomic.json');
  withStoreLock(() => atomicWriteText(target, '{"generation":1}'));
  const rename = fs.renameSync;
  fs.renameSync = () => { throw new Error('synthetic rename failure'); };
  try { assert.throws(() => withStoreLock(() => atomicWriteText(target, '{"generation":2}')), /synthetic rename failure/); }
  finally { fs.renameSync = rename; }
  assert.equal(fs.readFileSync(target, 'utf8'), '{"generation":1}');
  assert.equal(fs.existsSync(path.join(scratch, 'data/.write-lock')), false);
  assert.equal(fs.readdirSync(path.join(scratch, 'data')).some(file => file.endsWith('.tmp')), false);
  withStoreLock(() => atomicWriteText(target, '{"generation":3}'));
  assert.equal(JSON.parse(fs.readFileSync(target)).generation, 3);
});
test('corrupt JSON is preserved instead of being overwritten with a new empty database', () => {
  const target = path.join(scratch, 'data/users.json');
  const before = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, '{synthetic broken JSON');
  try {
    assert.throws(() => users.createOrUpdateUser({ email: 'new@example.test', name: 'Synthetic', image: null }));
    assert.equal(fs.readFileSync(target, 'utf8'), '{synthetic broken JSON');
  } finally { fs.writeFileSync(target, before); }
});
test('editing a stale post preserves its current view counter and immutable owner', () => {
  const before = posts.getPostById('shared');
  assert.equal(posts.incrementViews('shared').success, true);
  assert.equal(posts.updatePost('shared', { ...before, title: 'Synthetic edited' }).success, true);
  assert.equal(posts.getPostById('shared').views, before.views + 1);
  assert.equal(posts.updatePost('shared', { ...before, authorEmail: 'different@example.test' }).success, false);
  assert.equal(posts.getPostById('shared').title, 'Synthetic edited');
});

test('a stale delete cannot remove a recreated post belonging to another owner', () => {
  const data = { id: 'recreated', title: 'Synthetic', content: 'Synthetic', date: '2026-10-23', author: 'Synthetic', tags: [], excerpt: '', authorEmail: 'first@example.test' };
  assert.equal(posts.savePost(data).success, true);
  assert.equal(posts.deletePost(data.id).success, true);
  assert.equal(posts.savePost({ ...data, authorEmail: 'second@example.test' }).success, true);
  assert.equal(posts.deletePost(data.id, 'first@example.test').success, false);
  assert.equal(posts.getPostById(data.id).authorEmail, 'second@example.test');
});
