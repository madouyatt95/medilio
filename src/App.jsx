// ── App.jsx — Main Router ──
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { useEffect, useState } from 'react';
import { seedDemoData } from './utils/demoData';
import {
  Activity, Home, ClipboardList, User, Radar as RadarIcon,
  TrendingUp, Bell, X, Shield, LogOut, Calendar as CalendarIcon, MessageCircle,
  Plus, MessageSquare
} from 'lucide-react';
import { formatRelative, formatDate } from './utils/dateUtils';
import { CARE_TYPES, MISSION_STATUS_LABELS } from './utils/constants';
import missionService from './services/missionService';
import supabase from './lib/supabase';
import logo from './assets/logo-medilio.png';

// ── Error Boundary ──
import React from 'react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'white', color: 'red', minHeight: '100vh', wordBreak: 'break-all' }}>
          <h2>CRASH DETECTED</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px' }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Protected Route Helper ──
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

// ── Shared Header & Layout ──
// (Moved into AppContent for access to context)

// ── Header Component ──
function Header() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show header on landing, login, register
  const hiddenPaths = ['/', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.includes('create-mission')) return null;

  const profilePath = user?.role === 'patient' ? '/patient/profile' : user?.role === 'professional' ? '/pro/profile' : null;

  return (
    <>
      <header className="header">
        <div className="header-logo" onClick={() => navigate(user ? (user.role === 'professional' ? '/pro/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/patient/dashboard') : '/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <img src={logo} alt="Medilio" style={{ height: '32px', width: 'auto', marginRight: 'var(--space-2)' }} />
          <span style={{ fontWeight: 800, fontSize: 'var(--font-lg)', letterSpacing: '-0.02em' }}>Medilio</span>
        </div>
        <div className="header-actions">
          <button className="header-notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="header-notif-badge">{unreadCount}</span>}
          </button>
          <div
            className="avatar avatar-sm"
            onClick={() => profilePath && navigate(profilePath)}
            style={{ 
              cursor: 'pointer', 
              border: '2px solid rgba(255,255,255,0.2)',
              backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
              color: user?.avatar ? 'transparent' : 'white'
            }}
          >
            {!user?.avatar && <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>}
          </div>
        </div>
      </header>

      {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
    </>
  );
}

// ── Notification Panel ──
function NotificationPanel({ onClose }) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <>
      <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-panel-header">
          <h3 style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>Notifications</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-sm" onClick={markAllAsRead}>Tout lire</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        <div className="notif-panel-list">
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
              Aucune notification
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.link) navigate(n.link);
                  onClose();
                }}>
                {!n.read && <div className="notif-item-dot" />}
                <div style={{ flex: 1 }}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-time">{formatRelative(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Bottom Navigation ──
