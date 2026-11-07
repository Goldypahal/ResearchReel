import { fetchApi, fetchPage, qs, type Page } from './client';
import type { Comment, CommentSort, Post, ReactionType } from './types';

export interface CreatePostPayload {
  content_type: Post['content_type'];
  caption?: string;
  tags?: string[];
  document_id?: string | null;
  media_urls?: string[];
  publication_status?: 'preprint' | 'published' | 'wip' | null;
  doi?: string | null;
}

export const REACTIONS: { type: ReactionType; label: string; emoji: string }[] = [
  { type: 'interesting', label: 'Interesting', emoji: '💡' },
  { type: 'novel', label: 'Novel', emoji: '🚀' },
  { type: 'needs_discussion', label: 'Needs discussion', emoji: '💬' },
];

export const postsApi = {
  getFeed: (opts: { cursor?: string | null; scope?: 'all' | 'following'; tag?: string } = {}) =>
    fetchPage<Post>(`/posts/feed${qs({ cursor: opts.cursor, scope: opts.scope, tag: opts.tag })}`),
  getTrending: (days = 7): Promise<Post[]> => fetchApi(`/posts/trending${qs({ days })}`),
  getTrendingTags: (): Promise<{ tag: string; post_count: number }[]> => fetchApi('/posts/tags/trending'),
  getSaved: (cursor?: string | null) => fetchPage<Post>(`/posts/saved${qs({ cursor })}`),
  getPost: (id: string): Promise<Post> => fetchApi(`/posts/${id}`),
  uploadImages: (files: File[]): Promise<{ urls: string[] }> => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return fetchApi('/posts/media', { method: 'POST', body: form });
  },
  create: (payload: CreatePostPayload): Promise<Post> =>
    fetchApi('/posts/create', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (id: string) => fetchApi(`/posts/${id}`, { method: 'DELETE' }),
  react: (postId: string, reaction: ReactionType | null): Promise<{ viewer_reaction: ReactionType | null; reaction_count: number }> =>
    fetchApi('/posts/react', { method: 'POST', body: JSON.stringify({ post_id: postId, reaction_type: reaction }) }),
  bookmark: (postId: string) => fetchApi(`/posts/${postId}/bookmark`, { method: 'POST' }),
  unbookmark: (postId: string) => fetchApi(`/posts/${postId}/bookmark`, { method: 'DELETE' }),
  /** Top-level comments; `cursor` comes from the previous page. */
  getComments: (postId: string, sort: CommentSort, cursor: string | null): Promise<Page<Comment>> =>
    fetchPage(`/posts/${postId}/comments${qs({ sort, cursor })}`),
  getReplies: (postId: string, commentId: string, cursor: string | null): Promise<Page<Comment>> =>
    fetchPage(`/posts/${postId}/comments/${commentId}/replies${qs({ cursor })}`),
  addComment: (postId: string, content: string, parentId?: string | null): Promise<Comment> =>
    fetchApi(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content, parent_id: parentId || undefined }) }),
  editComment: (postId: string, commentId: string, content: string): Promise<Comment> =>
    fetchApi(`/posts/${postId}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteComment: (postId: string, commentId: string) =>
    fetchApi(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  likeComment: (postId: string, commentId: string, liked: boolean): Promise<{ id: string; like_count: number; viewer_liked: boolean }> =>
    fetchApi(`/posts/${postId}/comments/${commentId}/like`, { method: liked ? 'POST' : 'DELETE' }),
  report: (postId: string, reason: string, details?: string) =>
    fetchApi('/moderation/report', { method: 'POST', body: JSON.stringify({ post_id: postId, reason, details }) }),
  recordView: (postId: string) =>
    fetchApi('/posts/view', { method: 'POST', body: JSON.stringify({ post_id: postId }) }).catch(() => undefined),
};
