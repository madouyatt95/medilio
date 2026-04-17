// ── Chat Service ──
import { v4 as uuidv4 } from 'uuid';
import storageService from './storageService';

const CHATS_KEY = 'medilio_chats';

export const chatService = {
  getAll() {
    return storageService.get(CHATS_KEY) || [];
  },

  save(chats) {
    storageService.set(CHATS_KEY, chats);
  },

  // Get or create a conversation for a mission
  getConversation(missionId) {
    const chats = this.getAll();
    let convo = chats.find(c => c.missionId === missionId);
    if (!convo) {
      convo = {
        id: uuidv4(),
        missionId,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      chats.push(convo);
      this.save(chats);
    }
    return convo;
  },

  sendMessage(missionId, senderId, senderName, content) {
    const chats = this.getAll();
    let convoIndex = chats.findIndex(c => c.missionId === missionId);
    if (convoIndex === -1) {
      chats.push({
        id: uuidv4(),
        missionId,
        messages: [],
        createdAt: new Date().toISOString(),
      });
      convoIndex = chats.length - 1;
    }
    const message = {
      id: uuidv4(),
      senderId,
      senderName,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };
    chats[convoIndex].messages.push(message);
    this.save(chats);
    return message;
  },

  getMessages(missionId) {
    const convo = this.getConversation(missionId);
    return convo.messages || [];
  },

  markAsRead(missionId, userId) {
    const chats = this.getAll();
    const convoIndex = chats.findIndex(c => c.missionId === missionId);
    if (convoIndex === -1) return;
    chats[convoIndex].messages.forEach(m => {
      if (m.senderId !== userId) m.read = true;
    });
    this.save(chats);
  },

  getUnreadCount(missionId, userId) {
    const convo = this.getConversation(missionId);
    return convo.messages.filter(m => m.senderId !== userId && !m.read).length;
  },

  getUserConversations(userId, missions) {
    // Get all conversations for missions this user is part of
    return missions
      .map(m => {
        const convo = this.getConversation(m.id);
        const unread = convo.messages.filter(msg => msg.senderId !== userId && !msg.read).length;
        const lastMessage = convo.messages[convo.messages.length - 1] || null;
        return { ...convo, mission: m, unreadCount: unread, lastMessage };
      })
      .filter(c => c.messages.length > 0 || c.mission.assignedProId)
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
  },
};

export default chatService;
