// ── Messages Page (Conversations and Notifications) ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import chatService from '../services/chatService';
import missionService from '../services/missionService';
import authService from '../services/authService';
import { Shield, ChevronRight, MessageSquare, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'notifications'
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      if (!user) return;
      try {
        setLoading(true);
        // Fetch all user missions to find associated chats
        let userMissions = [];
        if (user.role === 'patient') {
          userMissions = await missionService.getByPatient(user.id);
        } else if (user.role === 'professional') {
          userMissions = await missionService.getByProfessional(user.id);
        }
        
        const convos = await chatService.getUserConversations(user.id, userMissions);
        setConversations(convos);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, [user]);

  const handleConversationClick = (convo) => {
    navigate(`/chat/${convo.missionId}`);
  };

  const getRecipientNameAndAvatar = (convo) => {
    const mission = convo.mission;
    if (!mission) return { name: 'Discussion', avatar: null };

    // If I am patient, recipient is pro
    if (user.role === 'patient') {
      return {
        name: mission.assignedProName || 'Infirmier',
        avatar: null // Default icon
      };
    }
    // If I am pro, recipient is patient
    return {
      name: mission.patientName || 'Patient',
      avatar: null
    };
  };

  return (
    <div className="page-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 40px)' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Messages
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid var(--border-light)', 
        marginBottom: 'var(--space-5)',
        position: 'relative'
      }}>
        <button 
          onClick={() => setActiveTab('conversations')}
          style={{
            flex: 1,
            padding: '14px 0',
            background: 'none',
            border: 'none',
            fontSize: 'var(--font-sm)',
            fontWeight: activeTab === 'conversations' ? 700 : 500,
            color: activeTab === 'conversations' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'conversations' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <MessageSquare size={16} />
          Conversations
          {conversations.some(c => c.unreadCount > 0) && (
            <span style={{ 
              background: 'var(--color-danger)', 
              color: 'white', 
              fontSize: '10px', 
              fontWeight: 700, 
              padding: '2px 6px', 
              borderRadius: '99px' 
            }}>
              {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          style={{
            flex: 1,
            padding: '14px 0',
            background: 'none',
            border: 'none',
            fontSize: 'var(--font-sm)',
            fontWeight: activeTab === 'notifications' ? 700 : 500,
            color: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'notifications' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Bell size={16} />
          Notifications
          {notifications.some(n => !n.read) && (
            <span style={{ 
              background: 'var(--color-primary)', 
              color: 'white', 
              fontSize: '10px', 
              fontWeight: 700, 
              padding: '2px 6px', 
              borderRadius: '99px' 
            }}>
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </div>

      {/* Conversations Tab content */}
      {activeTab === 'conversations' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8) 0' }}>
              <div className="spinner" />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)', color: 'var(--text-secondary)' }}>
              <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
              <div style={{ fontWeight: 600 }}>Aucune conversation</div>
              <p style={{ fontSize: 'var(--font-xs)', opacity: 0.8, marginTop: 4 }}>
                Vos discussions apparaîtront une fois les demandes de soins démarrées.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conversations.map((convo) => {
                const recipient = getRecipientNameAndAvatar(convo);
                return (
                  <div 
                    key={convo.id}
                    onClick={() => handleConversationClick(convo)}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-xl)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      boxShadow: convo.unreadCount > 0 ? 'var(--shadow-md)' : 'none',
                      background: convo.unreadCount > 0 ? 'rgba(37, 99, 235, 0.03)' : 'var(--bg-card)',
                      transition: 'transform 0.2s ease, background 0.2s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div className="avatar" style={{ 
                      background: 'var(--color-primary-lighter)', 
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      fontSize: 'var(--font-sm)',
                      flexShrink: 0
                    }}>
                      {recipient.name?.[0]}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontWeight: convo.unreadCount > 0 ? 800 : 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
                          {recipient.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                          {convo.lastMessage ? formatDate(convo.lastMessage.createdAt) : formatDate(convo.createdAt)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: 'var(--font-xs)', 
                          color: convo.unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: convo.unreadCount > 0 ? 600 : 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1
                        }}>
                          {convo.lastMessage ? convo.lastMessage.content : 'Nouvelle conversation'}
                        </span>
                        
                        {convo.unreadCount > 0 && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            flexShrink: 0
                          }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Secure RGPD Banner - mockup match */}
          <div className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-xl)',
            border: 'none',
            background: 'var(--color-primary-lighter)',
            color: 'var(--color-primary)',
            marginTop: 'var(--space-8)'
          }}>
            <Shield size={20} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
            <div style={{ fontSize: '11px', fontWeight: 600, lineHeight: '1.4' }}>
              <strong>Vos échanges sont sécurisés.</strong> Medilio protège vos données de santé conformément au RGPD.
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab content */}
      {activeTab === 'notifications' && (
        <div>
          {notifications.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={markAllAsRead}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-xs)' }}
              >
                <CheckCheck size={14} /> Tout marquer comme lu
              </button>
            </div>
          )}

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)', color: 'var(--text-secondary)' }}>
              <Bell size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
              <div style={{ fontWeight: 600 }}>Aucune notification</div>
              <p style={{ fontSize: 'var(--font-xs)', opacity: 0.8, marginTop: 4 }}>
                Vous serez alerté ici en cas d'action sur vos soins.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) navigate(notif.link);
                  }}
                  className="glass-card"
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-xl)',
                    cursor: notif.link ? 'pointer' : 'default',
                    border: '1px solid var(--border-color)',
                    background: notif.read ? 'var(--bg-card)' : 'rgba(37, 99, 235, 0.02)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: notif.read ? 'var(--bg-input)' : 'var(--color-primary-lighter)',
                    color: notif.read ? 'var(--text-secondary)' : 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Bell size={14} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', display: 'block', lineHeight: '1.4' }}>
                      {notif.message}
                    </span>
                  </div>

                  {!notif.read && (
                    <span style={{
                      position: 'absolute',
                      right: '16px',
                      bottom: '16px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)'
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
