// ── Create Mission (Multi-step Form) ──
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import { CARE_TYPES, CITIES } from '../../utils/constants';
import { getTodayStr } from '../../utils/dateUtils';
import { DocumentUpload, RecurrenceSelector } from '../../components/SharedComponents';
import {
  ArrowLeft, ArrowRight, Check, Syringe, Scissors,
  ShowerHead, Activity, Pill, Dumbbell, Heart, Plus,
  MapPin, Calendar, User, FileText, Upload, Repeat
} from 'lucide-react';

const ICONS = { Syringe, Bandage: Scissors, ShowerHead, Activity, Pill, Dumbbell, Heart, Plus };

export default function CreateMission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    careType: '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      postalCode: user?.address?.postalCode || '',
    },
    scheduledDate: '',
    scheduledTime: '',
    patientInfo: { name: '', age: '', conditions: '' },
    description: '',
    estimatedDuration: 30,
    estimatedCost: '',
    recurrence: 'none',
    recurrenceEndDate: '',
    documents: [],
    isForOther: false,
  });

  const update = (path, value) => {
    setForm(prev => {
      const keys = path.split('.');
      const newForm = { ...prev };
      let obj = newForm;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newForm;
    });
  };

  const steps = [
    { label: 'Type', icon: <Activity size={16} /> },
    { label: 'Lieu & Date', icon: <MapPin size={16} /> },
    { label: 'Patient', icon: <User size={16} /> },
    { label: 'Détails', icon: <FileText size={16} /> },
    { label: 'Confirmation', icon: <Check size={16} /> },
  ];

  const canNext = () => {
    if (step === 0) return !!form.careType;
    if (step === 1) return form.address.city && form.address.street && form.scheduledDate && form.scheduledTime;
    if (step === 2) return !!form.patientInfo.name;
    return true;
  };

  const handleSubmit = async () => {
    try {
      const mission = await missionService.create({
        ...form,
        patientId: user.id,
      });
      showToast('Mission créée avec succès !', 'success');
      navigate(`/patient/mission/${mission.id}`);
    } catch (err) {
      showToast(err.message || 'Erreur lors de la création', 'error');
    }
  };

  const getCareLabel = (id) => CARE_TYPES.find(c => c.id === id)?.label || id;

  return (
    <div className="page-container no-bottom-nav">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Nouvelle demande</h1>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Étape {step + 1} sur {steps.length}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div className={`stepper-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
              <div className="stepper-circle">
                {i < step ? <Check size={14} /> : i + 1}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`stepper-line ${i < step ? 'completed' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Care Type */}
      {step === 0 && (
        <div className="animate-fadeIn">
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
            Quel type de soin recherchez-vous ?
          </h2>
          <div className="care-type-grid">
            {CARE_TYPES.map(ct => {
              const Icon = ICONS[ct.icon] || Activity;
              return (
                <div key={ct.id}
                  className={`care-type-option ${form.careType === ct.id ? 'selected' : ''}`}
                  onClick={() => update('careType', ct.id)}>
                  <div className="care-type-option-icon"><Icon size={20} /></div>
                  <div className="care-type-option-label">{ct.label}</div>
                  <div className="care-type-option-desc">{ct.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Location & Date */}
      {step === 1 && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>
            Où et quand ?
          </h2>
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input className="form-input" placeholder="Numéro et rue"
              value={form.address.street}
              onChange={e => update('address.street', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <select className="form-input form-select" value={form.address.city}
                onChange={e => update('address.city', e.target.value)}>
                <option value="">Sélectionner</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Code postal</label>
              <input className="form-input" placeholder="75001"
                value={form.address.postalCode}
                onChange={e => update('address.postalCode', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" min={getTodayStr()}
                value={form.scheduledDate}
                onChange={e => update('scheduledDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Heure</label>
              <input className="form-input" type="time"
                value={form.scheduledTime}
                onChange={e => update('scheduledTime', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Patient Info */}
      {step === 2 && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>
            Pour qui est ce soin ?
          </h2>
          
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <button 
              className={`btn ${!form.isForOther ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1 }}
              onClick={() => {
                update('isForOther', false);
                update('patientInfo.name', `${user?.firstName} ${user?.lastName}`);
              }}
            >
              Pour moi
            </button>
            <button 
              className={`btn ${form.isForOther ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1 }}
              onClick={() => {
                update('isForOther', true);
                if (!form.patientInfo.name || form.patientInfo.name.includes(user?.firstName)) {
                  update('patientInfo.name', '');
                }
              }}
            >
              Pour un proche
            </button>
          </div>

          <div className="form-group" style={{ display: form.isForOther ? 'block' : 'none' }}>
            <label className="form-label">Nom du proche (Patient)</label>
            <input className="form-input" placeholder="Ex: Jean Dupont"
              value={form.patientInfo.name}
              onChange={e => update('patientInfo.name', e.target.value)} />
          </div>
          <div className="form-group">
             {/* Always ask for age / conditions, but label depends on for whom */}
            <label className="form-label">Âge {form.isForOther ? 'du patient' : ''}</label>
            <input className="form-input" type="number" placeholder="Ex: 75"
              value={form.patientInfo.age}
              onChange={e => update('patientInfo.age', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Conditions médicales / Antécédents</label>
            <textarea className="form-input form-textarea"
              placeholder="Pathologies, allergies, informations importantes..."
              value={form.patientInfo.conditions}
              onChange={e => update('patientInfo.conditions', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>
            Détails supplémentaires
          </h2>
          <div className="form-group">
            <label className="form-label">Description détaillée</label>
            <textarea className="form-input form-textarea"
              placeholder="Décrivez les soins nécessaires, les consignes particulières..."
              value={form.description}
              onChange={e => update('description', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Durée estimée (min)</label>
              <input className="form-input" type="number" min="15" step="15"
                value={form.estimatedDuration}
                onChange={e => update('estimatedDuration', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Budget estimé (€)</label>
              <input className="form-input" type="number" placeholder="30"
                value={form.estimatedCost}
                onChange={e => update('estimatedCost', e.target.value)} />
            </div>
          </div>
          <RecurrenceSelector value={form.recurrence} onChange={v => update('recurrence', v)} />
          {form.recurrence !== 'none' && (
            <div className="form-group animate-fadeIn" style={{ marginTop: 'var(--space-[-2])' }}>
              <label className="form-label">Jusqu'au (Date de fin)</label>
              <input className="form-input" type="date" min={form.scheduledDate || getTodayStr()}
                value={form.recurrenceEndDate}
                onChange={e => update('recurrenceEndDate', e.target.value)} />
            </div>
          )}
          <div>
            <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Documents (ordonnance, prescription...)</label>
            <DocumentUpload documents={form.documents} onChange={docs => update('documents', docs)} />
          </div>
        </div>
      )}

      {/* Step 4: Summary */}
      {step === 4 && (
        <div className="animate-fadeIn">
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
            Récapitulatif
          </h2>
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="mission-detail-info">
              <div className="mission-detail-row">
                <div className="mission-detail-row-icon"><Activity size={20} /></div>
                <div className="mission-detail-row-content">
                  <div className="mission-detail-row-label">Type de soin</div>
                  <div className="mission-detail-row-value">{getCareLabel(form.careType)}</div>
                </div>
              </div>
              <div className="mission-detail-row">
                <div className="mission-detail-row-icon"><MapPin size={20} /></div>
                <div className="mission-detail-row-content">
                  <div className="mission-detail-row-label">Adresse</div>
                  <div className="mission-detail-row-value">{form.address.street}, {form.address.city} {form.address.postalCode}</div>
                </div>
              </div>
              <div className="mission-detail-row">
                <div className="mission-detail-row-icon"><Calendar size={20} /></div>
                <div className="mission-detail-row-content">
                  <div className="mission-detail-row-label">Date & heure</div>
                  <div className="mission-detail-row-value">
                    {form.scheduledDate} à {form.scheduledTime}
                    {form.recurrence !== 'none' && form.recurrenceEndDate && (
                      <span style={{ display: 'block', fontSize: 'var(--font-xs)', color: 'var(--color-primary)' }}>
                        Jusqu'au {form.recurrenceEndDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mission-detail-row">
                <div className="mission-detail-row-icon"><User size={20} /></div>
                <div className="mission-detail-row-content">
                  <div className="mission-detail-row-label">Patient</div>
                  <div className="mission-detail-row-value">
                    {form.patientInfo.name}{form.patientInfo.age ? `, ${form.patientInfo.age} ans` : ''}
                  </div>
                </div>
              </div>
              {form.description && (
                <div className="mission-detail-row">
                  <div className="mission-detail-row-icon"><FileText size={20} /></div>
                  <div className="mission-detail-row-content">
                    <div className="mission-detail-row-label">Description</div>
                    <div className="mission-detail-row-value">{form.description}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-8)',
        ...(step > 0 ? {} : { justifyContent: 'flex-end' })
      }}>
        {step > 0 && (
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={18} /> Retour
          </button>
        )}
        {step < 4 ? (
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Suivant <ArrowRight size={18} />
          </button>
        ) : (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>
            <Check size={18} /> Confirmer la demande
          </button>
        )}
      </div>
    </div>
  );
}
