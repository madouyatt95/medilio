// ── Pro Tour (Optimized Itinerary) ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
import { CARE_TYPES } from '../../utils/constants';
import { getTodayStr, formatDate } from '../../utils/dateUtils';
import { 
  ArrowLeft, MapPin, Clock, Calendar, CheckCircle, Navigation, Play
} from 'lucide-react';

export default function ProTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  useEffect(() => {
    async function load() {
      if (user) {
        const allMyMissions = await missionService.getByProfessional(user.id);
        // Filter by selected date and not cancelled
        const forDate = allMyMissions.filter(m => 
          m.scheduledDate === selectedDate && m.status !== 'cancelled'
        );
        // "Optimize" by sorting by time (Logistics simulation)
        forDate.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
        setMissions(forDate);
      }
    }
    load();
  }, [user, selectedDate]);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const openMaps = (address) => {
    const query = encodeURIComponent(`${address.street}, ${address.city} ${address.postalCode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Ma Tournée</h1>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Itinéraire optimisé</p>
        </div>
      </div>

      {/* Date Selector */}
      <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
        <input 
          type="date" 
          className="form-input" 
          value={selectedDate} 
          onChange={e => setSelectedDate(e.target.value)} 
        />
      </div>

      {/* Map Placeholder */}
      <div style={{
        height: 200, borderRadius: 'var(--radius-lg)', background: '#E2E8F0',
        marginBottom: 'var(--space-5)', position: 'relative', overflow: 'hidden',
        border: '1px solid var(--border-light)'
      }}>
        {/* Fake Map background */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.5, backgroundImage: 'url(https://www.transparenttextures.com/patterns/cubes.png)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <Navigation size={32} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
          <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Aperçu du trajet</div>
        </div>
      </div>

      {/* Itinerary Timeline */}
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* timeline line */}
        <div style={{ position: 'absolute', left: 8, top: 20, bottom: 20, width: 2, background: 'var(--border-light)' }} />
        
        {missions.length === 0 ? (
           <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>Aucune activité prévue ce jour.</p>
        ) : (
          missions.map((m, idx) => (
            <div key={m.id} style={{ position: 'relative', marginBottom: 'var(--space-5)', opacity: m.status === 'completed' ? 0.6 : 1 }}>
              {/* timeline dot */}
              <div style={{ 
                position: 'absolute', left: -21, top: 4, width: 12, height: 12, borderRadius: '50%',
                background: m.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)',
                border: '2px solid var(--bg-body)'
              }} />
              
              <div className="card" style={{ padding: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--color-primary)' }}>
                    {m.scheduledTime}
                  </div>
                  {m.status === 'completed' ? (
                    <span className="badge badge-success" style={{ fontSize: '10px' }}><CheckCircle size={10} style={{marginRight:4}}/> Terminée</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>À venir</span>
                  )}
                </div>
                
                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 4 }}>
                  {getCareLabel(m.careType)} — {m.patientInfo?.name}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  <MapPin size={12} /> {m.address.street}, {m.address.city}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/pro/mission/${m.id}`)}>
                    Détails
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openMaps(m.address)}>
                    <Play size={14} style={{ marginRight: 4 }} /> Y aller
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
