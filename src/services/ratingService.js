// ── Rating Service (Supabase) ──
import supabase from '../lib/supabase';

export const ratingService = {
  async create({ missionId, patientId, proId, score, comment }) {
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        mission_id: missionId,
        patient_id: patientId,
        pro_id: proId,
        score,
        comment: comment || '',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Vous avez déjà noté cette mission');
      throw new Error(error.message);
    }

    return {
      id: data.id,
      missionId: data.mission_id,
      patientId: data.patient_id,
      proId: data.pro_id,
      score: data.score,
      comment: data.comment,
      createdAt: data.created_at,
    };
  },

  async getByPro(proId) {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('pro_id', proId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(r => ({
      id: r.id, missionId: r.mission_id, patientId: r.patient_id,
      proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
    }));
  },

  async getByMission(missionId) {
    const { data } = await supabase
      .from('ratings')
      .select('*')
      .eq('mission_id', missionId)
      .single();

    if (!data) return null;
    return {
      id: data.id, missionId: data.mission_id, patientId: data.patient_id,
      proId: data.pro_id, score: data.score, comment: data.comment, createdAt: data.created_at,
    };
  },

  async getByPatient(patientId) {
    const { data } = await supabase
      .from('ratings')
      .select('*')
      .eq('patient_id', patientId);

    return (data || []).map(r => ({
      id: r.id, missionId: r.mission_id, patientId: r.patient_id,
      proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
    }));
  },

  async getProAverageRating(proId) {
    const ratings = await this.getByPro(proId);
    if (ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((s, r) => s + r.score, 0);
    return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
  },

  async getAllProRatings() {
    const { data } = await supabase.from('ratings').select('*');
    const proMap = {};
    (data || []).forEach(r => {
      const mapped = {
        id: r.id, missionId: r.mission_id, patientId: r.patient_id,
        proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
      };
      if (!proMap[r.pro_id]) proMap[r.pro_id] = [];
      proMap[r.pro_id].push(mapped);
    });
    return proMap;
  },

  async getAll() {
    const { data } = await supabase.from('ratings').select('*');
    return (data || []).map(r => ({
      id: r.id, missionId: r.mission_id, patientId: r.patient_id,
      proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
    }));
  },
};

export default ratingService;
