// ── Rating Service ──
import { v4 as uuidv4 } from 'uuid';
import storageService from './storageService';

const RATINGS_KEY = 'medilio_ratings';

export const ratingService = {
  getAll() {
    return storageService.get(RATINGS_KEY) || [];
  },

  save(ratings) {
    storageService.set(RATINGS_KEY, ratings);
  },

  create({ missionId, patientId, proId, score, comment }) {
    const ratings = this.getAll();
    // Check if already rated
    if (ratings.find(r => r.missionId === missionId && r.patientId === patientId)) {
      throw new Error('Vous avez déjà noté cette mission');
    }
    const rating = {
      id: uuidv4(),
      missionId,
      patientId,
      proId,
      score, // 1-5
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };
    ratings.push(rating);
    this.save(ratings);
    return rating;
  },

  getByPro(proId) {
    return this.getAll().filter(r => r.proId === proId);
  },

  getByMission(missionId) {
    return this.getAll().find(r => r.missionId === missionId) || null;
  },

  getByPatient(patientId) {
    return this.getAll().filter(r => r.patientId === patientId);
  },

  getProAverageRating(proId) {
    const ratings = this.getByPro(proId);
    if (ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((s, r) => s + r.score, 0);
    return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
  },

  getAllProRatings() {
    const ratings = this.getAll();
    const proMap = {};
    ratings.forEach(r => {
      if (!proMap[r.proId]) proMap[r.proId] = [];
      proMap[r.proId].push(r);
    });
    return proMap;
  },
};

export default ratingService;
