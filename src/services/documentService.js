// ── Document Service (Supabase Storage — Secure Signed URLs) ──
// Handles upload/download of medical documents (ordonnances, prescriptions)
import supabase from '../lib/supabase';
import { assertBackendConfigured, isDemoMode } from '../config/runtime';

const BUCKET = 'mission_docs';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Generate a secure file path
 */
function generatePath(userId, fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}/${timestamp}_${random}.${ext}`;
}

export const documentService = {
  /**
   * Upload a single document file
   * @param {File} file - The file object from input
   * @param {string} userId - Owner ID (patient)
   * @returns {Promise<{id, name, type, size, path?, data?, url?, storageType}>}
   */
  async upload(file, userId) {
    // Validate
    if (file.size > MAX_SIZE) {
      throw new Error(`Fichier trop volumineux (max ${MAX_SIZE / (1024 * 1024)} Mo)`);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Type de fichier non autorisé. Utilisez des images, PDF ou Word.');
    }

    const docId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    if (isDemoMode) return this._uploadLocal(file, docId);

    assertBackendConfigured();
    const path = generatePath(userId, file.name);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw new Error(`Téléversement impossible : ${uploadError.message}`);
    return {
      id: docId,
      name: file.name,
      type: file.type,
      size: file.size,
      path,
      storageType: 'supabase',
    };
  },

  /**
   * Upload multiple documents
   */
  async uploadMany(files, userId) {
    const results = [];
    for (const file of files) {
      try {
        const doc = await this.upload(file, userId);
        results.push(doc);
      } catch (err) {
        throw new Error(`${file.name} : ${err.message}`, { cause: err });
      }
    }
    return results;
  },

  /**
   * Get a secure download URL for a document
   * @param {Object} doc - Document object
   * @returns {Promise<string|null>} - Signed URL or base64 data
   */
  async getSecureUrl(doc) {
    if (!doc) return null;

    // Already has a local base64 data URI
    if (isDemoMode && doc.storageType === 'local' && doc.data) {
      return doc.data;
    }

    // Legacy: old documents with direct data
    if (isDemoMode && doc.data?.startsWith('data:')) {
      return doc.data;
    }

    // Legacy: old documents with public URL
    if (isDemoMode && doc.url) {
      return doc.url;
    }

    // Supabase Storage: create signed URL
    if (doc.path) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(doc.path, SIGNED_URL_EXPIRY);

        if (error) {
          console.warn('Could not create signed URL:', error.message);
          return null;
        }
        return data.signedUrl;
      } catch (err) {
        console.warn('Signed URL error:', err);
        return null;
      }
    }

    return null;
  },

  /**
   * Delete a document from storage
   */
  async delete(doc) {
    if (doc.storageType === 'supabase' && doc.path) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([doc.path]);

      if (error) throw new Error(error.message);
    }
    // Local docs: nothing to clean up (they're embedded in the mission data)
  },

  /**
   * Fallback: store as base64 in mission JSON
   */
  _uploadLocal(file, docId) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: docId,
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result,
          storageType: 'local',
        });
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Check storage health
   */
  async checkHealth() {
    if (isDemoMode) {
      return { available: true, mode: 'demo', bucket: BUCKET, maxSize: MAX_SIZE, allowedTypes: ALLOWED_TYPES };
    }
    assertBackendConfigured();
    const { error } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
    return {
      available: !error,
      error: error?.message || null,
      bucket: BUCKET,
      maxSize: MAX_SIZE,
      allowedTypes: ALLOWED_TYPES,
    };
  },
};

export default documentService;
