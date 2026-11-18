// Keep normal production and isolated standalone artifacts separate on every OS.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const standalone = process.argv.includes('--standalone');
const declarations = path.join(process.cwd(), 'next-env.d.ts');
const previousDeclarations = standalone && fs.existsSync(declarations) ? fs.readFileSync(declarations) : null;
let status;
try {
  const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
    stdio: 'inherit', env: { ...process.env, BLOG_STANDALONE_BUILD: standalone ? '1' : '0' },
  });
  if (result.error) throw result.error;
  status = result.status || (result.signal ? 1 : 0);
  if (status === 0 && standalone) {
    const check = spawnSync(process.execPath, [path.join(__dirname, 'check-standalone.cjs')], { stdio: 'inherit' });
    if (check.error) throw check.error;
    status = check.status || (check.signal ? 1 : 0);
  }
} finally {
  // Next rewrites these imports for custom distDir; retain the normal build's type entrypoint.
  if (previousDeclarations) fs.writeFileSync(declarations, previousDeclarations);
}
process.exitCode = status;
