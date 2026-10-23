const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
require('tsx/cjs');
const root = path.resolve(__dirname, '..');
const cwd = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-auth-regression-'));
process.chdir(scratch);
const previousAdmin = process.env.ADMIN_EMAILS;
process.env.ADMIN_EMAILS = '';
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request.endsWith('/logger')) return { logAction() {} };
  return originalLoad.call(this, request, parent, isMain);
};
const { authOptions } = require(path.join(root, 'pages/api/auth/[...nextauth].ts'));
const { getAllUsers, updateUserRole, deleteUser } = require(path.join(root, 'lib/users.ts'));
after(() => { Module._load = originalLoad; process.chdir(cwd); fs.rmSync(scratch, { recursive: true, force: true }); if (previousAdmin === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = previousAdmin; });
test('Google sign-in requires verified email', async () => {
  const args = { user: { email: 'synthetic@example.test' }, account: { provider: 'google' } };
  assert.equal(await authOptions.callbacks.signIn({ ...args, profile: { email_verified: false } }), false);
  assert.equal(await authOptions.callbacks.signIn({ ...args, profile: { email_verified: true } }), true);
});
test('JWT refresh applies revocation, does not resurrect deleted users, and session omits OAuth access token', async () => {
  let token = { email: 'synthetic@example.test', name: 'Synthetic', accessToken: 'synthetic-provider-token' };
  token = await authOptions.callbacks.jwt({ token, user: { email: token.email }, account: { access_token: 'synthetic-provider-token' } });
  assert.equal(getAllUsers().length, 1); assert.equal(token.accessToken, undefined);
  updateUserRole(token.email, 'writer'); token = await authOptions.callbacks.jwt({ token }); assert.equal(token.permissions.canWrite, true);
  updateUserRole(token.email, 'banned'); token = await authOptions.callbacks.jwt({ token }); assert.equal(token.permissions.canWrite, false); assert.equal(token.permissions.canComment, false);
  deleteUser(token.email); token = await authOptions.callbacks.jwt({ token }); assert.equal(getAllUsers().length, 0); assert.equal(token.permissions.canWrite, false);
  const session = await authOptions.callbacks.session({ session: { user: { email: token.email } }, token: { ...token, accessToken: 'legacy-token' } });
  assert.equal(session.accessToken, undefined);
});
