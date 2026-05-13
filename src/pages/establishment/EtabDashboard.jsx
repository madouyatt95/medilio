// ── Establishment Dashboard ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
import { CARE_TYPES, MISSION_STATUS_LABELS, MISSION_STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  Building2, Plus, Users, ClipboardList, TrendingUp, Home,
  ChevronRight, Activity, Calendar, ArrowUpRight, Clock, UserPlus
} from 'lucide-react';

export default function EtabDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  const etabName = user?.establishmentInfo?.name || user?.firstName || 'Établissement';
  const etabType = user?.establishmentInfo?.type || '';

  useEffect(() => {
    loadMissions();
  }, [user]);

  async function loadMissions() {
    if (!user) return;
    setLoading(true);
    try {
      const all = await missionService.getAll();
      // Filter missions created by this establishment
      const etabMissions = all.filter(m =>
        m.createdByEstablishmentId === user.id || m.patientId === user.id
      );
      setMissions(etabMissions);
    } catch (err) {
      console.error('Failed to load missions', err);
    } finally {
      setLoading(false);
    }
  }

  const activeMissions = missions.filter(m => ['open', 'assigned', 'in_progress'].includes(m.status));
  const completedMissions = missions.filter(m => m.status === 'completed');
  const dischargeMissions = missions.filter(m => m.dischargeMode);
  const filteredMissions = tab === 'active' ? activeMissions
    : tab === 'completed' ? completedMissions
    : tab === 'discharge' ? dischargeMissions
    : missions;

  // Stats
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const missionsThisMonth = missions.filter(m => {
    const d = new Date(m.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // Care type distribution
  const careDistrib = {};
  missions.forEach(m => {
    careDistrib[m.careType] = (careDistrib[m.careType] || 0) + 1;
  });
  const topCareTypes = Object.entries(careDistrib)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '40vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary), #1e40af)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        color: 'white',
        marginBottom: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
          <Building2 size={120} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-lg)',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: 0 }}>{etabName}</h1>
              {etabType && <span style={{
                fontSize: 'var(--font-xs)', background: 'rgba(255,255,255,0.2)',
                padding: '2px 10px', borderRadius: 20, fontWeight: 600
              }}>{etabType}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 900 }}>{missions.length}</div>
              <div style={{ fontSize: 'var(--font-xs)', opacity: 0.8 }}>Total missions</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 900 }}>{activeMissions.length}</div>
              <div style={{ fontSize: 'var(--font-xs)', opacity: 0.8 }}>En cours</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 900 }}>{missionsThisMonth}</div>
              <div style={{ fontSize: 'var(--font-xs)', opacity: 0.8 }}>Ce mois</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="card" onClick={() => navigate('/etab/create-mission')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-4)', cursor: 'pointer', border: '2px dashed var(--color-primary)',
          background: 'var(--color-primary-light)', textAlign: 'center'
        }}>
          <Plus size={24} color="var(--color-primary)" />
          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>Nouvelle mission</span>
        </button>

        <button className="card" onClick={() => navigate('/etab/create-mission?mode=discharge')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-4)', cursor: 'pointer', border: '2px dashed var(--color-secondary)',
          background: 'rgba(16, 185, 129, 0.05)', textAlign: 'center'
        }}>
          <Home size={24} color="var(--color-secondary)" />
          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--color-secondary)' }}>Retour à domicile</span>
        </button>
      </div>

      {/* Care Types Stats */}
      {topCareTypes.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Activity size={16} color="var(--color-primary)" /> Types de soins demandés
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {topCareTypes.map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--font-sm)', flex: 1 }}>{getCareLabel(type)}</span>
                <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / missions.length) * 100}%`,
                    height: '100%', borderRadius: 3,
                    background: 'var(--color-primary)'
                  }} />
                </div>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 20, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missions Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          En cours ({activeMissions.length})
        </button>
        <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
          Terminées ({completedMissions.length})
        </button>
        <button className={`tab ${tab === 'discharge' ? 'active' : ''}`} onClick={() => setTab('discharge')}>
          🏠 RAD ({dischargeMissions.length})
        </button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Toutes
        </button>
      </div>

      {/* Missions List */}
      <div className="mission-list">
        {filteredMissions.map(m => (
          <div key={m.id} className="mission-card" onClick={() => navigate(`/etab/mission/${m.id}`)}>
            <div className="mission-card-header">
              <div className="mission-card-type">
                <div className="mission-card-type-icon">
                  {m.dischargeMode ? <Home size={18} /> : <ClipboardList size={18} />}
                </div>
                {getCareLabel(m.careType)}
                {m.dischargeMode && (
                  <span style={{
                    marginLeft: 'var(--space-2)', fontSize: 'var(--font-xs)',
                    background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-secondary)',
                    padding: '2px 8px', borderRadius: 12, fontWeight: 700
                  }}>RAD</span>
                )}
              </div>
              <span className={`badge badge-${m.status}`}>
                <span className="badge-dot" /> {MISSION_STATUS_LABELS[m.status]}
              </span>
            </div>
            <div className="mission-card-meta">
              <div className="mission-card-meta-row">
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                  👤 {m.patientInfo?.name || 'Patient'} · 📅 {formatDate(m.scheduledDate)} · 📍 {m.address?.city}
                </span>
              </div>
              {m.applicants?.length > 0 && (
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-primary)', fontWeight: 600, marginTop: 4 }}>
                  {m.applicants.length} candidature{m.applicants.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredMissions.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardList size={48} /></div>
            <div className="empty-state-title">Aucune mission</div>
            <div className="empty-state-desc">Créez une mission pour vos patients</div>
            <button className="btn btn-primary" onClick={() => navigate('/etab/create-mission')}>
              <Plus size={18} /> Nouvelle mission
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
