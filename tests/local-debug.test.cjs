const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');
const { scripts } = JSON.parse(read('package.json'));
const launch = JSON.parse(read('.vscode/launch.json'));
const full = launch.configurations.find(config => config.name === 'Next.js: Full Stack');
const server = launch.configurations.find(config => config.name === 'Next.js: Server');

test('VS Code and npm use the same loopback development address as local OAuth', () => {
  assert.equal(scripts.dev, 'next dev --hostname 127.0.0.1 --port 65002');
  for (const config of [full, server]) {
    assert.equal(config.type, 'node');
    assert.match(config.program, /\/next\/dist\/bin\/next$/);
    assert.equal(config.cwd, '${workspaceFolder}');
    assert.equal(config.autoAttachChildProcesses, true);
    assert.equal('next ' + config.args.join(' '), scripts.dev);
  }
  const authUrl = read('.env.example').match(/^NEXTAUTH_URL=(.+)$/m)[1];
  assert.equal(full.serverReadyAction.uriFormat, authUrl);
});

test('full stack waits for readiness and closes the Chrome debug session on stop', () => {
  assert.equal(launch.compounds, undefined);
  assert.equal(full.console, 'internalConsole');
  assert.equal(full.outputCapture, 'std');
  const action = full.serverReadyAction;
  assert.equal(action.action, 'debugWithChrome');
  assert.equal(action.killOnServerStop, true);
  assert.equal(server.serverReadyAction, undefined);
  const ready = new RegExp(action.pattern);
  assert.match('✓ Ready in 83ms', ready);
  assert.doesNotMatch('- Local: http://localhost:65002\nError: listen EADDRINUSE', ready);
});
