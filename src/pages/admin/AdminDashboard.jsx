// ── Redesigned Admin Dashboard (Desktop High-Fidelity App Layout) ──
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import missionService from '../../services/missionService';
import ratingService from '../../services/ratingService';
import { MISSION_STATUS_LABELS, CARE_TYPES } from '../../utils/constants';
import { formatDate, formatRelative } from '../../utils/dateUtils';
import { RatingDisplay } from '../../components/SharedComponents';
import {
  Home, Users, ClipboardList, Shield, Heart, CreditCard,
  Star, MessageSquare, Settings, Headphones, Download,
  ChevronDown, Bell, CheckCircle, Ban, Trash2, X, Check as CheckIcon,
  ShieldAlert, ArrowUpDown, ArrowUpRight, TrendingUp, Menu, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-medilio.png';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview'); // Active sidebar tab
  const [users, setUsers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [proRatings, setProRatings] = useState({});
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [timeframe, setTimeframe] = useState('30_days');

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

  // Load real data from DB
  useEffect(() => {
    async function load() {
      try {
        const dbUsers = await authService.getAllUsers();
        const dbMissions = await missionService.getAll();
        const dbRatings = await ratingService.getAll();
        const dbProRatings = await ratingService.getAllProRatings();

        setUsers(dbUsers);
        setMissions(dbMissions);
        setRatings(dbRatings);

        const pAverages = {};
        for (const [proId, rs] of Object.entries(dbProRatings)) {
          if (rs && rs.length > 0) {
            const sum = rs.reduce((acc, r) => acc + r.score, 0);
            pAverages[proId] = { average: Math.round((sum / rs.length) * 10) / 10, count: rs.length };
          }
        }
        setProRatings(pAverages);
      } catch (err) {
        console.error("Error loading admin dashboard stats:", err);
      }
    }
    load();
  }, []);

  const patients = users.filter(u => u.role === 'patient');
  const pros = users.filter(u => u.role === 'professional');
  const verifiedPros = pros.filter(p => p.professionalInfo?.verified);
  
  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  // Calcul des métriques financières
  const completedMissions = missions.filter(m => m.status === 'completed');
  const familyExpenses = completedMissions.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0);
  const platformCommissions = familyExpenses * 0.15;
  const proRevenues = familyExpenses * 0.85;

  // Calcul des métriques d'activité
  const totalMissions = missions.length;
  const assignedMissions = missions.filter(m => m.status === 'assigned');
  const openMissions = missions.filter(m => m.status === 'open');
  const cancelledMissions = missions.filter(m => m.status === 'cancelled');

  const assignmentRate = totalMissions > 0 ? (((assignedMissions.length + completedMissions.length) / totalMissions) * 100).toFixed(0) : 0;
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
      await authService.toggleUserStatus(userId);
      setUsers(await authService.getAllUsers());
    }
  };

  const handleDeleteMission = async (missionId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette mission ?")) {
      await missionService.delete(missionId);
      setMissions(await missionService.getAll());
    }
  };

  const handleVerifyPro = async (userId) => {
    const u = users.find(u => u.id === userId);
    if (u?.professionalInfo) {
      await authService.updateProfile(userId, {
        professionalInfo: { ...u.professionalInfo, verified: !u.professionalInfo.verified }
      });
      setUsers(await authService.getAllUsers());
    }
    setShowVerifyModal(null);
  };

  // CSV Export
  const exportCSV = (type) => {
    let csv = '';
    let filename = '';

    if (type === 'users') {
      csv = 'Prénom,Nom,Email,Rôle,Téléphone,Ville,Inscrit le,Vérifié\n';
      users.forEach(u => {
        csv += `${u.firstName},${u.lastName},${u.email},${u.role},${u.phone || ''},${u.address?.city || ''},${formatDate(u.createdAt)},${u.professionalInfo?.verified ? 'Oui' : 'Non'}\n`;
      });
      filename = 'medilio_utilisateurs.csv';
    } else {
      csv = 'Type,Ville,Date,Heure,Patient,Statut,Candidatures,Coût,Créée le\n';
      missions.forEach(m => {
        csv += `${getCareLabel(m.careType)},${m.address?.city || ''},${m.scheduledDate},${m.scheduledTime},${m.patientInfo?.name || ''},${MISSION_STATUS_LABELS[m.status]},${m.applicants?.length || 0},${m.estimatedCost || 0}€,${formatDate(m.createdAt)}\n`;
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
              { id: 'verification', label: "Intervenants", icon: <Shield size={18} /> },
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

        {/* Support Box */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #F1F5F9'
        }}>
          <div style={{ color: '#2563EB', marginBottom: '8px' }}>
            <Headphones size={20} />
          </div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Besoin d'aide ?</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
            Notre équipe support est disponible 7j/7.
          </p>
          <button style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#1E293B',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            Contacter le support
          </button>
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
            <div style={{ position: 'relative', cursor: 'pointer', color: '#64748B' }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#EF4444',
                color: 'white',
                fontSize: '9px',
                fontWeight: 800,
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white'
              }}>
                3
              </span>
            </div>

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
                AM
              </div>
              {!isMobile && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Admin Medilio</div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>Super administrateur</div>
                </div>
              )}
              {!isMobile && <ChevronDown size={14} style={{ color: '#64748B', cursor: 'pointer' }} />}
            </div>

            {/* Logout shortcut */}
            <button 
              onClick={() => { authService.logout(); navigate('/login'); }}
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
                  { label: "Utilisateurs", value: users.length.toString(), pct: "12%", icon: <Users size={18} />, iconBg: '#EFF6FF', iconCol: '#2563EB' },
                  { label: "Missions", value: totalMissions.toString(), pct: "18%", icon: <ClipboardList size={18} />, iconBg: '#EEF2F6', iconCol: '#475569' },
                  { label: "Intervenants vérifiés", value: verifiedPros.length.toString(), pct: "9%", icon: <CheckCircle size={18} />, iconBg: '#ECFDF5', iconCol: '#10B981' },
                  { label: "CA Global", value: `${familyExpenses.toLocaleString('fr-FR')} €`, pct: "21%", icon: <TrendingUp size={18} />, iconBg: '#FFFBEB', iconCol: '#F59E0B' },
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                      <span style={{ background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>↑ {stat.pct}</span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>vs mois dernier</span>
                    </div>
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
                    { label: "Nouveaux utilisateurs", value: users.length.toString(), trend: "↑ 12%" },
                    { label: "Nouvelles missions", value: totalMissions.toString(), trend: "↑ 15%" },
                    { label: "Missions terminées", value: completedMissions.length.toString(), trend: "↑ 10%" },
                    { label: "Commissions générées", value: `${platformCommissions.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €`, trend: "↑ 23%", col: '#F59E0B' },
                  ].map((sub, i) => (
                    <div key={i}>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{sub.label}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{sub.value}</span>
                        <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>{sub.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SVG Line Spline Chart Drawing */}
                <div style={{ height: '180px', width: '100%', position: 'relative', marginTop: '10px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 800 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00"/>
                      </linearGradient>
                      <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.12"/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.00"/>
                      </linearGradient>
                    </defs>
                    {/* Gridlines */}
                    <line x1="0" y1="30" x2="800" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="75" x2="800" y2="75" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="120" x2="800" y2="120" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1="160" x2="800" y2="160" stroke="#E2E8F0" strokeWidth="1" />

                    {/* Chart Paths: Blue Spline Curve (Total Volume) */}
                    <path d="M 0 100 Q 100 60, 200 80 T 400 50 T 600 70 T 800 50" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 0 100 Q 100 60, 200 80 T 400 50 T 600 70 T 800 50 L 800 160 L 0 160 Z" fill="url(#blueGrad)" />

                    {/* Emerald Spline Curve (Missions count) */}
                    <path d="M 0 130 Q 100 110, 200 120 T 400 90 T 600 110 T 800 90" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 0 130 Q 100 110, 200 120 T 400 90 T 600 110 T 800 90 L 800 160 L 0 160 Z" fill="url(#emeraldGrad)" />

                    {/* Yellow Spline Curve (Users) */}
                    <path d="M 0 150 Q 100 135, 200 145 T 400 120 T 600 140 T 800 115" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {/* Axis dates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '10px', fontWeight: 600, marginTop: '8px' }}>
                    <span>12 avr.</span>
                    <span>19 avr.</span>
                    <span>28 avr.</span>
                    <span>3 mai</span>
                    <span>10 mai</span>
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
                      const isPro = usr.role === 'professional';
                      const roleLabel = isPro ? 'Intervenant' : 'Patient';
                      const color = isPro ? '#ECFDF5' : '#EFF6FF';
                      const textCol = isPro ? '#10B981' : '#3B82F6';
                      return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: textCol, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                            {usr.firstName?.[0]}{usr.lastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{usr.firstName} {usr.lastName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{usr.email}</div>
                          </div>
                        </div>
                        <span style={{
                          background: color, color: textCol, fontSize: '10px',
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
                        
                        {/* 52% (Terminées) - Blue */}
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3B82F6" strokeWidth="3.5" 
                          strokeDasharray="52 48" strokeDashoffset="25" />
                        
                        {/* 28% (En cours) - Emerald */}
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10B981" strokeWidth="3.5" 
                          strokeDasharray="28 72" strokeDashoffset="-27" />

                        {/* 15% (Assignées) - Orange */}
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="3.5" 
                          strokeDasharray="15 85" strokeDashoffset="-55" />

                        {/* 5% (Annulées) - Purple */}
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#8B5CF6" strokeWidth="3.5" 
                          strokeDasharray="5 95" strokeDashoffset="-70" />
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
                        { label: "En cours", count: assignedMissions.length, pct: `${totalMissions ? ((assignedMissions.length / totalMissions) * 100).toFixed(0) : 0}%`, col: '#10B981' },
                        { label: "Assignées", count: openMissions.length, pct: `${totalMissions ? ((openMissions.length / totalMissions) * 100).toFixed(0) : 0}%`, col: '#F59E0B' },
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
                    {[
                      { label: "Injection / Vaccin", loc: "Paris 15e", date: "5 mai 2026", stat: "Assignée", bg: '#FEF3C7', col: '#B45309' },
                      { label: "Pansement", loc: "Lyon 3e", date: "5 mai 2026", stat: "En cours", bg: '#E0E7FF', col: '#4338CA' },
                      { label: "Surveillance post-op", loc: "Marseille 8e", date: "4 mai 2026", stat: "Terminée", bg: '#D1FAE5', col: '#065F46' },
                      { label: "Toilette à domicile", loc: "Toulouse 6e", date: "4 mai 2026", stat: "Assignée", bg: '#FEF3C7', col: '#B45309' },
                    ].map((mis, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyBreak: 'space-between', justifyContent: 'space-between', borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none', paddingBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{mis.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{mis.loc} · {mis.date}</div>
                        </div>
                        <span style={{
                          background: mis.bg, color: mis.col, fontSize: '10px',
                          fontWeight: 700, padding: '4px 10px', borderRadius: '20px'
                        }}>
                          {mis.stat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alertes & notifications */}
                <div style={{
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Alertes & notifications</h3>
                    <button style={{ color: '#2563EB', background: 'none', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Voir tout</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { title: `${pros.filter(p => !p.professionalInfo?.verified).length} intervenants en attente`, desc: "Vérifiez les documents en attente de validation.", time: "Il y a 20 min", icon: <Shield size={16} />, bg: '#FEF2F2', col: '#EF4444' },
                      { title: `${openMissions.length} missions sans réponse`, desc: "Des missions sont en attente d'un intervenant.", time: "Il y a 1 h", icon: <ShieldAlert size={16} />, bg: '#FFF7ED', col: '#EA580C' },
                      { title: "Maintenance programmée", desc: "Le système sera en maintenance le 12/05 à 02:00.", time: "Il y a 3 h", icon: <CheckCircle size={16} />, bg: '#EFF6FF', col: '#2563EB' },
                    ].map((al, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px', borderRadius: '12px', background: al.bg }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: al.col, flexShrink: 0
                        }}>
                          {al.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{al.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{al.desc}</div>
                          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', fontWeight: 600 }}>{al.time}</div>
                        </div>
                      </div>
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
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Chiffre d'Affaires Global</h3>
                    <button style={{ color: '#2563EB', background: 'none', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Voir le détail</button>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>{familyExpenses.toLocaleString('fr-FR')} €</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '12px' }}>Dépenses cumulées des familles</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10B981', fontWeight: 700, background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                    <ArrowUpRight size={12} /> +25% <span style={{ color: '#64748B', fontWeight: 500 }}>vs mois dernier</span>
                  </div>
                </div>

                {/* Middle Bar Chart Wave */}
                <div style={{ flex: 1, height: '90px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  {[12, 18, 25, 45, 15, 30, 22, 60, 40, 50, 35, 75, 42, 58, 20, 68, 48, 85, 30, 78, 52, 90, 42, 60, 80, 50, 72].map((height, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${height}%`,
                      background: '#3B82F6',
                      borderRadius: '2px 2px 0 0',
                      transition: 'all 0.3s'
                    }} />
                  ))}
                </div>

                {/* Right Side Breakdown */}
                <div style={{ width: isMobile ? '100%' : '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: isMobile ? 'none' : '1px solid #F1F5F9', borderTop: isMobile ? '1px solid #F1F5F9' : 'none', paddingLeft: isMobile ? 0 : '24px', paddingTop: isMobile ? '16px' : 0 }}>
                  {[
                    { label: "Part Intervenants (85%)", val: `${proRevenues.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €`, col: '#10B981' },
                    { label: "Commissions (15%)", val: `${platformCommissions.toLocaleString('fr-FR', {maximumFractionDigits: 0})} €`, col: '#3B82F6' },
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
                    {sortedUsers.map(u => {
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
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>{u.email}</td>
                          <td style={{ padding: '12px' }}>{proR && proR.count > 0 ? <RatingDisplay average={proR.average} count={proR.count} size={12} /> : '—'}</td>
                          <td style={{ padding: '12px' }}>
                            {u.disabled ? (
                              <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '12px' }}>Désactivé</span>
                            ) : u.role === 'professional' && u.professionalInfo?.verified ? (
                              <span style={{ color: '#10B981', fontWeight: 700, fontSize: '12px' }}>✓ Vérifié</span>
                            ) : (
                              <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: '12px' }}>Actif</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {u.role === 'professional' && (
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

          {/* ── 3. INTERVENANTS TAB (VÉRIFICATION) ── */}
          {tab === 'verification' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Demandes de vérification d'infirmiers</h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Vérifiez et validez les qualifications et pièces justificatives des intervenants.</p>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>En attente de validation</h3>
                {pros.filter(p => !p.professionalInfo?.verified).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <CheckCircle size={32} style={{ color: '#10B981', marginBottom: '8px' }} />
                    <p style={{ fontWeight: 600, color: '#1E293B' }}>Tous les dossiers sont validés !</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pros.filter(p => !p.professionalInfo?.verified).map(pro => (
                      <div key={pro.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700 }}>{pro.firstName} {pro.lastName}</h4>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{pro.email} · {pro.phone}</div>
                          <div style={{ fontSize: '12px', color: '#1E293B', marginTop: '6px' }}>
                            📍 {pro.professionalInfo?.serviceArea?.city} (Rayon {pro.professionalInfo?.serviceArea?.radius} km)
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleVerifyPro(pro.id)} style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
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
                    {missions.map(m => (
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
                    {patients.map(p => (
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
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Suivi de Facturation</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Historique des Transactions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { id: "TX-9281", pro: "Claire Moreau", user: "Sophie Martin", type: "Prise de sang", amount: "45.00 €", date: "05/05/2026" },
                    { id: "TX-4832", pro: "Lucas Dubois", user: "Julien Morel", type: "Pansement", amount: "65.00 €", date: "04/05/2026" },
                  ].map((tx, i) => (
                    <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>Transaction {tx.id}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Soignant: {tx.pro} · Patient: {tx.user} ({tx.type})
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, color: '#10B981' }}>{tx.amount}</span>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{tx.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {ratings.map(r => (
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
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Messagerie Plateforme</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', textAlign: 'center' }}>
                <MessageSquare size={36} style={{ color: '#3B82F6', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>Centre d'assistance admin</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>La messagerie est configurée pour suivre et assister les échanges soignants / patients de manière confidentielle.</p>
              </div>
            </div>
          )}

          {/* ── 9. SETTINGS TAB ── */}
          {tab === 'settings' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Paramètres d'administration</h1>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Données de démonstration</h3>
                <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px' }}>
                  Vous pouvez réinitialiser le scénario de démonstration pour recharger toutes les demandes de soins, utilisateurs et avis d'origine.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (window.confirm("Réinitialiser toutes les données vers le scénario de démonstration ?")) {
                      import('../../utils/demoData').then(m => {
                        m.resetDemoData();
                        window.location.reload();
                      });
                    }
                  }}
                  style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Réinitialiser le scénario de démo
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(null)} style={{ zIndex: 100000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Vérifier l'intervenant</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowVerifyModal(null)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', background: '#2563EB', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px'
              }}>{showVerifyModal.firstName?.[0]}{showVerifyModal.lastName?.[0]}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{showVerifyModal.firstName} {showVerifyModal.lastName}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {showVerifyModal.professionalInfo?.specialties?.join(', ')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowVerifyModal(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#2563EB', color: 'white' }}
                onClick={() => handleVerifyPro(showVerifyModal.id)}>
                <Shield size={16} /> {showVerifyModal.professionalInfo?.verified ? 'Retirer la validation' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
