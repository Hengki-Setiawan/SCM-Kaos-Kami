'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

export default function BusinessProfileClient() {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({ brandName: 'Kaos Kami', adminName: 'Hengki Setiawan', telegramToken: '' });

  useEffect(() => {
    const saved = localStorage.getItem('business_profile');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setProfile({ brandName: parsed.brandName || 'Kaos Kami', adminName: parsed.adminName || 'Hengki Setiawan', telegramToken: parsed.telegramToken || '' });
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    if (!profile.brandName.trim() || !profile.adminName.trim()) {
      return showToast('Nama Brand dan Admin wajib diisi', 'error');
    }
    localStorage.setItem('business_profile', JSON.stringify(profile));
    setIsEditing(false);
    showToast('Profil bisnis berhasil disimpan', 'success');
    // Dispatch event to update Topbar without full reload
    window.dispatchEvent(new Event('business_profile_updated'));
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <span className="text-xs text-muted block mb-1">Nama Brand</span>
        {isEditing ? (
          <input 
            type="text" 
            className="input-field" 
            value={profile.brandName} 
            onChange={e => setProfile({...profile, brandName: e.target.value})} 
          />
        ) : (
          <span className="font-semibold text-lg">{profile.brandName}</span>
        )}
      </div>
      
      <div>
        <span className="text-xs text-muted block mb-1">Admin</span>
        {isEditing ? (
          <input 
            type="text" 
            className="input-field" 
            value={profile.adminName} 
            onChange={e => setProfile({...profile, adminName: e.target.value})} 
          />
        ) : (
          <span className="font-semibold">{profile.adminName}</span>
        )}
      </div>

      <div>
        <span className="text-xs text-muted block mb-1">Telegram Bot Token</span>
        {isEditing ? (
          <input 
            type="text" 
            className="input-field" 
            value={profile.telegramToken} 
            onChange={e => setProfile({...profile, telegramToken: e.target.value})}
            placeholder="Ketik token bot dari BotFather"
          />
        ) : (
          <span className="font-semibold">{profile.telegramToken ? '✅ Terhubung (Disembunyikan)' : '❌ Belum diatur'}</span>
        )}
      </div>

      <div className="col-span-1 pt-2">
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Simpan Profil</button>
            <button onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Batal</button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>✏️ Edit Profil</button>
        )}
      </div>
    </div>
  );
}
