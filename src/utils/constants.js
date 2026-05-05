// ── Medilio Constants ──

export const ROLES = {
  PATIENT: 'patient',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin',
};

export const MISSION_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const MISSION_STATUS_LABELS = {
  open: 'Ouverte',
  assigned: 'Assignée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export const MISSION_STATUS_COLORS = {
  open: 'var(--color-info)',
  assigned: 'var(--color-warning)',
  in_progress: 'var(--color-secondary)',
  completed: 'var(--color-success)',
  cancelled: 'var(--color-danger)',
};

export const CARE_TYPES = [
  { id: 'blood_test', label: 'Prise de sang', icon: 'Droplet', description: 'Prélèvement sanguin à domicile' },
  { id: 'bandage', label: 'Pansement', icon: 'Bandage', description: 'Changement de pansement, soins de plaie' },
  { id: 'injection', label: 'Injection / Vaccin', icon: 'Syringe', description: 'Injections (sous-cutanée, intramusculaire...)' },
  { id: 'hygiene', label: 'Aide à la toilette', icon: 'ShowerHead', description: 'Aide complète ou partielle à la toilette' },
  { id: 'sutures', label: 'Fils et Agrafes', icon: 'Scissors', description: 'Ablation de fils ou d\'agrafes' },
  { id: 'infusion', label: 'Perfusion', icon: 'Droplets', description: 'Pose et surveillance de perfusion' },
  { id: 'diabetes', label: 'Soins diabétiques', icon: 'Activity', description: 'Insuline, glycémie capillaire' },
  { id: 'catheter', label: 'Sondage urinaire', icon: 'TestTube', description: 'Pose, changement ou retrait de sonde' },
  { id: 'respiratory', label: 'Soins respiratoires', icon: 'Wind', description: 'Aérosols, oxygénothérapie' },
  { id: 'medication', label: 'Médicaments', icon: 'Pill', description: 'Préparation et distribution des piluliers' },
  { id: 'rehabilitation', label: 'Rééducation', icon: 'Dumbbell', description: 'Exercices et maintien de la mobilité' },
  { id: 'palliative', label: 'Soins palliatifs', icon: 'Heart', description: 'Accompagnement, confort et fin de vie' },
  { id: 'other', label: 'Autre besoin', icon: 'Plus', description: 'Soin spécifique non listé' },
];

export const SPECIALTIES = [
  'Infirmier(e) D.E.',
  'Infirmier(e) Libéral(e)',
  'Infirmier(e) Puériculteur(trice)',
  'Aide-soignant(e)',
  'Auxiliaire de vie',
  'Kinésithérapeute',
];

// Liste étendue pour l'autocomplétion de la saisie manuelle
export const EXTENDED_SPECIALTIES = [
  ...SPECIALTIES,
  'Infirmier(e) anesthésiste (IADE)',
  'Infirmier(e) de bloc opératoire (IBODE)',
  'Infirmier(e) en pratique avancée (IPA)',
  'Sage-femme',
  'Ergothérapeute',
  'Ostéopathe',
  'Psychomotricien(ne)',
  'Diététicien(ne)',
  'Orthophoniste',
  'Pédicure-podologue',
];

export const CITIES = [
  'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice',
  'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Saint-Étienne', 'Toulon', 'Le Havre',
  'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Clermont-Ferrand',
];

export const CITIES_GEO = {
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Nantes': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg': { lat: 48.5734, lng: 7.7521 },
  'Montpellier': { lat: 43.6108, lng: 3.8767 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
  'Lille': { lat: 50.6292, lng: 3.0573 },
  'Rennes': { lat: 48.1173, lng: -1.6778 },
  'Reims': { lat: 49.2583, lng: 4.0317 },
  'Saint-Étienne': { lat: 45.4397, lng: 4.3872 },
  'Toulon': { lat: 43.1242, lng: 5.9280 },
  'Le Havre': { lat: 49.4944, lng: 0.1079 },
  'Grenoble': { lat: 45.1885, lng: 5.7245 },
  'Dijon': { lat: 47.3220, lng: 5.0415 },
  'Angers': { lat: 47.4784, lng: -0.5632 },
  'Nîmes': { lat: 43.8367, lng: 4.3601 },
  'Clermont-Ferrand': { lat: 45.7772, lng: 3.0870 },
};

export const NOTIFICATION_TYPES = {
  MISSION_CREATED: 'mission_created',
  PRO_APPLIED: 'pro_applied',
  MISSION_ACCEPTED: 'mission_accepted',
  MISSION_COMPLETED: 'mission_completed',
  REMINDER: 'reminder',
};
