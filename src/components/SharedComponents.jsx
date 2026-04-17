// ── Shared UI Components ──
import { useState, useRef, useEffect } from 'react';
import { Star, Upload, X, File, Image, ChevronLeft, ChevronRight, MessageCircle, Send } from 'lucide-react';

// ── Skeleton Loading ──
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, className = '' }) {
  return (
    <div className={`skeleton ${className}`} style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Skeleton width={36} height={36} borderRadius={8} />
          <Skeleton width={120} height={18} />
        </div>
        <Skeleton width={80} height={24} borderRadius={99} />
      </div>
      <Skeleton width="90%" height={14} className="mb-2" />
      <Skeleton width="70%" height={14} className="mb-2" />
      <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={100} height={14} />
        <Skeleton width={50} height={18} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

// ── Star Rating ──
export function StarRating({ value = 0, onChange, size = 24, readonly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: 2, cursor: readonly ? 'default' : 'pointer' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          fill={(hover || value) >= star ? '#F59E0B' : 'transparent'}
          color={(hover || value) >= star ? '#F59E0B' : '#CBD5E1'}
          style={{ transition: 'all 150ms ease' }}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star)}
        />
      ))}
    </div>
  );
}

export function RatingDisplay({ average, count, size = 16 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <StarRating value={Math.round(average)} size={size} readonly />
      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: '#F59E0B' }}>
        {average > 0 ? average.toFixed(1) : '—'}
      </span>
      {count > 0 && (
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
          ({count} avis)
        </span>
      )}
    </div>
  );
}

// ── Rating Modal ──
export function RatingModal({ isOpen, onClose, onSubmit, proName }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (score === 0) return;
    onSubmit({ score, comment });
    setScore(0);
    setComment('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Évaluer {proName}
          </h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            Comment s'est passée cette mission ?
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
          <StarRating value={score} onChange={setScore} size={40} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)', fontSize: 'var(--font-lg)', fontWeight: 600 }}>
          {score === 1 && '😞 Décevant'}
          {score === 2 && '😐 Passable'}
          {score === 3 && '🙂 Correct'}
          {score === 4 && '😊 Très bien'}
          {score === 5 && '🤩 Excellent'}
        </div>

        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="form-label">Commentaire (optionnel)</label>
          <textarea className="form-input form-textarea"
            placeholder="Partagez votre expérience..."
            value={comment} onChange={e => setComment(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={score === 0}>
            <Star size={16} /> Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document Upload ──
export function DocumentUpload({ documents = [], onChange, readonly = false }) {
  const fileRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return; // 5MB limit
      const reader = new FileReader();
      reader.onload = () => {
        const doc = {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result,
        };
        onChange?.([...documents, doc]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeDoc = (id) => {
    onChange?.(documents.filter(d => d.id !== id));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  const isImage = (type) => type?.startsWith('image/');

  return (
    <div>
      {!readonly && (
        <>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx"
            style={{ display: 'none' }} onChange={handleFiles} />
          <button className="btn btn-secondary btn-block" onClick={() => fileRef.current?.click()}
            style={{ marginBottom: documents.length > 0 ? 'var(--space-3)' : 0 }}>
            <Upload size={16} /> Ajouter un document
          </button>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)', textAlign: 'center' }}>
            Images, PDF, Word — Max 5 Mo
          </p>
        </>
      )}

      {documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          {documents.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-3)', background: 'var(--bg-body)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
            }}>
              {isImage(doc.type) ? (
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  <img src={doc.data} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary-lighter)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <File size={18} />
                </div>
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 'var(--font-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                  {formatSize(doc.size)}
                </div>
              </div>
              {!readonly && (
                <button className="btn btn-ghost btn-icon" onClick={() => removeDoc(doc.id)}
                  style={{ color: 'var(--color-danger)' }}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mini Calendar ──
export function MiniCalendar({ missions = [], onDateClick, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1));

  // Count missions per day
  const missionDays = {};
  missions.forEach(m => {
    const d = m.scheduledDate?.split('T')[0];
    if (d) {
      const [y, mo, da] = d.split('-').map(Number);
      if (y === year && mo - 1 === month) {
        missionDays[da] = (missionDays[da] || 0) + 1;
      }
    }
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells = [];
  for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-4)'
      }}>
        <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={18} /></button>
        <span style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>
          {monthNames[month]} {year}
        </span>
        <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={18} /></button>
      </div>

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 'var(--space-2)' }}>
        {dayNames.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 'var(--font-xs)', fontWeight: 600,
            color: 'var(--text-tertiary)', padding: '4px 0',
          }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasMissions = missionDays[day] > 0;

          return (
            <button key={day}
              onClick={() => onDateClick?.(dateStr)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--font-sm)', fontWeight: isToday || isSelected ? 700 : 400,
                background: isSelected ? 'var(--color-primary)' : isToday ? 'var(--color-primary-lighter)' : 'transparent',
                color: isSelected ? 'white' : isToday ? 'var(--color-primary)' : 'var(--text-primary)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'all 150ms ease',
              }}>
              {day}
              {hasMissions && (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isSelected ? 'white' : 'var(--color-primary)',
                  marginTop: 2,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Chat Bubble Component ──
export function ChatBubble({ message, isOwn }) {
  return (
    <div style={{
      display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start',
      marginBottom: 'var(--space-2)',
    }}>
      <div style={{
        maxWidth: '80%',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isOwn ? 'var(--color-primary)' : 'var(--bg-body)',
        color: isOwn ? 'white' : 'var(--text-primary)',
        fontSize: 'var(--font-sm)',
        lineHeight: 1.5,
      }}>
        {!isOwn && (
          <div style={{
            fontSize: 'var(--font-xs)', fontWeight: 600,
            color: 'var(--color-primary)', marginBottom: 2,
          }}>
            {message.senderName}
          </div>
        )}
        <div>{message.content}</div>
        <div style={{
          fontSize: '10px', textAlign: 'right', marginTop: 4,
          opacity: 0.7,
        }}>
          {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ── Recurrence Selector ──
export function RecurrenceSelector({ value, onChange }) {
  const options = [
    { id: 'none', label: 'Ponctuelle' },
    { id: 'daily', label: 'Quotidienne' },
    { id: 'weekly', label: 'Hebdomadaire' },
    { id: 'biweekly', label: 'Bi-hebdomadaire' },
    { id: 'monthly', label: 'Mensuelle' },
  ];

  return (
    <div className="form-group">
      <label className="form-label">Récurrence</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {options.map(opt => (
          <button key={opt.id}
            className={`radar-filter-chip ${value === opt.id ? 'active' : ''}`}
            onClick={() => onChange(opt.id)}
            type="button">
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
