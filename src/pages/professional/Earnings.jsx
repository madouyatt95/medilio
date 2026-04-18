// ── Earnings Page ──
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import missionService from '../../services/missionService';
import { CARE_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  TrendingUp, DollarSign, Calendar, CheckCircle,
  ArrowLeft, ClipboardList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    async function load() {
      if (user) {
        const myMissions = await missionService.getByProfessional(user.id);
        setMissions(myMissions.filter(m => m.status === 'completed'));
      }
    }
    load();
  }, [user]);

  const totalEarnings = missions.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);
  const getCareLabel = (type) => CARE_TYPES.find(c => c.id === type)?.label || type;

  // Group by month
  const monthlyData = {};
  missions.forEach(m => {
    const date = new Date(m.completedAt || m.scheduledDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { total: 0, count: 0 };
    monthlyData[key].total += Number(m.estimatedCost) || 0;
    monthlyData[key].count++;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Mes revenus</h1>
      </div>

      {/* Total */}
      <div className="earnings-total animate-fadeIn">
        <div className="earnings-total-label">Revenus totaux</div>
        <div className="earnings-total-value">{totalEarnings} €</div>
        <div style={{ marginTop: 'var(--space-3)', opacity: 0.8, fontSize: 'var(--font-sm)' }}>
          {missions.length} mission(s) complétée(s)
        </div>
      </div>

      {/* Stats cards */}
      <div className="dashboard-stats" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-card-value">{missions.length}</div>
          <div className="stat-card-label">Missions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">
            {missions.length > 0 ? Math.round(totalEarnings / missions.length) : 0} €
          </div>
          <div className="stat-card-label">Moyenne</div>
        </div>
      </div>

      {/* Mission History */}
      <div className="section">
        <div className="section-title">Historique</div>
        {missions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><TrendingUp size={28} /></div>
            <div className="empty-state-title">Aucun revenu</div>
            <div className="empty-state-text">Complétez votre première mission pour voir vos revenus ici.</div>
          </div>
        ) : (
          <div className="earnings-list">
            {missions.map(m => (
              <div key={m.id} className="earnings-item"
                onClick={() => navigate(`/pro/mission/${m.id}`)} style={{ cursor: 'pointer' }}>
                <div className="earnings-item-left">
                  <div className="mission-card-type-icon" style={{ width: 36, height: 36 }}>
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <div className="earnings-item-type">{getCareLabel(m.careType)}</div>
                    <div className="earnings-item-date">{formatDate(m.completedAt || m.scheduledDate)}</div>
                  </div>
                </div>
                <div className="earnings-item-amount">+{m.estimatedCost || 0} €</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
