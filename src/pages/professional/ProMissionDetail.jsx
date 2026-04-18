// ── Professional Mission Detail ──
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatRelative } from '../../utils/dateUtils';
import {
  ArrowLeft, MapPin, Calendar, Clock, User, Activity,
  FileText, CheckCircle, Send, MessageCircle, Plus
} from 'lucide-react';

export default function ProMissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [mission, setMission] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    async function loadData() {
      const m = await missionService.getById(id);
      if (!m) return navigate('/pro/dashboard');
      setMission(m);

      // Load patient info
      const allUsers = await authService.getAllUsers();
      const p = allUsers.find(u => u.id === m.patientId);
      setPatient(p || null);
    }
    loadData();
  }, [id, navigate]);

  if (!mission) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;
  const isAssigned = mission.assignedProId === user?.id;

  const handleComplete = async () => {
    const updated = await missionService.updateStatus(mission.id, 'completed');
    setMission(updated);
    showToast('Mission terminée !', 'success');
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    const updated = await missionService.addCareNote(mission.id, user.id, noteContent);
    setMission(updated);
    setNoteContent('');
    setShowNoteForm(false);
    showToast('Note de soins ajoutée !', 'success');
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{getCareLabel(mission.careType)}</h1>
          <span className={`badge badge-${mission.status}`}>
            <span className="badge-dot" /> {MISSION_STATUS_LABELS[mission.status]}
          </span>
        </div>
      </div>

      {/* Mission Details */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="mission-detail-info">
          <div className="mission-detail-row">
            <div className="mission-detail-row-icon"><MapPin size={20} /></div>
            <div className="mission-detail-row-content">
              <div className="mission-detail-row-label">Adresse</div>
              <div className="mission-detail-row-value">{mission.address?.street}, {mission.address?.city}</div>
            </div>
          </div>
          <div className="mission-detail-row">
            <div className="mission-detail-row-icon"><Calendar size={20} /></div>
            <div className="mission-detail-row-content">
              <div className="mission-detail-row-label">Date & heure</div>
              <div className="mission-detail-row-value">{formatDate(mission.scheduledDate)} à {mission.scheduledTime}</div>
            </div>
          </div>
          <div className="mission-detail-row">
            <div className="mission-detail-row-icon"><Clock size={20} /></div>
            <div className="mission-detail-row-content">
              <div className="mission-detail-row-label">Durée / Rémunération</div>
              <div className="mission-detail-row-value">{mission.estimatedDuration} min — {mission.estimatedCost || '—'} €</div>
            </div>
          </div>
          <div className="mission-detail-row">
            <div className="mission-detail-row-icon"><User size={20} /></div>
            <div className="mission-detail-row-content">
              <div className="mission-detail-row-label">Patient</div>
              <div className="mission-detail-row-value">
                {mission.patientInfo?.name}{mission.patientInfo?.age ? `, ${mission.patientInfo.age} ans` : ''}
                {mission.patientInfo?.conditions && (
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {mission.patientInfo.conditions}
                  </div>
                )}
              </div>
            </div>
          </div>
          {mission.description && (
            <div className="mission-detail-row">
              <div className="mission-detail-row-icon"><FileText size={20} /></div>
              <div className="mission-detail-row-content">
                <div className="mission-detail-row-label">Description</div>
                <div className="mission-detail-row-value">{mission.description}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient Contact (if assigned) */}
      {isAssigned && patient && (
        <div className="card" style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="avatar">{patient.firstName?.[0]}{patient.lastName?.[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>
              {patient.firstName} {patient.lastName}
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
              📞 {patient.phone} — ✉️ {patient.email}
            </div>
          </div>
        </div>
      )}

      {/* Care Notes */}
      {mission.careNotes?.length > 0 && (
        <div className="section">
          <div className="section-title">Notes de soins</div>
          {mission.careNotes.map(note => (
            <div key={note.id} className="care-note">
              <div className="care-note-header">
                <div className="care-note-author">Vous</div>
                <div className="care-note-date">{formatRelative(note.createdAt)}</div>
              </div>
              <div className="care-note-content">{note.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add Note */}
      {isAssigned && (
        <div className="section">
          {!showNoteForm ? (
            <button className="btn btn-secondary btn-block" onClick={() => setShowNoteForm(true)}>
              <Plus size={16} /> Ajouter une note de soins
            </button>
          ) : (
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)' }}>
                <MessageCircle size={16} style={{ marginRight: 8 }} />
                Nouvelle note de soins
              </h3>
              <textarea className="form-input form-textarea"
                placeholder="Décrivez les soins réalisés, les observations, les constantes..."
                value={noteContent} onChange={e => setNoteContent(e.target.value)}
                style={{ marginBottom: 'var(--space-3)' }} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteForm(false)}>Annuler</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!noteContent.trim()}>
                  <Send size={14} /> Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isAssigned && mission.status === 'assigned' && (
        <button className="btn btn-success btn-block" style={{ marginTop: 'var(--space-4)' }} onClick={handleComplete}>
          <CheckCircle size={18} /> Marquer comme terminée
        </button>
      )}
    </div>
  );
}
