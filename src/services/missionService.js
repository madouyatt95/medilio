// ── Mission Service (Hybrid Supabase/Local Demo) ──
import supabase from '../lib/supabase';
import storageService from './storageService';

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
    };
  },

  // ── Fetch full mission with applicants and notes ──
  async _fetchFull(missionRow) {
    const { data: applicants } = await supabase
      .from('mission_applicants')
      .select('*')
      .eq('mission_id', missionRow.id);

    const { data: careNotes } = await supabase
      .from('mission_care_notes')
      .select('*')
      .eq('mission_id', missionRow.id)
      .order('created_at', { ascending: true });

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

    // Calculate dates for recurrence
    const dates = [missionData.scheduledDate];
    if (missionData.recurrence && missionData.recurrence !== 'none' && missionData.recurrenceEndDate) {
      let curr = new Date(missionData.scheduledDate);
      const end = new Date(missionData.recurrenceEndDate);
      // We limit to max 60 instances to prevent abuse (2 months of daily)
      let count = 0;
      
      while (curr < end && count < 60) {
        if (missionData.recurrence === 'daily') {
          curr.setDate(curr.getDate() + 1);
        } else if (missionData.recurrence === 'weekly') {
          curr.setDate(curr.getDate() + 7);
        } else if (missionData.recurrence === 'biweekly') {
          curr.setDate(curr.getDate() + 14);
        } else if (missionData.recurrence === 'monthly') {
          curr.setMonth(curr.getMonth() + 1);
        }
        
        if (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
        }
        count++;
      }
    }

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
    }));

    // Try Supabase first, fallback to local storage if DB schema is incomplete
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert(inserts)
        .select();

      if (error) throw error;
      
      // Return the very first mission created to navigate the user
      return this._mapMission(data[0]);
    } catch (dbError) {
      console.warn('Supabase insert failed, saving locally:', dbError.message);
      
      // Fallback: save to local demo storage
      const { v4: uuidv4 } = await import('uuid');
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
      };

      const existing = storageService.getMissions();
      storageService.setMissions([localMission, ...existing]);
      return localMission;
    }
  },

  async getAll() {
    // ── Local Demo Missions ──
    const localMissions = storageService.getMissions();

    // ── Supabase Missions ──
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const remoteMissions = await Promise.all((data || []).map(m => this._fetchFull(m)));
    
    // Merge: Demo missions usually have different UUIDs than Supabase ones
    return [...localMissions, ...remoteMissions].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  async getById(id) {
    const local = storageService.getMissions().find(m => m.id === id);
    if (local) return local;

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this._fetchFull(data);
  },

  async getByPatient(patientId) {
    const locals = storageService.getMissions().filter(m => m.patientId === patientId);

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const remotes = await Promise.all((data || []).map(m => this._fetchFull(m)));
    
    return [...locals, ...remotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getByProfessional(proId) {
    const locals = storageService.getMissions().filter(m => m.assignedProId === proId);

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('assigned_pro_id', proId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const remotes = await Promise.all((data || []).map(m => this._fetchFull(m)));

    return [...locals, ...remotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getOpenMissions() {
    // ── Local Demo Missions ──
    const localOpen = storageService.getMissions().filter(m => m.status === 'open');

    // ── Supabase Missions ──
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const remotes = await Promise.all((data || []).map(m => this._fetchFull(m)));
      return [...localOpen, ...remotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch {
      return localOpen;
    }
  },

  async applyToMission(missionId, proId, message = '') {
    // 1. Try Local Demo
    const missions = storageService.getMissions();
    const localIdx = missions.findIndex(m => m.id === missionId);
    if (localIdx !== -1) {
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

    // 2. Supabase
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
    // 1. Local
    const missions = storageService.getMissions();
    const localIdx = missions.findIndex(m => m.id === missionId);
    if (localIdx !== -1) {
      const mission = missions[localIdx];
      mission.assignedProId = proId;
      mission.status = 'assigned';
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    // 2. Supabase
    const { error } = await supabase
      .from('missions')
      .update({ assigned_pro_id: proId, status: 'assigned' })
      .eq('id', missionId);

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async rejectApplicant(missionId, proId) {
    // 1. Local
    const missions = storageService.getMissions();
    const localIdx = missions.findIndex(m => m.id === missionId);
    if (localIdx !== -1) {
      const mission = missions[localIdx];
      mission.applicants = (mission.applicants || []).filter(a => a.proId !== proId);
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    // 2. Supabase
    const { error } = await supabase
      .from('mission_applicants')
      .delete()
      .eq('mission_id', missionId)
      .eq('pro_id', proId);

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async updateStatus(missionId, status) {
    // 1. Local
    const missions = storageService.getMissions();
    const localIdx = missions.findIndex(m => m.id === missionId);
    if (localIdx !== -1) {
      const mission = missions[localIdx];
      mission.status = status;
      if (status === 'completed') {
        mission.updatedAt = new Date().toISOString();
      }
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    // 2. Supabase
    const updates = { status };
    if (status === 'completed') {
      updates.updated_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('missions')
      .update(updates)
      .eq('id', missionId);

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async addCareNote(missionId, proId, content) {
    // 1. Local
    const missions = storageService.getMissions();
    const localIdx = missions.findIndex(m => m.id === missionId);
    if (localIdx !== -1) {
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
    // 1. Local
    const missions = storageService.getMissions();
    const localIdx = missions.findIndex(m => m.id === missionId);
    if (localIdx !== -1) {
      const mission = { ...missions[localIdx], ...updates };
      if (updates.address) mission.address = { ...missions[localIdx].address, ...updates.address };
      if (updates.patientInfo) mission.patientInfo = { ...missions[localIdx].patientInfo, ...updates.patientInfo };
      missions[localIdx] = mission;
      storageService.setMissions(missions);
      return mission;
    }

    // 2. Supabase
    const dbUpdates = {};
    if (updates.careType) dbUpdates.care_type = updates.careType;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.scheduledTime) dbUpdates.scheduled_time = updates.scheduledTime;
    if (updates.status) dbUpdates.status = updates.status;
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
    // 1. Local
    const missions = storageService.getMissions();
    const filtered = missions.filter(m => m.id !== missionId);
    if (filtered.length !== missions.length) {
      storageService.setMissions(filtered);
      return;
    }

    // 2. Supabase
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId);

    if (error) throw new Error(error.message);
  },
};

export default missionService;
