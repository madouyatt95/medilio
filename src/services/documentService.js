// ── Document Service (Supabase Storage — Secure Signed URLs) ──
// Handles upload/download of medical documents (ordonnances, prescriptions)
// Falls back to local base64 storage when Supabase Storage is unavailable

import supabase from '../lib/supabase';

const BUCKET = 'mission_docs';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

let _storageAvailable = null; // cached check

/**
 * Check if Supabase Storage bucket exists and is accessible
 */
async function isStorageAvailable() {
  if (_storageAvailable !== null) return _storageAvailable;

  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET);
    _storageAvailable = !error && !!data;
  } catch {
    _storageAvailable = false;
  }

  if (!_storageAvailable) {
    console.warn(`⚠️ Supabase Storage bucket "${BUCKET}" non disponible. Fallback base64 local.`);
  }

  return _storageAvailable;
}

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
    const available = await isStorageAvailable();

    if (available) {
      // ── Supabase Storage Upload ──
      const path = generatePath(userId, file.name);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.warn('Supabase upload failed, falling back to local:', uploadError.message);
        return this._uploadLocal(file, docId);
      }

      return {
        id: docId,
        name: file.name,
        type: file.type,
        size: file.size,
        path: path,
        storageType: 'supabase',
      };
    }

    // ── Fallback: Local base64 ──
    return this._uploadLocal(file, docId);
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
        console.warn(`Skipping file ${file.name}:`, err.message);
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
    if (doc.storageType === 'local' && doc.data) {
      return doc.data;
    }

    // Legacy: old documents with direct data
    if (doc.data && doc.data.startsWith('data:')) {
      return doc.data;
    }

    // Legacy: old documents with public URL
    if (doc.url) {
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

      if (error) {
        console.warn('Could not delete from storage:', error.message);
      }
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
    const available = await isStorageAvailable();
    return {
      available,
      bucket: BUCKET,
      maxSize: MAX_SIZE,
      allowedTypes: ALLOWED_TYPES,
    };
  },
};

export default documentService;