function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const { notifications } = useNotifications();

  const hiddenPaths = ['/', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.includes('/chat/')) return null;
  if (user?.role === 'admin') return null;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const unreadNotifs = notifications.filter(n => !n.read).length;

  if (user?.role === 'patient') {
    return (
      <nav className="bottom-nav">
        <Link to="/patient/dashboard" className={`bottom-nav-item ${isActive('/patient/dashboard') ? 'active' : ''}`}>
          <Home size={20} className="bottom-nav-icon" />
          <span>Accueil</span>
        </Link>
        <Link to="/patient/calendar" className={`bottom-nav-item ${isActive('/patient/calendar') ? 'active' : ''}`}>
          <CalendarIcon size={20} className="bottom-nav-icon" />
          <span>Rendez-vous</span>
        </Link>
        <Link to="/patient/create-mission" className={`bottom-nav-item ${isActive('/patient/create-mission') ? 'active' : ''}`} style={{ position: 'relative' }}>
          <div style={{
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            marginTop: '-12px',
            marginBottom: '2px'
          }}>
            <Plus size={20} color="white" />
          </div>
          <span>Nouveau</span>
        </Link>
        <Link to="/patient/messages" className={`bottom-nav-item ${isActive('/patient/messages') ? 'active' : ''}`} style={{ position: 'relative' }}>
          <MessageSquare size={20} className="bottom-nav-icon" />
          <span>Messages</span>
          {unreadNotifs > 0 && (
            <span className="badge-nav">{unreadNotifs}</span>
          )}
        </Link>
        <Link to="/patient/profile" className={`bottom-nav-item ${isActive('/patient/profile') ? 'active' : ''}`}>
          <User size={20} className="bottom-nav-icon" />
          <span>Profil</span>
        </Link>
      </nav>
    );
  }

  if (user?.role === 'professional') {
    return (
      <nav className="bottom-nav">
        <Link to="/pro/dashboard" className={`bottom-nav-item ${isActive('/pro/dashboard') ? 'active' : ''}`}>
          <Home size={20} className="bottom-nav-icon" />
          <span>Accueil</span>
        </Link>
        <Link to="/pro/radar" className={`bottom-nav-item ${isActive('/pro/radar') ? 'active' : ''}`}>
          <RadarIcon size={20} className="bottom-nav-icon" />
          <span>Radar</span>
        </Link>
        <Link to="/pro/calendar" className={`bottom-nav-item ${isActive('/pro/calendar') ? 'active' : ''}`}>
          <CalendarIcon size={20} className="bottom-nav-icon" />
          <span>Calendrier</span>
        </Link>
        <Link to="/pro/messages" className={`bottom-nav-item ${isActive('/pro/messages') ? 'active' : ''}`} style={{ position: 'relative' }}>
          <MessageSquare size={20} className="bottom-nav-icon" />
          <span>Messages</span>
          {unreadNotifs > 0 && (
            <span className="badge-nav">{unreadNotifs}</span>
          )}
        </Link>
        <Link to="/pro/profile" className={`bottom-nav-item ${isActive('/pro/profile') ? 'active' : ''}`}>
          <User size={20} className="bottom-nav-icon" />
          <span>Profil</span>
        </Link>
      </nav>
    );
  }

  return null;
}

