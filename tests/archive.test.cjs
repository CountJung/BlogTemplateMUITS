const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {crc32,deflateRawSync}=require('node:zlib');
require('tsx/cjs');
const {isSafeArchive}=require('../lib/archive-validation.ts');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'blog-zip-'));
after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
function archive(entries,alter) {
 const locals=[],central=[];let position=0;
 for(const [name,text] of entries){
  const filename=Buffer.from(name),raw=Buffer.from(text),packed=deflateRawSync(raw);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(8,8);header.writeUInt32LE(crc32(raw),14);header.writeUInt32LE(packed.length,18);header.writeUInt32LE(raw.length,22);header.writeUInt16LE(filename.length,26);
  const index=Buffer.alloc(46);index.writeUInt32LE(0x02014b50);index.writeUInt16LE(8,10);index.writeUInt32LE(crc32(raw),16);index.writeUInt32LE(packed.length,20);index.writeUInt32LE(raw.length,24);index.writeUInt16LE(filename.length,28);index.writeUInt32LE(position,42);
  locals.push(header,filename,packed);central.push(index,filename);position+=header.length+filename.length+packed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(position,16);
 const bytes=Buffer.concat([...locals,directory,end]);if(alter)alter(bytes,position);const file=path.join(scratch,'fixture.zip');fs.writeFileSync(file,bytes);return file;
}
test('ZIP inspection accepts bounded contents and checks OOXML package identity',()=>{
 const file=archive([['[Content_Types].xml','<Types/>'],['word/document.xml','<document/>']]);
 assert.equal(isSafeArchive(file,'.zip'),true);assert.equal(isSafeArchive(file,'.docx'),true);assert.equal(isSafeArchive(file,'.xlsx'),false);
});
test('ZIP inspection rejects traversal, duplicate names, encrypted files, symlinks and expansion bombs',()=>{
 for(const entries of [[['../escape','x']],[['/absolute','x']],[['a','x'],['a','y']],[['bomb','0'.repeat(2*1024*1024)]]])assert.equal(isSafeArchive(archive(entries),'.zip'),false);
 for(const edit of [(b,p)=>b.writeUInt16LE(1,p+8),(b,p)=>b.writeUInt32LE(0xa0000000,p+38),(b,p)=>b.writeUInt32LE(0xffffffff,p+24),(b,p)=>b.writeUInt32LE(0xffffffff,p+42),(b,p)=>b.writeUInt32LE(123,p+16)])assert.equal(isSafeArchive(archive([['a','x']],edit),'.zip'),false);
});
test('truncated and signature-only files are rejected without extraction',()=>{
 const file=archive([['a','x']]);const bytes=fs.readFileSync(file);fs.writeFileSync(file,bytes.subarray(0,bytes.length-1));assert.equal(isSafeArchive(file,'.zip'),false);
 fs.writeFileSync(file,'PK\x03\x04fake');assert.equal(isSafeArchive(file,'.zip'),false);assert.deepEqual(fs.readdirSync(scratch),['fixture.zip']);
});
