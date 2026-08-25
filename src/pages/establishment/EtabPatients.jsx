// ── Establishment Patients Management ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import managedPatientService from '../../services/managedPatientService';
import { MISSION_STATUS_LABELS, CARE_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  Users, Plus, Search, ChevronRight, ClipboardList,
  Phone, MapPin, ArrowLeft, X, UserPlus
} from 'lucide-react';

export default function EtabPatients() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [missions, setMissions] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    firstName: '', lastName: '', age: '', phone: '', conditions: '',
    street: '', city: '', postalCode: ''
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [managedPatients, establishmentMissions] = await Promise.all([
          managedPatientService.getByEstablishment(user.id),
          missionService.getByEstablishment(user.id),
        ]);
        setPatients(managedPatients);
        setMissions(establishmentMissions);
      } catch (error) {
        showToast(`Chargement impossible : ${error.message}`, 'error');
      }
    }
    void loadData();
  }, [user, showToast]);

  const handleAddPatient = async () => {
    if (!newPatient.firstName || !newPatient.lastName) {
      showToast('Veuillez remplir le nom et prénom', 'error');
      return;
    }
    try {
      const patient = await managedPatientService.create(user.id, newPatient);
      setPatients(prev => [patient, ...prev]);
      setNewPatient({ firstName: '', lastName: '', age: '', phone: '', conditions: '', street: '', city: '', postalCode: '' });
      setShowAdd(false);
      showToast(`Patient ${patient.firstName} ${patient.lastName} ajouté`, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const getPatientMissions = (patient) => missions.filter(mission =>
    mission.managedPatientId === patient.id
    || (!mission.managedPatientId && mission.patientInfo?.name === `${patient.firstName} ${patient.lastName}`)
  );

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const filtered = patients.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  // Patient detail view
  if (selectedPatient) {
    const patientMissions = getPatientMissions(selectedPatient);
    return (
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSelectedPatient(null)}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>
            {selectedPatient.firstName} {selectedPatient.lastName}
          </h1>
        </div>

        {/* Patient Info Card */}
        <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="avatar avatar-lg" style={{
              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%', fontSize: 'var(--font-lg)', fontWeight: 800
            }}>
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)' }}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </div>
              {selectedPatient.patientAge && (
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  {selectedPatient.patientAge} ans
                </span>
              )}
              {selectedPatient.managedAccount && (
                <span style={{
                  marginLeft: 8, fontSize: 'var(--font-xs)',
                  background: 'var(--color-warning-light)', color: 'var(--color-warning)',
                  padding: '2px 8px', borderRadius: 12, fontWeight: 600
                }}>Compte géré</span>
              )}
            </div>
          </div>

          {selectedPatient.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>
              <Phone size={14} /> {selectedPatient.phone}
            </div>
          )}
          {selectedPatient.address?.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>
              <MapPin size={14} /> {selectedPatient.address.street}, {selectedPatient.address.city}
            </div>
          )}
          {selectedPatient.patientConditions && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-sm)' }}>
              <strong>Conditions :</strong> {selectedPatient.patientConditions}
            </div>
          )}
        </div>

        {/* Quick Action */}
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/etab/create-mission?patient=${selectedPatient.id}`)}
          style={{ marginBottom: 'var(--space-5)' }}>
          <Plus size={18} /> Créer une mission pour ce patient
        </button>

        {/* Patient's missions */}
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={18} /> Missions ({patientMissions.length})
        </h3>
        <div className="mission-list">
          {patientMissions.map(m => (
            <div key={m.id} className="mission-card" onClick={() => navigate(`/etab/mission/${m.id}`)}>
              <div className="mission-card-header">
                <div className="mission-card-type">
                  <div className="mission-card-type-icon"><ClipboardList size={18} /></div>
                  {getCareLabel(m.careType)}
                </div>
                <span className={`badge badge-${m.status}`}>
                  <span className="badge-dot" /> {MISSION_STATUS_LABELS[m.status]}
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                📅 {formatDate(m.scheduledDate)} · 📍 {m.address?.city}
              </div>
            </div>
          ))}
          {patientMissions.length === 0 && (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>Aucune mission pour ce patient</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          <Users size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Patients ({patients.length})
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
        <Search size={18} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-tertiary)'
        }} />
        <input className="form-input" placeholder="Rechercher un patient..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 44 }} />
      </div>

      {/* Add patient modal */}
      {showAdd && (
        <>
          <div className="modal-overlay" onClick={() => setShowAdd(false)} />
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Nouveau patient</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input className="form-input" placeholder="Prénom" value={newPatient.firstName}
                    onChange={e => setNewPatient(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-input" placeholder="Nom" value={newPatient.lastName}
                    onChange={e => setNewPatient(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Âge</label>
                  <input className="form-input" type="number" placeholder="75" value={newPatient.age}
                    onChange={e => setNewPatient(p => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" type="tel" placeholder="06..." value={newPatient.phone}
                    onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Pathologies</label>
                <input className="form-input" placeholder="Diabète, hypertension..." value={newPatient.conditions}
                  onChange={e => setNewPatient(p => ({ ...p, conditions: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input className="form-input" placeholder="Paris" value={newPatient.city}
                  onChange={e => setNewPatient(p => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleAddPatient}
                disabled={!newPatient.firstName || !newPatient.lastName}>
                <UserPlus size={16} /> Ajouter le patient
              </button>
            </div>
          </div>
        </>
      )}

      {/* Patient list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.map(p => {
          const pMissions = getPatientMissions(`${p.firstName} ${p.lastName}`);
          const activeMissions = pMissions.filter(m => ['open', 'assigned', 'in_progress'].includes(m.status));
          return (
            <div key={p.id} className="card" onClick={() => setSelectedPatient(p)} style={{
              padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)'
            }}>
              <div className="avatar avatar-md" style={{
                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: '50%', fontWeight: 800, flexShrink: 0
              }}>
                {p.firstName[0]}{p.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>
                  {p.firstName} {p.lastName}
                  {p.patientAge && <span style={{ fontWeight: 400, fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginLeft: 6 }}>{p.patientAge} ans</span>}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', display: 'flex', gap: 'var(--space-3)' }}>
                  {p.address?.city && <span><MapPin size={12} /> {p.address.city}</span>}
                  <span><ClipboardList size={12} /> {pMissions.length} mission{pMissions.length > 1 ? 's' : ''}</span>
                  {activeMissions.length > 0 && (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      {activeMissions.length} en cours
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-tertiary)" />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={48} /></div>
            <div className="empty-state-title">Aucun patient</div>
            <div className="empty-state-desc">Ajoutez vos premiers patients</div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={18} /> Ajouter un patient
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