// ── Toast Container ──
function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => dismissToast(t.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Import Pages ──
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import CreateMission from './pages/patient/CreateMission';
import PatientMissionDetail from './pages/patient/MissionDetail';
import ProDashboard from './pages/professional/ProDashboard';
import MissionRadar from './pages/professional/MissionRadar';
import ProTour from './pages/professional/ProTour';
import ProMissionDetail from './pages/professional/ProMissionDetail';
import PatientRecord from './pages/professional/PatientRecord';
import Earnings from './pages/professional/Earnings';
import ProProfile from './pages/professional/ProProfile';
import PatientProfile from './pages/patient/PatientProfile';
import CalendarPage from './pages/CalendarPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProPublicProfile from './pages/professional/ProPublicProfile';
import MessagesPage from './pages/MessagesPage';
import DocumentsPage from './pages/patient/DocumentsPage';

// ── Main App Content ──
function AppContent() {
  const { user } = useAuth();
  const { refresh } = useNotifications();
  const location = useLocation();
  
  // ── Synchronization across tabs (demo mode) ──
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'medilio_notifications' || e.key === 'medilio_chats') {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refresh]);

  // ── Rappels J-1 automatiques ──
  useEffect(() => {
    if (user?.id) {
      import('./services/reminderService').then(mod => {
        mod.default.checkAndSendReminders(user.id);
      });
    }
  }, [user?.id]);

  const isAdmin = user?.role === 'admin' || location.pathname.startsWith('/admin');

  return (
    <ErrorBoundary>
      {!isAdmin && <Header />}
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Patient Routes */}
        <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/documents" element={<ProtectedRoute allowedRoles={['patient']}><DocumentsPage /></ProtectedRoute>} />
        <Route path="/patient/create-mission" element={<ProtectedRoute allowedRoles={['patient']}><CreateMission /></ProtectedRoute>} />
        <Route path="/patient/mission/:id" element={<ProtectedRoute allowedRoles={['patient']}><PatientMissionDetail /></ProtectedRoute>} />
        <Route path="/patient/missions" element={<ProtectedRoute allowedRoles={['patient']}><PatientMissions /></ProtectedRoute>} />
        <Route path="/patient/profile" element={<ProtectedRoute allowedRoles={['patient']}><PatientProfile /></ProtectedRoute>} />
        <Route path="/patient/calendar" element={<ProtectedRoute allowedRoles={['patient']}><CalendarPage /></ProtectedRoute>} />
        <Route path="/patient/messages" element={<ProtectedRoute allowedRoles={['patient']}><MessagesPage /></ProtectedRoute>} />

        {/* Professional Routes */}
        <Route path="/pro/dashboard" element={<ProtectedRoute allowedRoles={['professional']}><ProDashboard /></ProtectedRoute>} />
        <Route path="/pro/radar" element={<ProtectedRoute allowedRoles={['professional']}><MissionRadar /></ProtectedRoute>} />
        <Route path="/pro/tour" element={<ProtectedRoute allowedRoles={['professional']}><ProTour /></ProtectedRoute>} />
        <Route path="/pro/mission/:id" element={<ProtectedRoute allowedRoles={['professional']}><ProMissionDetail /></ProtectedRoute>} />
        <Route path="/pro/patient/:patientId" element={<ProtectedRoute allowedRoles={['professional']}><PatientRecord /></ProtectedRoute>} />
        <Route path="/pro/earnings" element={<ProtectedRoute allowedRoles={['professional']}><Earnings /></ProtectedRoute>} />
        <Route path="/pro/profile" element={<ProtectedRoute allowedRoles={['professional']}><ProProfile /></ProtectedRoute>} />
        <Route path="/pro/calendar" element={<ProtectedRoute allowedRoles={['professional']}><CalendarPage /></ProtectedRoute>} />
        <Route path="/pro/messages" element={<ProtectedRoute allowedRoles={['professional']}><MessagesPage /></ProtectedRoute>} />

        {/* Chat Route */}
        <Route path="/chat/:missionId" element={<ProtectedRoute allowedRoles={['patient', 'professional']}><ChatPage /></ProtectedRoute>} />

        {/* Public Pro Profile */}
        <Route path="/pro/view/:proId" element={<ProtectedRoute allowedRoles={['patient', 'professional']}><ProPublicProfile /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </ErrorBoundary>
  );
}

// ── Patient Missions List Component (Moved from App.jsx to avoid clutter) ──
function PatientMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    async function load() {
      if (user) setMissions(await missionService.getByPatient(user.id));
    }
    load();
  }, [user]);

  const filtered = tab === 'all' ? missions
    : tab === 'active' ? missions.filter(m => ['open', 'assigned', 'in_progress'].includes(m.status))
    : missions.filter(m => m.status === 'completed');

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div className="page-container">
      <h1 className="page-title">Mes demandes de soins</h1>
      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>Toutes</button>
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>En cours</button>
        <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Terminées</button>
      </div>
      <div className="mission-list">
        {filtered.map(m => (
          <div key={m.id} className="mission-card" onClick={() => navigate(`/patient/mission/${m.id}`)}>
            <div className="mission-card-header">
              <div className="mission-card-type">
                <div className="mission-card-type-icon"><ClipboardList size={18} /></div>
                {getCareLabel(m.careType)}
              </div>
              <span className={`badge badge-${m.status}`}>
                <span className="badge-dot" /> {MISSION_STATUS_LABELS[m.status]}
              </span>
            </div>
            <div className="mission-card-meta">
              <div className="mission-card-meta-row">
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                  📅 {formatDate(m.scheduledDate)} · 📍 {m.address?.city}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-title">Aucune demande</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    seedDemoData();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
