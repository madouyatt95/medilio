import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo-medilio.png';

const operatorName = import.meta.env.VITE_LEGAL_OPERATOR || 'Information éditeur à compléter';
const privacyContact = import.meta.env.VITE_PRIVACY_CONTACT || 'Contact confidentialité à compléter';

export default function LegalPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname === '/confidentialite';

  return (
    <main className="page-container" style={{ maxWidth: 760, paddingTop: 32, paddingBottom: 64 }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <img src={logo} alt="" width="36" height="36" />
        <strong>Medilio</strong>
      </Link>

      <h1 className="page-title">{isPrivacy ? 'Politique de confidentialité' : 'Mentions légales'}</h1>

      {isPrivacy ? (
        <div className="card" style={{ display: 'grid', gap: 22, lineHeight: 1.65 }}>
          <section>
            <h2>Responsable du traitement</h2>
            <p>{operatorName}. Contact : {privacyContact}.</p>
          </section>
          <section>
            <h2>Données traitées</h2>
            <p>Medilio traite les données de compte, coordonnées, demandes de soins, documents transmis, candidatures, messages, notes de soins et journaux techniques nécessaires au service.</p>
          </section>
          <section>
            <h2>Finalités et accès</h2>
            <p>Ces données servent à gérer les comptes, organiser les missions et permettre les échanges entre le demandeur, l’établissement et le professionnel affecté. Les accès sont limités par rôle et par participation à la mission.</p>
          </section>
          <section>
            <h2>Conservation et droits</h2>
            <p>Les durées de conservation doivent être définies par l’éditeur selon ses obligations légales et médicales. Vous pouvez demander l’accès, la rectification, la limitation ou la suppression de vos données via le contact ci-dessus.</p>
          </section>
          <section>
            <h2>Hébergement de données de santé</h2>
            <p>Avant toute exploitation avec des données de santé réelles, l’éditeur doit valider le périmètre réglementaire applicable, contractualiser un hébergement adapté et documenter ses sous-traitants.</p>
          </section>
        </div>
      ) : (
        <div className="card" style={{ display: 'grid', gap: 22, lineHeight: 1.65 }}>
          <section>
            <h2>Éditeur</h2>
            <p>{operatorName}. Les coordonnées juridiques, le représentant de publication, l’adresse, le numéro d’immatriculation et le contact doivent être renseignés avant publication commerciale.</p>
          </section>
          <section>
            <h2>Hébergement</h2>
            <p>L’interface et la base de données utilisent des prestataires distincts. L’éditeur doit publier leurs identités, localisations contractuelles et garanties applicables à son déploiement.</p>
          </section>
          <section>
            <h2>Responsabilité</h2>
            <p>Medilio facilite la coordination. Le service ne remplace ni le diagnostic, ni l’urgence médicale, ni la relation entre le patient et le professionnel.</p>
          </section>
        </div>
      )}

      <p style={{ marginTop: 24 }}><Link to="/">Retour à l’accueil</Link></p>
    </main>
  );
}
