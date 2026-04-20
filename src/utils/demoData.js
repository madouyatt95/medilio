// ── Demo Data Seeder ──
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';

const DEMO_SEEDED_KEY = 'medilio_demo_seeded';

export function seedDemoData() {
  if (localStorage.getItem(DEMO_SEEDED_KEY)) return;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const tomorrow = new Date(dayStart.getTime() + 86400000);
  const nextWeek = new Date(dayStart.getTime() + 7 * 86400000);
  const yesterday = new Date(dayStart.getTime() - 86400000);
  const lastWeek = new Date(dayStart.getTime() - 7 * 86400000);

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
      bio: 'Infirmière diplômée avec 8 ans d\'expérience en soins à domicile.',
      verified: true,
    },
  };

  const proLucas = {
    id: uuidv4(),
    email: 'lucas.infirmier@email.fr',
    password: btoa('pro123'),
    role: 'professional',
    firstName: 'Lucas',
    lastName: 'Dubois',
    phone: '06 33 22 11 00',
    avatar: null,
    createdAt: lastWeek.toISOString(),
    address: { street: '7 Rue Nationale', city: 'Paris', postalCode: '75013' },
    professionalInfo: {
      specialties: ['Infirmier(e) diplômé(e)', 'Urgentiste'],
      serviceArea: { city: 'Paris', radius: 20 },
      availability: { days: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], hours: { start: '08:00', end: '22:00' } },
      bio: 'Infirmier expert en soins complexes et logistique de tournée. Disponible 7j/7.',
      verified: true,
    },
  };

  const users = [admin, patient1, patient2, pro1, proLucas];

  // ── Today's Date String ──
  const todayStr = dayStart.toISOString().split('T')[0];

  // ── Missions for Lucas (Tour Simulation) ──
  const tourMissions = [
    {
      id: uuidv4(),
      patientId: patient1.id,
      status: 'assigned',
      careType: 'injection',
      description: 'Injection insuline matinale.',
      address: { street: '15 Rue de la Paix', city: 'Paris', postalCode: '75002' },
      scheduledDate: todayStr,
      scheduledTime: '08:30',
      patientInfo: { name: 'Marie Dupont', age: 45, conditions: 'Diabète' },
      assignedProId: proLucas.id,
      careNotes: [],
      createdAt: yesterday.toISOString(),
      estimatedCost: 20,
    },
    {
      id: uuidv4(),
      patientId: patient2.id,
      status: 'assigned',
      careType: 'bandage',
      description: 'Changement de pansement post-op.',
      address: { street: '8 Avenue Victor Hugo', city: 'Lyon', postalCode: '69002' }, // In reality closer to Lucas area
      scheduledDate: todayStr,
      scheduledTime: '10:00',
      patientInfo: { name: 'Jean Martin', age: 62, conditions: 'Post-op genou' },
      assignedProId: proLucas.id,
      careNotes: [],
      createdAt: yesterday.toISOString(),
      estimatedCost: 35,
    },
    {
      id: uuidv4(),
      patientId: patient1.id,
      status: 'assigned',
      careType: 'monitoring',
      description: 'Check des constantes après midi.',
      address: { street: '15 Rue de la Paix', city: 'Paris', postalCode: '75002' },
      scheduledDate: todayStr,
      scheduledTime: '14:30',
      patientInfo: { name: 'Marie Dupont', age: 45, conditions: 'Suivi' },
      assignedProId: proLucas.id,
      careNotes: [],
      createdAt: yesterday.toISOString(),
      estimatedCost: 25,
    },
    {
      id: uuidv4(),
      patientId: patient2.id,
      status: 'assigned',
      careType: 'hygiene',
      description: 'Aide à la toilette du soir.',
      address: { street: '8 Avenue Victor Hugo', city: 'Lyon', postalCode: '69002' },
      scheduledDate: todayStr,
      scheduledTime: '19:00',
      patientInfo: { name: 'Jean Martin', age: 62, conditions: 'Mobilité réduite' },
      assignedProId: proLucas.id,
      careNotes: [],
      createdAt: yesterday.toISOString(),
      estimatedCost: 40,
    }
  ];

  // ── Historical Record for Marie Dupont (Patient Record Simulation) ──
  const historicalMissions = [
    {
      id: uuidv4(),
      patientId: patient1.id,
      status: 'completed',
      careType: 'monitoring',
      description: 'Bilan initial',
      address: patient1.address,
      scheduledDate: lastWeek.toISOString().split('T')[0],
      scheduledTime: '10:00',
      assignedProId: pro1.id,
      careNotes: [{
        id: uuidv4(), proId: pro1.id, 
        content: "Première visite. Constantes stables : TA 12/8, Pouls 72. La patiente semble bien réagir au traitement.",
        createdAt: lastWeek.toISOString()
      }],
      completedAt: lastWeek.toISOString(),
    },
    {
      id: uuidv4(),
      patientId: patient1.id,
      status: 'completed',
      careType: 'injection',
      description: 'Injection hebdo',
      address: patient1.address,
      scheduledDate: yesterday.toISOString().split('T')[0],
      scheduledTime: '09:00',
      assignedProId: proLucas.id,
      careNotes: [{
        id: uuidv4(), proId: proLucas.id, 
        content: "Injection faite sans douleur. Pas de rougeur au point de ponction. RAS.",
        createdAt: yesterday.toISOString()
      }],
      completedAt: yesterday.toISOString(),
    }
  ];

  const allMissions = [...tourMissions, ...historicalMissions];

  // ── Notifications ──
  const notifications = [
    {
      id: uuidv4(), userId: patient1.id, type: 'pro_applied',
      title: 'Nouvelle candidature', message: 'Claire Moreau a postulé pour votre mission.',
      read: false, createdAt: now.toISOString(),
    }
  ];

  storageService.setUsers(users);
  storageService.setMissions(allMissions);
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
