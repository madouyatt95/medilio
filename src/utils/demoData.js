// ── Demo Data Seeder ──
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';

const DEMO_SEEDED_KEY = 'medilio_demo_seeded';

export function seedDemoData() {
  if (localStorage.getItem(DEMO_SEEDED_KEY)) return;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const yesterday = new Date(now.getTime() - 86400000);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);

  // ── Admin User ──
  const admin = {
    id: uuidv4(),
    email: 'admin@medilio.fr',
    password: btoa('admin123'),
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Medilio',
    phone: '01 00 00 00 00',
    avatar: null,
    createdAt: lastWeek.toISOString(),
    address: null,
    professionalInfo: null,
  };

  // ── Patients ──
  const patient1 = {
    id: uuidv4(),
    email: 'famille.dupont@email.fr',
    password: btoa('patient123'),
    role: 'patient',
    firstName: 'Marie',
    lastName: 'Dupont',
    phone: '06 12 34 56 78',
    avatar: null,
    createdAt: lastWeek.toISOString(),
    address: { street: '15 Rue de la Paix', city: 'Paris', postalCode: '75002' },
    professionalInfo: null,
  };

  const patient2 = {
    id: uuidv4(),
    email: 'jean.martin@email.fr',
    password: btoa('patient123'),
    role: 'patient',
    firstName: 'Jean',
    lastName: 'Martin',
    phone: '06 98 76 54 32',
    avatar: null,
    createdAt: lastWeek.toISOString(),
    address: { street: '8 Avenue Victor Hugo', city: 'Lyon', postalCode: '69002' },
    professionalInfo: null,
  };

  const patient3 = {
    id: uuidv4(),
    email: 'sophie.bernard@email.fr',
    password: btoa('patient123'),
    role: 'patient',
    firstName: 'Sophie',
    lastName: 'Bernard',
    phone: '06 11 22 33 44',
    avatar: null,
    createdAt: yesterday.toISOString(),
    address: { street: '22 Boulevard Gambetta', city: 'Marseille', postalCode: '13001' },
    professionalInfo: null,
  };

  // ── Professionals ──
  const pro1 = {
    id: uuidv4(),
    email: 'claire.infirmiere@email.fr',
    password: btoa('pro123'),
    role: 'professional',
    firstName: 'Claire',
    lastName: 'Moreau',
    phone: '06 55 44 33 22',
    avatar: null,
    createdAt: lastWeek.toISOString(),
    address: { street: '5 Rue République', city: 'Paris', postalCode: '75011' },
    professionalInfo: {
      specialties: ['Infirmier(e) diplômé(e)'],
      serviceArea: { city: 'Paris', radius: 25 },
      availability: { days: ['lun', 'mar', 'mer', 'jeu', 'ven'], hours: { start: '07:00', end: '19:00' } },
      bio: 'Infirmière diplômée avec 8 ans d\'expérience en soins à domicile. Spécialisée en gériatrie et soins palliatifs.',
      verified: true,
    },
  };

  const pro2 = {
    id: uuidv4(),
    email: 'thomas.aide@email.fr',
    password: btoa('pro123'),
    role: 'professional',
    firstName: 'Thomas',
    lastName: 'Petit',
    phone: '06 77 88 99 00',
    avatar: null,
    createdAt: lastWeek.toISOString(),
    address: { street: '12 Rue Bellecour', city: 'Lyon', postalCode: '69002' },
    professionalInfo: {
      specialties: ['Aide-soignant(e)', 'Auxiliaire de vie'],
      serviceArea: { city: 'Lyon', radius: 30 },
      availability: { days: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam'], hours: { start: '06:00', end: '20:00' } },
      bio: 'Aide-soignant passionné, 5 ans d\'expérience. Je prends soin de vos proches comme de ma propre famille.',
      verified: true,
    },
  };

  const pro3 = {
    id: uuidv4(),
    email: 'emma.kine@email.fr',
    password: btoa('pro123'),
    role: 'professional',
    firstName: 'Emma',
    lastName: 'Laurent',
    phone: '06 44 55 66 77',
    avatar: null,
    createdAt: yesterday.toISOString(),
    address: { street: '3 Cours Mirabeau', city: 'Marseille', postalCode: '13100' },
    professionalInfo: {
      specialties: ['Kinésithérapeute'],
      serviceArea: { city: 'Marseille', radius: 20 },
      availability: { days: ['lun', 'mar', 'jeu', 'ven'], hours: { start: '08:00', end: '17:00' } },
      bio: 'Kinésithérapeute spécialisée en rééducation post-opératoire. Approche douce et personnalisée.',
      verified: false,
    },
  };

  const pro4 = {
    id: uuidv4(),
    email: 'lucas.infirmier@email.fr',
    password: btoa('pro123'),
    role: 'professional',
    firstName: 'Lucas',
    lastName: 'Dubois',
    phone: '06 33 22 11 00',
    avatar: null,
    createdAt: yesterday.toISOString(),
    address: { street: '7 Rue Nationale', city: 'Paris', postalCode: '75013' },
    professionalInfo: {
      specialties: ['Infirmier(e) diplômé(e)', 'Sage-femme'],
      serviceArea: { city: 'Paris', radius: 15 },
      availability: { days: ['lun', 'mer', 'ven', 'sam', 'dim'], hours: { start: '08:00', end: '22:00' } },
      bio: 'Infirmier urgentiste reconverti en soins à domicile. Disponible en soirée et week-ends.',
      verified: true,
    },
  };

  const users = [admin, patient1, patient2, patient3, pro1, pro2, pro3, pro4];

  // ── Missions ──
  const missions = [
    {
      id: uuidv4(),
      patientId: patient1.id,
      status: 'open',
      careType: 'injection',
      description: 'Injection quotidienne d\'anticoagulant pour ma mère de 78 ans. Elle est à mobilité réduite.',
      address: { street: '15 Rue de la Paix', city: 'Paris', postalCode: '75002' },
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: '09:00',
      patientInfo: { name: 'Jeanne Dupont', age: 78, conditions: 'Mobilité réduite, diabète type 2' },
      documents: [],
      applicants: [
        { proId: pro1.id, appliedAt: now.toISOString(), message: 'Je suis disponible et j\'ai l\'expérience nécessaire.' },
        { proId: pro4.id, appliedAt: now.toISOString(), message: 'Disponible demain matin.' },
      ],
      assignedProId: null,
      careNotes: [],
      createdAt: now.toISOString(),
      completedAt: null,
      estimatedDuration: 30,
      estimatedCost: 25,
    },
    {
      id: uuidv4(),
      patientId: patient1.id,
      status: 'assigned',
      careType: 'bandage',
      description: 'Changement de pansement post-opératoire. Plaie au genou droit.',
      address: { street: '15 Rue de la Paix', city: 'Paris', postalCode: '75002' },
      scheduledDate: nextWeek.toISOString().split('T')[0],
      scheduledTime: '14:00',
      patientInfo: { name: 'Jeanne Dupont', age: 78, conditions: 'Post-opératoire genou' },
      documents: [],
      applicants: [{ proId: pro1.id, appliedAt: lastWeek.toISOString(), message: '' }],
      assignedProId: pro1.id,
      careNotes: [],
      createdAt: lastWeek.toISOString(),
      completedAt: null,
      estimatedDuration: 45,
      estimatedCost: 35,
    },
    {
      id: uuidv4(),
      patientId: patient2.id,
      status: 'completed',
      careType: 'hygiene',
      description: 'Aide à la toilette pour personne âgée. Mon père a besoin d\'assistance quotidienne.',
      address: { street: '8 Avenue Victor Hugo', city: 'Lyon', postalCode: '69002' },
      scheduledDate: lastWeek.toISOString().split('T')[0],
      scheduledTime: '08:00',
      patientInfo: { name: 'Robert Martin', age: 85, conditions: 'Alzheimer stade précoce' },
      documents: [],
      applicants: [{ proId: pro2.id, appliedAt: lastWeek.toISOString(), message: '' }],
      assignedProId: pro2.id,
      careNotes: [{
        id: uuidv4(),
        proId: pro2.id,
        content: 'Toilette effectuée sans difficulté. Patient coopératif et de bonne humeur. Surveillance tensionnelle : 13/8. RAS.',
        createdAt: lastWeek.toISOString(),
      }],
      createdAt: lastWeek.toISOString(),
      completedAt: lastWeek.toISOString(),
      estimatedDuration: 60,
      estimatedCost: 40,
    },
    {
      id: uuidv4(),
      patientId: patient2.id,
      status: 'open',
      careType: 'monitoring',
      description: 'Surveillance post-hospitalisation. Prise de constantes et vérification de l\'état général.',
      address: { street: '8 Avenue Victor Hugo', city: 'Lyon', postalCode: '69002' },
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: '10:30',
      patientInfo: { name: 'Robert Martin', age: 85, conditions: 'Retour d\'hospitalisation' },
      documents: [],
      applicants: [],
      assignedProId: null,
      careNotes: [],
      createdAt: now.toISOString(),
      completedAt: null,
      estimatedDuration: 45,
      estimatedCost: 30,
    },
    {
      id: uuidv4(),
      patientId: patient3.id,
      status: 'open',
      careType: 'rehabilitation',
      description: 'Séance de rééducation à domicile suite à une fracture du col du fémur.',
      address: { street: '22 Boulevard Gambetta', city: 'Marseille', postalCode: '13001' },
      scheduledDate: nextWeek.toISOString().split('T')[0],
      scheduledTime: '15:00',
      patientInfo: { name: 'Pierre Bernard', age: 72, conditions: 'Fracture col du fémur, 6 semaines post-op' },
      documents: [],
      applicants: [{ proId: pro3.id, appliedAt: now.toISOString(), message: 'Spécialisée en rééduc post-fracture.' }],
      assignedProId: null,
      careNotes: [],
      createdAt: yesterday.toISOString(),
      completedAt: null,
      estimatedDuration: 60,
      estimatedCost: 50,
    },
    {
      id: uuidv4(),
      patientId: patient3.id,
      status: 'completed',
      careType: 'medication',
      description: 'Préparation du pilulier hebdomadaire et vérification des traitements.',
      address: { street: '22 Boulevard Gambetta', city: 'Marseille', postalCode: '13001' },
      scheduledDate: lastWeek.toISOString().split('T')[0],
      scheduledTime: '11:00',
      patientInfo: { name: 'Pierre Bernard', age: 72, conditions: 'Polymédiqué' },
      documents: [],
      applicants: [{ proId: pro3.id, appliedAt: lastWeek.toISOString(), message: '' }],
      assignedProId: pro3.id,
      careNotes: [{
        id: uuidv4(),
        proId: pro3.id,
        content: 'Pilulier préparé pour la semaine. Vérification des interactions : RAS. Patient comprend bien son traitement.',
        createdAt: lastWeek.toISOString(),
      }],
      createdAt: lastWeek.toISOString(),
      completedAt: lastWeek.toISOString(),
      estimatedDuration: 30,
      estimatedCost: 20,
    },
  ];

  // ── Notifications ──
  const notifications = [
    {
      id: uuidv4(), userId: patient1.id, type: 'pro_applied',
      title: 'Nouvelle candidature', message: 'Claire Moreau a postulé pour votre mission d\'injection.',
      read: false, link: '', createdAt: now.toISOString(),
    },
    {
      id: uuidv4(), userId: patient1.id, type: 'pro_applied',
      title: 'Nouvelle candidature', message: 'Lucas Dubois a postulé pour votre mission d\'injection.',
      read: false, link: '', createdAt: now.toISOString(),
    },
    {
      id: uuidv4(), userId: pro1.id, type: 'mission_created',
      title: 'Nouvelle mission disponible', message: 'Une mission d\'injection est disponible à Paris.',
      read: true, link: '', createdAt: now.toISOString(),
    },
    {
      id: uuidv4(), userId: pro2.id, type: 'mission_accepted',
      title: 'Mission acceptée !', message: 'Votre candidature pour l\'aide à la toilette a été acceptée.',
      read: true, link: '', createdAt: lastWeek.toISOString(),
    },
  ];

  storageService.setUsers(users);
  storageService.setMissions(missions);
  storageService.setNotifications(notifications);
  localStorage.setItem(DEMO_SEEDED_KEY, 'true');
}

export function resetDemoData() {
  localStorage.removeItem(DEMO_SEEDED_KEY);
  localStorage.removeItem('medilio_users');
  localStorage.removeItem('medilio_missions');
  localStorage.removeItem('medilio_notifications');
  localStorage.removeItem('medilio_current_user');
  seedDemoData();
}
