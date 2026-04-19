// ── Avatar Upload Service ──
import supabase from '../lib/supabase';

const BUCKET = 'avatars';

export const avatarService = {
  /**
   * Upload an avatar image for a user.
   * Returns the public URL of the uploaded image.
   */
  async upload(userId, file) {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${ext}`;

    // Upload (upsert to replace existing)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (error) {
      // If bucket doesn't exist, try creating it
      if (error.message?.includes('not found') || error.statusCode === 404) {
        console.warn('Bucket "avatars" may not exist. Creating...');
        throw new Error('Le stockage des photos n\'est pas encore configuré. Contactez l\'administrateur.');
      }
      throw new Error(error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const url = urlData?.publicUrl + '?t=' + Date.now(); // cache-bust

    // Save URL to profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', userId);

    if (profileError) {
      console.warn('Could not save avatar URL to profile:', profileError.message);
    }

    return url;
  },

  /**
   * Get avatar URL for a user. Returns null if none.
   */
  getUrl(userId) {
    if (!userId) return null;
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(`${userId}/avatar.jpg`);
    return data?.publicUrl || null;
  },
};

export default avatarService;
