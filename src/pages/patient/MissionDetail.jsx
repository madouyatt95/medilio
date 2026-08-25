// ── Mission Detail (Patient View) — V2 with Rating, Chat, Favorites, Documents ──
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import authService from '../../services/authService';
import ratingService from '../../services/ratingService';
import favoritesService from '../../services/favoritesService';
import emailService from '../../services/emailService';
import { CARE_TYPES, MISSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatRelative } from '../../utils/dateUtils';
import { RatingDisplay, RatingModal, DocumentUpload, LoadingState, LoadErrorState } from '../../components/SharedComponents';
import { withTimeout } from '../../utils/async';
import {
  ArrowLeft, MapPin, Calendar, Clock, User, FileText,
  CheckCircle, X, Users, MessageCircle, Heart, Star
} from 'lucide-react';

export default function PatientMissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [mission, setMission] = useState(null);
  const [applicantUsers, setApplicantUsers] = useState({});
  const [showRating, setShowRating] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [proRatings, setProRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setLoadError('');

      let m;
      try {
        m = await withTimeout(missionService.getById(id));
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Impossible de charger cette demande.');
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (!m) {
        if (!cancelled) setLoadError('Cette demande est introuvable ou vous n’êtes pas autorisé à la consulter.');
        return;
      }
      if (cancelled) return;
      setMission(m);

      try {
        await withTimeout((async () => {
          const professionalIds = [...new Set([
            ...(m.applicants || []).map(applicant => applicant.proId),
            m.assignedProId,
          ].filter(Boolean))];
          const professionals = await Promise.all(
            professionalIds.map(proId => authService.getPublicProfessional(proId).catch(() => null))
          );
          const userMap = {};
          professionals.filter(Boolean).forEach(profile => { userMap[profile.id] = profile; });
          if (m.assignedProId) {
            const assignedProfile = await authService.getProfile(m.assignedProId).catch(() => null);
            if (assignedProfile) userMap[assignedProfile.id] = assignedProfile;
          }
          if (!cancelled) setApplicantUsers(userMap);

          const rating = await ratingService.getByMission(id);
          if (!cancelled) setExistingRating(rating);

          const ratingIds = [...new Set([
            ...(m.applicants || []).map(applicant => applicant.proId),
            m.assignedProId,
          ].filter(Boolean))];
          const ratingEntries = await Promise.all(ratingIds.map(async proId => [
            proId,
            await ratingService.getProAverageRating(proId),
          ]));
          if (!cancelled) setProRatings(Object.fromEntries(ratingEntries));

          if (user?.role === 'patient') {
            const favIds = await favoritesService.getFavoriteProIds(user.id);
            if (!cancelled) setFavorites(Object.fromEntries(favIds.map(favoriteId => [favoriteId, true])));
          }
        })());
      } catch (error) {
        console.warn('Informations complémentaires indisponibles', error);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [id, user, reloadKey]);

  // Prompt rating automatically if mission completed and not rated
  useEffect(() => {
    if (mission && mission.status === 'completed' && existingRating === null && mission.assignedProId) {
      const timer = setTimeout(() => setShowRating(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [mission, existingRating]);

  if (loading) return <LoadingState label="Chargement de la demande…" />;
  if (loadError || !mission) {
    return (
      <LoadErrorState
        title="Demande inaccessible"
        message={loadError || 'Cette demande est introuvable.'}
        onBack={() => navigate('/patient/dashboard')}
        onRetry={() => setReloadKey(key => key + 1)}
      />
    );
  }

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const handleAccept = async (proId) => {
    const updated = await missionService.acceptApplicant(mission.id, proId);
    setMission(updated);
    showToast('Professionnel accepté !', 'success');

    // Send email notification to the accepted pro
    void emailService.notifyMissionAccepted({ mission: updated }).catch(() => {
      showToast('Mission affectée, mais l’email de confirmation n’a pas pu être envoyé.', 'info');
    });
  };

  const handleReject = async (proId) => {
    const updated = await missionService.rejectApplicant(mission.id, proId);
    setMission(updated);
    showToast('Candidature refusée', 'info');
  };

  const handleComplete = async () => {
    const updated = await missionService.updateStatus(mission.id, 'completed');
    setMission(updated);
    showToast('Demande marquée comme terminée !', 'success');
    setTimeout(() => setShowRating(true), 500);
  };

  const handleCancel = async () => {
    const updated = await missionService.updateStatus(mission.id, 'cancelled');
    setMission(updated);
    showToast('Demande annulée', 'warning');
  };

  const handleRate = async ({ score, comment }) => {
    await ratingService.create({
      missionId: mission.id,
      patientId: user.id,
      proId: mission.assignedProId,
      score, comment,
    });
    const r = await ratingService.getByMission(mission.id);
    setExistingRating(r);
    setShowRating(false);
    showToast('Merci pour votre évaluation !', 'success');
  };

  const toggleFavorite = async (proId) => {
    const added = await favoritesService.toggle(user.id, proId);
    setFavorites(prev => ({ ...prev, [proId]: added }));
    showToast(added ? 'Ajouté aux favoris ❤️' : 'Retiré des favoris', 'info');
  };

  const assignedPro = mission.assignedProId ? applicantUsers[mission.assignedProId] : null;
  const proRating = assignedPro ? proRatings[assignedPro.id] : null;

  return (
    <div className="page-container">
      {/* Header */}
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

      {/* Details Card */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="mission-detail-info">
          <div className="mission-detail-row">
            <div className="mission-detail-row-icon"><MapPin size={20} /></div>
            <div className="mission-detail-row-content">
              <div className="mission-detail-row-label">Adresse</div>
              <div className="mission-detail-row-value">{mission.address?.street}, {mission.address?.city} {mission.address?.postalCode}</div>
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
              <div className="mission-detail-row-label">Durée / Récurrence</div>
              <div className="mission-detail-row-value">
                {mission.estimatedDuration} min
                {mission.recurrence && mission.recurrence !== 'none' && (
                  <span className="tag" style={{ marginLeft: 8 }}>
                    🔁 {mission.recurrence === 'daily' ? 'Quotidienne' : mission.recurrence === 'weekly' ? 'Hebdomadaire' : mission.recurrence === 'biweekly' ? 'Bi-hebdo' : 'Mensuelle'}
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

      {/* Documents */}
      {mission.documents?.length > 0 && (
        <div className="section">
          <div className="section-title">Documents joints</div>
          <DocumentUpload documents={mission.documents} readonly />
        </div>
      )}

      {/* Assigned Pro */}
      {assignedPro && (
        <div className="section">
          <div className="section-title">Professionnel assigné</div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div className="avatar avatar-lg" style={{
                backgroundImage: assignedPro.avatar ? `url(${assignedPro.avatar})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
                color: assignedPro.avatar ? 'transparent' : 'var(--text-primary)'
              }}>
                {assignedPro.firstName?.[0]}{assignedPro.lastName?.[0]}
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/pro/view/${assignedPro.id}`)}>
                <div style={{ fontWeight: 700 }}>{assignedPro.firstName} {assignedPro.lastName}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  {assignedPro.professionalInfo?.specialties?.join(', ')}
                </div>
                {proRating && <RatingDisplay average={proRating.average} count={proRating.count} />}
              </div>
              {user?.role === 'patient' && <button className="btn btn-ghost btn-icon" onClick={() => toggleFavorite(assignedPro.id)}
                style={{ color: favorites[assignedPro.id] ? '#EF4444' : 'var(--text-tertiary)' }}>
                <Heart size={20} fill={favorites[assignedPro.id] ? '#EF4444' : 'none'} />
              </button>}
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
              📞 {assignedPro.phone}
            </div>
            {(mission.status === 'assigned' || mission.status === 'in_progress') && (
              <button className="btn btn-secondary btn-block btn-sm"
                onClick={() => navigate(`/chat/${mission.id}`)}>
                <MessageCircle size={16} /> Envoyer un message
              </button>
            )}
          </div>
        </div>
      )}

      {/* Existing Rating */}
      {existingRating && (
        <div className="section">
          <div className="section-title">Votre évaluation</div>
          <div className="card">
            <RatingDisplay average={existingRating.score} count={0} size={20} />
            {existingRating.comment && (
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                "{existingRating.comment}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Applicants */}
      {mission.status === 'open' && mission.applicants?.length > 0 && (
        <div className="section">
          <div className="section-title">Candidatures ({mission.applicants.length})</div>
          {mission.applicants.map(app => {
            const pro = applicantUsers[app.proId];
            if (!pro) return null;
            const proR = proRatings[app.proId] || { average: 0, count: 0 };
            return (
              <div key={app.proId} className="applicant-card" onClick={() => navigate(`/pro/view/${app.proId}`)} style={{ cursor: 'pointer' }}>
                <div className="avatar" style={{
                  backgroundImage: pro.avatar ? `url(${pro.avatar})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  color: pro.avatar ? 'transparent' : 'var(--text-primary)'
                }}>
                  {pro.firstName?.[0]}{pro.lastName?.[0]}
                </div>
                <div className="applicant-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="applicant-name">{pro.firstName} {pro.lastName}</span>
                    {user?.role === 'patient' && <button className="btn btn-ghost" style={{ padding: 2, color: favorites[app.proId] ? '#EF4444' : 'var(--text-tertiary)' }}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(app.proId); }}>
                      <Heart size={14} fill={favorites[app.proId] ? '#EF4444' : 'none'} />
                    </button>}
                  </div>
                  <div className="applicant-specialty">{pro.professionalInfo?.specialties?.join(', ')}</div>
                  {proR.count > 0 && <RatingDisplay average={proR.average} count={proR.count} size={12} />}
                  {app.message && <div className="applicant-message">"{app.message}"</div>}
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Postulé {formatRelative(app.appliedAt)}
                  </div>
                </div>
                <div className="applicant-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleAccept(app.proId)}>
                    <CheckCircle size={14} /> Accepter
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleReject(app.proId)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mission.status === 'open' && mission.applicants?.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', marginBottom: 'var(--space-5)' }}>
          <Users size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>En attente de candidatures</div>
          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            La mission est visible par les professionnels vérifiés de votre secteur.
          </div>
        </div>
      )}

      {/* Care Notes */}
      {mission.careNotes?.length > 0 && (
        <div className="section">
          <div className="section-title">Notes de soins</div>
          {mission.careNotes.map(note => {
            const author = applicantUsers[note.proId];
            return (
              <div key={note.id} className="care-note">
                <div className="care-note-header">
                  <div className="care-note-author">{author ? `${author.firstName} ${author.lastName}` : 'Professionnel'}</div>
                  <div className="care-note-date">{formatRelative(note.createdAt)}</div>
                </div>
                <div className="care-note-content">{note.content}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {mission.status === 'assigned' && (
          <button className="btn btn-success btn-block" onClick={handleComplete}>
            <CheckCircle size={18} /> Marquer comme terminée
          </button>
        )}
        {mission.status === 'completed' && !existingRating && assignedPro && (
          <button className="btn btn-primary btn-block" onClick={() => setShowRating(true)}>
            <Star size={18} /> Évaluer le professionnel
          </button>
        )}
        {(mission.status === 'open' || mission.status === 'assigned') && (
          <button className="btn btn-ghost btn-block" style={{ color: 'var(--color-danger)' }} onClick={handleCancel}>
            <X size={18} /> Annuler
          </button>
        )}
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleRate}
        proName={assignedPro ? `${assignedPro.firstName} ${assignedPro.lastName}` : ''}
      />
    </div>
  );
}
