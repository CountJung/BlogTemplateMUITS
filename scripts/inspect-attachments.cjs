// Read-only inventory. Unknown ownership and an empty reference list never authorize deletion.
require('tsx/cjs');
const { inspectAttachmentReferences } = require('../lib/attachments.ts');
console.log(JSON.stringify(inspectAttachmentReferences(), null, 2));
