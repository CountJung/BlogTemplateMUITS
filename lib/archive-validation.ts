import fs from 'fs';
import { crc32, inflateRawSync } from 'zlib';

// Inspect ZIP contents in memory without extracting paths or invoking external tools.
// This bounds expansion and validates structure; it is not malware detection.
export function isSafeArchive(file: string, extension: string): boolean {
  try {
    const size = fs.statSync(/* turbopackIgnore: true */ file).size;
    if (size > 10 * 1024 * 1024 || size < 22) return false;
    const bytes = fs.readFileSync(/* turbopackIgnore: true */ file);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
    }
    if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) return false;
    const count = bytes.readUInt16LE(end + 10);
    const length = bytes.readUInt32LE(end + 12);
    const start = bytes.readUInt32LE(end + 16);
    if (!count || count > 1000 || count !== bytes.readUInt16LE(end + 8) || start + length !== end) return false;
    const names = new Set<string>();
    const ranges: Array<[number, number]> = [];
    let offset = start, total = 0;
    for (let entry = 0; entry < count; entry++) {
      if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) return false;
      const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10);
      const compressed = bytes.readUInt32LE(offset + 20), expanded = bytes.readUInt32LE(offset + 24);
      const nameSize = bytes.readUInt16LE(offset + 28), extraSize = bytes.readUInt16LE(offset + 30), commentSize = bytes.readUInt16LE(offset + 32);
      const local = bytes.readUInt32LE(offset + 42);
      if (offset + 46 + nameSize + extraSize + commentSize > end || flags & 1 || ![0, 8].includes(method) || bytes.readUInt16LE(offset + 34)) return false;
      const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameSize);
      const name = nameBytes.toString('utf8');
      if (!name || /[\\:]/.test(name) || [...name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || name.startsWith('/') || name.split('/').includes('..') || names.has(name)) return false;
      // Unix symlinks are never accepted, even though this code does not extract files.
      if (((bytes.readUInt32LE(offset + 38) >>> 16) & 0xf000) === 0xa000) return false;
      names.add(name); total += expanded;
      if (total > 100 * 1024 * 1024 || expanded > Math.max(1024 * 1024, compressed * 200)) return false;
      if (local + 30 > start || bytes.readUInt32LE(local) !== 0x04034b50 || bytes.readUInt16LE(local + 6) !== flags || bytes.readUInt16LE(local + 8) !== method) return false;
      const localNameSize = bytes.readUInt16LE(local + 26), localExtraSize = bytes.readUInt16LE(local + 28);
      if (!nameBytes.equals(bytes.subarray(local + 30, local + 30 + localNameSize))) return false;
      const dataStart = local + 30 + localNameSize + localExtraSize, dataEnd = dataStart + compressed;
      if (dataEnd > start || ranges.some(([a,b]) => local < b && dataEnd > a)) return false;
      ranges.push([local, dataEnd]);
      const packed = bytes.subarray(dataStart, dataEnd);
      const unpacked = method === 0 ? packed : inflateRawSync(packed, { maxOutputLength: Math.max(1, expanded) });
      if (unpacked.length !== expanded || crc32(unpacked) !== bytes.readUInt32LE(offset + 16)) return false;
      offset += 46 + nameSize + extraSize + commentSize;
    }
    if (offset !== end) return false;
    if (extension === '.docx') return names.has('[Content_Types].xml') && names.has('word/document.xml');
    if (extension === '.xlsx') return names.has('[Content_Types].xml') && names.has('xl/workbook.xml');
    return true;
  } catch { return false; }
}
