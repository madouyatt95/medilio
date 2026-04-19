// ── Chat Page ──
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chatService';
import missionService from '../services/missionService';
import authService from '../services/authService';
import { CARE_TYPES } from '../utils/constants';
import { ChatBubble } from '../components/SharedComponents';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

export default function ChatPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mission, setMission] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      const m = await missionService.getById(missionId);
      if (!m) return navigate(-1);
      setMission(m);

      const allUsers = await authService.getAllUsers();
      const otherId = user.role === 'patient' ? m.assignedProId : m.patientId;
      setOtherUser(allUsers.find(u => u.id === otherId));

      const convo = await chatService.getConversation(missionId);
      setChatId(convo.id);
      setMessages(convo.messages);
      await chatService.markAsRead(missionId, user.id);
    }
    loadData();
  }, [missionId, user, navigate]);

  // Real-time subscription
  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = chatService.subscribeToMessages(chatId, (newMsg) => {
      // Add message if it's not already in the list (sent by ourselves)
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await chatService.sendMessage(missionId, user.id, `${user.firstName} ${user.lastName}`, input.trim());
    const updatedMessages = await chatService.getMessages(missionId);
    setMessages(updatedMessages);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      maxWidth: 640, margin: '0 auto', background: 'var(--bg-card)',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        background: 'var(--bg-card)', flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        {otherUser && (
          <>
            <div className="avatar avatar-sm">
              {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>
                {otherUser.firstName} {otherUser.lastName}
              </div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                {mission && getCareLabel(mission.careType)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflow: 'auto', padding: 'var(--space-4)',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 'var(--space-12)',
            color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)',
          }}>
            <MessageCircle size={40} style={{ marginBottom: 'var(--space-3)', opacity: 0.3 }} />
            <div>Commencez la conversation</div>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} isOwn={msg.senderId === user.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderTop: '1px solid var(--border-light)',
        display: 'flex', gap: 'var(--space-2)',
        background: 'var(--bg-card)', flexShrink: 0,
        paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom, 0))',
      }}>
        <input
          ref={inputRef}
          className="form-input"
          placeholder="Votre message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={!input.trim()}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
