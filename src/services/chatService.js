// ── Chat Service (Supabase) ──
import supabase from '../lib/supabase';

export const chatService = {
  // Get or create a conversation for a mission
  async getConversation(missionId) {
    // Try to find existing chat
    let { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('mission_id', missionId)
      .single();

    if (!chat) {
      // Create one
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({ mission_id: missionId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      chat = newChat;
    }

    // Fetch messages
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    return {
      id: chat.id,
      missionId: chat.mission_id,
      messages: (messages || []).map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        content: m.content,
        createdAt: m.created_at,
        read: m.read,
      })),
      createdAt: chat.created_at,
    };
  },

  async sendMessage(missionId, senderId, senderName, content) {
    // Get or create the chat
    const convo = await this.getConversation(missionId);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: convo.id,
        sender_id: senderId,
        sender_name: senderName,
        content,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      senderId: data.sender_id,
      senderName: data.sender_name,
      content: data.content,
      createdAt: data.created_at,
      read: data.read,
    };
  },

  async getMessages(missionId) {
    const convo = await this.getConversation(missionId);
    return convo.messages;
  },

  async markAsRead(missionId, userId) {
    const convo = await this.getConversation(missionId);

    // Mark all messages NOT sent by this user as read
    const unreadIds = convo.messages
      .filter(m => m.senderId !== userId && !m.read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', unreadIds);
    }
  },

  async getUnreadCount(missionId, userId) {
    const convo = await this.getConversation(missionId);
    return convo.messages.filter(m => m.senderId !== userId && !m.read).length;
  },

  async getUserConversations(userId, missions) {
    const results = [];

    for (const m of missions) {
      const convo = await this.getConversation(m.id);
      const unread = convo.messages.filter(msg => msg.senderId !== userId && !msg.read).length;
      const lastMessage = convo.messages[convo.messages.length - 1] || null;
      results.push({ ...convo, mission: m, unreadCount: unread, lastMessage });
    }

    return results
      .filter(c => c.messages.length > 0 || c.mission.assignedProId)
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
  },
};

export default chatService;
