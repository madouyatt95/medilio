// ── Rating Service (Hybrid Supabase/Local Demo) ──
import supabase from '../lib/supabase';
import storageService from './storageService';

export const ratingService = {
  async create({ missionId, patientId, proId, score, comment }) {
    // 1. Try Local Demo First
    const missions = storageService.getMissions();
    const isLocalMission = missions.some(m => m.id === missionId);

    if (isLocalMission) {
      const ratings = storageService.getRatings();
      if (ratings.some(r => r.missionId === missionId)) {
        throw new Error('Vous avez déjà noté cette mission');
      }
      
      const newRating = {
        id: `local_rating_${Date.now()}`,
        missionId,
        patientId,
        proId,
        score,
        comment: comment || '',
        createdAt: new Date().toISOString(),
      };
      
      ratings.unshift(newRating);
      storageService.setRatings(ratings);
      return newRating;
    }

    // 2. Supabase
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
    // 1. Local Ratings
    const localRatings = storageService.getRatings().filter(r => r.proId === proId);

    // 2. Supabase Ratings
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('pro_id', proId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const remotes = (data || []).map(r => ({
        id: r.id, missionId: r.mission_id, patientId: r.patient_id,
        proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
      }));
      return [...localRatings, ...remotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch {
      return localRatings;
    }
  },

  async getByMission(missionId) {
    const local = storageService.getRatings().find(r => r.missionId === missionId);
    if (local) return local;

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

  async getProAverageRating(proId) {
    const ratings = await this.getByPro(proId);
    if (ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((s, r) => s + r.score, 0);
    return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
  },

  async getAllProRatings() {
    const localRatings = storageService.getRatings();
    const { data } = await supabase.from('ratings').select('*');
    const remotes = (data || []).map(r => ({
      id: r.id, missionId: r.mission_id, patientId: r.patient_id,
      proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
    }));

    const all = [...localRatings, ...remotes];
    const proMap = {};
    all.forEach(r => {
      if (!proMap[r.proId]) proMap[r.proId] = [];
      proMap[r.proId].push(r);
    });
    return proMap;
  },
};

export default ratingService;
