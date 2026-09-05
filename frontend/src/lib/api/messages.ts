import { fetchApi } from './client';

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project';
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  file_url?: string;
  created_at: string;
  username?: string;
}

export const messagesApi = {
  getConversations: (): Promise<Conversation[]> => fetchApi('/messages/conversations'),
  getMessages: (conversationId: string, cursor?: string): Promise<{ messages: Message[]; nextCursor?: string }> =>
    fetchApi(`/messages/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  sendMessage: (conversationId: string, content: string, fileUrl?: string): Promise<Message> =>
    fetchApi('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, content, file_url: fileUrl }),
    }),
  markAsRead: (conversationId: string) =>
    fetchApi('/messages/read', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }),
};
