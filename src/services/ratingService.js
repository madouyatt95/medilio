// ── Rating Service (Hybrid Supabase/Local Demo) ──
import supabase from '../lib/supabase';
import storageService from './storageService';
import { isDemoMode } from '../config/runtime';

export const ratingService = {
  async create({ missionId, patientId, proId, score, comment }) {
    if (isDemoMode) {
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
    if (isDemoMode) return storageService.getRatings().filter(r => r.proId === proId);
    const { data, error } = await supabase.from('ratings').select('*')
      .eq('pro_id', proId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      id: r.id, missionId: r.mission_id, patientId: r.patient_id,
      proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
    }));
  },

  async getByMission(missionId) {
    if (isDemoMode) return storageService.getRatings().find(r => r.missionId === missionId) || null;

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
    if (!isDemoMode) {
      const { data, error } = await supabase.rpc('get_public_professionals', { p_profile_id: proId });
      if (error) throw new Error(error.message);
      return {
        average: Number(data?.[0]?.rating_average || 0),
        count: Number(data?.[0]?.rating_count || 0),
      };
    }
    const ratings = await this.getByPro(proId);
    if (ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((s, r) => s + r.score, 0);
    return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
  },

  async getAll() {
    if (isDemoMode) return storageService.getRatings();
    const { data, error } = await supabase.from('ratings').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      id: r.id, missionId: r.mission_id, patientId: r.patient_id,
      proId: r.pro_id, score: r.score, comment: r.comment, createdAt: r.created_at,
    }));
  },

  async getAllProRatings() {
    const ratings = await this.getAll();
    return ratings.reduce((proMap, rating) => {
      if (!proMap[rating.proId]) proMap[rating.proId] = [];
      proMap[rating.proId].push(rating);
      return proMap;
    }, {});
  },
};

export default ratingService;
