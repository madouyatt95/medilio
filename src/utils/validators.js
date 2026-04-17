// ── Form Validators ──

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email requis';
  if (!re.test(email)) return 'Email invalide';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Mot de passe requis';
  if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
  return '';
}

export function validateRequired(value, fieldName = 'Ce champ') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} est requis`;
  }
  return '';
}

export function validatePhone(phone) {
  if (!phone) return '';
  const re = /^[\d\s+()-]{8,15}$/;
  if (!re.test(phone)) return 'Numéro de téléphone invalide';
  return '';
}

export function validateMissionForm(data) {
  const errors = {};
  if (!data.careType) errors.careType = 'Type de soin requis';
  if (!data.address?.city) errors.city = 'Ville requise';
  if (!data.address?.street) errors.street = 'Adresse requise';
  if (!data.scheduledDate) errors.scheduledDate = 'Date requise';
  if (!data.scheduledTime) errors.scheduledTime = 'Heure requise';
  if (!data.patientInfo?.name) errors.patientName = 'Nom du patient requis';
  return errors;
}
