import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, increment } from 'firebase/firestore';
import { supabase } from '../lib/supabase';

async function uploadImage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

  const { error } = await supabase.storage.from('cars').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw new Error(error.message || 'Upload failed');

  const { data } = supabase.storage.from('cars').getPublicUrl(path);
  return data.publicUrl;
}

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.includes('/video/upload/');
}

const defaultLot = {
  dealershipName: 'PM SELECT AUTOMOTIVE',
  phone: '+359 899 225 640',
  footerNote: 'Всички автомобили се предлагат с оглед и тест драйв на място.\nВъзможност за лизинг и бартер.',
  heroImage: '',
  fullGalleryImages: [],
  sections: [
    {
      label: 'Джипове / SUV',
      cars: [
        { name: 'BMW X5 30d', desc: 'Full extras, 3x S-line, keyless, панорама', price: '19999', year: '2018', mileage: '240 000 км', fuel: 'Дизел', power: '265 к.с.', gearbox: 'Автоматична', badges: ['4x4'], image: '' },
        { name: 'Land Rover Discovery HSE', desc: 'Terrain Response, Meridian, 7 места', price: '14999', year: '2015', mileage: '230 000 км', fuel: 'Дизел', power: '256 к.с.', gearbox: 'Автоматична', badges: ['4x4', 'leasing'], image: '' }
      ]
    },
    {
      label: 'Седани',
      cars: [
        { name: 'Mercedes-Benz C 300 4-MATIC', desc: 'Mild Hybrid, MBUX, 360° камера', price: '32500', year: '2022', mileage: '85 780 км', fuel: 'Бензин хибрид', power: '258 к.с.', gearbox: 'Автоматична', badges: ['new'], image: '' },
        { name: 'Audi A6 3.0 TDI Quattro', desc: 'S-line, Bose, Full LED', price: '12799', year: '2012', mileage: '250 000 км', fuel: 'Дизел', power: '245 к.с.', gearbox: 'Автоматична', badges: ['leasing'], image: '' }
      ]
    },
    {
      label: 'Спортни',
      cars: [
        { name: 'BMW M5 F10', desc: 'Пълна история, чипован, нови вериги', price: '34999', year: '2013', mileage: '150 000 км', fuel: 'Бензин', power: '560 к.с.', gearbox: 'Автоматична', badges: ['warranty'], image: '' }
      ]
    }
  ]
};

const BADGE_LABELS = { '4x4': '4x4', leasing: 'Лизинг/Бартер', new: 'Ново постъпление', warranty: 'Гаранция' };

function getBadgeColors(dark) {
  return {
    '4x4': { bg: dark ? '#0a1e2e' : '#DEEBF3', color: dark ? '#50a8c8' : '#0A3550' },
    leasing: { bg: dark ? '#2e2205' : '#FAF0DA', color: dark ? '#e8b830' : '#634806' },
    new: { bg: dark ? '#1a2e0a' : '#EAF3DE', color: dark ? '#7ec850' : '#27500A' },
    warranty: { bg: dark ? '#2e0a0a' : '#FAECE7', color: dark ? '#e86060' : '#712B13' },
  };
}

function ImageUploader({ value, onChange, allowVideo = false }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      alert('Грешка при качване: ' + err.message);
    }

    setUploading(false);
    e.target.value = '';
  }

  const valueIsVideo = allowVideo && isVideoUrl(value);

  return (
    <div style={{ marginTop: 8 }}>
      <input ref={inputRef} type="file" accept={allowVideo ? 'image/*,video/mp4,video/quicktime' : 'image/*'} onChange={handleFile} style={{ display: 'none' }} />

      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {valueIsVideo ? (
            <video src={value} muted playsInline style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 6, border: '0.5px solid rgba(140,150,160,0.35)', display: 'block' }} />
          ) : (
            <img src={value} alt="" style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 6, border: '0.5px solid rgba(140,150,160,0.35)', display: 'block' }} />
          )}
          <button onClick={() => inputRef.current.click()} style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(10,12,16,0.85)', border: 'none', color: '#E8B830', fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}>
            Смени
          </button>
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(200,60,60,0.9)', border: 'none', color: 'white', fontSize: 13, width: 18, height: 18, borderRadius: '50%', lineHeight: '18px', textAlign: 'center', padding: 0, cursor: 'pointer' }}>
            ×
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={uploading}
          style={{ padding: '5px 12px', border: '0.5px dashed rgba(140,150,160,0.5)', borderRadius: 6, background: 'transparent', color: uploading ? '#888' : '#C9A227', fontSize: 12, cursor: uploading ? 'default' : 'pointer' }}>
          {uploading ? '⏳ Качване...' : allowVideo ? '📷 Добави снимка/видео' : '📷 Добави снимка'}
        </button>
      )}
    </div>
  );
}

