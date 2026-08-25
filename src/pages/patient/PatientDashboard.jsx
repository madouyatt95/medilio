// ── Patient Dashboard ── (Mockup-faithful premium design with restored blue appointment hero)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import { CARE_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import logoFallback from '../../assets/logo-medilio.png';
import {
  Calendar, ChevronRight, ClipboardList,
  MessageSquare, Folder, Droplet, Star
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const [missions, setMissions] = useState([]);
  const [topProfessionals, setTopProfessionals] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        if (user) {
          const [patientMissions, professionals] = await Promise.all([
            missionService.getByPatient(user.id),
            authService.getPublicProfessionals(),
          ]);
          setMissions(patientMissions);
          setTopProfessionals(professionals
            .sort((a, b) => b.professionalInfo.ratingAverage - a.professionalInfo.ratingAverage)
            .slice(0, 3));
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      }
    }
    loadData();
  }, [user]);

  const activeMissions = missions.filter(m => ['open', 'assigned', 'in_progress'].includes(m.status));
  const assignedMissions = missions.filter(m => m.status === 'assigned' || m.status === 'in_progress');
  const unreadNotifs = notifications.filter(n => !n.read).length;

  // Find next upcoming appointment
  const nextAppointment = assignedMissions[0] || null;

  const handleCareSelect = (careTypeId) => {
    navigate(`/patient/create-mission?careType=${careTypeId}`);
  };

  // Pre-list of available care types
  const availableCares = [
    { id: 'daily_assistance', label: 'Aide au quotidien', emoji: '❤️', color: 'rgba(239, 68, 68, 0.06)', textColor: '#EF4444' },
    { id: 'injection', label: 'Injection / Vaccin', emoji: '💉', color: 'rgba(239, 68, 68, 0.06)', textColor: '#EF4444' },
    { id: 'bandage', label: 'Pansement', emoji: '🩹', color: 'rgba(245, 158, 11, 0.06)', textColor: '#F59E0B' },
    { id: 'blood_test', label: 'Prise de sang', emoji: '🧪', color: 'rgba(16, 185, 129, 0.06)', textColor: '#10B981' },
    { id: 'hygiene', label: 'Aide à la toilette', emoji: '🧼', color: 'rgba(59, 130, 246, 0.06)', textColor: '#3B82F6' },
  ];

  return (
    <div className="page-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 40px)', background: '#FAFBFD' }}>
      
      {/* ── Welcome Header ── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Bonjour, {user?.firstName || ''} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 'var(--font-xs)', marginTop: 4 }}>
          Comment allez-vous aujourd'hui ?
        </p>
      </div>

      {/* ── Upcoming Appointment Hero Encart (Vibrant Blue Card) ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '100ms', marginBottom: 'var(--space-6)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: 'white',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: '0 12px 28px rgba(37, 99, 235, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Wave background element */}
          <div style={{
            position: 'absolute', right: '-10%', bottom: '-20%', width: '180px', height: '180px',
            background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', pointerEvents: 'none'
          }} />
          
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, display: 'block', marginBottom: '12px' }}>
            Prochain rendez-vous
          </span>

          {nextAppointment ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, margin: 0, color: 'white' }}>
                    {nextAppointment.assignedProName || 'Infirmier Assigné'}
                  </h3>
                  <p style={{ fontSize: 'var(--font-xs)', opacity: 0.9, marginTop: 4, fontWeight: 500 }}>
                    {CARE_TYPES.find(c => c.id === nextAppointment.careType)?.label || nextAppointment.careType}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'white' }}>
                    {nextAppointment.scheduledTime}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                    {formatDate(nextAppointment.scheduledDate)}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(`/patient/mission/${nextAppointment.id}`)}
                className="btn"
                style={{ 
                  background: 'white', 
                  color: 'var(--color-primary)', 
                  fontWeight: 700, 
                  fontSize: 'var(--font-xs)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px'
                }}
              >
                Voir les détails
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, margin: '0 0 6px', color: 'white' }}>
                Aucun rendez-vous confirmé
              </h3>
              <p style={{ fontSize: 'var(--font-xs)', opacity: 0.9, margin: '0 0 16px', fontWeight: 500 }}>
                Créez une demande pour trouver un professionnel disponible.
              </p>
              
              <button 
                onClick={() => navigate('/patient/create-mission')}
                className="btn"
                style={{ 
                  background: 'white', 
                  color: 'var(--color-primary)', 
                  fontWeight: 700, 
                  fontSize: 'var(--font-xs)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px'
                }}
              >
                Créer une demande
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Accès Rapides (4 columns premium rounded grid) ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '150ms', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          
          {/* Card 1: Mes RDV */}
          <div 
            onClick={() => navigate('/patient/calendar')}
            className="glass-card"
            style={{
              padding: '16px 8px', borderRadius: 'var(--radius-lg)', textAlign: 'center', cursor: 'pointer',
              border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.08)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Mes RDV</span>
          </div>

          {/* Card 2: Demandes de soins */}
          <div 
            onClick={() => navigate('/patient/missions')}
            className="glass-card"
            style={{
              padding: '16px 8px', borderRadius: 'var(--radius-lg)', textAlign: 'center', cursor: 'pointer',
              border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              position: 'relative'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={20} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Demandes</span>
            {activeMissions.length > 0 && (
              <span style={{
                position: 'absolute', top: '10px', right: '10px', background: 'var(--color-success)', color: 'white',
                fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '99px'
              }}>
                {activeMissions.length}
              </span>
            )}
          </div>

          {/* Card 3: Mes documents */}
          <div 
            onClick={() => navigate('/patient/documents')}
            className="glass-card"
            style={{
              padding: '16px 8px', borderRadius: 'var(--radius-lg)', textAlign: 'center', cursor: 'pointer',
              border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.08)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={20} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Documents</span>
          </div>

          {/* Card 4: Messages */}
          <div 
            onClick={() => navigate('/patient/messages')}
            className="glass-card"
            style={{
              padding: '16px 8px', borderRadius: 'var(--radius-lg)', textAlign: 'center', cursor: 'pointer',
              border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              position: 'relative'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={20} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Messages</span>
            {unreadNotifs > 0 && (
              <span style={{
                position: 'absolute', top: '10px', right: '10px', background: 'var(--color-danger)', color: 'white',
                fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '99px'
              }}>
                {unreadNotifs}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── Pre-liste de soins et d'aide disponibles (Stylish badges, direct actions) ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '200ms', marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--font-base)', fontWeight: 800, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
          Demander un soin ou un service
        </h2>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {availableCares.map((care) => (
            <div 
              key={care.id}
              onClick={() => handleCareSelect(care.id)}
              className="glass-card"
              style={{
                flexShrink: 0,
                width: '130px',
                padding: '16px 12px',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--border-color)',
                background: 'white',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: care.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                {care.emoji}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {care.label.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Professionals les mieux notés section (Photo, Rating, access info) ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '250ms', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--text-primary)' }}>
            Professionnels les mieux notés
          </h2>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>Dans votre zone</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topProfessionals.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-5)', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Aucun professionnel vérifié n’est encore référencé dans votre zone.
            </div>
          ) : topProfessionals.map((pro) => (
            <div 
              key={pro.id}
              onClick={() => navigate(`/pro/view/${pro.id}`)}
              className="glass-card"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-color)',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={pro.avatar || logoFallback}
                  alt={`${pro.firstName} ${pro.lastName}`} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {pro.firstName} {pro.lastName}
                  </h4>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                    {pro.professionalInfo.specialties?.[0] || 'Professionnel à domicile'}
                  </p>
                  
                  {/* Rating Stars indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    <Star size={12} fill="currentColor" style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>{pro.professionalInfo.ratingAverage || '—'}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>({pro.professionalInfo.ratingCount || 0} avis)</span>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                <ChevronRight size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Conseils du jour section ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '300ms', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--text-primary)' }}>Conseils du jour</h2>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>Prévention</span>
        </div>
        
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)', background: 'white'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.08)',
            color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Droplet size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Hydratation</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2, lineHeight: '1.4' }}>
              Pensez à boire régulièrement tout au long de la journée pour rester en forme.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
