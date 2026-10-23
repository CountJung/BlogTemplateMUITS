const path = require('node:path');
const root = path.resolve(__dirname, '../..');
require('tsx/cjs');
process.chdir(process.env.BLOG_STORE_TEST_DIRECTORY);
const moduleRoot = process.env.BLOG_STORE_MODULE_ROOT || root;
const users = require(path.join(moduleRoot, 'lib/users.ts'));
const comments = require(path.join(moduleRoot, 'lib/comments.ts'));
const posts = require(path.join(moduleRoot, 'lib/posts.ts'));
const views = require(path.join(moduleRoot, 'lib/views.ts'));
process.send('ready');
process.on('message', ({ action, worker, count }) => {
  try {
    let succeeded = 0;
    for (let i = 0; i < count; i++) {
      if (action === 'users') { users.createOrUpdateUser({ email: `${worker}-${i}@example.test`, name: 'Synthetic', image: null }); succeeded++; }
      if (action === 'comments') { const result = comments.createComment({ postId: 'shared', content: `synthetic ${worker}-${i}`, author: 'Synthetic', authorEmail: `${worker}@example.test` }); if (!result.success) throw new Error(result.error); succeeded++; }
      if (action === 'views') { const result = views.addViewRecord('shared', `192.0.2.${worker}-${i}`); if (!result.success) throw new Error(result.error); if (!posts.incrementViews('shared').success) throw new Error('increment failed'); succeeded++; }
      if (action === 'duplicate') { const result = posts.savePost({ id: 'duplicate', date: `2026-10-${20 + worker}`, title: 'Synthetic', content: 'Synthetic', author: 'Synthetic', authorEmail: 'synthetic@example.test', excerpt: '', tags: [] }); if (result.success) succeeded++; }
    }
    process.send({ succeeded });
    process.exit(0);
  } catch (error) { process.send({ error: error.stack }); process.exit(1); }
});
