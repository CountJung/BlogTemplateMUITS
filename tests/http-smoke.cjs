// Run after npm run build. Copies the standalone server into an isolated synthetic runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');
const { encode } = require(path.join(root, 'node_modules/next-auth/jwt'));
const matter = require(path.join(root, 'node_modules/gray-matter'));
const LOOPBACK = '127.0.0.1';
const PREVIEW_PORT = 65003;

async function selectPort(preview) {
  const listener = net.createServer();
  const listening = once(listener, 'listening');
  listener.listen(preview ? PREVIEW_PORT : 0, LOOPBACK);
  try {
    await listening;
  } catch (error) {
    if (preview && error.code === 'EADDRINUSE') {
      throw new Error(`Preview port ${LOOPBACK}:${PREVIEW_PORT} is already in use. Stop the existing preview or process yourself; it was not stopped.`, { cause: error });
    }
    throw error;
  }
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

async function main() {
  const preview = process.argv.includes('--preview');
  assert.ok(fs.existsSync(path.join(root, '.next/standalone/server.js')), 'Run npm run build first.');
  const previewPort = preview ? await selectPort(true) : null;
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-http-'));
  let child;
  let output = '';
  let checks = 0;
  const check = (actual, expected) => { assert.equal(actual, expected); checks++; };
  try {
    fs.cpSync(path.join(root, '.next/standalone'), runtime, { recursive: true, verbatimSymlinks: true });
    for (const directory of ['lib', 'pages', 'components', 'contexts', 'docs', 'tests', 'data', 'content', 'logs']) {
      assert.equal(fs.existsSync(path.join(runtime, directory)), false, `Standalone unexpectedly contains ${directory}`); checks++;
    }
    assert.equal(fs.readdirSync(runtime).some(name => name.startsWith('.env')), false); checks++;
    fs.mkdirSync(path.join(runtime, '.next/static'), { recursive: true });
    fs.cpSync(path.join(root, '.next/static'), path.join(runtime, '.next/static'), { recursive: true });
    fs.mkdirSync(path.join(runtime, 'content/posts/2026/10/23'), { recursive: true });
    for (let i = 0; i < 23; i++) fs.writeFileSync(path.join(runtime, `content/posts/2026/10/23/synthetic-${i}.md`), matter.stringify(`Synthetic full body unique_${i}_end`, {
      title: `Synthetic ${i}`, author: 'Synthetic writer', authorEmail: 'writer@example.test', date: '2026-10-23', excerpt: 'Synthetic excerpt', tags: ['synthetic'], views: 0, attachments: [],
    }));
    const users = ['admin', 'writer', 'reader', 'other', 'banned'].map(name => ({ id: name, email: `${name}@example.test`, name, image: null, role: name === 'other' ? 'writer' : name, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() }));
    fs.mkdirSync(path.join(runtime, 'data'), { recursive: true });
    fs.writeFileSync(path.join(runtime, 'data/users.json'), JSON.stringify(users));
    fs.mkdirSync(path.join(runtime, 'public/uploads'), { recursive: true });
    fs.writeFileSync(path.join(runtime, 'public/uploads/legacy.html'), '<html>synthetic active content</html>');
    // Harmless local fixtures, not a reproduction of the advisory's bypass payload.
    fs.writeFileSync(path.join(runtime, 'public/optimizer-fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="red"/></svg>');
    fs.writeFileSync(path.join(runtime, 'public/optimizer-fixture.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
    const port = previewPort ?? await selectPort(false);
    const origin = `http://${LOOPBACK}:${port}`;
    const secret = 'synthetic-local-http-test-secret-with-no-real-account';
    const rateLimits = {
      RATE_LIMIT_VIEW_MAX: '4', RATE_LIMIT_UPLOAD_MAX: '4', RATE_LIMIT_POST_WRITE_MAX: '3',
      RATE_LIMIT_COMMENT_WRITE_MAX: '1', RATE_LIMIT_COMMENT_READ_MAX: '1', RATE_LIMIT_FILE_MAX: '2',
    };
    const runtimeEnv = { ...process.env };
    for (const key of Object.keys(runtimeEnv)) {
      if (key.startsWith('RATE_LIMIT_')) delete runtimeEnv[key];
    }
    child = spawn(process.execPath, [path.join(runtime, 'server.js')], { cwd: runtime, env: { ...runtimeEnv,
      NODE_ENV: 'production', HOSTNAME: LOOPBACK, PORT: String(port), NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret,
      ADMIN_EMAILS: 'admin@example.test', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic',
      NEXT_TELEMETRY_DISABLED: '1', ...(!preview ? rateLimits : {}), TRUST_PROXY_HOPS: '0', __NEXT_SHOW_IGNORE_LISTED: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { const response = await fetch(origin + '/api/settings/language', { signal: AbortSignal.timeout(1000) }); if (response.status === 200) { ready = true; break; } } catch { /* Server may still be starting. */ }
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Standalone server exited (${child.exitCode ?? child.signalCode}): ${output}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, output.slice(0, 3000));
    if (preview) {
      console.log(`Synthetic local preview: ${origin} (Ctrl+C to stop; no real accounts or data)`);
      await Promise.race([
        new Promise(resolve => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); }),
        once(child, 'exit').then(([code, signal]) => {
          throw new Error(`Preview server exited unexpectedly (${code ?? signal})`);
        }),
      ]);
      return;
    }
    const cookies = {};
    for (const name of ['admin', 'writer', 'reader', 'other', 'banned']) cookies[name] = `next-auth.session-token=${await encode({ secret, token: { email: `${name}@example.test`, name, sub: name } })}`;
    const request = async (route, { user, method = 'GET', body, foreign = false, multipart, forwarded } = {}) => {
      try {
        return await fetch(origin + route, {
          // Keep assertions independent of pooled-connection reuse, including responses whose bodies are not read.
          method, headers: { Connection: 'close', ...(forwarded ? { 'X-Forwarded-For': forwarded } : {}), ...(user ? { Cookie: cookies[user] } : {}), ...(method !== 'GET' ? { Origin: foreign ? 'https://foreign.example.test' : origin } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
          body: multipart || (body === undefined ? undefined : JSON.stringify(body)), redirect: 'manual', signal: AbortSignal.timeout(15000),
        });
      } catch (error) {
        throw new Error(`Synthetic request failed: ${method} ${route}`, { cause: error });
      }
    };
    const rejectedSvg = await request('/_next/image?url=%2Foptimizer-fixture.svg&w=64&q=75');
    check(rejectedSvg.status, 400);
    assert.match(await rejectedSvg.text(), /not allowed/i); checks++;
    const optimizedPng = await request('/_next/image?url=%2Foptimizer-fixture.png&w=64&q=75');
    check(optimizedPng.status, 200);
    assert.match(optimizedPng.headers.get('content-type'), /^image\//); checks++;
    for (const endpoint of ['system', 'language']) {
      const route = `/api/settings/${endpoint}`;
      const body = endpoint === 'system' ? { logRetentionDays: 30, scheduler: { hour: 23, minute: 0, second: 0 } } : { language: 'en' };
      check((await request(route, { method: 'POST', body })).status, 401);
      check((await request(route, { method: 'POST', body, user: 'reader' })).status, 403);
      check((await request(route, { method: 'POST', body, user: 'admin', foreign: true })).status, 403);
      check((await request(route, { method: 'POST', body, user: 'admin' })).status, 200);
    }
    check(JSON.parse(fs.readFileSync(path.join(runtime, 'data/settings.json'))).logRetentionDays, 30);
    check(fs.readFileSync(path.join(runtime, '.env'), 'utf8').includes('NEXT_PUBLIC_LANGUAGE=en'), true);
    const home = await request('/'); const html = await home.text();
    assert.equal(home.status, 200, output.slice(0, 4000)); checks++; check(home.headers.get('x-frame-options'), 'DENY'); check(home.headers.get('x-content-type-options'), 'nosniff');
    assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/); checks++;
    const script = html.match(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/)?.[1];
    assert.ok(script, 'Home should reference a standalone JavaScript asset'); checks++;
    check((await request(script)).status, 200);
    const data = JSON.parse(html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)[1]).props.pageProps;
    check(data.posts.length, 10); check(data.totalPosts, 23); check(/authorEmail|content|attachments/.test(JSON.stringify(data)), false);
    const page2 = await (await request('/?page=2')).text();
    const data2 = JSON.parse(page2.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)[1]).props.pageProps;
    check(data2.posts.length, 10); check(data2.currentPage, 2); check(data.posts.some(a => data2.posts.some(b => a.id === b.id)), false);
    const searched = await (await request('/?q=unique_21_end')).text();
    const searchedData = JSON.parse(searched.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)[1]).props.pageProps;
    check(searchedData.totalPosts, 1); check(searchedData.posts[0].id, 'synthetic-21');
    check((await request('/api/posts/missing/view', { method: 'POST' })).status, 404);
    check((await (await request('/api/posts/synthetic-0/view', { method: 'POST' })).json()).incremented, true);
    check((await (await request('/api/posts/synthetic-0/view', { method: 'POST' })).json()).incremented, false);
    check((await request('/api/posts/missing/view', { method: 'POST', forwarded: '203.0.113.1' })).status, 404);
    const limited = await request('/api/posts/missing/view', { method: 'POST', forwarded: '203.0.113.2' });
    check(limited.status, 429); check(Number(limited.headers.get('retry-after')) > 0, true);
    check(limited.headers.get('cache-control').includes('no-store'), true);
    const detail = await request('/blog/synthetic-0'); check(detail.status, 200); check((await detail.text()).includes('authorEmail'), false);
    check((await request('/blog/edit/synthetic-0')).status, 307);
    check((await request('/blog/edit/synthetic-0', { user: 'other' })).status, 404);
    check((await request('/blog/edit/synthetic-0', { user: 'writer' })).status, 200);
    check((await request('/api/posts/synthetic-0', { user: 'writer' })).status, 200);
    check((await (await request('/api/posts/synthetic-0', { user: 'writer' })).json()).canManage, true);
    const update = { title: 'Updated synthetic', content: 'Synthetic updated', tags: [], attachments: [] };
    check((await request('/api/posts/synthetic-0', { method: 'PUT', body: update, user: 'other' })).status, 403);
    check((await request('/api/posts/synthetic-0', { method: 'PUT', body: update, user: 'writer' })).status, 200);
    // Keep the same signed session cookie while revoking its privileges in storage.
    users.find(user => user.id === 'writer').role = 'banned'; fs.writeFileSync(path.join(runtime, 'data/users.json'), JSON.stringify(users));
    check((await request('/api/posts/synthetic-0', { method: 'PUT', body: update, user: 'writer' })).status, 403);
    check((await request('/api/delete-post?id=synthetic-0', { method: 'DELETE', user: 'writer' })).status, 403);
    users.find(user => user.id === 'writer').role = 'writer'; fs.writeFileSync(path.join(runtime, 'data/users.json'), JSON.stringify(users));
    const uploaded = new FormData(); uploaded.set('postDate', '2026-10-23'); uploaded.set('file', new Blob(['Synthetic text'], { type: 'text/plain' }), 'fixture.txt');
    const upload = await request('/api/upload', { user: 'writer', method: 'POST', multipart: uploaded }); check(upload.status, 200);
    const uploadedData = await upload.json(); check(uploadedData.file.url.startsWith('/api/files/2026/10/23/'), true);
    check(fs.existsSync(path.join(runtime, 'data/uploads/2026/10/23', uploadedData.file.filename)), true);
    check(JSON.parse(fs.readFileSync(path.join(runtime, 'data/upload-index.json')))[uploadedData.file.url.slice('/api/files/'.length)].ownerEmail, 'writer@example.test');
    const foreignFile = { id: 'foreign-attachment-http', title: 'Synthetic', content: 'Synthetic', tags: [], attachments: [uploadedData.file] };
    check((await request('/api/posts', { user: 'other', method: 'POST', body: foreignFile })).status, 403);
    const file = await request(uploadedData.file.url); check(file.status, 200); check(await file.text(), 'Synthetic text'); assert.match(file.headers.get('content-disposition'), /^attachment/); checks++;
    const spoof = new FormData(); spoof.set('file', new Blob(['<html>synthetic</html>'], { type: 'text/plain' }), 'fixture.html');
    check((await request('/api/upload', { user: 'writer', method: 'POST', multipart: spoof })).status, 400);
    const invalidZip = new FormData(); invalidZip.set('file', new Blob(['PK\x03\x04fake'], { type: 'application/zip' }), 'fixture.zip');
    check((await request('/api/upload', { user: 'writer', method: 'POST', multipart: invalidZip })).status, 400);
    const tooMany = new FormData(); tooMany.append('file', new Blob(['one'], { type: 'text/plain' }), 'one.txt'); tooMany.append('file', new Blob(['two'], { type: 'text/plain' }), 'two.txt');
    check((await request('/api/upload', { user: 'writer', method: 'POST', multipart: tooMany })).status, 400);
    const legacy = await request('/uploads/legacy.html'); check(legacy.status, 200); assert.match(legacy.headers.get('content-disposition'), /^attachment/); checks++;
    assert.match(legacy.headers.get('content-security-policy'), /sandbox/); checks++;
    check((await request('/api/files/missing.txt', { forwarded: '203.0.113.3' })).status, 429);
    check((await request('/api/upload', { user: 'writer', method: 'POST' })).status, 429);
    check((await request('/api/comments/synthetic-0')).status, 200);
    check((await request('/api/comments/synthetic-0')).status, 429);
    check((await request('/api/comments/synthetic-0', { method: 'POST', body: { content: 'Synthetic comment' }, user: 'writer' })).status, 201);
    check((await request('/api/comments/synthetic-0', { method: 'POST', body: { content: 'Repeated comment' }, user: 'writer' })).status, 429);
    check((await request('/api/comments/synthetic-0', { method: 'POST', body: { content: 'Separate account' }, user: 'reader' })).status, 201);
    const posted = { id: 'created-http', title: 'Synthetic created', content: 'Synthetic', date: '2026-10-23', tags: [], attachments: [] };
    check((await request('/api/posts', { method: 'POST', body: posted, user: 'writer' })).status, 201);
    check((await request('/api/posts', { method: 'POST', body: posted, user: 'other' })).status, 409);
    check((await request('/api/delete-post?id=created-http', { method: 'DELETE', user: 'writer' })).status, 200);
    check((await request('/api/posts', { method: 'POST', body: { ...posted, id: 'rate-limited-http' }, user: 'writer' })).status, 429);
    console.log(`HTTP smoke passed: ${checks} assertions; isolated standalone runtime; 23 synthetic posts; real signed local sessions and multipart requests.`);
  } catch (error) {
    if (output) console.error(output.slice(-4000));
    throw error;
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    await fs.promises.rm(runtime, { recursive: true, force: true, maxRetries: 5 });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
