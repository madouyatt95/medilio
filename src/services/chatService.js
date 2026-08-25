import supabase from '../lib/supabase';
import storageService from './storageService';
import notificationService from './notificationService';
import { isDemoMode } from '../config/runtime';

export const chatService = {
  // Get or create a conversation for a mission
  async getConversation(missionId) {
    if (isDemoMode) {
      const localChats = storageService.getChats();
      const localChat = localChats.find(c => c.missionId === missionId);
      if (localChat) return localChat;
      const newLocalChat = {
        id: `local_chat_${missionId}`,
        missionId,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      storageService.setChats([...localChats, newLocalChat]);
      return newLocalChat;
    }

    let { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('mission_id', missionId)
      .maybeSingle();
    if (chatError) throw new Error(chatError.message);

    if (!chat) {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({ mission_id: missionId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      chat = newChat;
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });
    if (messagesError) throw new Error(messagesError.message);

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
    const convo = await this.getConversation(missionId);

    // 1. Handle Local Chat
    if (isDemoMode && convo.id.startsWith('local_chat_')) {
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

        // Notify recipient locally
        const mission = storageService.getMissions().find(m => m.id === missionId);
        if (mission) {
          const recipientId = mission.patientId === senderId ? mission.assignedProId : mission.patientId;
          if (recipientId) {
            void notificationService.create({
              userId: recipientId,
              type: 'message',
              title: `Message de ${senderName}`,
              message: content.length > 40 ? content.substring(0, 40) + '...' : content,
              link: `/chat/${missionId}`
            });
          }
        }
        
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
    if (isDemoMode && convo.id.startsWith('local_chat_')) {
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
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', unreadIds);
      if (error) throw new Error(error.message);
    }
  },

  async getUnreadCount(missionId, userId) {
    const convo = await this.getConversation(missionId);
    return convo.messages.filter(m => m.senderId !== userId && !m.read).length;
  },

  async getUserConversations(userId, missions) {
    if (!missions?.length) return [];

    let chats;
    let messages;

    if (isDemoMode) {
      chats = storageService.getChats()
        .filter(chat => missions.some(mission => mission.id === chat.missionId));
      messages = chats.flatMap(chat => (chat.messages || []).map(message => ({
        ...message,
        chatId: chat.id,
      })));
    } else {
      const missionIds = missions.map(mission => mission.id);
      const { data: chatRows, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .in('mission_id', missionIds);
      if (chatError) throw new Error(chatError.message);

      chats = (chatRows || []).map(chat => ({
        id: chat.id,
        missionId: chat.mission_id,
        createdAt: chat.created_at,
      }));

      const chatIds = chats.map(chat => chat.id);
      if (chatIds.length > 0) {
        const { data: messageRows, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: true });
        if (messagesError) throw new Error(messagesError.message);

        messages = (messageRows || []).map(message => ({
          id: message.id,
          chatId: message.chat_id,
          senderId: message.sender_id,
          senderName: message.sender_name,
          content: message.content,
          createdAt: message.created_at,
          read: message.read,
        }));
      }
    }

    const chatByMission = new Map(chats.map(chat => [chat.missionId, chat]));
    const results = missions.map(mission => {
      const chat = chatByMission.get(mission.id);
      const conversationMessages = chat
        ? messages.filter(message => message.chatId === chat.id)
        : [];
      const lastMessage = conversationMessages[conversationMessages.length - 1] || null;
      return {
        id: chat?.id || `mission_${mission.id}`,
        missionId: mission.id,
        messages: conversationMessages,
        createdAt: chat?.createdAt || mission.createdAt,
        mission,
        unreadCount: conversationMessages.filter(message => message.senderId !== userId && !message.read).length,
        lastMessage,
      };
    });

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
    if (isDemoMode && chatId.startsWith('local_chat_')) {
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
