// ── Calendar Page (Patient & Pro) ── (Screenshot-faithful design)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import missionService from '../services/missionService';
import { CARE_TYPES } from '../utils/constants';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import { LoadingState, LoadErrorState } from '../components/SharedComponents';
import { withTimeout } from '../utils/async';

const MONTHS_FR = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
  '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
  '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
};

const MONTHS_FR_SHORT = {
  '01': 'MAI', '02': 'FÉV.', '03': 'MAR.', '04': 'AVR.',
  '05': 'MAI', '06': 'JUIN', '07': 'JUIL.', '08': 'AOÛT',
  '09': 'SEPT.', '10': 'OCT.', '11': 'NOV.', '12': 'DÉC.'
};

const DAYS_FR_SHORT = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [activeTab, setActiveTab] = useState('avenir'); // 'avenir' or 'passes'
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      setLoadError('');
      try {
        if (user.role === 'patient') {
          setMissions(await withTimeout(missionService.getByPatient(user.id)));
        } else if (user.role === 'professional') {
          setMissions(await withTimeout(missionService.getByProfessional(user.id)));
        } else if (user.role === 'establishment') {
          setMissions(await withTimeout(missionService.getByEstablishment(user.id)));
        }
      } catch (error) {
        setLoadError(error.message || 'Impossible de charger le calendrier.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user, reloadKey]);

  if (loading) return <LoadingState label="Chargement du calendrier…" />;
  if (loadError) {
    return (
      <LoadErrorState
        title="Calendrier indisponible"
        message={loadError}
        onBack={() => navigate(-1)}
        onRetry={() => setReloadKey(key => key + 1)}
      />
    );
  }

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  // Filter based on active segment tab
  const tabFilteredMissions = missions.filter(m => {
    if (activeTab === 'avenir') {
      return ['open', 'assigned', 'in_progress'].includes(m.status);
    } else {
      return ['completed', 'cancelled'].includes(m.status);
    }
  });

  // Sort chronologically (ascending for upcoming, descending for past)
  const sortedMissions = [...tabFilteredMissions].sort((a, b) => {
    const dateA = `${a.scheduledDate}T${a.scheduledTime || '00:00'}`;
    const dateB = `${b.scheduledDate}T${b.scheduledTime || '00:00'}`;
    return activeTab === 'avenir' 
      ? dateA.localeCompare(dateB)
      : dateB.localeCompare(dateA);
  });

  // Group missions by month-year
  const groupedMissions = sortedMissions.reduce((groups, mission) => {
    if (!mission.scheduledDate) return groups;
    const [year, month] = mission.scheduledDate.split('-');
    const groupKey = `${month}-${year}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(mission);
    return groups;
  }, {});

  const hasItems = Object.keys(groupedMissions).length > 0;

  const basePath = user?.role === 'patient' ? '/patient'
    : user?.role === 'establishment' ? '/etab'
    : '/pro';

  // Get date helper parts
  const getDateParts = (dateStr) => {
    if (!dateStr) return { dayOfWeek: 'JEU.', dayNum: '15', monthShort: 'MAI' };
    const dateObj = new Date(dateStr);
    const dayOfWeek = DAYS_FR_SHORT[dateObj.getDay()] || 'JEU.';
    const dayNum = dateStr.split('-')[2] || '15';
    const monthNum = dateStr.split('-')[1] || '05';
    const monthShort = MONTHS_FR_SHORT[monthNum] || 'MAI';
    return { dayOfWeek, dayNum, monthShort };
  };

  return (
    <div className="page-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 40px)', background: '#F8FAFC' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #F1F5F9', marginBottom: '8px' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          {user?.role === 'patient' ? 'Mes rendez-vous' : 'Mon calendrier'}
        </h1>
        <div style={{ width: '40px' }} /> {/* Balance spacer */}
      </div>

      {/* ── Tab Switcher identical to Screenshot ── */}
      <div style={{ position: 'relative', display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('avenir')}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'avenir' ? '#1E40AF' : '#64748B',
            fontSize: '15px',
            fontWeight: 700,
            padding: '12px 0',
            cursor: 'pointer',
            position: 'relative',
            transition: 'color 0.2s ease',
            textAlign: 'center'
          }}
        >
          À venir
          {activeTab === 'avenir' && (
            <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '3px', background: '#2563EB', borderRadius: '3px' }} />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('passes')}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'passes' ? '#1E40AF' : '#64748B',
            fontSize: '15px',
            fontWeight: 700,
            padding: '12px 0',
            cursor: 'pointer',
            position: 'relative',
            transition: 'color 0.2s ease',
            textAlign: 'center'
          }}
        >
          Passés
          {activeTab === 'passes' && (
            <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '3px', background: '#2563EB', borderRadius: '3px' }} />
          )}
        </button>
      </div>

      {/* ── Content Grouped by Months ── */}
      {hasItems ? (
        Object.entries(groupedMissions).map(([groupKey, list]) => {
          const [month, year] = groupKey.split('-');
          const monthLabel = `${MONTHS_FR[month]} ${year}`;

          return (
            <div key={groupKey} className="animate-fadeInUp" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', paddingLeft: '4px' }}>
                {monthLabel}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {list.map((m) => {
                  const { dayOfWeek, dayNum, monthShort } = getDateParts(m.scheduledDate);
                  const isConfirmed = m.status === 'assigned' || m.status === 'completed' || m.status === 'in_progress';
                  const titleName = user?.role === 'patient' || user?.role === 'establishment'
                    ? (m.assignedProName || 'Professionnel à confirmer')
                    : (m.patientInfo?.name || 'Patient');

                  return (
                    <div 
                      key={m.id}
                      onClick={() => navigate(`${basePath}/mission/${m.id}`)}
                      style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '16px',
                        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.03)',
                        border: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      {/* Left Date Badge */}
                      <div style={{
                        background: '#F0F5FF',
                        borderRadius: '16px',
                        width: '64px',
                        height: '76px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
                          {dayOfWeek}
                        </span>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: '#1E3A8A', margin: '1px 0' }}>
                          {dayNum}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
                          {monthShort}
                        </span>
                      </div>

                      {/* Middle Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {titleName}
                        </h3>
                        <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px', marginBottom: '8px' }}>
                          {getCareLabel(m.careType)}
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                            <Clock size={13} style={{ color: '#94A3B8' }} />
                            <span>{m.scheduledTime}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <MapPin size={13} style={{ color: '#94A3B8' }} />
                            <span>{m.address?.street ? `${m.address.street}, ${m.address.city}` : m.address?.city || 'Cabinet médical'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Pill */}
                      <div style={{ flexShrink: 0 }}>
                        {isConfirmed ? (
                          <span style={{
                            background: '#EAFAF1',
                            color: '#10B981',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 12px',
                            borderRadius: '99px',
                            display: 'inline-block'
                          }}>
                            Confirmé
                          </span>
                        ) : (
                          <span style={{
                            background: '#EFF6FF',
                            color: '#3B82F6',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 12px',
                            borderRadius: '99px',
                            display: 'inline-block'
                          }}>
                            En attente
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty-state" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
          <Clock size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <h2 style={{ fontSize: 'var(--font-base)' }}>Aucun rendez-vous</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Les missions planifiées apparaîtront ici.
          </p>
        </div>
      )}

    </div>
  );
}