function FullGalleryUploader({ value = [], onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const current = Array.isArray(value) ? value : [];
    const freeSlots = Math.max(0, 30 - current.length);
    const selected = files.slice(0, freeSlots);

    if (!selected.length) {
      alert('Можеш да качиш максимум 30 файла за галерията на автокъщата.');
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const urls = [];
      for (const file of selected) urls.push(await uploadImage(file));
      onChange([...current, ...urls].slice(0, 30));
    } catch (err) {
      alert('Грешка при качване: ' + err.message);
    }

    setUploading(false);
    e.target.value = '';
  }

  function removeImage(index) {
    const next = [...(Array.isArray(value) ? value : [])];
    next.splice(index, 1);
    onChange(next);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      <button
        onClick={() => inputRef.current.click()}
        disabled={uploading || (value || []).length >= 30}
        style={{
          padding: '8px 12px',
          border: '0.5px dashed rgba(140,150,160,0.5)',
          borderRadius: 8,
          background: 'transparent',
          color: uploading ? '#888' : '#C9A227',
          fontSize: 13,
          cursor: uploading ? 'default' : 'pointer',
          width: '100%'
        }}
      >
        {uploading ? '⏳ Качване...' : `📚 Качи снимки на автокъщата (${(value || []).length}/30)`}
      </button>

      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6, lineHeight: 1.45 }}>
        Показват се в раздел „Галерия на автокъщата“.
      </div>

      {(value || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
          {(value || []).map((url, i) => (
            <div key={url + i} style={{ position: 'relative' }}>
              <img src={url} alt={`Снимка ${i + 1}`} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '0.5px solid rgba(140,150,160,0.35)', display: 'block' }} />
              <div style={{ position: 'absolute', left: 5, bottom: 5, background: 'rgba(10,12,16,0.8)', color: '#E8B830', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
                #{i + 1}
              </div>
              <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(200,60,60,0.92)', border: 'none', color: 'white', fontSize: 13, width: 20, height: 20, borderRadius: '50%', lineHeight: '20px', textAlign: 'center', padding: 0, cursor: 'pointer' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CarCard({ c, dark, badgeColors, index }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 + index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const specs = [c.year, c.mileage, c.fuel, c.power, c.gearbox].filter(Boolean);

  return (
    <div style={{
      background: dark ? '#1b1f26' : 'white',
      border: `0.5px solid ${dark ? 'rgba(140,150,160,0.22)' : 'rgba(140,150,160,0.28)'}`,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(18px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      {c.image && <img src={c.image} alt={c.name} style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />}

      <div style={{ padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: dark ? '#F1F3F5' : '#12151A' }}>{c.name}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#E8B830' : '#8A6A00', whiteSpace: 'nowrap' }}>
            {Number(c.price || 0).toLocaleString('bg-BG')} €
          </div>
        </div>

        {c.desc && <div style={{ fontSize: 12, color: dark ? '#a8b0ba' : '#5B6470', lineHeight: 1.5, marginBottom: 6 }}>{c.desc}</div>}

        {specs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 11.5, color: dark ? '#8f98a3' : '#6B7280', marginBottom: 6 }}>
            {specs.map((s, i) => (
              <span key={i}>{i > 0 && '· '}{s}</span>
            ))}
          </div>
        )}

        {c.badges?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {c.badges.map(b => (
              <span key={b} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: badgeColors[b]?.bg, color: badgeColors[b]?.color }}>
                {BADGE_LABELS[b]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CarPickerModal({ catalog, loading, search, onSearch, onAdd, onClose }) {
  const q = search.trim().toLowerCase();
  const filtered = q ? catalog.filter(c => (c.name || '').toLowerCase().includes(q)) : catalog;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,10,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#F5F6F7', width: '100%', maxWidth: 480, maxHeight: '82vh', borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -12px 40px rgba(0,0,0,0.4)' }}
      >
        <div style={{ padding: '1rem 1.1rem 0.75rem', borderBottom: '0.5px solid rgba(140,150,160,0.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#12151A' }}>📚 Каталог с автомобили</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5B6470', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          </div>

          <input
            autoFocus
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Търси по марка/модел..."
            style={{ width: '100%', padding: '9px 12px', border: '0.5px solid rgba(140,150,160,0.4)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'white' }}
          />
        </div>

        <div style={{ overflowY: 'auto', padding: '0.5rem 1.1rem 1.25rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#C9A227', fontSize: 13, padding: '1.75rem 0' }}>⏳ Зареждане...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#5B6470', fontSize: 13, padding: '1.75rem 0', lineHeight: 1.6 }}>
              {catalog.length === 0
                ? 'Каталогът е още празен. Добави автомобил ръчно и запази — той ще се появи тук за бъдеща употреба.'
                : 'Няма автомобил с това име.'}
            </div>
          )}

          {filtered.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(140,150,160,0.18)' }}>
              {c.image ? (
                <img src={c.image} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: 8, background: '#e6e8eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚗</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#12151A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: '#5B6470' }}>
                  {c.category ? `${c.category} · ` : ''}{c.price ? `${c.price} €` : ''}
                </div>
              </div>

              <button
                onClick={() => onAdd(c)}
                style={{ background: '#12151A', color: '#E8B830', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
              >
                + Добави
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstallBanner({ dark, iosDevice, dealershipName, onInstall, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 150,
        maxWidth: 440,
        margin: '0 auto',
        background: dark
          ? 'linear-gradient(135deg, rgba(27,31,38,0.98), rgba(10,12,16,0.98))'
          : 'linear-gradient(135deg, #fff7dc, #ffffff)',
        border: '1px solid rgba(201,162,39,0.4)',
        borderRadius: 14,
        padding: '12px 12px 12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 14px 34px rgba(0,0,0,0.3)',
        animation: 'fadeUp 0.4s ease',
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#12151A', color: '#E8B830', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        🚗
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#E8B830' : '#12151A' }}>
          Добави {dealershipName} на началния екран
        </div>
        <div style={{ fontSize: 11, color: dark ? '#a8b0ba' : '#5B6470', marginTop: 2, lineHeight: 1.4 }}>
          {iosDevice
            ? 'Тапни бутона Споделяне ⬆️ в Safari, после „Добави към Начален екран“'
            : 'Бърз достъп до автомобилите, без да търсиш браузъра'}
        </div>
      </div>

      {!iosDevice && (
        <button
          onClick={onInstall}
          style={{ background: '#12151A', color: '#E8B830', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Добави
        </button>
      )}

      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: dark ? '#8f98a3' : '#5B6470', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: 4, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

export default function Home() {
  const [lot, setLot] = useState(null);
  const [screen, setScreen] = useState('lot');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [toast, setToast] = useState('');
  const [adminLot, setAdminLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dark, setDark] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [pickerSection, setPickerSection] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);
  const [todayViews, setTodayViews] = useState(null);
  const [galleryPage, setGalleryPage] = useState(0);
  const [currentPass, setCurrentPass] = useState(process.env.NEXT_PUBLIC_ADMIN_PASS || 'Maxxium121');
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const badgeColors = getBadgeColors(dark);

  useEffect(() => {
    const saved = localStorage.getItem('lot_dark');
    if (saved !== null) setDark(saved === '1');

    async function loadLot() {
      try {
        const snap = await getDoc(doc(db, 'lot', 'daily'));

        if (snap.exists()) {
          const data = snap.data();
          if (!Array.isArray(data.fullGalleryImages)) data.fullGalleryImages = [];
          setLot(data);
        } else {
          setLot(defaultLot);
        }
      } catch (e) {
        setLot(defaultLot);
      }

      setLoading(false);
      setTimeout(() => setHeaderVisible(true), 50);
    }

    loadLot();

    async function loadPassword() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'admin'));
        if (snap.exists() && snap.data().password) {
          setCurrentPass(snap.data().password);
        }
      } catch (e) {
        console.error('Грешка при зареждане на паролата:', e);
      }
    }

    loadPassword();
  }, []);

  useEffect(() => {
    async function trackView() {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const ref = doc(db, 'stats', todayKey);
      const sessionFlag = `lot_viewed_${todayKey}`;

      try {
        if (!sessionStorage.getItem(sessionFlag)) {
          await setDoc(ref, { count: increment(1), date: todayKey }, { merge: true });
          sessionStorage.setItem(sessionFlag, '1');
        }

        const snap = await getDoc(ref);
        setTodayViews(snap.exists() ? (snap.data().count || 0) : 0);
      } catch (e) {
        console.error('Грешка при брояча на посещения:', e);
        setTodayViews(0);
      }
    }

    trackView();
  }, []);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const dismissedAt = localStorage.getItem('lot_install_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 14 * 24 * 60 * 60 * 1000) return;

    const visits = parseInt(localStorage.getItem('lot_visits') || '0', 10) + 1;
    localStorage.setItem('lot_visits', String(visits));

    if (isIOSDevice()) {
      setIosDevice(true);
      if (visits >= 2) setShowInstallBanner(true);
      return;
    }

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPromptEvent(e);
      if (visits >= 2) setShowInstallBanner(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    setShowInstallBanner(false);
    setInstallPromptEvent(null);

    if (choice.outcome !== 'accepted') {
      localStorage.setItem('lot_install_dismissed', String(Date.now()));
    }
  }

  function dismissInstallBanner() {
    setShowInstallBanner(false);
    localStorage.setItem('lot_install_dismissed', String(Date.now()));
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('lot_dark', next ? '1' : '0');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function doLogin() {
    if (password === currentPass) {
      setAdminLot(JSON.parse(JSON.stringify(lot)));
      setScreen('admin');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  }

  async function changePassword() {
    setPassMsg('');

    if (!newPass1 || newPass1.length < 4) {
      setPassMsg('Паролата трябва да е поне 4 символа.');
      return;
    }

    if (newPass1 !== newPass2) {
      setPassMsg('Паролите не съвпадат.');
      return;
    }

    setPassSaving(true);

    try {
      await setDoc(doc(db, 'settings', 'admin'), { password: newPass1 }, { merge: true });
      setCurrentPass(newPass1);
      setNewPass1('');
      setNewPass2('');
      setPassMsg('Паролата е сменена успешно.');
      showToast('Паролата е сменена ✓');
    } catch (e) {
      console.error('Грешка при смяна на паролата:', e);
      setPassMsg('Грешка при запис. Опитай отново.');
    }

    setPassSaving(false);
  }

  async function saveLot() {
    setSaving(true);

    try {
      const m = JSON.parse(JSON.stringify(adminLot));

      // Всеки автомобил с попълнено име се записва (или обновява) и в каталога „cars“,
      // за да може да бъде преизползван неограничено пъти от там нататък.
      for (const sec of m.sections) {
        for (const c of sec.cars) {
          if (!c.name || !c.name.trim()) continue;

          const catalogData = {
            name: c.name,
            desc: c.desc || '',
            price: c.price || '',
            year: c.year || '',
            mileage: c.mileage || '',
            fuel: c.fuel || '',
            power: c.power || '',
            gearbox: c.gearbox || '',
            badges: c.badges || [],
            image: c.image || '',
            category: sec.label
          };

          if (c.catalogId) {
            await setDoc(doc(db, 'cars', c.catalogId), catalogData, { merge: true });
          } else {
            const ref = await addDoc(collection(db, 'cars'), catalogData);
            c.catalogId = ref.id;
          }
        }
      }

      await setDoc(doc(db, 'lot', 'daily'), m);
      setLot(m);
      setAdminLot(m);
      showToast('Автокъщата е записана ✓');
      setTimeout(() => setScreen('lot'), 1200);
    } catch (e) {
      showToast('Грешка при записване!');
    }

    setSaving(false);
  }

  async function loadCatalog() {
    setCatalogLoading(true);

    try {
      const snap = await getDocs(collection(db, 'cars'));
      const list = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bg'));
      setCatalog(list);
    } catch (e) {
      showToast('Грешка при зареждане на каталога');
    }

    setCatalogLoading(false);
  }

  function openPicker(si) {
    setPickerSearch('');
    setPickerSection(si);
    loadCatalog();
  }

  function addCarFromCatalog(si, car) {
    const m = JSON.parse(JSON.stringify(adminLot));

    m.sections[si].cars.push({
      name: car.name || '',
      desc: car.desc || '',
      price: car.price || '',
      year: car.year || '',
      mileage: car.mileage || '',
      fuel: car.fuel || '',
      power: car.power || '',
      gearbox: car.gearbox || '',
      badges: car.badges || [],
      image: car.image || '',
      catalogId: car.id
    });

    setAdminLot(m);
    showToast(`„${car.name}“ добавен ✓`);
  }

  function updateCar(si, ci, field, val) {
    const m = JSON.parse(JSON.stringify(adminLot));
    m.sections[si].cars[ci][field] = val;
    setAdminLot(m);
  }

  function toggleBadge(si, ci, badge) {
    const m = JSON.parse(JSON.stringify(adminLot));
    const c = m.sections[si].cars[ci];
    const idx = c.badges.indexOf(badge);

    if (idx > -1) c.badges.splice(idx, 1);
    else c.badges.push(badge);

    setAdminLot(m);
  }

  function deleteCar(si, ci) {
    const m = JSON.parse(JSON.stringify(adminLot));
    m.sections[si].cars.splice(ci, 1);
    setAdminLot(m);
  }

  function addCar(si) {
    const m = JSON.parse(JSON.stringify(adminLot));
    m.sections[si].cars.push({ name: '', desc: '', price: '', year: '', mileage: '', fuel: '', power: '', gearbox: '', badges: [], image: '' });
    setAdminLot(m);
  }

  function addSectionAfter(si) {
    const m = JSON.parse(JSON.stringify(adminLot));
    m.sections.splice(si + 1, 0, { label: 'Нова категория', cars: [] });
    setAdminLot(m);
  }

  function deleteSection(si) {
    const m = JSON.parse(JSON.stringify(adminLot));
    m.sections.splice(si, 1);
    setAdminLot(m);
  }

  function updateSectionLabel(si, label) {
    const m = JSON.parse(JSON.stringify(adminLot));
    m.sections[si].label = label;
    setAdminLot(m);
  }

  const bg = dark ? '#0d0f12' : '#F5F6F7';
  const cardBg = dark ? '#1b1f26' : 'white';
  const textMain = dark ? '#F1F3F5' : '#12151A';
  const textSub = dark ? '#a8b0ba' : '#5B6470';
  const border = dark ? 'rgba(140,150,160,0.18)' : 'rgba(140,150,160,0.28)';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0f12' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>
      <div style={{ fontSize: 32, animation: 'pulse 1.5s ease infinite' }}>🚗</div>
      <div style={{ marginTop: 16, color: '#C9A227', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Зареждане</div>
      <div style={{ marginTop: 12, width: 32, height: 32, border: '2px solid rgba(201,162,39,0.2)', borderTop: '2px solid #C9A227', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
    </div>
  );

  return (
    <>
      <Head>
        <title>{lot?.dealershipName || 'Автокъща'} — Автомобили</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={dark ? '#0d0f12' : '#12151A'} />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${bg}; transition: background 0.3s; }
        input, button, select { font-family: inherit; }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-label { animation: fadeUp 0.5s ease both; }

        .lot-hero {
          min-height: 170px;
          padding: 34px 56px 30px;
          overflow: hidden;
          isolation: isolate;
          position: relative;
        }

        .lot-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(2,3,5,.78) 0%, rgba(4,5,7,.42) 36%, rgba(2,3,5,.34) 60%, rgba(2,3,5,.76) 100%),
            linear-gradient(180deg, rgba(2,3,5,.4) 0%, rgba(2,3,5,.15) 45%, rgba(2,3,5,.62) 100%);
          z-index: -1;
          pointer-events: none;
        }

        .lot-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 48px rgba(0,0,0,.62);
          z-index: 0;
          pointer-events: none;
        }

        .hero-copy {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-shadow: 0 2px 10px rgba(0,0,0,.8);
        }

        .hero-kicker, .hero-subtitle {
          font-family: -apple-system, 'Segoe UI', sans-serif;
          color: #dfe3e8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .22em;
        }

        .hero-kicker { font-size: 12px; margin-bottom: 4px; }

        .hero-title {
          font-family: -apple-system, 'Segoe UI', sans-serif;
          font-size: clamp(26px, 7vw, 40px);
          line-height: 1.02;
          font-weight: 800;
          letter-spacing: .01em;
          color: #E8B830;
          text-shadow: 0 2px 0 rgba(0,0,0,.5), 0 4px 14px rgba(0,0,0,.9);
          margin: 1px 0 8px;
        }

        .hero-ornament {
          width: min(200px, 58vw);
          height: 3px;
          background: linear-gradient(90deg, transparent, #C9A227 20%, #E8B830 50%, #C9A227 80%, transparent);
          margin-bottom: 10px;
          box-shadow: 0 1px 6px rgba(232,184,48,0.4);
        }

        .hero-subtitle { font-size: 11px; opacity: 0.9; }

        @media (max-width: 520px) {
          .lot-hero {
            min-height: 190px;
            padding: 30px 44px 26px;
          }

          .hero-kicker { font-size: 11px; }
          .hero-title { font-size: clamp(30px, 9vw, 40px); }
          .hero-subtitle { font-size: 10px; }
        }
      `}</style>

      {screen === 'lot' && lot && (
        <div style={{ background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>
          {lot.phone && (
            <div style={{ background: '#C9A227', color: '#12151A', textAlign: 'center', padding: '7px 1rem', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', animation: 'fadeDown 0.4s ease' }}>
              📞 <a href={`tel:${lot.phone.replace(/\s/g, '')}`} style={{ color: '#12151A', textDecoration: 'none' }}>{lot.phone}</a>
            </div>
          )}

          <div
            className="lot-hero"
            style={{
              background: lot.heroImage && !isVideoUrl(lot.heroImage)
                ? `url(${lot.heroImage}) center/cover no-repeat`
                : 'linear-gradient(135deg, #14171c 0%, #06070a 100%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            {lot.heroImage && isVideoUrl(lot.heroImage) && (
              <video
                src={lot.heroImage}
                autoPlay
                muted
                loop
                playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }}
              />
            )}

            <button
              onClick={() => { setPassword(''); setLoginError(false); setScreen('login'); }}
              style={{ position: 'absolute', zIndex: 2, top: 10, right: 10, background: 'rgba(6,7,10,0.5)', border: '1px solid rgba(232,184,48,0.4)', color: '#E8B830', fontSize: 10, padding: '4px 7px', borderRadius: 4, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              ⚙
            </button>

            <button
              onClick={toggleDark}
              style={{ position: 'absolute', zIndex: 2, top: 10, left: 10, background: 'rgba(6,7,10,0.5)', border: '1px solid rgba(232,184,48,0.4)', color: '#E8B830', fontSize: 13, width: 27, height: 27, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            >
              {dark ? '☀️' : '🌙'}
            </button>

            <div className="hero-copy">
              <div className="hero-kicker">Автокъща</div>
              <div className="hero-title">{lot.dealershipName}</div>
              <div className="hero-ornament" />
              <div className="hero-subtitle">Проверени автомобили · Лизинг и бартер</div>
            </div>
          </div>

          {Array.isArray(lot.fullGalleryImages) && lot.fullGalleryImages.length > 0 && (
            <div style={{ padding: '1rem 1.25rem 0' }}>
              <button
                onClick={() => { setGalleryPage(0); setScreen('gallery'); }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(201,162,39,0.5)',
                  background: dark ? 'linear-gradient(135deg, rgba(201,162,39,0.16), rgba(27,31,38,0.96))' : 'linear-gradient(135deg, #fff7dc, #ffffff)',
                  color: dark ? '#E8B830' : '#12151A',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: dark ? '0 10px 28px rgba(0,0,0,0.3)' : '0 8px 20px rgba(0,0,0,0.08)'
                }}
              >
                🖼 Виж галерията на автокъщата
              </button>
            </div>
          )}

          <div style={{ padding: '1.25rem' }}>
            {(lot.sections || []).map((sec, si) => {
              let carIndex = 0;
              lot.sections.slice(0, si).forEach(s => { carIndex += s.cars.length; });

              return (
                <div key={si} style={{ marginBottom: '1.75rem' }}>
                  <div className="section-label" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A227', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, animationDelay: `${0.2 + si * 0.1}s` }}>
                    {sec.label}
                    <div style={{ flex: 1, height: 0.5, background: border }} />
                  </div>

                  {sec.cars.map((c, ci) => (
                    <CarCard key={ci} c={c} dark={dark} badgeColors={badgeColors} index={carIndex + ci} />
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', padding: '1rem 1.25rem 2.5rem' }}>
            <div style={{ fontSize: 11, color: textSub, lineHeight: 1.6 }}>
              {lot.footerNote?.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
            </div>
          </div>
        </div>
      )}

      {screen === 'gallery' && lot && (() => {
        const pages = lot.fullGalleryImages || [];
        const total = pages.length;
        const goTo = (n) => setGalleryPage(((n % total) + total) % total);
        let touchStartX = null;

        function onTouchStart(e) { touchStartX = e.touches[0].clientX; }
        function onTouchEnd(e) {
          if (touchStartX === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX;
          if (dx > 40) goTo(galleryPage - 1);
          else if (dx < -40) goTo(galleryPage + 1);
          touchStartX = null;
        }

        return (
          <div style={{ background: '#06070a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(6,7,10,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(201,162,39,0.25)', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => setScreen('lot')} style={{ background: 'none', border: '1px solid rgba(232,184,48,0.3)', color: '#E8B830', padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                ← Назад
              </button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#E8B830', fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Галерия
                </div>
                <div style={{ color: 'rgba(232,184,48,0.55)', fontSize: 11, marginTop: 2, letterSpacing: '0.05em' }}>
                  Снимка {galleryPage + 1} от {total}
                </div>
              </div>

              <div style={{ width: 68 }} />
            </div>

            <div
              style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 14px', overflow: 'hidden' }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {total > 1 && (
                <button
                  onClick={() => goTo(galleryPage - 1)}
                  aria-label="Предишна снимка"
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(232,184,48,0.3)', background: 'rgba(6,7,10,0.55)', color: '#E8B830', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
                >
                  ‹
                </button>
              )}

              <div
                key={galleryPage}
                style={{
                  maxWidth: 560,
                  width: '100%',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#12151a',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 2px 0 rgba(232,184,48,0.06) inset',
                  border: '1px solid rgba(201,162,39,0.35)',
                  animation: 'fadeUp 0.35s ease both'
                }}
              >
                <img src={pages[galleryPage]} alt={`Снимка ${galleryPage + 1}`} style={{ width: '100%', display: 'block' }} />
              </div>

              {total > 1 && (
                <button
                  onClick={() => goTo(galleryPage + 1)}
                  aria-label="Следваща снимка"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(232,184,48,0.3)', background: 'rgba(6,7,10,0.55)', color: '#E8B830', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
                >
                  ›
                </button>
              )}
            </div>

            {total > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 0 22px', flexWrap: 'wrap', maxWidth: 480, margin: '0 auto' }}>
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Снимка ${i + 1}`}
                    style={{
                      width: i === galleryPage ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'width 0.25s ease, background 0.25s ease',
                      background: i === galleryPage ? '#E8B830' : 'rgba(232,184,48,0.28)'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {screen === 'login' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: bg }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: textMain, marginBottom: 4 }}>Вход в администрацията</div>
          <div style={{ fontSize: 13, color: textSub, marginBottom: '1.5rem' }}>Въведете паролата за управление</div>

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Парола"
            style={{ width: '100%', maxWidth: 320, padding: '10px 14px', border: `0.5px solid ${border}`, borderRadius: 8, fontSize: 14, marginBottom: 10, outline: 'none', background: cardBg, color: textMain }}
          />

          <button onClick={doLogin} style={{ width: '100%', maxWidth: 320, padding: 11, background: '#12151A', color: '#E8B830', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Влез
          </button>

          {loginError && <div style={{ color: '#E24B4A', fontSize: 12, marginTop: 8 }}>Грешна парола</div>}

          <button onClick={() => setScreen('lot')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: textSub, fontSize: 13, cursor: 'pointer' }}>
            ← Назад към автомобилите
          </button>
        </div>
      )}

      {screen === 'admin' && adminLot && (
        <div style={{ background: '#F5F6F7', minHeight: '100vh' }}>
          <div style={{ background: '#12151A', color: '#E8B830', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setScreen('lot')} style={{ background: 'none', border: '0.5px solid rgba(232,184,48,0.35)', color: 'rgba(232,184,48,0.85)', padding: '5px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
              ← Автомобили
            </button>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Управление на автокъщата</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(232,184,48,0.8)' }}>
              👁 Днес: {todayViews === null ? '…' : todayViews}
            </span>
          </div>

          <div style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A227', marginBottom: 10 }}>
                Автокъща
              </div>

              <input
                value={adminLot.dealershipName}
                onChange={e => setAdminLot({ ...adminLot, dealershipName: e.target.value })}
                placeholder="Име на автокъщата"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', marginBottom: 8 }}
              />

              <input
                value={adminLot.phone || ''}
                onChange={e => setAdminLot({ ...adminLot, phone: e.target.value })}
                placeholder="Телефон за връзка"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', marginBottom: 8 }}
              />

              <input
                value={adminLot.footerNote}
                onChange={e => setAdminLot({ ...adminLot, footerNote: e.target.value })}
                placeholder="Бележка в долната част"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none' }}
              />

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: '#C9A227', marginBottom: 6 }}>ФОН НА ХЕДЪРА (СНИМКА ИЛИ MP4)</div>
                <ImageUploader value={adminLot.heroImage || ''} onChange={url => setAdminLot({ ...adminLot, heroImage: url })} allowVideo />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: '#C9A227', marginBottom: 6 }}>ГАЛЕРИЯ НА АВТОКЪЩАТА — ДО 30 СНИМКИ</div>
                <FullGalleryUploader value={adminLot.fullGalleryImages || []} onChange={imgs => setAdminLot({ ...adminLot, fullGalleryImages: imgs })} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', background: 'white', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 10, padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A227', marginBottom: 10 }}>
                Смяна на парола за админ
              </div>

              <input
                type="password"
                value={newPass1}
                onChange={e => setNewPass1(e.target.value)}
                placeholder="Нова парола"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 8, fontSize: 14, background: '#F9FAFA', outline: 'none', marginBottom: 8 }}
              />

              <input
                type="password"
                value={newPass2}
                onChange={e => setNewPass2(e.target.value)}
                placeholder="Потвърди новата парола"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 8, fontSize: 14, background: '#F9FAFA', outline: 'none', marginBottom: 8 }}
              />

              {passMsg && (
                <div style={{ fontSize: 12, color: passMsg.includes('успешно') ? '#2e7d32' : '#c0392b', marginBottom: 8 }}>
                  {passMsg}
                </div>
              )}

              <button
                onClick={changePassword}
                disabled={passSaving}
                style={{ background: '#12151A', color: '#E8B830', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', opacity: passSaving ? 0.6 : 1 }}
              >
                {passSaving ? 'Запис...' : 'Смени паролата'}
              </button>
            </div>

            {adminLot.sections.map((sec, si) => (
              <div key={si} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input
                    value={sec.label}
                    onChange={e => updateSectionLabel(si, e.target.value)}
                    style={{ flex: 1, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A227', padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.35)', borderRadius: 6, background: 'white', outline: 'none' }}
                  />

                  <button
                    onClick={() => deleteSection(si)}
                    title="Изтрий категорията"
                    style={{ background: 'none', border: 'none', color: '#E24B4A', fontSize: 18, opacity: 0.6, padding: '0 4px', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>

                {sec.cars.map((c, ci) => (
                  <div key={ci} style={{ background: 'white', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input
                        value={c.name}
                        onChange={e => updateCar(si, ci, 'name', e.target.value)}
                        placeholder="Марка и модел"
                        style={{ flex: 1, padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none' }}
                      />

                      <input
                        value={c.price}
                        onChange={e => updateCar(si, ci, 'price', e.target.value)}
                        placeholder="Цена €"
                        style={{ width: 80, padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none' }}
                      />

                      <button onClick={() => deleteCar(si, ci)} style={{ background: 'none', border: 'none', color: '#E24B4A', fontSize: 20, opacity: 0.6, padding: '0 4px', cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>

                    <input
                      value={c.desc}
                      onChange={e => updateCar(si, ci, 'desc', e.target.value)}
                      placeholder="Описание (екстри, състояние)"
                      style={{ width: '100%', padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none', marginBottom: 6, display: 'block' }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
                      <input
                        value={c.year || ''}
                        onChange={e => updateCar(si, ci, 'year', e.target.value)}
                        placeholder="Година"
                        style={{ padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none' }}
                      />
                      <input
                        value={c.mileage || ''}
                        onChange={e => updateCar(si, ci, 'mileage', e.target.value)}
                        placeholder="Пробег (напр. 180 000 км)"
                        style={{ padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none' }}
                      />
                      <input
                        value={c.fuel || ''}
                        onChange={e => updateCar(si, ci, 'fuel', e.target.value)}
                        placeholder="Гориво"
                        style={{ padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none' }}
                      />
                      <input
                        value={c.power || ''}
                        onChange={e => updateCar(si, ci, 'power', e.target.value)}
                        placeholder="Мощност (напр. 245 к.с.)"
                        style={{ padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none' }}
                      />
                      <input
                        value={c.gearbox || ''}
                        onChange={e => updateCar(si, ci, 'gearbox', e.target.value)}
                        placeholder="Скоростна кутия"
                        style={{ padding: '6px 8px', border: '0.5px solid rgba(140,150,160,0.3)', borderRadius: 4, fontSize: 13, background: '#F9FAFA', outline: 'none', gridColumn: 'span 2' }}
                      />
                    </div>

                    <ImageUploader value={c.image || ''} onChange={url => updateCar(si, ci, 'image', url)} />

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {['4x4', 'leasing', 'new', 'warranty'].map(b => {
                        const bc = getBadgeColors(false);
                        const emoji = b === '4x4' ? '🛞' : b === 'leasing' ? '🤝' : b === 'new' ? '✨' : '🛡';

                        return (
                          <button
                            key={b}
                            onClick={() => toggleBadge(si, ci, b)}
                            style={{
                              fontSize: 10,
                              padding: '3px 9px',
                              borderRadius: 20,
                              border: c.badges.includes(b) ? `0.5px solid ${bc[b].color}` : '0.5px solid rgba(140,150,160,0.3)',
                              background: c.badges.includes(b) ? bc[b].bg : 'white',
                              color: c.badges.includes(b) ? bc[b].color : '#5B6470',
                              cursor: 'pointer'
                            }}
                          >
                            {emoji} {BADGE_LABELS[b]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => addCar(si)}
                    style={{ flex: 1, padding: 8, border: '0.5px dashed rgba(140,150,160,0.4)', borderRadius: 8, background: 'transparent', color: '#C9A227', fontSize: 13, cursor: 'pointer' }}
                  >
                    + Нов автомобил
                  </button>

                  <button
                    onClick={() => openPicker(si)}
                    style={{ flex: 1, padding: 8, border: '0.5px solid rgba(140,150,160,0.5)', borderRadius: 8, background: '#12151A', color: '#E8B830', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    📚 От каталога
                  </button>
                </div>

                <button
                  onClick={() => addSectionAfter(si)}
                  style={{ width: '100%', marginTop: 8, padding: 7, border: '0.5px dashed rgba(140,150,160,0.4)', borderRadius: 8, background: 'transparent', color: '#C9A227', fontSize: 12, cursor: 'pointer' }}
                >
                  + Нова категория след „{sec.label}“
                </button>
              </div>
            ))}

            <button
              onClick={saveLot}
              disabled={saving}
              style={{ width: '100%', padding: 13, background: saving ? '#555' : '#12151A', color: '#E8B830', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', marginTop: '0.5rem', cursor: saving ? 'default' : 'pointer' }}
            >
              {saving ? 'Записване...' : '💾 Запази автокъщата'}
            </button>
          </div>
        </div>
      )}

      {screen === 'lot' && showInstallBanner && lot && (
        <InstallBanner
          dark={dark}
          iosDevice={iosDevice}
          dealershipName={lot.dealershipName}
          onInstall={handleInstallClick}
          onDismiss={dismissInstallBanner}
        />
      )}

      {pickerSection !== null && (
        <CarPickerModal
          catalog={catalog}
          loading={catalogLoading}
          search={pickerSearch}
          onSearch={setPickerSearch}
          onAdd={car => addCarFromCatalog(pickerSection, car)}
          onClose={() => setPickerSection(null)}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#12151A', color: '#E8B830', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 99, whiteSpace: 'nowrap', animation: 'fadeUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}
