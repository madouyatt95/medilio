import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ratingService } from '../../services/ratingService';
import { RatingDisplay } from '../../components/SharedComponents';
import { ArrowLeft, Star, MapPin, Briefcase, Award, MessageCircle, Calendar } from 'lucide-react';
import { formatRelative } from '../../utils/dateUtils';

export default function ProPublicProfile() {
  const { proId } = useParams();
  const navigate = useNavigate();
  const [pro, setPro] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const profile = await authService.getProfile(proId);
        if (profile) {
          setPro(profile);
          const proRatings = await ratingService.getByPro(proId);
          setRatings(proRatings);
          const proStats = await ratingService.getProAverageRating(proId);
          setStats(proStats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [proId]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!pro) return <div className="page-container">Professionnel non trouvé</div>;

  return (
    <div className="page-container animate-fadeIn">
      <div className="header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>Profil de {pro.firstName}</h1>
      </div>

      {/* Hero Card */}
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <div className="avatar avatar-xl" style={{
          margin: '0 auto var(--space-4)',
          width: '100px', height: '100px',
          backgroundImage: pro.avatar ? `url(${pro.avatar})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          color: pro.avatar ? 'transparent' : 'white',
          fontSize: 'var(--font-3xl)',
          border: '4px solid white',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {!pro.avatar && <span>{pro.firstName?.[0]}{pro.lastName?.[0]}</span>}
        </div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
          {pro.firstName} {pro.lastName}
          {pro.professionalInfo?.verified && <Award size={20} style={{ color: 'var(--color-primary)', marginLeft: 8, verticalAlign: 'middle' }} />}
        </h2>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', fontWeight: 500 }}>
          {pro.professionalInfo?.specialties?.join(' · ')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
          <RatingDisplay average={stats.average} count={stats.count} size={20} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
          <div style={{ color: 'var(--color-primary)', marginBottom: 4 }}><Briefcase size={20} /></div>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)' }}>Expérimenté</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Inscrit {formatRelative(pro.createdAt)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
          <div style={{ color: 'var(--color-success)', marginBottom: 4 }}><MapPin size={20} /></div>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)' }}>{pro.professionalInfo?.serviceArea?.radius}km</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Autour de {pro.professionalInfo?.serviceArea?.city}</div>
        </div>
      </div>

      {/* Bio */}
      <div className="section">
        <div className="section-title">À propos</div>
        <div className="card" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {pro.professionalInfo?.bio || "Ce professionnel n'a pas encore rédigé de biographie."}
        </div>
      </div>

      {/* Ratings & Reviews */}
      <div className="section">
        <div className="section-title">Avis et notes ({stats.count})</div>
        {ratings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)' }}>
            Aucun avis pour le moment
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {ratings.map(r => (
              <div key={r.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <RatingDisplay average={r.score} count={0} size={14} />
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{formatRelative(r.createdAt)}</span>
                </div>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)', margin: 0 }}>
                  {r.comment || "Aucun commentaire laissé."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 'var(--space-10)' }} />
    </div>
  );
}
