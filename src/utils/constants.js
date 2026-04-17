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
  { id: 'injection', label: 'Injection', icon: 'Syringe', description: 'Injections et perfusions' },
  { id: 'bandage', label: 'Pansement', icon: 'Bandage', description: 'Soins de plaies et pansements' },
  { id: 'hygiene', label: 'Toilette', icon: 'ShowerHead', description: 'Aide à la toilette et hygiène' },
  { id: 'monitoring', label: 'Surveillance', icon: 'Activity', description: 'Surveillance et suivi médical' },
  { id: 'medication', label: 'Médicaments', icon: 'Pill', description: 'Administration de médicaments' },
  { id: 'rehabilitation', label: 'Rééducation', icon: 'Dumbbell', description: 'Exercices et rééducation' },
  { id: 'palliative', label: 'Soins palliatifs', icon: 'Heart', description: 'Accompagnement et confort' },
  { id: 'other', label: 'Autre', icon: 'Plus', description: 'Autre type de soin' },
];

export const SPECIALTIES = [
  'Infirmier(e) diplômé(e)',
  'Aide-soignant(e)',
  'Auxiliaire de vie',
  'Kinésithérapeute',
  'Sage-femme',
  'Ergothérapeute',
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
