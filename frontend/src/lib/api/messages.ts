import { fetchApi, qs } from './client';
import type { Conversation, Message } from './types';

export const messagesApi = {
  getConversations: (): Promise<Conversation[]> => fetchApi('/messages/conversations'),
  startConversation: (username: string): Promise<Conversation> =>
    fetchApi('/messages/conversations', { method: 'POST', body: JSON.stringify({ username }) }),
  getMessages: (conversationId: string, cursor?: string | null): Promise<{ messages: Message[]; nextCursor: string | null }> =>
    fetchApi(`/messages/${conversationId}/messages${qs({ cursor })}`),
  sendMessage: (conversationId: string, content: string): Promise<Message> =>
    fetchApi('/messages/send', { method: 'POST', body: JSON.stringify({ conversationId, content }) }),
  markAsRead: (conversationId: string) =>
    fetchApi('/messages/read', { method: 'POST', body: JSON.stringify({ conversationId }) }),
};
