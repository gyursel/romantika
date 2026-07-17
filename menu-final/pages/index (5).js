import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, increment } from 'firebase/firestore';

const CLOUD_NAME = 'dqunocngf';
const UPLOAD_PRESET = 'menu_upload';

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

const defaultMenu = {
  restaurantName: 'Романтика',
  phone: '+359 88 888 8887',
  footerNote: 'Всички ястия се приготвят в момента на поръчката.\nАлергени при поискване.',
  heroImage: '',
  fullMenuImages: [],
  sections: [
    {
      label: 'Супата',
      dishes: [
        { name: 'Телешки бульон с фиде', desc: 'Домашен бульон, зеленчуци, магданоз', price: '4.50', weight: '300 мл', badges: [], image: '' },
        { name: 'Крем супа от тиква', desc: 'Орехи, сметана, черен пипер', price: '5.00', weight: '300 мл', badges: ['veg'], image: '' }
      ]
    },
    {
      label: 'Основно',
      dishes: [
        { name: 'Свинско с картофи на фурна', desc: 'Печено бавно, с розмарин и мащерка', price: '12.00', weight: '350 г', badges: [], image: '' },
        { name: 'Пилешко с гъби', desc: 'В маслено-чеснов сос, с ориз', price: '10.50', weight: '320 г', badges: ['new'], image: '' },
        { name: 'Гевречета с тахан', desc: 'Сезонни зеленчуци, хумус, кисело мляко', price: '9.00', weight: '280 г', badges: ['veg'], image: '' }
      ]
    },
    {
      label: 'Десерт',
      dishes: [
        { name: 'Баница с ябълки', desc: 'Хрупкава коричка, канела, пудра захар', price: '3.50', weight: '150 г', badges: [], image: '' },
        { name: 'Тирамису', desc: 'По класическа рецепта с маскарпоне', price: '5.50', weight: '180 г', badges: [], image: '' }
      ]
    }
  ]
};

const BADGE_LABELS = { veg: 'Вегетарианско', spicy: 'Пикантно', new: 'Ново' };

function getBadgeColors(dark) {
  return {
    veg: { bg: dark ? '#1a2e0a' : '#EAF3DE', color: dark ? '#7ec850' : '#27500A' },
    spicy: { bg: dark ? '#2e0a0a' : '#FAECE7', color: dark ? '#e86060' : '#712B13' },
    new: { bg: dark ? '#2e1f00' : '#FAEEDA', color: dark ? '#e8a830' : '#633806' },
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const isVideo = allowVideo && file.type.startsWith('video/');
      const endpoint = isVideo ? 'video' : 'image';

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.secure_url) onChange(data.secure_url);
      else throw new Error(data.error?.message || 'Upload failed');
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
            <video src={value} muted playsInline style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 6, border: '0.5px solid rgba(184,134,11,0.3)', display: 'block' }} />
          ) : (
            <img src={value} alt="" style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 6, border: '0.5px solid rgba(184,134,11,0.3)', display: 'block' }} />
          )}
          <button onClick={() => inputRef.current.click()} style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(26,18,8,0.82)', border: 'none', color: '#F5E6A3', fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}>
            Смени
          </button>
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(226,75,74,0.9)', border: 'none', color: 'white', fontSize: 13, width: 18, height: 18, borderRadius: '50%', lineHeight: '18px', textAlign: 'center', padding: 0, cursor: 'pointer' }}>
            ×
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={uploading}
          style={{ padding: '5px 12px', border: '0.5px dashed rgba(184,134,11,0.4)', borderRadius: 6, background: 'transparent', color: uploading ? '#aaa' : '#B8860B', fontSize: 12, cursor: uploading ? 'default' : 'pointer' }}>
          {uploading ? '⏳ Качване...' : allowVideo ? '📷 Добави снимка/видео' : '📷 Добави снимка'}
        </button>
      )}
    </div>
  );
}

