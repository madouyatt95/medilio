// ── Landing Page ──
import { useNavigate } from 'react-router-dom';
import {
  Heart, Shield, Clock, MapPin, Users, Star,
  FileText, Bell, ChevronRight, Activity
} from 'lucide-react';
import logo from '../assets/logo-medilio.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-badge">
          <img src={logo} alt="" style={{ height: '24px', width: 'auto', marginRight: '8px' }} />
          Plateforme de soins & d'aide à domicile
        </div>
        <h1>
          Trouvez un <span>intervenant à domicile</span> rapidement
        </h1>
        <p className="landing-hero-text">
          Medilio connecte les familles avec des soignants qualifiés et des intervenants d'aide à la personne pour un accompagnement à domicile sur-mesure.
        </p>
        <div className="landing-hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
            Créer une demande
            <ChevronRight size={20} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </div>
        <div className="landing-stats">
          <div className="landing-stat">
            <div className="landing-stat-value">500+</div>
            <div className="landing-stat-label">Intervenants</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">2 000+</div>
            <div className="landing-stat-label">Missions réalisées</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">4.9/5</div>
            <div className="landing-stat-label">Satisfaction</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <h2 className="landing-section-title">Comment ça marche ?</h2>
        <p className="landing-section-subtitle">
          Trois étapes simples pour obtenir un accompagnement à domicile de qualité
        </p>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3 className="landing-step-title">Décrivez vos besoins</h3>
            <p className="landing-step-text">
              Créez une demande en quelques minutes : soin, aide à la personne, adresse, date et horaires.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3 className="landing-step-title">Recevez des candidatures</h3>
            <p className="landing-step-text">
              Des professionnels et intervenants qualifiés près de chez vous postulent à votre demande. Consultez leurs profils.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3 className="landing-step-title">Choisissez votre pro</h3>
            <p className="landing-step-text">
              Sélectionnez l'intervenant qui vous convient le mieux pour vos soins ou votre aide du quotidien.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <h2 className="landing-section-title">Pourquoi Medilio ?</h2>
        <p className="landing-section-subtitle">
          Une plateforme pensée pour simplifier l'accès aux services de soin et d'aide à domicile
        </p>
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
              <Shield size={24} />
            </div>
            <h3 className="landing-feature-title">Professionnels vérifiés</h3>
            <p className="landing-feature-text">
              Tous nos professionnels sont diplômés et vérifiés pour garantir des soins de qualité.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #22D3EE)' }}>
              <Clock size={24} />
            </div>
            <h3 className="landing-feature-title">Disponibilité rapide</h3>
            <p className="landing-feature-text">
              Trouvez un professionnel disponible rapidement, même pour des besoins urgents.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
              <MapPin size={24} />
            </div>
            <h3 className="landing-feature-title">À proximité</h3>
            <p className="landing-feature-text">
              Des professionnels proches de chez vous pour une intervention rapide et régulière.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
              <FileText size={24} />
            </div>
            <h3 className="landing-feature-title">Notes de soins</h3>
            <p className="landing-feature-text">
              Suivez chaque intervention avec des notes détaillées rédigées par le professionnel.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}>
              <Bell size={24} />
            </div>
            <h3 className="landing-feature-title">Notifications</h3>
            <p className="landing-feature-text">
              Restez informé à chaque étape : candidatures, confirmations et rappels automatiques.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon" style={{ background: 'linear-gradient(135deg, #EF4444, #F87171)' }}>
              <Heart size={24} />
            </div>
            <h3 className="landing-feature-title">Suivi personnalisé</h3>
            <p className="landing-feature-text">
              Un tableau de bord complet pour suivre toutes vos missions et l'historique des soins.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>Prêt à trouver votre intervenant de confiance ?</h2>
        <p>Rejoignez Medilio et simplifiez le quotidien et l'accompagnement à domicile de vos proches.</p>
        <button className="btn btn-lg" onClick={() => navigate('/register')}>
          Commencer maintenant
          <ChevronRight size={20} />
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Medilio — Tous droits réservés</p>
      </footer>
    </div>
  );
}
