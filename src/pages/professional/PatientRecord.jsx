// ── Patient Record (Shared Transmission Log) ──
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import missionService from '../../services/missionService';
import { CARE_TYPES } from '../../utils/constants';
import { formatDate, formatRelative } from '../../utils/dateUtils';
import { ArrowLeft, User, FileText, Calendar, Activity } from 'lucide-react';

export default function PatientRecord() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // In a real app we'd fetch patient profile based on patientId. Here we mock from users.
      const users = await authService.getAllUsers();
      const p = users.find(u => u.id === patientId);
      setPatient(p);

      const all = await missionService.getAll();
      const patientMissions = all.filter(m => m.patientId === patientId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setHistory(patientMissions);
      setLoading(false);
    }
    if (patientId) load();
  }, [patientId]);

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  if (!patient) return <div className="page-container">Patient introuvable</div>;

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  // Extract all notes
  const allNotes = [];
  history.forEach(m => {
    if (m.careNotes) {
      m.careNotes.forEach(note => {
        allNotes.push({ ...note, mission: m });
      });
    }
  });
  allNotes.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Dossier Patient</h1>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Carnet de transmission partagé</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
         <div className="avatar avatar-lg">{patient.firstName?.[0]}{patient.lastName?.[0]}</div>
         <div>
           <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)' }}>{patient.firstName} {patient.lastName}</div>
           <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
             📍 {patient.address?.city || 'Non renseigné'}
           </div>
         </div>
      </div>

      <div className="section">
        <div className="section-title">
          <Activity size={18} style={{marginRight: 8, color:'var(--color-primary)'}}/> 
          Transmissions médicales
        </div>
        {allNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Aucune note</div>
            <div className="empty-state-text">Soyez le premier à ajouter une transmission.</div>
          </div>
        ) : (
          allNotes.map(note => (
            <div key={note.id} className="care-note" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="care-note-header">
                <div className="care-note-author">
                  ProId: {note.authorId?.slice(0,4)}... <span style={{fontWeight:'normal', color:'var(--text-tertiary)'}}>lors de {getCareLabel(note.mission.careType)}</span>
                </div>
                <div className="care-note-date">{formatRelative(note.createdAt)}</div>
              </div>
              <div className="care-note-content" style={{ fontSize: 'var(--font-sm)' }}>{note.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-title">
          <Calendar size={18} style={{marginRight: 8, color:'var(--text-secondary)'}}/> 
          Historique des Soins
        </div>
        <div className="mission-list">
          {history.map(m => (
             <div key={m.id} className="mission-card" onClick={() => navigate(`/pro/mission/${m.id}`)}>
               <div className="mission-card-header">
                 <div className="mission-card-type">
                   <FileText size={16} /> {getCareLabel(m.careType)} 
                 </div>
                 <span className={`badge badge-${m.status}`}>{m.status}</span>
               </div>
               <div className="mission-card-meta">
                 <div className="mission-card-meta-row">{formatDate(m.scheduledDate)}</div>
               </div>
             </div>
          ))}
        </div>
      </div>

    </div>
  );
}