function FullMenuUploader({ value = [], onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  async function uploadOne(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || 'Upload failed');
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const current = Array.isArray(value) ? value : [];
    const freeSlots = Math.max(0, 20 - current.length);
    const selected = files.slice(0, freeSlots);

    if (!selected.length) {
      alert('Можеш да качиш максимум 20 файла за цялото меню.');
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const urls = [];

      for (const file of selected) {
        urls.push(await uploadOne(file));
      }

      onChange([...current, ...urls].slice(0, 20));
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
        disabled={uploading || (value || []).length >= 20}
        style={{
          padding: '8px 12px',
          border: '0.5px dashed rgba(184,134,11,0.45)',
          borderRadius: 8,
          background: 'transparent',
          color: uploading ? '#aaa' : '#B8860B',
          fontSize: 13,
          cursor: uploading ? 'default' : 'pointer',
          width: '100%'
        }}
      >
        {uploading ? '⏳ Качване...' : `📚 Качи файлове за цялото меню (${(value || []).length}/20)`}
      </button>

      <div style={{ fontSize: 11, color: '#6B5E3E', marginTop: 6, lineHeight: 1.45 }}>
        Можеш да качиш до 8 снимки/страници. Те ще се отварят от бутона „Виж цялото меню“.
      </div>

      {(value || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
          {(value || []).map((url, i) => (
            <div key={url + i} style={{ position: 'relative' }}>
              <img src={url} alt={`Страница ${i + 1}`} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '0.5px solid rgba(184,134,11,0.25)', display: 'block' }} />
              <div style={{ position: 'absolute', left: 5, bottom: 5, background: 'rgba(26,18,8,0.78)', color: '#F5E6A3', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
                #{i + 1}
              </div>
              <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(226,75,74,0.92)', border: 'none', color: 'white', fontSize: 13, width: 20, height: 20, borderRadius: '50%', lineHeight: '20px', textAlign: 'center', padding: 0, cursor: 'pointer' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DishCard({ d, dark, badgeColors, index }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 + index * 60);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div style={{
      background: dark ? '#2b2419' : 'white',
      border: `0.5px solid ${dark ? 'rgba(184,134,11,0.25)' : 'rgba(184,134,11,0.2)'}`,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(18px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      {d.image && <img src={d.image} alt={d.name} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />}

      <div style={{ padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: dark ? '#FBEFC2' : '#1A1208', marginBottom: 3 }}>{d.name}</div>
          {d.desc && <div style={{ fontSize: 12, color: dark ? '#cbb588' : '#6B5E3E', lineHeight: 1.5 }}>{d.desc}</div>}
          {d.weight && <div style={{ fontSize: 11, color: '#B8860B', marginTop: 4, opacity: 0.85 }}>⚖ {d.weight}</div>}

          {d.badges?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {d.badges.map(b => (
                <span key={b} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: badgeColors[b]?.bg, color: badgeColors[b]?.color }}>
                  {BADGE_LABELS[b]}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: dark ? '#d4a830' : '#7A5C00', whiteSpace: 'nowrap' }}>
          {d.price} €
        </div>
      </div>
    </div>
  );
}

function DishPickerModal({ catalog, loading, search, onSearch, onAdd, onClose }) {
  const q = search.trim().toLowerCase();
  const filtered = q ? catalog.filter(d => (d.name || '').toLowerCase().includes(q)) : catalog;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,6,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#FDFAF5', width: '100%', maxWidth: 480, maxHeight: '82vh', borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -12px 40px rgba(0,0,0,0.35)' }}
      >
        <div style={{ padding: '1rem 1.1rem 0.75rem', borderBottom: '0.5px solid rgba(184,134,11,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1208' }}>📚 Каталог с ястия</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B5E3E', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          </div>

          <input
            autoFocus
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Търси ястие по име..."
            style={{ width: '100%', padding: '9px 12px', border: '0.5px solid rgba(184,134,11,0.3)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'white' }}
          />
        </div>

        <div style={{ overflowY: 'auto', padding: '0.5rem 1.1rem 1.25rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#B8860B', fontSize: 13, padding: '1.75rem 0' }}>⏳ Зареждане...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6B5E3E', fontSize: 13, padding: '1.75rem 0', lineHeight: 1.6 }}>
              {catalog.length === 0
                ? 'Каталогът е още празен. Добави ястие ръчно и запази менюто — то ще се появи тук за бъдеща употреба.'
                : 'Няма ястие с това име.'}
            </div>
          )}

          {filtered.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(184,134,11,0.12)' }}>
              {d.image ? (
                <img src={d.image} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: 8, background: '#f1e7cf', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1208', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: 11, color: '#6B5E3E' }}>
                  {d.category ? `${d.category} · ` : ''}{d.price ? `${d.price} €` : ''}
                </div>
              </div>

              <button
                onClick={() => onAdd(d)}
                style={{ background: '#1A1208', color: '#F5E6A3', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
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

function InstallBanner({ dark, iosDevice, restaurantName, onInstall, onDismiss }) {
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
          ? 'linear-gradient(135deg, rgba(43,36,25,0.98), rgba(26,18,8,0.98))'
          : 'linear-gradient(135deg, #fff7dc, #ffffff)',
        border: '1px solid rgba(184,134,11,0.4)',
        borderRadius: 14,
        padding: '12px 12px 12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 14px 34px rgba(0,0,0,0.28)',
        animation: 'fadeUp 0.4s ease',
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#1A1208', color: '#F5E6A3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        🍽
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#F5E6A3' : '#1A1208' }}>
          Добави {restaurantName} на началния екран
        </div>
        <div style={{ fontSize: 11, color: dark ? '#cbb588' : '#6B5E3E', marginTop: 2, lineHeight: 1.4 }}>
          {iosDevice
            ? 'Тапни бутона Споделяне ⬆️ в Safari, после „Добави към Начален екран“'
            : 'Бърз достъп до менюто, без да търсиш браузъра'}
        </div>
      </div>

      {!iosDevice && (
        <button
          onClick={onInstall}
          style={{ background: '#1A1208', color: '#F5E6A3', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Добави
        </button>
      )}

      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: dark ? '#a08c5e' : '#6B5E3E', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: 4, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

export default function Home() {
  const [menu, setMenu] = useState(null);
  const [screen, setScreen] = useState('menu');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [toast, setToast] = useState('');
  const [adminMenu, setAdminMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dark, setDark] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [pickerSection, setPickerSection] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);
  const [todayViews, setTodayViews] = useState(null);

  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || '1234';
  const badgeColors = getBadgeColors(dark);

  useEffect(() => {
    const saved = localStorage.getItem('menu_dark');
    if (saved === '1') setDark(true);

    async function loadMenu() {
      try {
        const snap = await getDoc(doc(db, 'menu', 'daily'));

        if (snap.exists()) {
          const data = snap.data();

          if (!Array.isArray(data.fullMenuImages)) data.fullMenuImages = [];

          if (data.sections) {
            data.sections = data.sections.map(sec => ({
              ...sec,
              dishes: sec.dishes.map(d => ({ weight: '', ...d }))
            }));
          }

          setMenu(data);
        } else {
          setMenu(defaultMenu);
        }
      } catch (e) {
        setMenu(defaultMenu);
      }

      setLoading(false);
      setTimeout(() => setHeaderVisible(true), 50);
    }

    loadMenu();
  }, []);

  useEffect(() => {
    async function trackView() {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const ref = doc(db, 'stats', todayKey);
      const sessionFlag = `menu_viewed_${todayKey}`;

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

    const dismissedAt = localStorage.getItem('menu_install_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 14 * 24 * 60 * 60 * 1000) return;

    const visits = parseInt(localStorage.getItem('menu_visits') || '0', 10) + 1;
    localStorage.setItem('menu_visits', String(visits));

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
      localStorage.setItem('menu_install_dismissed', String(Date.now()));
    }
  }

  function dismissInstallBanner() {
    setShowInstallBanner(false);
    localStorage.setItem('menu_install_dismissed', String(Date.now()));
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('menu_dark', next ? '1' : '0');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function doLogin() {
    if (password === ADMIN_PASS) {
      setAdminMenu(JSON.parse(JSON.stringify(menu)));
      setScreen('admin');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  }

  async function saveMenu() {
    setSaving(true);

    try {
      const m = JSON.parse(JSON.stringify(adminMenu));

      // Всяко ястие с попълнено име се записва (или обновява) и в каталога „dishes“,
      // за да може да бъде преизползвано неограничено пъти от там нататък.
      for (const sec of m.sections) {
        for (const d of sec.dishes) {
          if (!d.name || !d.name.trim()) continue;

          const catalogData = {
            name: d.name,
            desc: d.desc || '',
            price: d.price || '',
            weight: d.weight || '',
            badges: d.badges || [],
            image: d.image || '',
            category: sec.label
          };

          if (d.catalogId) {
            await setDoc(doc(db, 'dishes', d.catalogId), catalogData, { merge: true });
          } else {
            const ref = await addDoc(collection(db, 'dishes'), catalogData);
            d.catalogId = ref.id;
          }
        }
      }

      await setDoc(doc(db, 'menu', 'daily'), m);
      setMenu(m);
      setAdminMenu(m);
      showToast('Менюто е записано ✓');
      setTimeout(() => setScreen('menu'), 1200);
    } catch (e) {
      showToast('Грешка при записване!');
    }

    setSaving(false);
  }

  async function loadCatalog() {
    setCatalogLoading(true);

    try {
      const snap = await getDocs(collection(db, 'dishes'));
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

  function addDishFromCatalog(si, dish) {
    const m = JSON.parse(JSON.stringify(adminMenu));

    m.sections[si].dishes.push({
      name: dish.name || '',
      desc: dish.desc || '',
      price: dish.price || '',
      weight: dish.weight || '',
      badges: dish.badges || [],
      image: dish.image || '',
      catalogId: dish.id
    });

    setAdminMenu(m);
    showToast(`„${dish.name}“ добавено ✓`);
  }

  function updateDish(si, di, field, val) {
    const m = JSON.parse(JSON.stringify(adminMenu));
    m.sections[si].dishes[di][field] = val;
    setAdminMenu(m);
  }

  function toggleBadge(si, di, badge) {
    const m = JSON.parse(JSON.stringify(adminMenu));
    const d = m.sections[si].dishes[di];
    const idx = d.badges.indexOf(badge);

    if (idx > -1) d.badges.splice(idx, 1);
    else d.badges.push(badge);

    setAdminMenu(m);
  }

  function deleteDish(si, di) {
    const m = JSON.parse(JSON.stringify(adminMenu));
    m.sections[si].dishes.splice(di, 1);
    setAdminMenu(m);
  }

  function addDish(si) {
    const m = JSON.parse(JSON.stringify(adminMenu));
    m.sections[si].dishes.push({ name: '', desc: '', price: '', weight: '', badges: [], image: '' });
    setAdminMenu(m);
  }

  const bg = dark ? '#1b150d' : '#FDFAF5';
  const cardBg = dark ? '#2b2419' : 'white';
  const textMain = dark ? '#F5E6A3' : '#1A1208';
  const textSub = dark ? '#a08c5e' : '#6B5E3E';
  const border = dark ? 'rgba(184,134,11,0.15)' : 'rgba(184,134,11,0.2)';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1A1208' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>
      <div style={{ fontSize: 32, animation: 'pulse 1.5s ease infinite' }}>🍽</div>
      <div style={{ marginTop: 16, color: '#B8860B', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Зареждане</div>
      <div style={{ marginTop: 12, width: 32, height: 32, border: '2px solid rgba(184,134,11,0.2)', borderTop: '2px solid #B8860B', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
    </div>
  );

  return (
    <>
      <Head>
        <title>{menu?.restaurantName || 'Меню'} — Меню</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={dark ? '#110e08' : '#1A1208'} />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${bg}; transition: background 0.3s; }
        input, button { font-family: inherit; }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-label { animation: fadeUp 0.5s ease both; }

        .romantika-hero {
          min-height: 160px;
          padding: 34px 56px 30px;
          overflow: hidden;
          isolation: isolate;
        }

        .romantika-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(8,5,2,.72) 0%, rgba(10,7,3,.36) 36%, rgba(8,5,2,.28) 60%, rgba(8,5,2,.70) 100%),
            linear-gradient(180deg, rgba(6,4,2,.34) 0%, rgba(6,4,2,.13) 45%, rgba(6,4,2,.58) 100%);
          z-index: -1;
          pointer-events: none;
        }

        .romantika-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 42px rgba(0,0,0,.58);
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
          text-shadow: 0 2px 10px rgba(0,0,0,.78);
        }

        .hero-kicker, .hero-subtitle {
          font-family: Georgia, 'Times New Roman', serif;
          color: #fff9e8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .20em;
        }

        .hero-kicker { font-size: 13px; margin-bottom: 2px; }

        .hero-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(26px, 7vw, 38px);
          line-height: .98;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .035em;
          color: #e9c86f;
          text-shadow: 0 2px 0 #5f3d00, 0 4px 12px rgba(0,0,0,.92);
          margin: 1px 0 7px;
        }

        .hero-ornament {
          width: min(200px, 58vw);
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-bottom: 3px;
        }

        .hero-ornament::before,
        .hero-ornament::after {
          content: '';
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, transparent, #d7ad42 28%, #f0d77f 100%);
          box-shadow: 0 1px 0 rgba(64,40,0,.8);
        }

        .hero-ornament::after { transform: scaleX(-1); }

        .hero-heart {
          color: #e5bd55;
          font-size: 20px;
          line-height: 1;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,.85));
        }

        .hero-subtitle { font-size: 11px; }

        @media (max-width: 520px) {
          .romantika-hero {
            min-height: 190px;
            padding: 30px 44px 26px;
          }

          .hero-kicker { font-size: 12px; }
          .hero-title { font-size: clamp(30px, 9vw, 40px); }
          .hero-subtitle { font-size: 10px; }
        }
      `}</style>

      {screen === 'menu' && menu && (
        <div style={{ background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>
          {menu.phone && (
            <div style={{ background: '#B8860B', color: '#1A1208', textAlign: 'center', padding: '7px 1rem', fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', animation: 'fadeDown 0.4s ease' }}>
              📞 <a href={`tel:${menu.phone.replace(/\s/g, '')}`} style={{ color: '#1A1208', textDecoration: 'none' }}>{menu.phone}</a>
            </div>
          )}

          <div
            className="romantika-hero"
            style={{
              background: menu.heroImage && !isVideoUrl(menu.heroImage)
                ? `url(${menu.heroImage}) center/cover no-repeat`
                : 'linear-gradient(135deg, #20160a 0%, #0d0905 100%)',
              color: '#D4AF37',
              textAlign: 'center',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            {menu.heroImage && isVideoUrl(menu.heroImage) && (
              <video
                src={menu.heroImage}
                autoPlay
                muted
                loop
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: -2,
                }}
              />
            )}

            <button
              onClick={() => { setPassword(''); setLoginError(false); setScreen('login'); }}
              style={{ position: 'absolute', zIndex: 2, top: 10, right: 10, background: 'rgba(14,9,4,0.46)', border: '1px solid rgba(234,201,111,0.42)', color: '#f2d98c', fontSize: 10, padding: '4px 7px', borderRadius: 4, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              ⚙
            </button>

            <button
              onClick={toggleDark}
              style={{ position: 'absolute', zIndex: 2, top: 10, left: 10, background: 'rgba(14,9,4,0.46)', border: '1px solid rgba(234,201,111,0.42)', color: '#f2d98c', fontSize: 13, width: 27, height: 27, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            >
              {dark ? '☀️' : '🌙'}
            </button>

            <div className="hero-copy">
              <div className="hero-kicker">Добре дошли в</div>
              <div className="hero-title">{menu.restaurantName}</div>
              <div className="hero-ornament">
                <span className="hero-heart">♡</span>
              </div>
              <div className="hero-subtitle">Обедно меню</div>
              {todayViews !== null && (
                <div style={{
                  marginTop: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: 'rgba(245,230,163,0.85)',
                  background: 'rgba(14,9,4,0.4)',
                  border: '0.5px solid rgba(234,201,111,0.35)',
                  borderRadius: 20,
                  padding: '4px 12px',
                  backdropFilter: 'blur(4px)'
                }}>
                  👀 {todayViews} {todayViews === 1 ? 'посещение' : 'посещения'} днес
                </div>
              )}
            </div>
          </div>

          {Array.isArray(menu.fullMenuImages) && menu.fullMenuImages.length > 0 && (
            <div style={{ padding: '1rem 1.25rem 0' }}>
              <button
                onClick={() => setScreen('fullMenu')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(184,134,11,0.45)',
                  background: dark ? 'linear-gradient(135deg, rgba(184,134,11,0.20), rgba(43,36,25,0.96))' : 'linear-gradient(135deg, #fff7dc, #ffffff)',
                  color: dark ? '#F5E6A3' : '#1A1208',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: dark ? '0 10px 28px rgba(0,0,0,0.22)' : '0 8px 20px rgba(122,92,0,0.08)'
                }}
              >
                📖 Виж цялото меню
              </button>
            </div>
          )}

          <div style={{ padding: '1.25rem' }}>
            {(menu.sections || []).map((sec, si) => {
              let dishIndex = 0;
              menu.sections.slice(0, si).forEach(s => { dishIndex += s.dishes.length; });

              return (
                <div key={si} style={{ marginBottom: '1.75rem', animationDelay: `${si * 0.1}s` }}>
                  <div className="section-label" style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#B8860B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, animationDelay: `${0.2 + si * 0.1}s` }}>
                    {sec.label}
                    <div style={{ flex: 1, height: 0.5, background: dark ? 'rgba(184,134,11,0.15)' : 'rgba(184,134,11,0.2)' }} />
                  </div>

                  {sec.dishes.map((d, di) => (
                    <DishCard key={di} d={d} dark={dark} badgeColors={badgeColors} index={dishIndex + di} />
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', padding: '1rem 1.25rem 2.5rem' }}>
            <div style={{ fontSize: 11, color: textSub, lineHeight: 1.6 }}>
              {menu.footerNote?.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
            </div>
          </div>
        </div>
      )}

      {screen === 'fullMenu' && menu && (
        <div style={{ background: bg, minHeight: '100vh', paddingBottom: '2rem' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 20, background: dark ? 'rgba(17,14,8,0.94)' : 'rgba(253,250,245,0.94)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${border}`, padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => setScreen('menu')} style={{ background: 'none', border: `1px solid ${border}`, color: textMain, padding: '7px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              ← Назад
            </button>

            <div style={{ color: '#B8860B', fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Цялото меню
            </div>

            <div style={{ width: 65 }} />
          </div>

          <div style={{ padding: '1rem 0.75rem' }}>
            {(menu.fullMenuImages || []).map((url, i) => (
              <div key={url + i} style={{ marginBottom: 14, borderRadius: 14, overflow: 'hidden', border: `1px solid ${border}`, background: cardBg, boxShadow: dark ? '0 12px 32px rgba(0,0,0,0.22)' : '0 10px 26px rgba(122,92,0,0.08)' }}>
                <div style={{ padding: '8px 12px', color: '#B8860B', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${border}` }}>
                  Страница {i + 1}
                </div>
                <img src={url} alt={`Цялото меню страница ${i + 1}`} style={{ width: '100%', display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {screen === 'login' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: bg }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: textMain, marginBottom: 4 }}>Вход в администрацията</div>
          <div style={{ fontSize: 13, color: textSub, marginBottom: '1.5rem' }}>Въведете паролата за управление</div>

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Парола"
            style={{ width: '100%', maxWidth: 320, padding: '10px 14px', border: `0.5px solid ${border}`, borderRadius: 8, fontSize: 14, marginBottom: 10, outline: 'none', background: cardBg, color: textMain }}
          />

          <button onClick={doLogin} style={{ width: '100%', maxWidth: 320, padding: 11, background: '#1A1208', color: '#F5E6A3', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Влез
          </button>

          {loginError && <div style={{ color: '#E24B4A', fontSize: 12, marginTop: 8 }}>Грешна парола</div>}

          <button onClick={() => setScreen('menu')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: textSub, fontSize: 13, cursor: 'pointer' }}>
            ← Назад към менюто
          </button>
        </div>
      )}

      {screen === 'admin' && adminMenu && (
        <div style={{ background: '#FDFAF5', minHeight: '100vh' }}>
          <div style={{ background: '#1A1208', color: '#F5E6A3', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setScreen('menu')} style={{ background: 'none', border: '0.5px solid rgba(245,230,163,0.3)', color: 'rgba(245,230,163,0.8)', padding: '5px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
              ← Меню
            </button>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Управление на менюто</span>
          </div>

          <div style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8860B', marginBottom: 10 }}>
                Ресторант
              </div>

              <input
                value={adminMenu.restaurantName}
                onChange={e => setAdminMenu({ ...adminMenu, restaurantName: e.target.value })}
                placeholder="Име на ресторант"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', marginBottom: 8 }}
              />

              <input
                value={adminMenu.phone || ''}
                onChange={e => setAdminMenu({ ...adminMenu, phone: e.target.value })}
                placeholder="Телефон за връзка"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', marginBottom: 8 }}
              />

              <input
                value={adminMenu.footerNote}
                onChange={e => setAdminMenu({ ...adminMenu, footerNote: e.target.value })}
                placeholder="Бележка в долната част"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none' }}
              />

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: '#B8860B', marginBottom: 6 }}>ФОН НА ХЕДЪРА (СНИМКА ИЛИ MP4)</div>
                <ImageUploader value={adminMenu.heroImage || ''} onChange={url => setAdminMenu({ ...adminMenu, heroImage: url })} allowVideo />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: '#B8860B', marginBottom: 6 }}>ЦЯЛО МЕНЮ — ДО 20 ФАЙЛА</div>
                <FullMenuUploader value={adminMenu.fullMenuImages || []} onChange={imgs => setAdminMenu({ ...adminMenu, fullMenuImages: imgs })} />
              </div>
            </div>

            {adminMenu.sections.map((sec, si) => (
              <div key={si} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8860B', marginBottom: 10 }}>
                  {sec.label}
                </div>

                {sec.dishes.map((d, di) => (
                  <div key={di} style={{ background: 'white', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input
                        value={d.name}
                        onChange={e => updateDish(si, di, 'name', e.target.value)}
                        placeholder="Ястие"
                        style={{ flex: 1, padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none' }}
                      />

                      <input
                        value={d.price}
                        onChange={e => updateDish(si, di, 'price', e.target.value)}
                        placeholder="Цена"
                        style={{ width: 65, padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none' }}
                      />

                      <button onClick={() => deleteDish(si, di)} style={{ background: 'none', border: 'none', color: '#E24B4A', fontSize: 20, opacity: 0.6, padding: '0 4px', cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>

                    <input
                      value={d.desc}
                      onChange={e => updateDish(si, di, 'desc', e.target.value)}
                      placeholder="Описание"
                      style={{ width: '100%', padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none', marginBottom: 6, display: 'block' }}
                    />

                    <input
                      value={d.weight || ''}
                      onChange={e => updateDish(si, di, 'weight', e.target.value)}
                      placeholder="Грамаж (напр. 350 г)"
                      style={{ width: '100%', padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none', marginBottom: 6, display: 'block' }}
                    />

                    <ImageUploader value={d.image || ''} onChange={url => updateDish(si, di, 'image', url)} />

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {['veg', 'spicy', 'new'].map(b => {
                        const bc = getBadgeColors(false);

                        return (
                          <button
                            key={b}
                            onClick={() => toggleBadge(si, di, b)}
                            style={{
                              fontSize: 10,
                              padding: '3px 9px',
                              borderRadius: 20,
                              border: d.badges.includes(b) ? `0.5px solid ${bc[b].color}` : '0.5px solid rgba(184,134,11,0.2)',
                              background: d.badges.includes(b) ? bc[b].bg : 'white',
                              color: d.badges.includes(b) ? bc[b].color : '#6B5E3E',
                              cursor: 'pointer'
                            }}
                          >
                            {b === 'veg' ? '🌿' : b === 'spicy' ? '🌶' : '✨'} {BADGE_LABELS[b]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => addDish(si)}
                    style={{ flex: 1, padding: 8, border: '0.5px dashed rgba(184,134,11,0.3)', borderRadius: 8, background: 'transparent', color: '#B8860B', fontSize: 13, cursor: 'pointer' }}
                  >
                    + Ново ястие
                  </button>

                  <button
                    onClick={() => openPicker(si)}
                    style={{ flex: 1, padding: 8, border: '0.5px solid rgba(184,134,11,0.45)', borderRadius: 8, background: '#1A1208', color: '#F5E6A3', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >
                    📚 От каталога
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={saveMenu}
              disabled={saving}
              style={{ width: '100%', padding: 13, background: saving ? '#555' : '#1A1208', color: '#F5E6A3', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, letterSpacing: '0.04em', marginTop: '0.5rem', cursor: saving ? 'default' : 'pointer' }}
            >
              {saving ? 'Записване...' : '💾 Запази менюто'}
            </button>
          </div>
        </div>
      )}

      {screen === 'menu' && showInstallBanner && menu && (
        <InstallBanner
          dark={dark}
          iosDevice={iosDevice}
          restaurantName={menu.restaurantName}
          onInstall={handleInstallClick}
          onDismiss={dismissInstallBanner}
        />
      )}

      {pickerSection !== null && (
        <DishPickerModal
          catalog={catalog}
          loading={catalogLoading}
          search={pickerSearch}
          onSearch={setPickerSearch}
          onAdd={dish => addDishFromCatalog(pickerSection, dish)}
          onClose={() => setPickerSection(null)}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#1A1208', color: '#F5E6A3', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 99, whiteSpace: 'nowrap', animation: 'fadeUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}