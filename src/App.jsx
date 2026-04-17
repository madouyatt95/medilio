// ── App.jsx — Main Router ──
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { useEffect, useState } from 'react';
import { seedDemoData } from './utils/demoData';
import {
  Activity, Home, ClipboardList, User, Radar as RadarIcon,
  TrendingUp, Bell, X, Shield, LogOut, Calendar as CalendarIcon, MessageCircle
} from 'lucide-react';
import { formatRelative, formatDate } from './utils/dateUtils';
import { CARE_TYPES, MISSION_STATUS_LABELS } from './utils/constants';
import missionService from './services/missionService';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import CreateMission from './pages/patient/CreateMission';
import PatientMissionDetail from './pages/patient/MissionDetail';
import PatientProfile from './pages/patient/PatientProfile';
import ProDashboard from './pages/professional/ProDashboard';
import MissionRadar from './pages/professional/MissionRadar';
import ProMissionDetail from './pages/professional/ProMissionDetail';
import Earnings from './pages/professional/Earnings';
import ProProfile from './pages/professional/ProProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import ChatPage from './pages/ChatPage';
import CalendarPage from './pages/CalendarPage';

// Seed demo data on first load
seedDemoData();

// ── Protected Route ──
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'professional') return <Navigate to="/pro/dashboard" replace />;
    return <Navigate to="/patient/dashboard" replace />;
  }
  return children;
}

// ── Header Component ──
function Header() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const location = useLocation();

  // Don't show header on landing, login, register
  const hiddenPaths = ['/', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.includes('create-mission')) return null;

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon"><Activity size={20} /></div>
          Medilio
        </div>
        <div className="header-actions">
          <button className="header-notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="header-notif-badge">{unreadCount}</span>}
          </button>
          <div className="avatar avatar-sm" style={{ cursor: 'pointer' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
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
                onClick={() => markAsRead(n.id)}>
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

  const hiddenPaths = ['/', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.includes('create-mission')) return null;
  if (user?.role === 'admin') return null;

  const isActive = (path) => location.pathname.startsWith(path);

  if (user?.role === 'patient') {
    return (
      <nav className="bottom-nav">
        <Link to="/patient/dashboard" className={`bottom-nav-item ${isActive('/patient/dashboard') ? 'active' : ''}`}>
          <Home size={20} className="bottom-nav-icon" />
          <span>Accueil</span>
        </Link>
        <Link to="/patient/missions" className={`bottom-nav-item ${isActive('/patient/missions') ? 'active' : ''}`}>
          <ClipboardList size={20} className="bottom-nav-icon" />
          <span>Missions</span>
        </Link>
        <Link to="/patient/calendar" className={`bottom-nav-item ${isActive('/patient/calendar') ? 'active' : ''}`}>
          <CalendarIcon size={20} className="bottom-nav-icon" />
          <span>Calendrier</span>
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
        <Link to="/pro/earnings" className={`bottom-nav-item ${isActive('/pro/earnings') ? 'active' : ''}`}>
          <TrendingUp size={20} className="bottom-nav-icon" />
          <span>Revenus</span>
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

// ── Patient Missions List Page ──
function PatientMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    if (user) setMissions(missionService.getByPatient(user.id));
  }, [user]);

  const filtered = tab === 'all' ? missions
    : tab === 'active' ? missions.filter(m => ['open', 'assigned', 'in_progress'].includes(m.status))
    : missions.filter(m => m.status === 'completed');

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div className="page-container">
      <h1 className="page-title">Mes missions</h1>
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
            <div className="empty-state-title">Aucune mission</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──
function AppContent() {
  return (
    <>
      <Header />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Patient Routes */}
        <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/create-mission" element={<ProtectedRoute allowedRoles={['patient']}><CreateMission /></ProtectedRoute>} />
        <Route path="/patient/mission/:id" element={<ProtectedRoute allowedRoles={['patient']}><PatientMissionDetail /></ProtectedRoute>} />
        <Route path="/patient/missions" element={<ProtectedRoute allowedRoles={['patient']}><PatientMissions /></ProtectedRoute>} />
        <Route path="/patient/profile" element={<ProtectedRoute allowedRoles={['patient']}><PatientProfile /></ProtectedRoute>} />
        <Route path="/patient/calendar" element={<ProtectedRoute allowedRoles={['patient']}><CalendarPage /></ProtectedRoute>} />

        {/* Professional Routes */}
        <Route path="/pro/dashboard" element={<ProtectedRoute allowedRoles={['professional']}><ProDashboard /></ProtectedRoute>} />
        <Route path="/pro/radar" element={<ProtectedRoute allowedRoles={['professional']}><MissionRadar /></ProtectedRoute>} />
        <Route path="/pro/mission/:id" element={<ProtectedRoute allowedRoles={['professional']}><ProMissionDetail /></ProtectedRoute>} />
        <Route path="/pro/earnings" element={<ProtectedRoute allowedRoles={['professional']}><Earnings /></ProtectedRoute>} />
        <Route path="/pro/profile" element={<ProtectedRoute allowedRoles={['professional']}><ProProfile /></ProtectedRoute>} />
        <Route path="/pro/calendar" element={<ProtectedRoute allowedRoles={['professional']}><CalendarPage /></ProtectedRoute>} />

        {/* Chat Route */}
        <Route path="/chat/:missionId" element={<ProtectedRoute allowedRoles={['patient', 'professional']}><ChatPage /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
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
