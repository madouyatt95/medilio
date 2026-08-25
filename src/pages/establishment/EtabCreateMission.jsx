// ── Establishment Create Mission ──
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import managedPatientService from '../../services/managedPatientService';
import documentService from '../../services/documentService';
import { CARE_TYPES } from '../../utils/constants';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import {
  ArrowLeft, Send, Home, ClipboardList, User,
  FileText, AlertTriangle, Upload, X, ChevronDown
} from 'lucide-react';

export default function EtabCreateMission() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [managedPatients, setManagedPatients] = useState([]);
  const [managedPatientId, setManagedPatientId] = useState(searchParams.get('patient') || '');
  const [step, setStep] = useState(1);

  const isDischargeDefault = searchParams.get('mode') === 'discharge';

  const [form, setForm] = useState({
    // Patient info
    patientName: '',
    patientAge: '',
    patientConditions: '',
    // Mission info
    careType: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '09:00',
    estimatedDuration: 30,
    // Address
    address: { street: '', city: '', postalCode: '', lat: null, lng: null },
    // Documents
    documents: [],
    // Discharge mode
    dischargeMode: isDischargeDefault,
    dischargeDate: '',
    medicalNotes: '',
    urgency: false,
    // Multi-care types for discharge
    additionalCareTypes: [],
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!user?.id) return;
    managedPatientService.getByEstablishment(user.id)
      .then(patients => {
        setManagedPatients(patients);
        const selected = patients.find(patient => patient.id === managedPatientId);
        if (selected) {
          setForm(current => ({
            ...current,
            patientName: `${selected.firstName} ${selected.lastName}`,
            patientAge: selected.patientAge || '',
            patientConditions: selected.patientConditions || '',
            address: selected.address || current.address,
          }));
        }
      })
      .catch(error => showToast(error.message, 'error'));
  }, [user?.id, managedPatientId, showToast]);

  const selectManagedPatient = (patientId) => {
    setManagedPatientId(patientId);
    const selected = managedPatients.find(patient => patient.id === patientId);
    if (!selected) return;
    setForm(current => ({
      ...current,
      patientName: `${selected.firstName} ${selected.lastName}`,
      patientAge: selected.patientAge || '',
      patientConditions: selected.patientConditions || '',
      address: selected.address || current.address,
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await documentService.uploadMany(files, user.id);
      setForm(current => ({ ...current, documents: [...current.documents, ...uploaded] }));
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (id) => {
    const document = form.documents.find(item => item.id === id);
    if (document) {
      try {
        await documentService.delete(document);
      } catch (error) {
        showToast(`Suppression impossible : ${error.message}`, 'error');
        return;
      }
    }
    setForm(current => ({ ...current, documents: current.documents.filter(item => item.id !== id) }));
  };

  const handleSubmit = async () => {
    if (!form.careType || !form.patientName || !form.scheduledDate) {
      showToast('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    setLoading(true);
    try {
      await missionService.create({
        patientId: user.id,
        careType: form.careType,
        description: form.description,
        address: form.address,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        patientInfo: {
          name: form.patientName,
          age: form.patientAge ? parseInt(form.patientAge) : null,
          conditions: form.patientConditions,
        },
        estimatedDuration: form.estimatedDuration,
        documents: form.documents,
        // Establishment-specific
        createdByEstablishmentId: user.id,
        managedPatientId: managedPatientId || null,
        dischargeMode: form.dischargeMode,
        dischargeDate: form.dischargeDate || null,
        medicalNotes: form.medicalNotes || '',
      });

      showToast(form.dischargeMode ? 'Mission RAD créée avec succès !' : 'Mission créée avec succès !', 'success');
      navigate('/etab/dashboard');
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = form.dischargeMode ? 4 : 3;

  return (
    <div className="page-container" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>
            {form.dischargeMode ? '🏠 Retour à domicile' : '📋 Nouvelle mission'}
          </h1>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
            Étape {step}/{totalSteps}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, background: 'var(--bg-tertiary)', borderRadius: 2,
        marginBottom: 'var(--space-6)', overflow: 'hidden'
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${(step / totalSteps) * 100}%`,
          background: form.dischargeMode ? 'var(--color-secondary)' : 'var(--color-primary)',
          transition: 'width 0.3s'
        }} />
      </div>

      {/* Mode toggle */}
      {step === 1 && (
        <div style={{
          display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 4
        }}>
          <button
            onClick={() => update('dischargeMode', false)}
            style={{
              flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--font-sm)',
              background: !form.dischargeMode ? 'var(--color-primary)' : 'transparent',
              color: !form.dischargeMode ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <ClipboardList size={16} /> Standard
          </button>
          <button
            onClick={() => update('dischargeMode', true)}
            style={{
              flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--font-sm)',
              background: form.dischargeMode ? 'var(--color-secondary)' : 'transparent',
              color: form.dischargeMode ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <Home size={16} /> Retour à domicile
          </button>
        </div>
      )}

      {/* STEP 1: Patient Info */}
      {step === 1 && (
        <div className="animate-fadeIn">
          <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} color="var(--color-primary)" /> Informations patient
          </h2>

          {managedPatients.length > 0 && (
            <div className="form-group">
              <label className="form-label" htmlFor="managed-patient">Patient suivi par l’établissement</label>
              <select
                id="managed-patient"
                className="form-input form-select"
                value={managedPatientId}
                onChange={event => selectManagedPatient(event.target.value)}
              >
                <option value="">Saisie ponctuelle</option>
                {managedPatients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nom du patient *</label>
            <input className="form-input" placeholder="Nom complet du patient"
              value={form.patientName} onChange={e => update('patientName', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Âge</label>
              <input className="form-input" type="number" placeholder="75"
                value={form.patientAge} onChange={e => update('patientAge', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Durée estimée (min)</label>
              <input className="form-input" type="number" value={form.estimatedDuration}
                onChange={e => update('estimatedDuration', parseInt(e.target.value) || 30)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pathologies / Conditions</label>
            <textarea className="form-input" rows={3} placeholder="Diabète type 2, post-opératoire..."
              value={form.patientConditions} onChange={e => update('patientConditions', e.target.value)}
              style={{ resize: 'none' }} />
          </div>

          <button className="btn btn-primary btn-block" onClick={() => setStep(2)} disabled={!form.patientName}>
            Continuer <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
      )}

      {/* STEP 2: Mission Details */}
      {step === 2 && (
        <div className="animate-fadeIn">
          <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={20} color="var(--color-primary)" /> Type de soin
          </h2>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-2)', marginBottom: 'var(--space-4)'
          }}>
            {CARE_TYPES.map(ct => (
              <button
                key={ct.id}
                onClick={() => update('careType', ct.id)}
                style={{
                  padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  border: form.careType === ct.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                  background: form.careType === ct.id ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 'var(--font-sm)', fontWeight: 600,
                  color: form.careType === ct.id ? 'var(--color-primary)' : 'var(--text-primary)',
                  transition: 'all 0.2s'
                }}
              >
                {ct.label}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Description / Instructions</label>
            <textarea className="form-input" rows={3} placeholder="Détails complémentaires..."
              value={form.description} onChange={e => update('description', e.target.value)}
              style={{ resize: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.scheduledDate}
                onChange={e => update('scheduledDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Heure</label>
              <input className="form-input" type="time" value={form.scheduledTime}
                onChange={e => update('scheduledTime', e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={() => setStep(3)}
            disabled={!form.careType || !form.scheduledDate}>
            Continuer <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
      )}

      {/* STEP 3 (discharge): Medical Info */}
      {step === 3 && form.dischargeMode && (
        <div className="animate-fadeIn">
          <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Home size={20} color="var(--color-secondary)" /> Informations de sortie
          </h2>

          <div className="form-group">
            <label className="form-label">Date de sortie prévue</label>
            <input className="form-input" type="date" value={form.dischargeDate}
              onChange={e => update('dischargeDate', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Consignes médicales de sortie</label>
            <textarea className="form-input" rows={4}
              placeholder="Protocole de soins post-hospitalisation, médicaments, surveillance..."
              value={form.medicalNotes} onChange={e => update('medicalNotes', e.target.value)}
              style={{ resize: 'none' }} />
          </div>

          <div className="form-group" style={{
            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            border: form.urgency ? '2px solid var(--color-danger)' : '1px solid var(--border-color)',
            background: form.urgency ? 'var(--color-danger-light)' : 'var(--bg-primary)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer'
          }} onClick={() => update('urgency', !form.urgency)}>
            <AlertTriangle size={20} color={form.urgency ? 'var(--color-danger)' : 'var(--text-tertiary)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)' }}>Urgence</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                Recherche prioritaire d'un professionnel
              </div>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              border: form.urgency ? '2px solid var(--color-danger)' : '2px solid var(--border-color)',
              background: form.urgency ? 'var(--color-danger)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {form.urgency && <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>✓</span>}
            </div>
          </div>

          {/* Document upload */}
          <div className="form-group">
            <label className="form-label">Ordonnance & Documents</label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-4)', border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)',
              fontSize: 'var(--font-sm)', fontWeight: 600
            }}>
              <Upload size={20} /> {uploading ? 'Téléversement…' : 'Ajouter un document'}
              <input type="file" accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx" multiple disabled={uploading} style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
            {form.documents.length > 0 && (
              <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {form.documents.map(d => (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-xs)'
                  }}>
                    <span style={{ fontWeight: 600 }}><FileText size={14} /> {d.name}</span>
                    <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-block" onClick={() => setStep(4)}>
            Continuer <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
      )}

      {/* STEP 3 (standard) or STEP 4 (discharge): Address + Submit */}
      {((step === 3 && !form.dischargeMode) || (step === 4 && form.dischargeMode)) && (
        <div className="animate-fadeIn">
          <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            📍 Adresse du patient
          </h2>

          <AddressAutocomplete
            value={form.address}
            onChange={(addr) => update('address', addr)}
          />

          {/* Document upload for standard mode */}
          {!form.dischargeMode && (
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Documents (optionnel)</label>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-4)', border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)',
                fontSize: 'var(--font-sm)', fontWeight: 600
              }}>
                <Upload size={20} /> {uploading ? 'Téléversement…' : 'Ajouter un document'}
                <input type="file" accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx" multiple disabled={uploading} style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
              {form.documents.length > 0 && (
                <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {form.documents.map(d => (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-xs)'
                    }}>
                      <span style={{ fontWeight: 600 }}><FileText size={14} /> {d.name}</span>
                      <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary card */}
          <div className="card" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Récapitulatif</h3>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>👤 <strong>{form.patientName}</strong> {form.patientAge && `(${form.patientAge} ans)`}</div>
              <div>🩺 {CARE_TYPES.find(c => c.id === form.careType)?.label}</div>
              <div>📅 {form.scheduledDate} à {form.scheduledTime}</div>
              {form.address.city && <div>📍 {form.address.street}, {form.address.city}</div>}
              {form.dischargeMode && <div style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>🏠 Mode Retour à domicile</div>}
              {form.urgency && <div style={{ color: 'var(--color-danger)', fontWeight: 700 }}>⚠️ URGENT</div>}
              {form.documents.length > 0 && <div>📎 {form.documents.length} document{form.documents.length > 1 ? 's' : ''}</div>}
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={loading || uploading}
            style={form.dischargeMode ? { background: 'var(--color-secondary)' } : {}}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
              <>
                <Send size={18} />
                {form.dischargeMode ? 'Créer la demande RAD' : 'Publier la mission'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
