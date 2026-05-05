// ── Professional Dashboard ── (Mockup-faithful design)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import ratingService from '../../services/ratingService';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  Radar, Calendar, CheckCircle, Clock, MapPin, ChevronRight,
  ClipboardList, Bell, Shield, Star, Award
} from 'lucide-react';

export default function ProDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const [myMissions, setMyMissions] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(4.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const my = await missionService.getByProfessional(user.id);
          setMyMissions(my);
          const open = await missionService.getOpenMissions();
          setOpenCount(open.length);
          
          // Load average rating
          const ratingsMap = await ratingService.getAllProRatings();
          const ratings = ratingsMap[user.id] || [];
          if (ratings.length > 0) {
            const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
            setRatingAvg(Math.round(avg * 10) / 10);
          }
        } catch (err) {
          console.error("Pro dashboard data load error:", err);
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [user]);

  const assignedMissions = myMissions.filter(m => m.status === 'assigned' || m.status === 'in_progress');
  const completedMissions = myMissions.filter(m => m.status === 'completed');
  const totalEarnings = completedMissions.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  return (
    <div className="page-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 40px)', background: '#FAFBFD' }}>
      
      {/* ── Welcome Header with Badges ── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Bonjour, {user?.firstName || 'Lucas'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 'var(--font-xs)', marginTop: 4 }}>
          Prêt pour votre tournée aujourd'hui ?
        </p>
      </div>

      {/* ── Grid of 4 Key Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: 'var(--space-6)' }}>
        
        {/* Radar missions stat */}
        <div onClick={() => navigate('/pro/radar')} className="glass-card" style={{ padding: '16px 10px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Radar size={18} style={{ color: 'var(--color-primary)', margin: '0 auto' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{openCount}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Radar</span>
        </div>

        {/* Missions en cours */}
        <div className="glass-card" style={{ padding: '16px 10px', borderRadius: 'var(--radius-lg)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <ClipboardList size={18} style={{ color: 'var(--color-warning)', margin: '0 auto' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{assignedMissions.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>En cours</span>
        </div>

        {/* Terminée */}
        <div className="glass-card" style={{ padding: '16px 10px', borderRadius: 'var(--radius-lg)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <CheckCircle size={18} style={{ color: 'var(--color-success)', margin: '0 auto' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{completedMissions.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Terminée!</span>
        </div>

        {/* Tournées à venir */}
        <div onClick={() => navigate('/pro/tour')} className="glass-card" style={{ padding: '16px 10px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <MapPin size={18} style={{ color: '#6366F1', margin: '0 auto' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{assignedMissions.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tournées</span>
        </div>

      </div>

      {/* ── Radar Circular Animated Encart ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '100ms', marginBottom: 'var(--space-8)' }}>
        <div className="glass-card" style={{ 
          borderRadius: 'var(--radius-xl)', 
          padding: '24px', 
          border: '1px solid var(--border-color)', 
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          overflow: 'hidden'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Radar de missions
            </h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 500, lineHeight: '1.4' }}>
              {openCount} missions disponibles dans votre zone
            </p>
            <button 
              onClick={() => navigate('/pro/radar')}
              className="btn btn-primary btn-sm"
              style={{ 
                marginTop: '16px', 
                fontSize: '11px', 
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              Voir sur la carte
            </button>
          </div>
          
          {/* Animated circular radar sweep */}
          <div className="radar-pulse-container" style={{ flexShrink: 0 }}>
            <div className="radar-pulse-sweep" />
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-center" />
          </div>
        </div>
      </div>

      {/* ── Mes interventions section ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '150ms', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--text-primary)' }}>Mes interventions</h2>
          <span onClick={() => navigate('/pro/tour')} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-link)', cursor: 'pointer' }}>
            Voir tournée
          </span>
        </div>

        {assignedMissions.length === 0 ? (
          <div className="empty-state" style={{ background: 'white', padding: '32px 16px', border: '1px solid var(--border-color)' }}>
            <ClipboardList size={32} style={{ color: 'var(--text-tertiary)' }} />
            <div className="empty-state-title" style={{ marginTop: '12px' }}>Aucune intervention aujourd'hui</div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Explorez le radar de missions pour trouver votre prochain soin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assignedMissions.slice(0, 3).map((mission) => (
              <div 
                key={mission.id} 
                onClick={() => navigate(`/pro/mission/${mission.id}`)}
                className="glass-card"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {getCareLabel(mission.careType)}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                      {mission.patientName || 'Hôpital Saint-Joseph'}
                    </p>
                  </div>
                  <span className="badge badge-assigned" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)', border: 'none', fontWeight: 700, fontSize: '10px' }}>
                    Assignée
                  </span>
                </div>

                <div className="glass-panel" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: 'none',
                  fontSize: 'var(--font-xs)',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  <span>{formatDate(mission.scheduledDate)} · {mission.scheduledTime}</span>
                  <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pro Bottom Stats Bar (Note, Taux, Revenus) ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          
          <div className="glass-card" style={{ padding: '16px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {ratingAvg} <Star size={16} fill="currentColor" style={{ color: '#F59E0B' }} />
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Note moyenne</span>
          </div>

          <div className="glass-card" style={{ padding: '16px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              98 % <Shield size={16} style={{ color: 'var(--color-success)' }} />
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Taux de complétion</span>
          </div>

          <div className="glass-card" style={{ padding: '16px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalEarnings} €
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Revenus ce mois</span>
          </div>

        </div>
      </div>

    </div>
  );
}
