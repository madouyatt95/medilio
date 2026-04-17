// ── Admin Dashboard V2 — Analytics, Export CSV, Pro Verification ──
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import missionService from '../../services/missionService';
import ratingService from '../../services/ratingService';
import { MISSION_STATUS_LABELS, CARE_TYPES, CITIES } from '../../utils/constants';
import { formatDate, formatRelative } from '../../utils/dateUtils';
import { RatingDisplay } from '../../components/SharedComponents';
import {
  Users, ClipboardList, CheckCircle, Shield, Trash2,
  Ban, ChevronRight, UserCheck, Clock, TrendingUp,
  Download, BarChart3, Star, Eye, FileText, Upload,
  X, Check as CheckIcon
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [showVerifyModal, setShowVerifyModal] = useState(null);

  useEffect(() => {
    setUsers(authService.getAllUsers());
    setMissions(missionService.getAll());
  }, []);

  const patients = users.filter(u => u.role === 'patient');
  const pros = users.filter(u => u.role === 'professional');
  const verifiedPros = pros.filter(p => p.professionalInfo?.verified);
  const openMissions = missions.filter(m => m.status === 'open');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const totalRevenue = completedMissions.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0);

  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  const handleToggleUser = (userId) => {
    authService.toggleUserStatus(userId);
    setUsers(authService.getAllUsers());
  };

  const handleDeleteMission = (missionId) => {
    missionService.delete(missionId);
    setMissions(missionService.getAll());
  };

  const handleVerifyPro = (userId) => {
    const u = users.find(u => u.id === userId);
    if (u?.professionalInfo) {
      authService.updateProfile(userId, {
        professionalInfo: { ...u.professionalInfo, verified: !u.professionalInfo.verified }
      });
      setUsers(authService.getAllUsers());
    }
    setShowVerifyModal(null);
  };

  // ── Analytics Data ──
  const getMissionsByMonth = () => {
    const data = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      data[key] = { label, count: 0, completed: 0, revenue: 0 };
    }
    missions.forEach(m => {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (data[key]) {
        data[key].count++;
        if (m.status === 'completed') {
          data[key].completed++;
          data[key].revenue += Number(m.estimatedCost) || 0;
        }
      }
    });
    return Object.values(data);
  };

  const getMissionsByType = () => {
    const typeCount = {};
    missions.forEach(m => {
      const label = getCareLabel(m.careType);
      typeCount[label] = (typeCount[label] || 0) + 1;
    });
    return Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  };

  const getMissionsByCity = () => {
    const cityCount = {};
    missions.forEach(m => {
      const city = m.address?.city || 'Inconnu';
      cityCount[city] = (cityCount[city] || 0) + 1;
    });
    return Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  };

  const monthlyData = getMissionsByMonth();
  const maxMonthly = Math.max(...monthlyData.map(d => d.count), 1);

  // ── CSV Export ──
  const exportCSV = (type) => {
    let csv = '';
    let filename = '';

    if (type === 'users') {
      csv = 'Prénom,Nom,Email,Rôle,Téléphone,Ville,Inscrit le,Vérifié\n';
      users.forEach(u => {
        csv += `${u.firstName},${u.lastName},${u.email},${u.role},${u.phone || ''},${u.address?.city || ''},${formatDate(u.createdAt)},${u.professionalInfo?.verified ? 'Oui' : 'Non'}\n`;
      });
      filename = 'medilio_utilisateurs.csv';
    } else {
      csv = 'Type,Ville,Date,Heure,Patient,Statut,Candidatures,Coût,Créée le\n';
      missions.forEach(m => {
        csv += `${getCareLabel(m.careType)},${m.address?.city || ''},${m.scheduledDate},${m.scheduledTime},${m.patientInfo?.name || ''},${MISSION_STATUS_LABELS[m.status]},${m.applicants?.length || 0},${m.estimatedCost || 0}€,${formatDate(m.createdAt)}\n`;
      });
      filename = 'medilio_missions.csv';
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Simple Bar Chart ──
  const BarChart = ({ data, maxValue, color = 'var(--color-primary)', label }) => (
    <div>
      {label && <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)', height: 120 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>{d.count}</span>
            <div style={{
              width: '100%', borderRadius: '6px 6px 0 0',
              height: `${Math.max((d.count / maxValue) * 100, 4)}%`,
              background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
              transition: 'height 500ms ease',
              minHeight: 4,
            }} />
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Horizontal Bar ──
  const HorizontalBar = ({ items, maxValue, colors }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {items.map(([label, count], i) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>{count}</span>
          </div>
          <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${(count / maxValue) * 100}%`,
              background: colors?.[i % (colors?.length || 1)] || 'var(--color-primary-gradient)',
              transition: 'width 500ms ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-container full-width">
      <div className="dashboard-greeting animate-fadeIn">
        <h1>Administration 🛡️</h1>
        <p>Vue d'ensemble de la plateforme Medilio</p>
      </div>

      {/* Stats */}
      <div className="admin-grid animate-fadeInUp">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-primary-lighter)', color: 'var(--color-primary)' }}>
            <Users size={22} />
          </div>
          <div className="stat-card-value">{users.length}</div>
          <div className="stat-card-label">Utilisateurs</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
            <ClipboardList size={22} />
          </div>
          <div className="stat-card-value">{missions.length}</div>
          <div className="stat-card-label">Missions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-card-value">{verifiedPros.length}/{pros.length}</div>
          <div className="stat-card-label">Pros vérifiés</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-value">{totalRevenue}€</div>
          <div className="stat-card-label">Volume total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'analytics', 'users', 'missions', 'verification'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Vue d\'ensemble' : t === 'analytics' ? '📊 Analytics' : t === 'users' ? 'Utilisateurs' : t === 'missions' ? 'Missions' : '✓ Vérification'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="animate-fadeIn">
          <div className="section">
            <div className="section-title">
              <span>Derniers inscrits</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setTab('users')}>
                Tout voir <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {users.slice(-5).reverse().map(u => (
                <div key={u.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)'
                }}>
                  <div className="avatar avatar-sm">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      {u.role === 'patient' ? '👤 Patient' : u.role === 'professional' ? '🩺 Pro' : '🛡️ Admin'} · {formatRelative(u.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-title">
              <span>Dernières missions</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setTab('missions')}>Tout voir <ChevronRight size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {missions.slice(-5).reverse().map(m => (
                <div key={m.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)'
                }}>
                  <div className="mission-card-type-icon" style={{ width: 36, height: 36 }}><ClipboardList size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{getCareLabel(m.careType)} — {m.address?.city}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{formatDate(m.scheduledDate)}</div>
                  </div>
                  <span className={`badge badge-${m.status}`}><span className="badge-dot" /> {MISSION_STATUS_LABELS[m.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {tab === 'analytics' && (
        <div className="animate-fadeIn">
          {/* Missions per month chart */}
          <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)' }}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
              Missions par mois
            </div>
            <BarChart data={monthlyData} maxValue={maxMonthly} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* Missions by type */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ fontWeight: 700, marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
                Par type de soin
              </div>
              <HorizontalBar
                items={getMissionsByType()}
                maxValue={Math.max(...getMissionsByType().map(([, c]) => c), 1)}
                colors={['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
              />
            </div>

            {/* Missions by city */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ fontWeight: 700, marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
                Par ville
              </div>
              <HorizontalBar
                items={getMissionsByCity()}
                maxValue={Math.max(...getMissionsByCity().map(([, c]) => c), 1)}
                colors={['#06B6D4', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="admin-grid" style={{ marginTop: 'var(--space-5)' }}>
            <div className="stat-card">
              <div className="stat-card-value">{missions.length > 0 ? Math.round(completedMissions.length / missions.length * 100) : 0}%</div>
              <div className="stat-card-label">Taux de complétion</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{completedMissions.length > 0 ? Math.round(totalRevenue / completedMissions.length) : 0}€</div>
              <div className="stat-card-label">Panier moyen</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">
                {missions.length > 0 ? (missions.reduce((s, m) => s + (m.applicants?.length || 0), 0) / missions.length).toFixed(1) : 0}
              </div>
              <div className="stat-card-label">Candidatures/mission</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{ratingService.getAll().length}</div>
              <div className="stat-card-label">Avis déposés</div>
            </div>
          </div>

          {/* Export */}
          <div className="card" style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Download size={16} /> Exporter les données :
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('users')}>
              <Users size={14} /> Utilisateurs CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('missions')}>
              <ClipboardList size={14} /> Missions CSV
            </button>
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('users')}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="table-responsive">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr><th>Utilisateur</th><th>Rôle</th><th>Email</th><th>Note</th><th>Statut</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const proR = u.role === 'professional' ? ratingService.getProAverageRating(u.id) : null;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div className="avatar avatar-sm">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                            <span style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`tag ${u.role === 'professional' ? 'tag-success' : u.role === 'admin' ? 'tag-warning' : ''}`}>
                            {u.role === 'patient' ? 'Patient' : u.role === 'professional' ? 'Pro' : 'Admin'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-xs)' }}>{u.email}</td>
                        <td>{proR && proR.count > 0 ? <RatingDisplay average={proR.average} count={proR.count} size={12} /> : '—'}</td>
                        <td>
                          {u.disabled ? (
                            <span className="badge badge-cancelled"><span className="badge-dot" /> Désactivé</span>
                          ) : u.role === 'professional' && u.professionalInfo?.verified ? (
                            <span className="badge badge-completed"><span className="badge-dot" /> Vérifié</span>
                          ) : (
                            <span className="badge badge-open"><span className="badge-dot" /> Actif</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-table-actions">
                            {u.role === 'professional' && (
                              <button className="btn btn-ghost btn-sm" title="Vérifier"
                                onClick={() => setShowVerifyModal(u)}>
                                <Shield size={14} />
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button className="btn btn-ghost btn-sm" title="Désactiver"
                                onClick={() => handleToggleUser(u.id)}>
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Missions Tab ── */}
      {tab === 'missions' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('missions')}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="table-responsive">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead><tr><th>Mission</th><th>Ville</th><th>Date</th><th>Candidatures</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {missions.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{getCareLabel(m.careType)}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{m.patientInfo?.name}</div>
                      </td>
                      <td>{m.address?.city}</td>
                      <td style={{ fontSize: 'var(--font-xs)' }}>{formatDate(m.scheduledDate)}</td>
                      <td>{m.applicants?.length || 0}</td>
                      <td><span className={`badge badge-${m.status}`}><span className="badge-dot" /> {MISSION_STATUS_LABELS[m.status]}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDeleteMission(m.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Verification Tab ── */}
      {tab === 'verification' && (
        <div className="animate-fadeIn">
          <div className="section">
            <div className="section-title">Professionnels en attente de vérification</div>
            {pros.filter(p => !p.professionalInfo?.verified).length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon"><CheckCircle size={28} /></div>
                <div className="empty-state-title">Tout est vérifié</div>
                <div className="empty-state-text">Aucun professionnel en attente de vérification.</div>
              </div>
            ) : (
              pros.filter(p => !p.professionalInfo?.verified).map(pro => {
                const proR = ratingService.getProAverageRating(pro.id);
                return (
                  <div key={pro.id} className="card" style={{
                    display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-5)',
                    marginBottom: 'var(--space-3)', alignItems: 'flex-start',
                  }}>
                    <div className="avatar avatar-lg">{pro.firstName?.[0]}{pro.lastName?.[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{pro.firstName} {pro.lastName}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                        {pro.email} · {pro.phone}
                      </div>
                      <div className="tags" style={{ marginBottom: 'var(--space-2)' }}>
                        {pro.professionalInfo?.specialties?.map(s => (
                          <span key={s} className="tag">{s}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                        📍 {pro.professionalInfo?.serviceArea?.city || '—'} · Rayon {pro.professionalInfo?.serviceArea?.radius} km
                      </div>
                      {pro.professionalInfo?.bio && (
                        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          "{pro.professionalInfo.bio}"
                        </div>
                      )}
                      {proR.count > 0 && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <RatingDisplay average={proR.average} count={proR.count} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleVerifyPro(pro.id)}>
                        <CheckIcon size={14} /> Vérifier
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleToggleUser(pro.id)}>
                        <Ban size={14} /> Rejeter
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="section">
            <div className="section-title">Professionnels vérifiés ({verifiedPros.length})</div>
            {verifiedPros.map(pro => {
              const proR = ratingService.getProAverageRating(pro.id);
              return (
                <div key={pro.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-2)',
                }}>
                  <div className="avatar avatar-sm">{pro.firstName?.[0]}{pro.lastName?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{pro.firstName} {pro.lastName}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      {pro.professionalInfo?.specialties?.join(', ')}
                    </div>
                  </div>
                  {proR.count > 0 && <RatingDisplay average={proR.average} count={proR.count} size={12} />}
                  <span className="badge badge-completed"><Shield size={10} /> Vérifié</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Vérifier le professionnel</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowVerifyModal(null)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <div className="avatar avatar-lg">{showVerifyModal.firstName?.[0]}{showVerifyModal.lastName?.[0]}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{showVerifyModal.firstName} {showVerifyModal.lastName}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  {showVerifyModal.professionalInfo?.specialties?.join(', ')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowVerifyModal(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => handleVerifyPro(showVerifyModal.id)}>
                <Shield size={16} /> {showVerifyModal.professionalInfo?.verified ? 'Retirer' : 'Vérifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
