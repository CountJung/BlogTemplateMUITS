import type { BlogPost, PostSummary } from '../types/blog';
import { getAllPosts } from './posts';
import { getUserPermissions } from './admin';
import { isSafeUploadPath } from './validation';

export function canManagePost(post: BlogPost, email?: string | null): boolean {
  if (!email) return false;
  const permissions = getUserPermissions(email);
  return permissions.canDelete || (permissions.canWrite && post.authorEmail === email);
}

export function toPostSummary(post: BlogPost, email?: string | null): PostSummary {
  return { id: post.id, title: post.title, author: post.author, date: post.date,
    excerpt: post.excerpt, tags: post.tags, views: post.views, canManage: canManagePost(post, email) };
}

export function toPublicPost(post: BlogPost): BlogPost {
  const attachments = (post.attachments || []).flatMap(a => {
    if (!a || typeof a.url !== 'string') return [];
    const relative = a.url.replace(/^\/(api\/files|uploads)\//, '');
    if (relative === a.url || !isSafeUploadPath(relative)) return [];
    return [{ filename: a.filename, originalName: a.originalName, size: a.size,
      mimeType: a.mimeType, uploadedAt: a.uploadedAt,
      url: `/api/files/${relative}`, downloadUrl: `/api/files/${relative}?download=true` }];
  });
  const { canManage, ...summary } = toPostSummary(post);
  return { ...summary, content: post.content, attachments };
}

export function getPublicPostPage(query: { page?: unknown; q?: unknown; tag?: unknown }, email?: string | null) {
  const allPosts = getAllPosts();
  const search = typeof query.q === 'string' ? query.q.slice(0, 200) : '';
  const tag = typeof query.tag === 'string' ? query.tag.slice(0, 100) : '';
  const term = search.toLocaleLowerCase();
  const matches = allPosts.filter(post => (!term || [post.title, post.author, post.content].some(
    value => value.toLocaleLowerCase().includes(term))) && (!tag || post.tags.includes(tag)));
  const postsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(matches.length / postsPerPage));
  const requestedPage = typeof query.page === 'string' && /^\d+$/.test(query.page) ? Number(query.page) : 1;
  const currentPage = Math.min(totalPages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
  return { posts: matches.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage).map(post => toPostSummary(post, email)),
    currentPage, totalPages, postsPerPage, totalPosts: matches.length, search, selectedTag: tag,
    allTags: Array.from(new Set(allPosts.flatMap(post => post.tags))).sort() };
}
