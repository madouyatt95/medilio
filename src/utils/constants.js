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

export const NOTIFICATION_TYPES = {
  MISSION_CREATED: 'mission_created',
  PRO_APPLIED: 'pro_applied',
  MISSION_ACCEPTED: 'mission_accepted',
  MISSION_COMPLETED: 'mission_completed',
  REMINDER: 'reminder',
};
