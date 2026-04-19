// ── Avatar Upload Component ──
import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import avatarService from '../services/avatarService';

export default function AvatarUpload({ user, onUploaded, size = 100 }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const url = await avatarService.upload(user.id, file);
      if (onUploaded) onUploaded(url);
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar Display */}
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        overflow: 'hidden', border: '4px solid white',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: user?.avatar
          ? `url(${user.avatar}) center/cover`
          : 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
        color: 'white', fontWeight: 700,
        fontSize: `${size * 0.32}px`,
      }}>
        {!user?.avatar && initials}
      </div>

      {/* Camera Button Overlay */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{
          position: 'absolute', bottom: '0', right: '0',
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--color-primary)', color: 'white',
          border: '3px solid white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          transition: 'transform 0.2s ease',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {uploading ? (
          <div style={{
            width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white', borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
        ) : (
          <Camera size={16} />
        )}
      </button>

      {/* Hidden File Input */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={handleFileChange} />
    </div>
  );
}
