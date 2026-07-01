import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CLOUD_NAME = 'dqunocngf';
const UPLOAD_PRESET = 'menu_upload';

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

function ImageUploader({ value, onChange }) {
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

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
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

  return (
    <div style={{ marginTop: 8 }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="" style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 6, border: '0.5px solid rgba(184,134,11,0.3)', display: 'block' }} />
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
          {uploading ? '⏳ Качване...' : '📷 Добави снимка'}
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
    const freeSlots = Math.max(0, 8 - current.length);
    const selected = files.slice(0, freeSlots);

    if (!selected.length) {
      alert('Можеш да качиш максимум 8 файла за цялото меню.');
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const urls = [];

      for (const file of selected) {
        urls.push(await uploadOne(file));
      }

      onChange([...current, ...urls].slice(0, 8));
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
        disabled={uploading || (value || []).length >= 8}
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
        {uploading ? '⏳ Качване...' : `📚 Качи файлове за цялото меню (${(value || []).length}/8)`}
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

  const isPromo = String(d.name || '').toLowerCase().includes('промо') || String(d.name || '').includes('**') || d.badges?.includes('new');
  const cleanName = String(d.name || '').replace(/\*\*/g, '');

  return (
    <div className="premium-dish-card" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(18px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>
      {isPromo && <div className="premium-ribbon">★ Препоръка</div>}

      {d.image && (
        <div className="premium-image-wrap">
          <img src={d.image} alt={d.name} className="premium-dish-image" />
          <div className="premium-image-shade" />
        </div>
      )}

      <div className="premium-dish-body">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="premium-dish-name">{cleanName}</div>
          {d.desc && <div className="premium-dish-desc">{d.desc}</div>}

          <div className="premium-meta-row">
            {d.weight && <span className="premium-weight">♨ {d.weight}</span>}
            {d.badges?.length > 0 && d.badges.map(b => (
              <span key={b} className="premium-badge" style={{ background: badgeColors[b]?.bg, color: badgeColors[b]?.color }}>
                {BADGE_LABELS[b]}
              </span>
            ))}
          </div>
        </div>

        <div className="premium-price-wrap">
          <div className="premium-price">{d.price} €</div>
          <div className="premium-price-line" />
        </div>
      </div>
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
  const [dark, setDark] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(false);

  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || '1234';
  const badgeColors = getBadgeColors(dark);

  useEffect(() => {
    const saved = localStorage.getItem('menu_dark');
    if (saved === '0') setDark(false);
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
      await setDoc(doc(db, 'menu', 'daily'), adminMenu);
      setMenu(adminMenu);
      showToast('Менюто е записано ✓');
      setTimeout(() => setScreen('menu'), 1200);
    } catch (e) {
      showToast('Грешка при записване!');
    }

    setSaving(false);
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

  const bg = dark ? '#070604' : '#FDFAF5';
  const cardBg = dark ? '#11100c' : 'white';
  const textMain = dark ? '#F8E7A6' : '#1A1208';
  const textSub = dark ? '#b9a77d' : '#6B5E3E';
  const border = dark ? 'rgba(224,174,67,0.28)' : 'rgba(184,134,11,0.2)';

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
        html { background: ${bg}; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background:
            radial-gradient(circle at 50% 0%, rgba(198,146,31,.18), transparent 34%),
            linear-gradient(180deg, #090805 0%, ${bg} 34%, #050403 100%);
          transition: background 0.3s;
        }
        input, button { font-family: inherit; }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes goldShine {
          0% { transform: translateX(-120%); opacity: 0; }
          25% { opacity: .85; }
          100% { transform: translateX(120%); opacity: 0; }
        }

        .section-label { animation: fadeUp 0.5s ease both; }

        .romantika-hero {
          min-height: 230px;
          padding: 38px 52px 34px;
          overflow: hidden;
          isolation: isolate;
          border-bottom: 1px solid rgba(224,174,67,.22);
        }

        .romantika-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 40%, rgba(255,224,136,.12), transparent 30%),
            linear-gradient(90deg, rgba(3,3,2,.88) 0%, rgba(8,6,3,.48) 38%, rgba(8,6,3,.46) 62%, rgba(3,3,2,.88) 100%),
            linear-gradient(180deg, rgba(0,0,0,.38) 0%, rgba(0,0,0,.22) 44%, rgba(0,0,0,.86) 100%);
          z-index: -1;
          pointer-events: none;
        }

        .romantika-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 -42px 58px rgba(0,0,0,.86), inset 0 0 72px rgba(0,0,0,.72);
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
          text-shadow: 0 2px 12px rgba(0,0,0,.86);
        }

        .hero-kicker, .hero-subtitle {
          font-family: Georgia, 'Times New Roman', serif;
          color: #fff7dc;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .24em;
        }

        .hero-kicker { font-size: 15px; margin-bottom: 5px; }

        .hero-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(38px, 10vw, 58px);
          line-height: .92;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .045em;
          color: #edcd73;
          text-shadow: 0 2px 0 #674201, 0 6px 16px rgba(0,0,0,.95), 0 0 24px rgba(233,187,72,.22);
          margin: 0 0 13px;
        }

        .hero-ornament {
          width: min(260px, 70vw);
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-bottom: 5px;
        }

        .hero-ornament::before,
        .hero-ornament::after {
          content: '';
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, transparent, #c28a21 18%, #ffe18a 100%);
          box-shadow: 0 0 12px rgba(230,178,61,.45), 0 1px 0 rgba(64,40,0,.8);
        }

        .hero-ornament::after { transform: scaleX(-1); }

        .hero-heart {
          color: #f1cb63;
          font-size: 25px;
          line-height: 1;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,.9));
        }

        .hero-subtitle { font-size: 13px; }

        .premium-dish-card {
          position: relative;
          background: linear-gradient(145deg, rgba(27,25,20,.98), rgba(7,7,6,.98));
          border: 1px solid rgba(224,174,67,.72);
          border-radius: 18px;
          margin-bottom: 18px;
          overflow: hidden;
          box-shadow: 0 18px 38px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,226,145,.13), 0 0 0 1px rgba(255,220,128,.04);
        }

        .premium-dish-card::after {
          content: '';
          position: absolute;
          left: -25%;
          right: -25%;
          bottom: -1px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,222,132,.95), transparent);
          box-shadow: 0 0 15px rgba(239,188,74,.85);
        }

        .premium-ribbon {
          position: absolute;
          top: 17px;
          left: -37px;
          z-index: 4;
          width: 160px;
          transform: rotate(-42deg);
          text-align: center;
          padding: 7px 0;
          background: linear-gradient(135deg, #8b640f, #e2bc58 48%, #7a5209);
          color: #fff3c7;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          text-shadow: 0 1px 1px rgba(0,0,0,.55);
          box-shadow: 0 8px 16px rgba(0,0,0,.35);
        }

        .premium-image-wrap { position: relative; height: 205px; overflow: hidden; }
        .premium-dish-image { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.015); }
        .premium-image-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.58) 100%); pointer-events: none; }

        .premium-dish-body {
          position: relative;
          padding: 18px 20px 20px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          background: linear-gradient(135deg, rgba(16,15,12,.98), rgba(6,6,5,.98));
        }

        .premium-dish-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 23px;
          line-height: 1.16;
          font-weight: 700;
          color: #f4d77f;
          text-shadow: 0 2px 10px rgba(0,0,0,.65);
          margin-bottom: 8px;
        }

        .premium-dish-desc { font-size: 15px; color: #dfd2ad; line-height: 1.48; }
        .premium-meta-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 13px; }
        .premium-weight { font-size: 14px; color: #d8ad49; opacity: .95; }
        .premium-badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 700; border: 1px solid rgba(255,231,153,.12); }

        .premium-price-wrap { min-width: 88px; display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-end; }
        .premium-price {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 30px;
          font-weight: 700;
          color: #f2cf73;
          white-space: nowrap;
          text-shadow: 0 3px 12px rgba(0,0,0,.72), 0 0 18px rgba(236,189,77,.18);
        }
        .premium-price-line { margin-top: 8px; width: 82px; height: 12px; border-top: 1px solid rgba(224,174,67,.6); position: relative; }
        .premium-price-line::before { content: '⌁'; position: absolute; top: -12px; left: 25px; color: #d9af4d; font-size: 22px; }

        .premium-full-menu-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          padding: 17px 16px;
          border-radius: 17px;
          border: 1px solid rgba(224,174,67,.72);
          background: linear-gradient(135deg, rgba(39,32,18,.86), rgba(11,11,9,.98));
          color: #f6df95;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: .03em;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,236,169,.16), 0 0 18px rgba(197,139,31,.16);
          text-shadow: 0 2px 7px rgba(0,0,0,.75);
        }
        .premium-full-menu-btn::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0; width: 42%;
          background: linear-gradient(90deg, transparent, rgba(255,225,141,.28), transparent);
          animation: goldShine 3.4s ease-in-out infinite;
        }

        @media (max-width: 520px) {
          .romantika-hero {
            min-height: 235px;
            padding: 36px 34px 34px;
          }

          .hero-kicker { font-size: 14px; }
          .hero-title { font-size: clamp(38px, 12vw, 54px); }
          .hero-subtitle { font-size: 13px; }
          .premium-image-wrap { height: 205px; }
          .premium-dish-name { font-size: 22px; }
          .premium-dish-desc { font-size: 15px; }
          .premium-price { font-size: 30px; }
        }
      `}</style>

      {screen === 'menu' && menu && (
        <div style={{ background: `radial-gradient(circle at 50% 0%, rgba(224,174,67,.12), transparent 28%), linear-gradient(180deg, ${bg} 0%, #050403 100%)`, minHeight: '100vh', transition: 'background 0.3s' }}>
          {menu.phone && (
            <div style={{ background: 'linear-gradient(90deg, #8b600b, #e4b549, #8b600b)', color: '#171006', textAlign: 'center', padding: '9px 1rem', fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', animation: 'fadeDown 0.4s ease', boxShadow: '0 2px 16px rgba(0,0,0,.28)', textShadow: '0 1px 0 rgba(255,255,255,.25)' }}>
              📞 <a href={`tel:${menu.phone.replace(/\s/g, '')}`} style={{ color: '#1A1208', textDecoration: 'none' }}>{menu.phone}</a>
            </div>
          )}

          <div
            className="romantika-hero"
            style={{
              background: menu.heroImage
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
            </div>
          </div>

          {Array.isArray(menu.fullMenuImages) && menu.fullMenuImages.length > 0 && (
            <div style={{ padding: '1.35rem 1.35rem 0' }}>
              <button
                className="premium-full-menu-btn"
                onClick={() => setScreen('fullMenu')}
              >
                📖 Виж цялото меню
              </button>
            </div>
          )}

          <div style={{ padding: '1.35rem' }}>
            {(menu.sections || []).map((sec, si) => {
              let dishIndex = 0;
              menu.sections.slice(0, si).forEach(s => { dishIndex += s.dishes.length; });

              return (
                <div key={si} style={{ marginBottom: '1.75rem', animationDelay: `${si * 0.1}s` }}>
                  <div className="section-label" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#d6a83f', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, animationDelay: `${0.2 + si * 0.1}s`, textShadow: '0 2px 10px rgba(0,0,0,.55)' }}>
                    {sec.label}
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(224,174,67,.86), rgba(224,174,67,.08))' }} />
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
                <div style={{ fontSize: 11, color: '#B8860B', marginBottom: 6 }}>ФОНОВА СНИМКА НА ХЕДЪРА</div>
                <ImageUploader value={adminMenu.heroImage || ''} onChange={url => setAdminMenu({ ...adminMenu, heroImage: url })} />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: '#B8860B', marginBottom: 6 }}>ЦЯЛО МЕНЮ — ДО 8 ФАЙЛА</div>
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

                <button
                  onClick={() => addDish(si)}
                  style={{ width: '100%', padding: 8, border: '0.5px dashed rgba(184,134,11,0.3)', borderRadius: 8, background: 'transparent', color: '#B8860B', fontSize: 13, cursor: 'pointer' }}
                >
                  + Добави ястие
                </button>
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

      {toast && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#1A1208', color: '#F5E6A3', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 99, whiteSpace: 'nowrap', animation: 'fadeUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}