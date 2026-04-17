// ── Mission Service ──
import { v4 as uuidv4 } from 'uuid';
import storageService from './storageService';

export const missionService = {
  create(missionData) {
    const missions = storageService.getMissions();
    const mission = {
      id: uuidv4(),
      ...missionData,
      status: 'open',
      applicants: [],
      assignedProId: null,
      careNotes: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    missions.push(mission);
    storageService.setMissions(missions);
    return mission;
  },

  getAll() {
    return storageService.getMissions();
  },

  getById(id) {
    return storageService.getMissions().find(m => m.id === id) || null;
  },

  getByPatient(patientId) {
    return storageService.getMissions().filter(m => m.patientId === patientId);
  },

  getByProfessional(proId) {
    return storageService.getMissions().filter(m => m.assignedProId === proId);
  },

  getOpenMissions() {
    return storageService.getMissions().filter(m => m.status === 'open');
  },

  applyToMission(missionId, proId, message = '') {
    const missions = storageService.getMissions();
    const index = missions.findIndex(m => m.id === missionId);
    if (index === -1) throw new Error('Mission non trouvée');
    if (missions[index].applicants.some(a => a.proId === proId)) {
      throw new Error('Vous avez déjà postulé à cette mission');
    }
    missions[index].applicants.push({
      proId,
      appliedAt: new Date().toISOString(),
      message,
    });
    storageService.setMissions(missions);
    return missions[index];
  },

  acceptApplicant(missionId, proId) {
    const missions = storageService.getMissions();
    const index = missions.findIndex(m => m.id === missionId);
    if (index === -1) throw new Error('Mission non trouvée');
    missions[index].assignedProId = proId;
    missions[index].status = 'assigned';
    storageService.setMissions(missions);
    return missions[index];
  },

  rejectApplicant(missionId, proId) {
    const missions = storageService.getMissions();
    const index = missions.findIndex(m => m.id === missionId);
    if (index === -1) throw new Error('Mission non trouvée');
    missions[index].applicants = missions[index].applicants.filter(a => a.proId !== proId);
    storageService.setMissions(missions);
    return missions[index];
  },

  updateStatus(missionId, status) {
    const missions = storageService.getMissions();
    const index = missions.findIndex(m => m.id === missionId);
    if (index === -1) throw new Error('Mission non trouvée');
    missions[index].status = status;
    if (status === 'completed') {
      missions[index].completedAt = new Date().toISOString();
    }
    storageService.setMissions(missions);
    return missions[index];
  },

  addCareNote(missionId, proId, content) {
    const missions = storageService.getMissions();
    const index = missions.findIndex(m => m.id === missionId);
    if (index === -1) throw new Error('Mission non trouvée');
    missions[index].careNotes.push({
      id: uuidv4(),
      proId,
      content,
      createdAt: new Date().toISOString(),
    });
    storageService.setMissions(missions);
    return missions[index];
  },

  update(missionId, updates) {
    const missions = storageService.getMissions();
    const index = missions.findIndex(m => m.id === missionId);
    if (index === -1) throw new Error('Mission non trouvée');
    missions[index] = { ...missions[index], ...updates };
    storageService.setMissions(missions);
    return missions[index];
  },

  delete(missionId) {
    const missions = storageService.getMissions().filter(m => m.id !== missionId);
    storageService.setMissions(missions);
  },
};

export default missionService;
