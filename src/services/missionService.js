// ── Mission Service (Hybrid Supabase/Local Demo) ──
import supabase from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { assertBackendConfigured, isDemoMode } from '../config/runtime';
import storageService from './storageService';
import { buildRecurringDates } from '../utils/missionDates';

export const missionService = {
  // ── Helper: Map DB row to app format ──
  _mapMission(row, applicants = [], careNotes = []) {
    return {
      id: row.id,
      patientId: row.patient_id,
      status: row.status,
      careType: row.care_type,
      description: row.description || '',
      address: {
        street: row.street || '',
        city: row.city || '',
        postalCode: row.postal_code || '',
        lat: row.lat || null,
        lng: row.lng || null,
      },
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      patientInfo: {
        name: row.patient_name || '',
        age: row.patient_age || null,
        conditions: row.patient_conditions || '',
      },
      documents: row.documents || [],
      applicants: applicants.map(a => ({
        proId: a.pro_id,
        appliedAt: a.applied_at,
        message: a.message || '',
      })),
      assignedProId: row.assigned_pro_id,
      careNotes: careNotes.map(n => ({
        id: n.id,
        proId: n.pro_id,
        content: n.content,
        createdAt: n.created_at,
      })),
      createdAt: row.created_at,
      completedAt: row.status === 'completed' ? row.updated_at : null,
      estimatedDuration: row.estimated_duration || 30,
      estimatedCost: row.estimated_cost || 0,
      recurrence: row.recurrence || 'none',
      createdByEstablishmentId: row.created_by_establishment_id || null,
      dischargeMode: row.discharge_mode || false,
      dischargeDate: row.discharge_date || null,
      medicalNotes: row.medical_notes || '',
      managedPatientId: row.managed_patient_id || null,
      hasApplied: Boolean(row.has_applied),
    };
  },

  // ── Fetch full mission with applicants and notes ──
  async _fetchFull(missionRow) {
    const { data: applicants, error: applicantsError } = await supabase
      .from('mission_applicants')
      .select('*')
      .eq('mission_id', missionRow.id);

    const { data: careNotes, error: careNotesError } = await supabase
      .from('mission_care_notes')
      .select('*')
      .eq('mission_id', missionRow.id)
      .order('created_at', { ascending: true });

    if (applicantsError) throw new Error(applicantsError.message);
    if (careNotesError) throw new Error(careNotesError.message);
    return this._mapMission(missionRow, applicants || [], careNotes || []);
  },

  async create(missionData) {
    // Upload documents via documentService
    let uploadedDocs = [];
    if (missionData.documents && missionData.documents.length > 0) {
      // Documents are already uploaded by DocumentUpload component
      // Just pass them through, filtering out the raw file objects
      uploadedDocs = missionData.documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        path: doc.path || null,
        data: doc.data || null,
        url: doc.url || null,
        storageType: doc.storageType || 'local',
      }));
    }

    const dates = buildRecurringDates(
      missionData.scheduledDate,
      missionData.recurrence || 'none',
      missionData.recurrenceEndDate || null,
    );

    const inserts = dates.map(date => ({
      patient_id: missionData.patientId,
      care_type: missionData.careType,
      description: missionData.description || '',
      street: missionData.address?.street || '',
      city: missionData.address?.city || '',
      postal_code: missionData.address?.postalCode || '',
      lat: missionData.address?.lat || null,
      lng: missionData.address?.lng || null,
      scheduled_date: date,
      scheduled_time: missionData.scheduledTime,
      patient_name: missionData.patientInfo?.name || '',
      patient_age: missionData.patientInfo?.age || null,
      patient_conditions: missionData.patientInfo?.conditions || '',
      estimated_duration: missionData.estimatedDuration || 30,
      estimated_cost: missionData.estimatedCost || null,
      recurrence: missionData.recurrence || 'none',
      recurrence_end_date: missionData.recurrenceEndDate || null,
      documents: uploadedDocs,
      created_by_establishment_id: missionData.createdByEstablishmentId || null,
      managed_patient_id: missionData.managedPatientId || null,
      discharge_mode: missionData.dischargeMode || false,
      discharge_date: missionData.dischargeDate || null,
      medical_notes: missionData.medicalNotes || '',
    }));

    if (isDemoMode) {
      const localMission = {
        id: uuidv4(),
        patientId: missionData.patientId,
        status: 'open',
        careType: missionData.careType,
        description: missionData.description || '',
        address: {
          street: missionData.address?.street || '',
          city: missionData.address?.city || '',
          postalCode: missionData.address?.postalCode || '',
          lat: missionData.address?.lat || null,
          lng: missionData.address?.lng || null,
        },
        scheduledDate: missionData.scheduledDate,
        scheduledTime: missionData.scheduledTime,
        patientInfo: missionData.patientInfo || {},
        documents: uploadedDocs,
        applicants: [],
        assignedProId: null,
        careNotes: [],
        createdAt: new Date().toISOString(),
        estimatedDuration: missionData.estimatedDuration || 30,
        estimatedCost: missionData.estimatedCost || 0,
        recurrence: missionData.recurrence || 'none',
        createdByEstablishmentId: missionData.createdByEstablishmentId || null,
        dischargeMode: missionData.dischargeMode || false,
        dischargeDate: missionData.dischargeDate || null,
        medicalNotes: missionData.medicalNotes || '',
        managedPatientId: missionData.managedPatientId || null,
      };

      const existing = storageService.getMissions();
      storageService.setMissions([localMission, ...existing]);
      return localMission;
    }

    assertBackendConfigured();
    const { data, error } = await supabase.from('missions').insert(inserts).select();
    if (error) throw new Error(error.message);
    return this._mapMission(data[0]);
  },

  async getAll() {
    if (isDemoMode) {
      return storageService.getMissions().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    assertBackendConfigured();
    const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(mission => this._fetchFull(mission)));
  },

  async getById(id) {
    if (isDemoMode) return storageService.getMissions().find(mission => mission.id === id) || null;

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return this._fetchFull(data);

    // A professional may inspect an open mission only through its redacted RPC.
    const { data: available, error: availableError } = await supabase.rpc('list_available_missions');
    if (availableError) return null;
    const safeMission = (available || []).find(mission => mission.id === id);
    if (!safeMission) return null;
    return this._mapMission(safeMission, [], []);
  },

  async getByPatient(patientId) {
    if (isDemoMode) return storageService.getMissions().filter(mission => mission.patientId === patientId);
    const { data, error } = await supabase.from('missions').select('*')
      .eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(mission => this._fetchFull(mission)));
  },

  async getByProfessional(proId) {
    if (isDemoMode) return storageService.getMissions().filter(mission => mission.assignedProId === proId);
    const { data, error } = await supabase.from('missions').select('*')
      .eq('assigned_pro_id', proId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(mission => this._fetchFull(mission)));
  },

  async getByEstablishment(establishmentId) {
    if (isDemoMode) {
      return storageService.getMissions().filter(mission => mission.createdByEstablishmentId === establishmentId);
    }
    const { data, error } = await supabase.from('missions').select('*')
      .eq('created_by_establishment_id', establishmentId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(mission => this._fetchFull(mission)));
  },

  async getOpenMissions() {
    if (isDemoMode) return storageService.getMissions().filter(mission => mission.status === 'open');
    const { data, error } = await supabase.rpc('list_available_missions');
    if (error) throw new Error(error.message);
    return (data || []).map(row => this._mapMission(row, [], []));
  },

  async applyToMission(missionId, proId, message = '') {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const localIdx = missions.findIndex(m => m.id === missionId);
      if (localIdx === -1) throw new Error('Mission introuvable.');
      const mission = missions[localIdx];
      if (mission.applicants?.some(a => a.proId === proId)) {
        throw new Error('Vous avez déjà postulé à cette mission');
      }
      mission.applicants = [
        ...(mission.applicants || []),
        { proId, appliedAt: new Date().toISOString(), message }
      ];
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    const { error } = await supabase
      .from('mission_applicants')
      .insert({
        mission_id: missionId,
        pro_id: proId,
        message,
      });

    if (error) {
      if (error.code === '23505') throw new Error('Vous avez déjà postulé à cette mission');
      throw new Error(error.message);
    }
    return this.getById(missionId);
  },

  async acceptApplicant(missionId, proId) {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const localIdx = missions.findIndex(m => m.id === missionId);
      if (localIdx === -1) throw new Error('Mission introuvable.');
      const mission = missions[localIdx];
      mission.assignedProId = proId;
      mission.status = 'assigned';
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    const { error } = await supabase.rpc('accept_mission_applicant', {
      p_mission_id: missionId,
      p_pro_id: proId,
    });

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async rejectApplicant(missionId, proId) {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const localIdx = missions.findIndex(m => m.id === missionId);
      if (localIdx === -1) throw new Error('Mission introuvable.');
      const mission = missions[localIdx];
      mission.applicants = (mission.applicants || []).filter(a => a.proId !== proId);
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    const { error } = await supabase.rpc('reject_mission_applicant', {
      p_mission_id: missionId,
      p_pro_id: proId,
    });

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async updateStatus(missionId, status) {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const localIdx = missions.findIndex(m => m.id === missionId);
      if (localIdx === -1) throw new Error('Mission introuvable.');
      const mission = missions[localIdx];
      mission.status = status;
      if (status === 'completed') {
        mission.updatedAt = new Date().toISOString();
      }
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    const { error } = await supabase.rpc('update_mission_status', {
      p_mission_id: missionId,
      p_status: status,
    });

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async addCareNote(missionId, proId, content) {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const localIdx = missions.findIndex(m => m.id === missionId);
      if (localIdx === -1) throw new Error('Mission introuvable.');
      const mission = missions[localIdx];
      mission.careNotes = [
        ...(mission.careNotes || []),
        { id: Math.random().toString(36).substr(2, 9), proId, content, createdAt: new Date().toISOString() }
      ];
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    // 2. Supabase
    const { error } = await supabase
      .from('mission_care_notes')
      .insert({
        mission_id: missionId,
        pro_id: proId,
        content,
      });

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async update(missionId, updates) {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const localIdx = missions.findIndex(m => m.id === missionId);
      if (localIdx === -1) throw new Error('Mission introuvable.');
      const mission = { ...missions[localIdx], ...updates };
      if (updates.address) mission.address = { ...missions[localIdx].address, ...updates.address };
      if (updates.patientInfo) mission.patientInfo = { ...missions[localIdx].patientInfo, ...updates.patientInfo };
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    const dbUpdates = {};
    if (updates.careType) dbUpdates.care_type = updates.careType;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.scheduledTime) dbUpdates.scheduled_time = updates.scheduledTime;
    if (updates.address) {
      dbUpdates.street = updates.address.street || '';
      dbUpdates.city = updates.address.city || '';
      dbUpdates.postal_code = updates.address.postalCode || '';
    }

    const { error } = await supabase
      .from('missions')
      .update(dbUpdates)
      .eq('id', missionId);

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async delete(missionId) {
    if (isDemoMode) {
      const missions = storageService.getMissions();
      const filtered = missions.filter(m => m.id !== missionId);
      if (filtered.length === missions.length) throw new Error('Mission introuvable.');
      storageService.setMissions(filtered);
      return;
    }

    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId);

    if (error) throw new Error(error.message);
  },
};

export default missionService;
