// ── Chat Service (Hybrid Supabase/Local Demo) ──
import supabase from '../lib/supabase';
import storageService from './storageService';

export const chatService = {
  // Get or create a conversation for a mission
  async getConversation(missionId) {
    // 1. Try Local Demo First
    const localChats = storageService.getChats();
    let localChat = localChats.find(c => c.missionId === missionId);
    
    if (localChat) {
      return localChat;
    }

    // 2. Otherwise Supabase
    try {
      let { data: chat } = await supabase
        .from('chats')
        .select('*')
        .eq('mission_id', missionId)
        .single();

      if (!chat) {
        // Create one on Supabase (only if it's not a local mission ID)
        // If it's a UUID v4 from demo data, Supabase might reject it depending on FKs.
        // But if we are here, it means we didn't find it in local storage.
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({ mission_id: missionId })
          .select()
          .single();

        if (error) throw error;
        chat = newChat;
      }

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
    } catch (err) {
      // If Supabase fails (e.g. mission doesn't exist there), create a local chat
      const newLocalChat = {
        id: `local_chat_${missionId}`,
        missionId,
        messages: [],
        createdAt: new Date().toISOString()
      };
      storageService.setChats([...localChats, newLocalChat]);
      return newLocalChat;
    }
  },

  async sendMessage(missionId, senderId, senderName, content) {
    const convo = await this.getConversation(missionId);

    // 1. Handle Local Chat
    if (convo.id.startsWith('local_chat_')) {
      const localChats = storageService.getChats();
      const chatIdx = localChats.findIndex(c => c.id === convo.id);
      if (chatIdx !== -1) {
        const newMessage = {
          id: Math.random().toString(36).substr(2, 9),
          senderId,
          senderName,
          content,
          createdAt: new Date().toISOString(),
          read: false
        };
        localChats[chatIdx].messages.push(newMessage);
        storageService.setChats(localChats);
        return newMessage;
      }
    }

    // 2. Handle Supabase Chat
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

    // 1. Local
    if (convo.id.startsWith('local_chat_')) {
      const localChats = storageService.getChats();
      const chatIdx = localChats.findIndex(c => c.id === convo.id);
      if (chatIdx !== -1) {
        localChats[chatIdx].messages = localChats[chatIdx].messages.map(m => 
          m.senderId !== userId ? { ...m, read: true } : m
        );
        storageService.setChats(localChats);
      }
      return;
    }

    // 2. Supabase
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
      try {
        const convo = await this.getConversation(m.id);
        const unread = convo.messages.filter(msg => msg.senderId !== userId && !msg.read).length;
        const lastMessage = convo.messages[convo.messages.length - 1] || null;
        results.push({ ...convo, mission: m, unreadCount: unread, lastMessage });
      } catch (err) {
        console.error("Error loading conversation for mission", m.id, err);
      }
    }

    return results
      .filter(c => c.messages.length > 0 || c.mission.assignedProId)
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
  },

  // Subscribe to real-time new messages
  subscribeToMessages(chatId, onNewMessage) {
    if (chatId.startsWith('local_chat_')) {
      // For local chat, we use a simple interval or custom event
      // For demo, we can just poll or skip real-time as it's the same browser
      const interval = setInterval(() => {
        const localChats = storageService.getChats();
        const chat = localChats.find(c => c.id === chatId);
        if (chat && chat.messages.length > 0) {
          const last = chat.messages[chat.messages.length - 1];
          // This is a bit hacky but works for demo
          onNewMessage(last);
        }
      }, 3000);
      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const m = payload.new;
          onNewMessage({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            content: m.content,
            createdAt: m.created_at,
            read: m.read,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

export default chatService;
