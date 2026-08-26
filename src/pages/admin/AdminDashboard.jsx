// ── Redesigned Admin Dashboard (Desktop High-Fidelity App Layout) ──
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import missionService from '../../services/missionService';
import ratingService from '../../services/ratingService';
import { MISSION_STATUS_LABELS, CARE_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import { withTimeout } from '../../utils/async';
import { RatingDisplay } from '../../components/SharedComponents';
import {
  Home, Users, ClipboardList, Shield, Heart, CreditCard,
  Star, MessageSquare, Settings, Download,
  Bell, CheckCircle, Ban, Trash2, X,
  ShieldAlert, ArrowUpDown, TrendingUp, Menu, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-medilio.png';

const MISSION_BADGE_STYLES = {
  open: { background: '#EFF6FF', color: '#1D4ED8' },
  assigned: { background: '#FEF3C7', color: '#B45309' },
  in_progress: { background: '#E0E7FF', color: '#4338CA' },
  completed: { background: '#D1FAE5', color: '#065F46' },
  cancelled: { background: '#FEE2E2', color: '#B91C1C' },
};

const ROLE_LABELS = {
  patient: 'Patient',
  professional: 'Intervenant',
  establishment: 'Établissement',
  admin: 'Administrateur',
};

function toCsvCell(value) {
  const text = String(value ?? '');
  const formulaSafeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${formulaSafeText.replaceAll('"', '""')}"`;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview'); // Active sidebar tab
  const [users, setUsers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [proRatings, setProRatings] = useState({});
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [timeframe, setTimeframe] = useState('30_days');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [adminCandidateId, setAdminCandidateId] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState({ type: '', message: '' });
  const [isPromotingAdmin, setIsPromotingAdmin] = useState(false);

  // Responsiveness states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [dbUsers, dbMissions, dbRatings] = await withTimeout(Promise.all([
        authService.getAllUsers(),
        missionService.getAll(),
        ratingService.getAll(),
      ]), {
        timeout: 12_000,
        message: "Le chargement de l'administration a expiré.",
      });

      setUsers(dbUsers);
      setMissions(dbMissions);
      setRatings(dbRatings);

      const ratingsByProfessional = dbRatings.reduce((result, rating) => {
        if (!result[rating.proId]) result[rating.proId] = [];
        result[rating.proId].push(rating);
        return result;
      }, {});
      const pAverages = {};
      for (const [proId, proRatingList] of Object.entries(ratingsByProfessional)) {
        if (proRatingList.length > 0) {
          const sum = proRatingList.reduce((acc, rating) => acc + rating.score, 0);
          pAverages[proId] = {
            average: Math.round((sum / proRatingList.length) * 10) / 10,
            count: proRatingList.length,
          };
        }
      }
      setProRatings(pAverages);
    } catch (err) {
      console.error("Error loading admin dashboard stats:", err);
      setLoadError("Les données d'administration n'ont pas pu être chargées. Vérifiez la connexion puis réessayez.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const patients = users.filter(u => u.role === 'patient');
  const isAccountVerified = (account) => account.role === 'professional'
    ? Boolean(account.professionalInfo?.verified)
    : account.role === 'establishment'
      ? Boolean(account.establishmentInfo?.verified)
      : false;
  const verifiableAccounts = users.filter(account => ['professional', 'establishment'].includes(account.role));
  const verifiedAccounts = verifiableAccounts.filter(isAccountVerified);
  const pendingVerifications = verifiableAccounts.filter(account => !isAccountVerified(account));
  const adminAccounts = users.filter(account => account.role === 'admin');
  const adminCandidates = users.filter(account => account.role !== 'admin' && !account.disabled);
  const adminDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Administrateur Medilio';
  const adminInitials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'AD';
  
  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  // Calcul des métriques financières
  const completedMissions = missions.filter(m => m.status === 'completed');
  const familyExpenses = completedMissions.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0);
  const platformCommissions = familyExpenses * 0.15;
  const proRevenues = familyExpenses * 0.85;
  const activityWindowDays = timeframe === '7_days' ? 7 : 30;
  const activityBuckets = Array.from({ length: activityWindowDays }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (activityWindowDays - 1 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    return missions.filter(mission => {
      const createdAt = new Date(mission.createdAt);
      return createdAt >= day && createdAt < nextDay;
    }).length;
  });
  const maxBucket = Math.max(...activityBuckets, 1);
  const activityAxisLabels = Array.from({ length: 5 }, (_, index) => {
    const daysAgo = Math.round((activityWindowDays - 1) * (1 - index / 4));
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  });

  // Calcul des métriques d'activité
  const totalMissions = missions.length;
  const assignedMissions = missions.filter(m => m.status === 'assigned');
  const inProgressMissions = missions.filter(m => m.status === 'in_progress');
  const openMissions = missions.filter(m => m.status === 'open');
  const cancelledMissions = missions.filter(m => m.status === 'cancelled');
  const recentMissions = [...missions]
    .sort((a, b) => new Date(b.createdAt || b.scheduledDate).getTime() - new Date(a.createdAt || a.scheduledDate).getTime())
    .slice(0, 4);
  const alertCount = Number(pendingVerifications.length > 0) + Number(openMissions.length > 0);

  const completionRate = totalMissions > 0 ? ((completedMissions.length / totalMissions) * 100).toFixed(0) : 0;

  // Palmarès
  const careTypeCounts = {};
  missions.forEach(m => {
    const label = getCareLabel(m.careType);
    careTypeCounts[label] = (careTypeCounts[label] || 0) + 1;
  });
  const topCareTypes = Object.entries(careTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const cityCounts = {};
  missions.forEach(m => {
    if (m.address?.city) {
      cityCounts[m.address.city] = (cityCounts[m.address.city] || 0) + 1;
    }
  });
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const proCounts = {};
  missions.forEach(m => {
    if (m.assignedProId) {
      proCounts[m.assignedProId] = (proCounts[m.assignedProId] || 0) + 1;
    }
  });
  const topPros = Object.entries(proCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([proId, count]) => {
    const pro = users.find(u => u.id === proId);
    return { name: pro ? `${pro.firstName} ${pro.lastName}` : 'Inconnu', count };
  });

  const handleToggleUser = async (userId) => {
    if (window.confirm("Modifier le statut d'activation de cet utilisateur ?")) {
      try {
        setLoadError('');
        await authService.toggleUserStatus(userId);
        setUsers(await authService.getAllUsers());
      } catch (err) {
        console.error('Error updating user status:', err);
        setLoadError("Le statut de l'utilisateur n'a pas pu être modifié.");
      }
    }
  };

  const handleDeleteMission = async (missionId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette mission ?")) {
      try {
        setLoadError('');
        await missionService.delete(missionId);
        setMissions(await missionService.getAll());
      } catch (err) {
        console.error('Error deleting mission:', err);
        setLoadError("La mission n'a pas pu être supprimée.");
      }
    }
  };

  const handleToggleVerification = async (userId) => {
    try {
      setLoadError('');
      const account = users.find(item => item.id === userId);
      if (account && ['professional', 'establishment'].includes(account.role)) {
        await authService.toggleVerification(userId);
        setUsers(await authService.getAllUsers());
      }
    } catch (err) {
      console.error('Error updating verification status:', err);
      setLoadError("Le statut de vérification n'a pas pu être modifié.");
    } finally {
      setShowVerifyModal(null);
    }
  };

  const handlePromoteAdmin = async () => {
    const candidate = adminCandidates.find(account => account.id === adminCandidateId);
    if (!candidate) {
      setAdminActionStatus({ type: 'error', message: 'Sélectionnez un compte actif.' });
      return;
    }

    const candidateName = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || candidate.email;
    if (!window.confirm(`Accorder les droits administrateur à ${candidateName} ? Ce compte deviendra uniquement administrateur.`)) {
      return;
    }

    setIsPromotingAdmin(true);
    setAdminActionStatus({ type: '', message: '' });
    try {
      await authService.promoteToAdmin(candidate.id);
      setUsers(await authService.getAllUsers());
      setAdminCandidateId('');
      setAdminActionStatus({ type: 'success', message: `${candidateName} est maintenant administrateur.` });
    } catch (err) {
      console.error('Error promoting administrator:', err);
      setAdminActionStatus({ type: 'error', message: err.message || "Les droits administrateur n'ont pas pu être accordés." });
    } finally {
      setIsPromotingAdmin(false);
    }
  };

  // CSV Export
  const exportCSV = (type) => {
    let csv = '';
    let filename;

    if (type === 'users') {
      csv = 'Prénom,Nom,Email,Rôle,Téléphone,Ville,Inscrit le,Vérifié\n';
      users.forEach(u => {
        csv += [
          u.firstName,
          u.lastName,
          u.email,
          ROLE_LABELS[u.role] || u.role,
          u.phone,
          u.address?.city,
          formatDate(u.createdAt),
          ['professional', 'establishment'].includes(u.role) && isAccountVerified(u) ? 'Oui' : 'Non',
        ].map(toCsvCell).join(',') + '\n';
      });
      filename = 'medilio_utilisateurs.csv';
    } else {
      csv = 'Type,Ville,Date,Heure,Patient,Statut,Candidatures,Coût,Créée le\n';
      missions.forEach(m => {
        csv += [
          getCareLabel(m.careType),
          m.address?.city,
          m.scheduledDate,
          m.scheduledTime,
          m.patientInfo?.name,
          MISSION_STATUS_LABELS[m.status] || m.status,
          m.applicants?.length || 0,
          `${m.estimatedCost || 0} €`,
          formatDate(m.createdAt),
        ].map(toCsvCell).join(',') + '\n';
      });
      filename = 'medilio_missions.csv';
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    if (sortConfig.key === 'name') {
      valA = `${a.firstName} ${a.lastName}`.toLowerCase();
      valB = `${b.firstName} ${b.lastName}`.toLowerCase();
    } else if (sortConfig.key === 'role') {
      valA = a.role; valB = b.role;
    } else if (sortConfig.key === 'status') {
      valA = a.disabled ? 2 : (a.role === 'professional' && a.professionalInfo?.verified ? 0 : 1);
      valB = b.disabled ? 2 : (b.role === 'professional' && b.professionalInfo?.verified ? 0 : 1);
    }
    
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#F8FAFC',
      display: 'flex',
      fontFamily: '"Inter", sans-serif',
      color: '#0F172A',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      
      {/* ── Sidebar Backdrop Drawer for Mobile ── */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100000,
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      {/* ── Left Sidebar Navigation ── */}
      <aside style={{
        width: '260px',
        background: 'white',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        height: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
        // Mobile-responsive override positioning
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? '0' : '-260px') : '0',
        top: 0,
        bottom: 0,
        zIndex: isMobile ? 100001 : 1,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(15,23,42,0.15)' : 'none'
      }}>
        {/* Top Branding Header */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingLeft: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={logo} alt="Medilio" style={{ height: '32px', width: 'auto' }} />
              <span style={{ fontWeight: 800, fontSize: '20px', color: '#1E293B', letterSpacing: '-0.03em' }}>Medilio</span>
            </div>
            {isMobile && (
              <button 
                type="button"
                aria-label="Fermer le menu d'administration"
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'overview', label: "Vue d'ensemble", icon: <Home size={18} /> },
              { id: 'users', label: "Utilisateurs", icon: <Users size={18} /> },
              { id: 'verification', label: "Vérifications", icon: <Shield size={18} /> },
              { id: 'missions', label: "Missions", icon: <ClipboardList size={18} /> },
              { id: 'patients', label: "Patients", icon: <Heart size={18} /> },
              { id: 'billing', label: "Facturation", icon: <CreditCard size={18} /> },
              { id: 'reviews', label: "Avis & Notes", icon: <Star size={18} /> },
              { id: 'messages', label: "Messages", icon: <MessageSquare size={18} /> },
              { id: 'settings', label: "Paramètres", icon: <Settings size={18} /> },
            ].map(item => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: active ? '#EFF6FF' : 'transparent',
                    color: active ? '#2563EB' : '#64748B',
                    fontWeight: active ? 700 : 500,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onMouseEnter={e => !active && (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: active ? '#2563EB' : '#94A3B8' }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Access scope reminder */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #F1F5F9'
        }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Accès administrateur</h4>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
            Les actions sensibles sont réservées aux comptes disposant du rôle administrateur.
          </p>
        </div>
      </aside>

      {/* ── Main Panel (Right View) ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        {/* Top Desktop Admin Header */}
        <header style={{
          background: 'white',
          borderBottom: '1px solid #E2E8F0',
          padding: isMobile ? '12px 16px' : '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button 
                type="button"
                aria-label="Ouvrir le menu d'administration"
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                }}
              >
                <Menu size={22} />
              </button>
            )}
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', margin: 0 }}>Medilio Admin Console</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' }}>
            {/* Notification Bell */}
            <button
              type="button"
              aria-label={alertCount > 0 ? `${alertCount} catégories d'alertes à traiter` : 'Aucune alerte à traiter'}
              onClick={() => setTab(pendingVerifications.length > 0 ? 'verification' : openMissions.length > 0 ? 'missions' : 'overview')}
              style={{ position: 'relative', cursor: 'pointer', color: '#64748B', background: 'none', border: 0, padding: '4px', display: 'flex' }}
            >
              <Bell size={20} />
              {alertCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#EF4444',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 800,
                  borderRadius: '50%',
                  minWidth: '14px',
                  height: '14px',
                  padding: '0 2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white'
                }}>
                  {alertCount}
                </span>
              )}
            </button>

            {/* Profile Avatar / Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#2563EB',
                color: 'white',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(37,99,235,0.1)'
              }}>
                {adminInitials}
              </div>
              {!isMobile && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{adminDisplayName}</div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>Administrateur</div>
                </div>
              )}
            </div>

            {/* Logout shortcut */}
            <button 
              type="button"
              aria-label="Se déconnecter"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444',
                fontSize: '11px', fontWeight: 700, padding: isMobile ? '6px 8px' : '6px 12px', borderRadius: '8px', cursor: 'pointer'
              }}
            >
              {!isMobile ? 'Déconnexion' : <LogOut size={14} />}
            </button>
          </div>
        </header>

        {/* Dashboard Main Scrollable Body */}
        <div style={{ padding: isMobile ? '16px' : '32px', boxSizing: 'border-box' }}>
          {isLoading ? (
            <div role="status" aria-live="polite" style={{
              minHeight: '240px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#64748B',
            }}>
              <div className="spinner" />
              <span>Chargement des données d'administration…</span>
            </div>
          ) : (
            <>
              {loadError && (
                <div role="alert" style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '20px',
                  padding: '14px 16px',
                  border: '1px solid #FCA5A5',
                  borderRadius: '12px',
                  background: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  <span>{loadError}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={loadData}>Réessayer</button>
                </div>
              )}
          
          {/* ── 1. VUE D'ENSEMBLE (HIGH FIDELITY) ── */}
          {tab === 'overview' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header Title & Button */}
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                gap: '12px', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center' 
              }}>
                <div>
                  <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Administration 🛡️
                  </h1>
                  <p style={{ margin: 0, color: '#64748B', fontSize: '13px', fontWeight: 500 }}>
                    Bienvenue sur la plateforme Medilio.
                  </p>
                </div>
                <button 
                  onClick={() => exportCSV('missions')}
                  style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    color: '#1E293B',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <Download size={15} /> Exporter le rapport
                </button>
              </div>

              {/* Stats Cards Row (4 Columns / 2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: "Utilisateurs", value: users.length.toString(), icon: <Users size={18} />, iconBg: '#EFF6FF', iconCol: '#2563EB' },
                  { label: "Missions", value: totalMissions.toString(), icon: <ClipboardList size={18} />, iconBg: '#EEF2F6', iconCol: '#475569' },
                  { label: "Comptes vérifiés", value: verifiedAccounts.length.toString(), icon: <CheckCircle size={18} />, iconBg: '#ECFDF5', iconCol: '#10B981' },
                  { label: "Valeur estimée", value: `${familyExpenses.toLocaleString('fr-FR')} €`, icon: <TrendingUp size={18} />, iconBg: '#FFFBEB', iconCol: '#F59E0B' },
                ].map((stat, idx) => (
                  <div key={idx} style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: stat.iconBg, color: stat.iconCol,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {stat.icon}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 2px 0' }}>{stat.value}</div>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>{stat.label}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Données actuellement enregistrées</div>
                  </div>
                ))}
              </div>

              {/* Plattform Activity Chart Row */}
              <div style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Activité de la plateforme</h3>
                  <select 
                    value={timeframe} 
                    onChange={e => setTimeframe(e.target.value)}
                    style={{
                      background: 'white', border: '1px solid #E2E8F0', padding: '6px 12px',
                      borderRadius: '8px', fontSize: '12px', color: '#1E293B', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <option value="30_days">30 derniers jours</option>
                    <option value="7_days">7 derniers jours</option>
                  </select>
                </div>

                {/* Substats Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                  {[
                    { label: "Utilisateurs enregistrés", value: users.length.toString() },
                    { label: "Missions enregistrées", value: totalMissions.toString() },
                    { label: "Missions terminées", value: completedMissions.length.toString() },
                    { label: "Commission théorique (15%)", value: `${platformCommissions.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €`, col: '#F59E0B' },
                  ].map((sub, i) => (
                    <div key={i}>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{sub.label}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{sub.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div aria-label="Missions créées par jour" style={{ height: '180px', width: '100%', marginTop: '10px' }}>
                  <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: activityWindowDays === 7 ? '12px' : '4px', borderBottom: '1px solid #E2E8F0' }}>
                    {activityBuckets.map((count, index) => (
                      <div
                        key={index}
                        title={`${count} mission${count > 1 ? 's' : ''}`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: `${Math.max(4, (count / maxBucket) * 100)}%`,
                          background: count > 0 ? '#2563EB' : '#DBEAFE',
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '10px', fontWeight: 600, marginTop: '8px' }}>
                    {activityAxisLabels.map(label => <span key={label}>{label}</span>)}
                  </div>
                </div>
              </div>

              {/* Row 4: Recent Users (Left) & Missions Breakdown (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                
                {/* Utilisateurs récents */}
                <div style={{
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Utilisateurs récents</h3>
                    <button onClick={() => setTab('users')} style={{ color: '#2563EB', background: 'none', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Voir tout</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {users.slice(0, 5).map((usr, i) => {
                      const roleStyle = {
                        admin: { background: '#FEF3C7', color: '#B45309' },
                        professional: { background: '#ECFDF5', color: '#10B981' },
                        establishment: { background: '#F3E8FF', color: '#7E22CE' },
                        patient: { background: '#EFF6FF', color: '#3B82F6' },
                      }[usr.role] || { background: '#F1F5F9', color: '#475569' };
                      const roleLabel = ROLE_LABELS[usr.role] || usr.role;
                      return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: roleStyle.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                            {usr.firstName?.[0]}{usr.lastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{usr.firstName} {usr.lastName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{usr.email}</div>
                          </div>
                        </div>
                        <span style={{
                          background: roleStyle.background, color: roleStyle.color, fontSize: '10px',
                          fontWeight: 700, padding: '3px 8px', borderRadius: '6px'
                        }}>
                          {roleLabel}
                        </span>
                      </div>
                    )})}
                  </div>
                </div>

                {/* Répartition des missions (Donut) */}
                <div style={{
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Répartition des missions</h3>
                  
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: 'center', justifyContent: 'space-around', height: '100%' }}>
                    {/* Donut SVG */}
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                      <svg width="100%" height="100%" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="3.5" />
                        
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3B82F6" strokeWidth="3.5"
                          strokeDasharray={`${completionRate} ${100 - completionRate}`} strokeDashoffset="25" />
                      </svg>
                      {/* Text in middle */}
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{totalMissions}</div>
                        <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Total</div>
                      </div>
                    </div>

                    {/* Legends right */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: "Terminées", count: completedMissions.length, pct: `${completionRate}%`, col: '#3B82F6' },
                        { label: "En cours", count: inProgressMissions.length, pct: `${totalMissions ? ((inProgressMissions.length / totalMissions) * 100).toFixed(0) : 0}%`, col: '#10B981' },
                        { label: "Affectées", count: assignedMissions.length, pct: `${totalMissions ? ((assignedMissions.length / totalMissions) * 100).toFixed(0) : 0}%`, col: '#F59E0B' },
                        { label: "Ouvertes", count: openMissions.length, pct: `${totalMissions ? ((openMissions.length / totalMissions) * 100).toFixed(0) : 0}%`, col: '#64748B' },
                        { label: "Annulées", count: cancelledMissions.length, pct: `${totalMissions ? ((cancelledMissions.length / totalMissions) * 100).toFixed(0) : 0}%`, col: '#8B5CF6' },
                      ].map((lg, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: lg.col }} />
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, width: '70px' }}>{lg.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{lg.pct} <span style={{ fontWeight: 500, color: '#94A3B8' }}>({lg.count})</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 5: Last Missions (Left) & Alerts (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                
                {/* Dernières missions */}
                <div style={{
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Dernières missions</h3>
                    <button onClick={() => setTab('missions')} style={{ color: '#2563EB', background: 'none', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Voir tout</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentMissions.length === 0 ? (
                      <p style={{ margin: 0, color: '#64748B', fontSize: '12px' }}>Aucune mission enregistrée.</p>
                    ) : recentMissions.map((mission, index) => {
                      const badgeStyle = MISSION_BADGE_STYLES[mission.status] || MISSION_BADGE_STYLES.open;
                      return (
                      <div key={mission.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: index < recentMissions.length - 1 ? '1px solid #F1F5F9' : 'none', paddingBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{getCareLabel(mission.careType)}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {mission.address?.city || 'Ville non renseignée'} · {formatDate(mission.scheduledDate || mission.createdAt)}
                          </div>
                        </div>
                        <span style={{
                          background: badgeStyle.background, color: badgeStyle.color, fontSize: '10px',
                          fontWeight: 700, padding: '4px 10px', borderRadius: '20px'
                        }}>
                          {MISSION_STATUS_LABELS[mission.status] || mission.status}
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alertes & notifications */}
                <div style={{
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Alertes à traiter</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alertCount === 0 ? (
                      <div style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', background: '#ECFDF5' }}>
                        <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>Aucune alerte en attente</div>
                          <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>Les vérifications et missions ouvertes sont à jour.</div>
                        </div>
                      </div>
                    ) : [
                      pendingVerifications.length > 0 && { id: 'verification', title: `${pendingVerifications.length} compte${pendingVerifications.length > 1 ? 's' : ''} à vérifier`, desc: "Contrôler les informations avant d'accorder le badge de confiance.", icon: <Shield size={16} />, bg: '#FEF2F2', col: '#EF4444' },
                      openMissions.length > 0 && { id: 'missions', title: `${openMissions.length} mission${openMissions.length > 1 ? 's' : ''} ouverte${openMissions.length > 1 ? 's' : ''}`, desc: "Consulter les demandes qui n'ont pas encore été attribuées.", icon: <ShieldAlert size={16} />, bg: '#FFF7ED', col: '#EA580C' },
                    ].filter(Boolean).map(alert => (
                      <button key={alert.id} type="button" onClick={() => setTab(alert.id)} style={{ display: 'flex', gap: '12px', padding: '10px', borderRadius: '12px', background: alert.bg, border: 0, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: alert.col, flexShrink: 0
                        }}>
                          {alert.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{alert.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{alert.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Row 6: Revenue Analytics Wave Block */}
              <div style={{
                background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '24px'
              }}>
                {/* Left Side Info */}
                <div style={{ width: isMobile ? '100%' : '220px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Valeur indicative des missions</h3>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>{familyExpenses.toLocaleString('fr-FR')} €</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '12px' }}>Somme des tarifs estimés, sans encaissement</div>
                </div>

                {/* Middle Bar Chart Wave */}
                <div style={{ flex: 1, height: '90px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  {activityBuckets.map((count, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${Math.max(4, (count / maxBucket) * 100)}%`,
                      background: '#3B82F6',
                      borderRadius: '2px 2px 0 0',
                      transition: 'all 0.3s'
                    }} />
                  ))}
                </div>

                {/* Right Side Breakdown */}
                <div style={{ width: isMobile ? '100%' : '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: isMobile ? 'none' : '1px solid #F1F5F9', borderTop: isMobile ? '1px solid #F1F5F9' : 'none', paddingLeft: isMobile ? 0 : '24px', paddingTop: isMobile ? '16px' : 0 }}>
                  {[
                    { label: "Part théorique intervenants (85%)", val: `${proRevenues.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €`, col: '#10B981' },
                    { label: "Commission théorique (15%)", val: `${platformCommissions.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €`, col: '#3B82F6' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.col }} />
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 7: Tops */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Soins les plus demandés</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topCareTypes.length === 0 && <div style={{ fontSize: '12px', color: '#64748B' }}>Aucune donnée</div>}
                    {topCareTypes.map(([type, count], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{type}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', padding: '2px 8px', borderRadius: '12px' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Zones les plus actives</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topCities.length === 0 && <div style={{ fontSize: '12px', color: '#64748B' }}>Aucune donnée</div>}
                    {topCities.map(([city, count], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{city}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '12px' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Intervenants très sollicités</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topPros.length === 0 && <div style={{ fontSize: '12px', color: '#64748B' }}>Aucune donnée</div>}
                    {topPros.map((pro, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pro.name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '2px 8px', borderRadius: '12px' }}>{pro.count} mis.</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── 2. UTILISATEURS TAB ── */}
          {tab === 'users' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Gestion des Utilisateurs</h1>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('users')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Download size={14} /> Exporter la liste (CSV)
                </button>
              </div>

              <div className="table-responsive" style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #F1F5F9', color: '#64748B', fontSize: '12px' }}>
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', padding: '12px' }}>Nom <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} /></th>
                      <th onClick={() => handleSort('role')} style={{ cursor: 'pointer', padding: '12px' }}>Rôle <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} /></th>
                      <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', padding: '12px' }}>Email</th>
                      <th style={{ padding: '12px' }}>Note</th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', padding: '12px' }}>Statut</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Aucun utilisateur enregistré.</td></tr>
                    ) : sortedUsers.map(u => {
                      const proR = u.role === 'professional' ? proRatings[u.id] : null;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px'
                              }}>
                                {u.firstName?.[0]}{u.lastName?.[0]}
                              </div>
                              <span style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              background: u.role === 'professional' ? '#DCFCE7' : u.role === 'admin' ? '#FEF3C7' : '#EFF6FF',
                              color: u.role === 'professional' ? '#15803D' : u.role === 'admin' ? '#B45309' : '#1D4ED8',
                              padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700
                            }}>
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>{u.email}</td>
                          <td style={{ padding: '12px' }}>{proR && proR.count > 0 ? <RatingDisplay average={proR.average} count={proR.count} size={12} /> : '—'}</td>
                          <td style={{ padding: '12px' }}>
                            {u.disabled ? (
                              <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '12px' }}>Désactivé</span>
                            ) : ['professional', 'establishment'].includes(u.role) && isAccountVerified(u) ? (
                              <span style={{ color: '#10B981', fontWeight: 700, fontSize: '12px' }}>✓ Vérifié</span>
                            ) : (
                              <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: '12px' }}>Actif</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {['professional', 'establishment'].includes(u.role) && (
                                <button className="btn btn-ghost btn-sm" title="Vérifier" onClick={() => setShowVerifyModal(u)}>
                                  <Shield size={14} />
                                </button>
                              )}
                              {u.role !== 'admin' && (
                                <button className="btn btn-ghost btn-sm" title="Désactiver/Activer" onClick={() => handleToggleUser(u.id)}>
                                  <Ban size={14} style={{ color: u.disabled ? '#10B981' : '#EF4444' }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 3. ACCOUNT VERIFICATION TAB ── */}
          {tab === 'verification' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Vérification des comptes professionnels</h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Contrôlez les informations des intervenants et établissements avant d'accorder le badge de confiance.</p>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>En attente de validation</h3>
                {pendingVerifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <CheckCircle size={32} style={{ color: '#10B981', marginBottom: '8px' }} />
                    <p style={{ fontWeight: 600, color: '#1E293B' }}>Tous les dossiers sont validés !</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pendingVerifications.map(account => (
                      <div key={account.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700 }}>
                            {account.establishmentInfo?.name || `${account.firstName} ${account.lastName}`}
                          </h4>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{account.email} · {account.phone || 'Téléphone non renseigné'}</div>
                          <div style={{ fontSize: '12px', color: '#1E293B', marginTop: '6px' }}>
                            {account.role === 'establishment'
                              ? `${account.establishmentInfo?.type || 'Établissement'} · FINESS ${account.establishmentInfo?.finessNumber || 'non renseigné'}`
                              : `Zone : ${account.professionalInfo?.serviceArea?.city || 'non renseignée'} · Rayon ${account.professionalInfo?.serviceArea?.radius || 0} km`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleToggleVerification(account.id)} style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                            Valider le profil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 4. MISSIONS TAB ── */}
          {tab === 'missions' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Toutes les Demandes de Soins</h1>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('missions')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Download size={14} /> Exporter les missions (CSV)
                </button>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', textAlign: 'left', color: '#64748B', fontSize: '12px' }}>
                      <th style={{ padding: '12px' }}>Soin / Patient</th>
                      <th style={{ padding: '12px' }}>Ville</th>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Candidatures</th>
                      <th style={{ padding: '12px' }}>Statut</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missions.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Aucune mission enregistrée.</td></tr>
                    ) : missions.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{getCareLabel(m.careType)}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{m.patientInfo?.name}</div>
                        </td>
                        <td style={{ padding: '12px' }}>{m.address?.city}</td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>{formatDate(m.scheduledDate)}</td>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{m.applicants?.length || 0}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            background: m.status === 'completed' ? '#D1FAE5' : m.status === 'open' ? '#EFF6FF' : '#FEF3C7',
                            color: m.status === 'completed' ? '#065F46' : m.status === 'open' ? '#1D4ED8' : '#D97706',
                            padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700
                          }}>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteMission(m.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 5. PATIENTS TAB ── */}
          {tab === 'patients' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Liste des Patients</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', textAlign: 'left', color: '#64748B', fontSize: '12px' }}>
                      <th style={{ padding: '12px' }}>Patient</th>
                      <th style={{ padding: '12px' }}>Email</th>
                      <th style={{ padding: '12px' }}>Téléphone</th>
                      <th style={{ padding: '12px' }}>Ville</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Aucun patient enregistré.</td></tr>
                    ) : patients.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{p.firstName} {p.lastName}</td>
                        <td style={{ padding: '12px', color: '#64748B' }}>{p.email}</td>
                        <td style={{ padding: '12px' }}>{p.phone || '—'}</td>
                        <td style={{ padding: '12px' }}>{p.address?.city || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 6. BILLING TAB (FACTURATION) ── */}
          {tab === 'billing' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Facturation</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Aucun prestataire de paiement connecté</h3>
                <p style={{ color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                  Les montants affichés ailleurs sont des estimations déclaratives. Aucune transaction, commission ou facture n’est générée par Medilio.
                </p>
              </div>
            </div>
          )}

          {/* ── 7. REVIEWS TAB (AVIS) ── */}
          {tab === 'reviews' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Modération des Avis & Notes</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Retours d'expérience patients</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {ratings.length === 0 ? (
                    <p style={{ margin: 0, color: '#64748B', fontSize: '12px' }}>Aucun avis enregistré.</p>
                  ) : ratings.map(r => (
                    <div key={r.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>Note : {r.score}/5</div>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>{formatDate(r.createdAt)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 8. MESSAGES TAB ── */}
          {tab === 'messages' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Messagerie d'administration</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', textAlign: 'center' }}>
                <MessageSquare size={36} style={{ color: '#3B82F6', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>Fonction non activée pour le pilote</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                  Les échanges restent accessibles uniquement à leurs participants. Aucun accès global aux conversations n'est ouvert à l'administrateur.
                </p>
              </div>
            </div>
          )}

          {/* ── 9. SETTINGS TAB ── */}
          {tab === 'settings' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Paramètres d'administration</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Sécurité et accès</h3>
                <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px' }}>
                  Medilio dispose d'un seul niveau administrateur. Les comptes, vérifications et désactivations se gèrent depuis les écrans dédiés.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTab('users')}>Gérer les utilisateurs</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTab('verification')}>Gérer les vérifications</button>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0' }}>Administrateurs ({adminAccounts.length})</h3>
                <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  Pour ajouter un administrateur, la personne doit d'abord créer un compte Medilio. La promotion remplace son rôle actuel et lui donne accès uniquement à l'administration.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {adminAccounts.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Aucun administrateur enregistré.</div>
                  ) : adminAccounts.map(account => (
                    <div key={account.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', fontSize: '12px' }}>
                      <span style={{ fontWeight: 700 }}>{[account.firstName, account.lastName].filter(Boolean).join(' ') || 'Administrateur'}</span>
                      <span style={{ color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.email}</span>
                    </div>
                  ))}
                </div>

                <label htmlFor="admin-candidate" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Promouvoir un compte actif
                </label>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                  <select
                    id="admin-candidate"
                    value={adminCandidateId}
                    onChange={event => {
                      setAdminCandidateId(event.target.value);
                      setAdminActionStatus({ type: '', message: '' });
                    }}
                    disabled={adminCandidates.length === 0 || isPromotingAdmin}
                    style={{ flex: 1, minHeight: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', background: 'white', color: '#0F172A' }}
                  >
                    <option value="">{adminCandidates.length === 0 ? 'Aucun compte actif disponible' : 'Sélectionner un utilisateur'}</option>
                    {adminCandidates.map(account => (
                      <option key={account.id} value={account.id}>
                        {[account.firstName, account.lastName].filter(Boolean).join(' ') || account.email} — {ROLE_LABELS[account.role] || account.role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handlePromoteAdmin}
                    disabled={!adminCandidateId || isPromotingAdmin}
                    style={{ minHeight: '40px' }}
                  >
                    <Shield size={14} /> {isPromotingAdmin ? 'Ajout en cours…' : 'Ajouter comme administrateur'}
                  </button>
                </div>

                {adminActionStatus.message && (
                  <div role="status" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: adminActionStatus.type === 'success' ? '#166534' : '#B91C1C', background: adminActionStatus.type === 'success' ? '#DCFCE7' : '#FEE2E2' }}>
                    {adminActionStatus.message}
                  </div>
                )}
              </div>
            </div>
          )}

            </>
          )}

        </div>
      </main>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(null)} style={{ zIndex: 100000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Vérifier le compte professionnel</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowVerifyModal(null)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', background: '#2563EB', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px'
              }}>{showVerifyModal.firstName?.[0]}{showVerifyModal.lastName?.[0]}</div>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {showVerifyModal.establishmentInfo?.name || `${showVerifyModal.firstName} ${showVerifyModal.lastName}`}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {showVerifyModal.role === 'establishment'
                    ? showVerifyModal.establishmentInfo?.type || 'Établissement'
                    : showVerifyModal.professionalInfo?.specialties?.join(', ') || 'Intervenant'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowVerifyModal(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#2563EB', color: 'white' }}
                onClick={() => handleToggleVerification(showVerifyModal.id)}>
                <Shield size={16} /> {isAccountVerified(showVerifyModal) ? 'Retirer la validation' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
