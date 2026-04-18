// ── Mission Service (Supabase) ──
import supabase from '../lib/supabase';

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
      },
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      patientInfo: {
        name: row.patient_name || '',
        age: row.patient_age || null,
        conditions: row.patient_conditions || '',
      },
      documents: [],
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
    const { data, error } = await supabase
      .from('missions')
      .insert({
        patient_id: missionData.patientId,
        care_type: missionData.careType,
        description: missionData.description || '',
        street: missionData.address?.street || '',
        city: missionData.address?.city || '',
        postal_code: missionData.address?.postalCode || '',
        scheduled_date: missionData.scheduledDate,
        scheduled_time: missionData.scheduledTime,
        patient_name: missionData.patientInfo?.name || '',
        patient_age: missionData.patientInfo?.age || null,
        patient_conditions: missionData.patientInfo?.conditions || '',
        estimated_duration: missionData.estimatedDuration || 30,
        estimated_cost: missionData.estimatedCost || null,
        recurrence: missionData.recurrence || 'none',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this._mapMission(data);
  },

  async getAll() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch applicants and notes for each mission
    const missions = await Promise.all((data || []).map(m => this._fetchFull(m)));
    return missions;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this._fetchFull(data);
  },

  async getByPatient(patientId) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(m => this._fetchFull(m)));
  },

  async getByProfessional(proId) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('assigned_pro_id', proId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(m => this._fetchFull(m)));
  },

  async getOpenMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(m => this._fetchFull(m)));
  },

  async applyToMission(missionId, proId, message = '') {
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
    const { error } = await supabase
      .from('missions')
      .update({ assigned_pro_id: proId, status: 'assigned' })
      .eq('id', missionId);

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async rejectApplicant(missionId, proId) {
    const { error } = await supabase
      .from('mission_applicants')
      .delete()
      .eq('mission_id', missionId)
      .eq('pro_id', proId);

    if (error) throw new Error(error.message);
    return this.getById(missionId);
  },

  async updateStatus(missionId, status) {
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
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId);

    if (error) throw new Error(error.message);
  },
};

export default missionService;
