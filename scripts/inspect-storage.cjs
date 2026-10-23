require('tsx/cjs');
const { inspectStorage } = require('../lib/storage-health.ts');
const report = inspectStorage();
console.log(JSON.stringify(report, null, 2));
if (report.locked || report.invalidJson.length || report.symlinks.length || report.errors.length) process.exitCode = 1;
