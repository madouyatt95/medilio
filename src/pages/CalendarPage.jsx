// ── Calendar Page (Patient & Pro) ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import missionService from '../services/missionService';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';
import { MiniCalendar } from '../components/SharedComponents';
import {
  Calendar, ArrowLeft, MapPin, Clock, ClipboardList
} from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'patient') {
      setMissions(missionService.getByPatient(user.id));
    } else if (user.role === 'professional') {
      setMissions(missionService.getByProfessional(user.id));
    }
  }, [user]);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const filteredMissions = selectedDate
    ? missions.filter(m => m.scheduledDate?.startsWith(selectedDate))
    : missions;

  const basePath = user?.role === 'patient' ? '/patient' : '/pro';

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Calendar size={24} style={{ color: 'var(--color-primary)' }} />
            Calendrier
          </h1>
        </div>
      </div>

      <MiniCalendar
        missions={missions}
        selectedDate={selectedDate}
        onDateClick={(date) => setSelectedDate(date === selectedDate ? null : date)}
      />

      <div style={{ marginTop: 'var(--space-5)' }}>
        <div className="section-title">
          {selectedDate ? (
            <span>Missions du {formatDate(selectedDate)} ({filteredMissions.length})</span>
          ) : (
            <span>Toutes les missions ({missions.length})</span>
          )}
          {selectedDate && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(null)}>
              Tout voir
            </button>
          )}
        </div>

        {filteredMissions.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <div className="empty-state-title">Aucune mission</div>
            <div className="empty-state-text">
              {selectedDate ? 'Aucune mission prévue ce jour.' : 'Aucune mission planifiée.'}
            </div>
          </div>
        ) : (
          <div className="mission-list">
            {filteredMissions.map(m => (
              <div key={m.id} className="mission-card"
                onClick={() => navigate(`${basePath}/mission/${m.id}`)}>
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
                    <Clock size={16} /> {m.scheduledTime}
                  </div>
                  <div className="mission-card-meta-row">
                    <MapPin size={16} /> {m.address?.city}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
