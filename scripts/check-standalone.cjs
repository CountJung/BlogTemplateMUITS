// Package policy: runtime state and secrets are provided separately, never shipped in a build.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.join(process.cwd(), '.next', 'standalone');
assert.ok(fs.existsSync(path.join(output, 'server.js')), 'Expected the generated standalone server');
assert.ok(fs.existsSync(path.join(output, '.next', 'required-server-files.json')), 'Expected Next.js build metadata');
const runtimePaths = ['data', 'content', 'logs', 'public/uploads', ...fs.readdirSync(output).filter(name => name.startsWith('.env'))];
const removed = [];
for (const relative of runtimePaths) {
  const target = path.join(output, relative);
  if (fs.existsSync(target)) { fs.rmSync(target, { recursive: true, force: true }); removed.push(relative); }
}
for (const directory of ['lib', 'pages', 'components', 'contexts', 'docs', 'tests', 'scripts']) {
  assert.equal(fs.existsSync(path.join(output, directory)), false, `Unexpected project source in standalone: ${directory}`);
}
console.log(`Standalone package policy passed; runtime entries pruned: ${removed.join(', ') || 'none'}.`);
