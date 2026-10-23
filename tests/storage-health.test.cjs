const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
require('tsx/cjs');
const {inspectStorage}=require('../lib/storage-health.ts');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'blog-health-'));
after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
test('read-only diagnostics preserve corrupt files, temps and symlinks without following them',()=>{
 fs.mkdirSync(path.join(scratch,'data'),{recursive:true});fs.writeFileSync(path.join(scratch,'data/broken.json'),'{broken');fs.writeFileSync(path.join(scratch,'data/.unfinished.tmp'),'pending');fs.symlinkSync(os.tmpdir(),path.join(scratch,'data/link'));
 const report=inspectStorage(scratch);assert.deepEqual(report.invalidJson,['data/broken.json']);assert.deepEqual(report.symlinks,['data/link']);assert.deepEqual(report.temporaryFiles,['data/.unfinished.tmp']);assert.equal(fs.readFileSync(path.join(scratch,'data/broken.json'),'utf8'),'{broken');assert.equal(fs.existsSync(path.join(scratch,'data/.unfinished.tmp')),true);
});
test('process crash leaves its lock visible for operator recovery; diagnostics never remove it',()=>{
 const code=`require(${JSON.stringify(require.resolve('tsx/cjs'))});process.chdir(${JSON.stringify(scratch)});const {withStoreLock}=require(${JSON.stringify(path.join(root,'lib/storage.ts'))});withStoreLock(()=>process.kill(process.pid,'SIGKILL'));`;
 const child=spawnSync(process.execPath,['-e',code]);assert.equal(child.signal,'SIGKILL');
 const report=inspectStorage(scratch);assert.equal(report.locked,true);assert.equal(Number.isSafeInteger(report.lockOwner.pid),true);assert.equal(fs.existsSync(path.join(scratch,'data/.write-lock/owner.json')),true);
});
