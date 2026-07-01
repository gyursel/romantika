import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CLOUD_NAME = 'dqunocngf';
const UPLOAD_PRESET = 'menu_upload';

const defaultMenu = {
  restaurantName: 'Романтика',
  phone: '+359 876 632 764',
  footerNote: 'Всички ястия се приготвят в момента на поръчката. Алергени при поискване.',
  heroImage: '',
  fullMenuImages: [],
  updatedAt: Date.now(),
  sections: [
    { label: 'Обедно меню', lunch: true, dishes: [
      { name: 'Телешки бульон с фиде - ПРОМОЦИЯ', desc: 'Домашен бульон, зеленчуци, магданоз', price: '4.50', weight: '400 мл', badges: [], image: '' },
      { name: 'Крем супа от тиква', desc: 'Орехи, сметана, черен пипер', price: '5.00', weight: '300 мл', badges: ['veg'], image: '' },
    ] },
    { label: 'Салати', dishes: [
      { name: 'Салата “Романтика”', desc: 'домати, сирене, цедено мляко, чесън, песто', price: '7.00', weight: '300 гр.', badges: [], image: '' },
      { name: 'Домати с Моцарела', desc: 'домати, моцарела, песто', price: '7.00', weight: '250 гр.', badges: [], image: '' },
      { name: 'Шопска салата', desc: 'домати, краставици, лук, пипер, сирене', price: '6.50', weight: '350 гр.', badges: [], image: '' },
    ] },
    { label: 'Разядки', dishes: [
      { name: 'Тирокафтери', desc: '', price: '4.30', weight: '150 гр.', badges: [], image: '' },
      { name: 'Хумус с червена чушка', desc: '', price: '4.30', weight: '150 гр.', badges: [], image: '' },
    ] },
  ],
};

const BADGE_LABELS = { veg: 'Вегетарианско', spicy: 'Пикантно', new: 'Ново' };
const getBadgeColors = () => ({
  veg: { bg: '#17370e', color: '#90df63' },
  spicy: { bg: '#3b1111', color: '#ff7777' },
  new: { bg: '#3b2804', color: '#f3c55b' },
});

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

function ImageUploader({ value, onChange, label = 'Добави снимка' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { onChange(await uploadToCloudinary(file)); }
    catch (err) { alert('Грешка при качване: ' + err.message); }
    setUploading(false);
    e.target.value = '';
  }

  return <div style={{ marginTop: 8 }}>
    <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    {value ? <div style={{ position: 'relative', display: 'inline-block' }}>
      <img src={value} alt="" style={{ width: 110, height: 76, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(184,134,11,.35)' }} />
      <button onClick={() => inputRef.current.click()} style={miniButton({ right: 3, bottom: 3 })}>Смени</button>
      <button onClick={() => onChange('')} style={removeButton}>×</button>
    </div> : <button onClick={() => inputRef.current.click()} disabled={uploading} style={dashButton}>{uploading ? '⏳ Качване...' : `📷 ${label}`}</button>}
  </div>;
}

function FullMenuUploader({ value = [], onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const free = Math.max(0, 8 - value.length);
    const selected = files.slice(0, free);
    if (!selected.length) { alert('Максимум 8 файла.'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const urls = [];
      for (const file of selected) urls.push(await uploadToCloudinary(file));
      onChange([...value, ...urls].slice(0, 8));
    } catch (err) { alert('Грешка при качване: ' + err.message); }
    setUploading(false);
    e.target.value = '';
  }

  return <div style={{ marginTop: 10 }}>
    <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
    <button onClick={() => inputRef.current.click()} disabled={uploading || value.length >= 8} style={{ ...dashButton, width: '100%', padding: 12 }}>
      {uploading ? '⏳ Качване...' : `📚 Качи страници за цялото меню (${value.length}/8)`}
    </button>
    <div style={{ fontSize: 11, color: '#6B5E3E', marginTop: 7 }}>Качи снимките от старото меню. В сайта ще се показват в тъмен златен стил.</div>
    {!!value.length && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 10 }}>
      {value.map((url, i) => <div key={url + i} style={{ position: 'relative' }}>
        <img src={url} alt="" style={{ width: '100%', height: 92, objectFit: 'cover', borderRadius: 9, border: '1px solid rgba(184,134,11,.35)' }} />
        <span style={{ position: 'absolute', left: 5, bottom: 5, background: 'rgba(26,18,8,.8)', color: '#F5E6A3', fontSize: 10, padding: '2px 6px', borderRadius: 9 }}>#{i + 1}</span>
        <button onClick={() => onChange(value.filter((_, x) => x !== i))} style={removeButton}>×</button>
      </div>)}
    </div>}
  </div>;
}

function DishCard({ d, index, lunch }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60 + index * 40); return () => clearTimeout(t); }, [index]);
  const badgeColors = getBadgeColors();

  if (!lunch) return <div style={{ ...menuRow, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(12px)' }}>
    <div style={{ minWidth: 0 }}>
      <div style={rowName}>{d.name}</div>
      {d.desc && <div style={rowDesc}>{d.desc}</div>}
    </div>
    <div style={dots} />
    <div style={rowWeight}>{d.weight}</div>
    <div style={rowPrice}>{d.price} €</div>
  </div>;

  return <div style={{ ...lunchCard, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)' }}>
    {d.image && <img src={d.image} alt={d.name} style={{ width: '42%', minHeight: 122, objectFit: 'cover', display: 'block' }} />}
    <div style={{ padding: '1rem 1.05rem', flex: 1, display: 'flex', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: '#fff0c0', lineHeight: 1.15 }}>{d.name}</div>
        {d.desc && <div style={{ fontSize: 13, color: '#d4c196', lineHeight: 1.45, marginTop: 8 }}>{d.desc}</div>}
        {d.weight && <div style={{ fontSize: 12, color: '#d4a830', marginTop: 10 }}>⚖ {d.weight}</div>}
        {!!d.badges?.length && <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>{d.badges.map(b => <span key={b} style={{ fontSize: 11, borderRadius: 20, padding: '2px 8px', background: badgeColors[b]?.bg, color: badgeColors[b]?.color }}>{BADGE_LABELS[b]}</span>)}</div>}
      </div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 24, color: '#d4a830', whiteSpace: 'nowrap' }}>{d.price} €</div>
    </div>
  </div>;
}

export default function Home() {
  const [menu, setMenu] = useState(null);
  const [adminMenu, setAdminMenu] = useState(null);
  const [screen, setScreen] = useState('menu');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [updateNotice, setUpdateNotice] = useState(false);
  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || '1234';

  useEffect(() => {
    async function loadMenu() {
      try {
        const snap = await getDoc(doc(db, 'menu', 'daily'));
        const data = snap.exists() ? { ...defaultMenu, ...snap.data() } : defaultMenu;
        if (!Array.isArray(data.fullMenuImages)) data.fullMenuImages = [];
        if (!Array.isArray(data.sections)) data.sections = defaultMenu.sections;
        setMenu(data);
        const lastSeen = Number(localStorage.getItem('romantika_seen_version') || 0);
        if (data.updatedAt && lastSeen && data.updatedAt > lastSeen) {
          setUpdateNotice(true);
          if (navigator.vibrate) navigator.vibrate([160, 80, 160]);
        }
        localStorage.setItem('romantika_seen_version', String(data.updatedAt || Date.now()));
      } catch (e) { setMenu(defaultMenu); }
      setLoading(false);
      setTimeout(() => setHeaderVisible(true), 50);
    }
    loadMenu();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600); }
  function doLogin() {
    if (password === ADMIN_PASS) { setAdminMenu(JSON.parse(JSON.stringify(menu))); setScreen('admin'); setLoginError(false); }
    else setLoginError(true);
  }
  async function saveMenu() {
    setSaving(true);
    try {
      const next = { ...adminMenu, updatedAt: Date.now() };
      await setDoc(doc(db, 'menu', 'daily'), next);
      setMenu(next); setAdminMenu(next); showToast('Менюто е записано ✓'); setTimeout(() => setScreen('menu'), 900);
    } catch (e) { showToast('Грешка при записване!'); }
    setSaving(false);
  }
  function updateDish(si, di, field, val) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes[di][field] = val; setAdminMenu(m); }
  function toggleBadge(si, di, badge) { const m = JSON.parse(JSON.stringify(adminMenu)); const a = m.sections[si].dishes[di].badges || []; m.sections[si].dishes[di].badges = a.includes(badge) ? a.filter(x => x !== badge) : [...a, badge]; setAdminMenu(m); }
  function addDish(si) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes.push({ name: '', desc: '', price: '', weight: '', badges: [], image: '' }); setAdminMenu(m); }
  function deleteDish(si, di) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes.splice(di, 1); setAdminMenu(m); }

  if (loading) return <Loader />;

  return <>
    <Head>
      <title>{menu?.restaurantName || 'Романтика'} — Меню</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#1A1208" />
      <link rel="manifest" href="/manifest.json" />
    </Head>
    <GlobalCss />

    {screen === 'menu' && menu && <div className="page">
      {updateNotice && <div className="notice"><b>🔔 Има обновление в менюто</b><button onClick={() => setUpdateNotice(false)}>Видях</button></div>}
      {menu.phone && <div className="phonebar">📞 <a href={`tel:${menu.phone.replace(/\s/g, '')}`}>{menu.phone}</a></div>}
      <Hero menu={menu} headerVisible={headerVisible} onAdmin={() => { setPassword(''); setLoginError(false); setScreen('login'); }} />

      {!!menu.fullMenuImages?.length && <div style={{ padding: '1rem 1.25rem 0' }}><button className="fullBtn" onClick={() => setScreen('fullMenu')}>📖 Виж цялото меню</button></div>}

      <main style={{ padding: '1.15rem 1.25rem 2rem' }}>
        {(menu.sections || []).map((sec, si) => {
          let dishIndex = 0; menu.sections.slice(0, si).forEach(s => { dishIndex += s.dishes.length; });
          return <section key={si} className={sec.lunch || si === 0 ? 'lunchSection' : 'menuSection'}>
            <DecorTitle>{sec.label}</DecorTitle>
            {sec.dishes.map((d, di) => <DishCard key={di} d={d} lunch={sec.lunch || si === 0} index={dishIndex + di} />)}
          </section>;
        })}
        <footer>{menu.footerNote}</footer>
      </main>
    </div>}

    {screen === 'fullMenu' && <FullMenuScreen menu={menu} onBack={() => setScreen('menu')} />}
    {screen === 'login' && <LoginScreen password={password} setPassword={setPassword} doLogin={doLogin} loginError={loginError} onBack={() => setScreen('menu')} />}
    {screen === 'admin' && adminMenu && <AdminScreen adminMenu={adminMenu} setAdminMenu={setAdminMenu} saveMenu={saveMenu} saving={saving} onBack={() => setScreen('menu')} updateDish={updateDish} toggleBadge={toggleBadge} addDish={addDish} deleteDish={deleteDish} />}
    {toast && <div className="toast">{toast}</div>}
  </>;
}

function GlobalCss() { return <style>{`
*{box-sizing:border-box;margin:0;padding:0} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#120d08;color:#fff3c7}.page{min-height:100vh;background:radial-gradient(circle at 50% 0,rgba(92,55,12,.36),transparent 340px),#120d08}.phonebar{background:linear-gradient(90deg,#9e6f08,#d6a83a,#9e6f08);color:#130d06;text-align:center;padding:8px 1rem;font-size:15px;font-weight:700;letter-spacing:.04em}.phonebar a{color:#130d06;text-decoration:none}.notice{position:fixed;left:14px;right:14px;top:14px;z-index:40;background:rgba(23,15,8,.96);border:1px solid rgba(212,168,48,.6);box-shadow:0 12px 35px rgba(0,0,0,.35);border-radius:14px;padding:12px;color:#ffe7a3;display:flex;align-items:center;justify-content:space-between;gap:10px}.notice button{background:#d4a830;color:#120d08;border:0;border-radius:9px;padding:7px 11px;font-weight:800}.romantika-hero{min-height:205px;padding:42px 44px 36px;overflow:hidden;isolation:isolate}.romantika-hero:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,3,1,.78),rgba(8,5,2,.28),rgba(5,3,1,.76)),linear-gradient(180deg,rgba(6,4,2,.26),rgba(6,4,2,.65));z-index:-1}.romantika-hero:after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 70px rgba(0,0,0,.78);z-index:0}.hero-copy{position:relative;z-index:1;text-align:center;text-shadow:0 3px 15px rgba(0,0,0,.9)}.hero-kicker,.hero-subtitle{font-family:Georgia,serif;color:#fff9e8;font-weight:700;text-transform:uppercase;letter-spacing:.26em}.hero-kicker{font-size:13px}.hero-title{font-family:Georgia,serif;font-size:clamp(38px,10vw,58px);line-height:.95;font-weight:500;text-transform:uppercase;letter-spacing:.035em;color:#e9c86f;text-shadow:0 2px 0 #5f3d00,0 5px 16px #000;margin:6px 0 12px}.hero-ornament{width:min(270px,70vw);height:20px;margin:0 auto 8px;display:flex;align-items:center;gap:10px}.hero-ornament:before,.hero-ornament:after{content:'';flex:1;height:2px;background:linear-gradient(90deg,transparent,#d7ad42 25%,#f0d77f)}.hero-ornament:after{transform:scaleX(-1)}.hero-heart{color:#e5bd55;font-size:23px}.hero-subtitle{font-size:12px}.iconBtn{position:absolute;z-index:2;top:12px;background:rgba(14,9,4,.48);border:1px solid rgba(234,201,111,.45);color:#f2d98c;border-radius:50%;width:34px;height:34px;cursor:pointer}.fullBtn{width:100%;padding:14px;border-radius:14px;border:1px solid rgba(212,168,48,.56);background:linear-gradient(135deg,rgba(212,168,48,.25),rgba(43,36,25,.96));color:#f5d879;font-size:15px;font-weight:800;letter-spacing:.06em;box-shadow:0 10px 28px rgba(0,0,0,.3)}.decorTitle{font-family:Georgia,serif;color:#d4a830;font-size:22px;text-align:center;text-transform:uppercase;letter-spacing:.08em;margin:10px 0 14px;display:flex;align-items:center;gap:14px}.decorTitle:before,.decorTitle:after{content:'';height:1px;flex:1;background:linear-gradient(90deg,transparent,#d4a830)}.decorTitle:after{transform:scaleX(-1)}.lunchSection,.menuSection{margin-bottom:1.6rem}.lunchCard{display:flex;background:rgba(35,27,18,.86);border:1px solid rgba(212,168,48,.35);border-radius:14px;overflow:hidden;margin-bottom:10px;box-shadow:0 12px 30px rgba(0,0,0,.22);transition:.35s ease}.menuSection{background:linear-gradient(180deg,rgba(42,31,19,.75),rgba(20,14,9,.8));border:1px solid rgba(212,168,48,.22);border-radius:16px;padding:12px 14px;box-shadow:inset 0 0 30px rgba(0,0,0,.23)}.menuRow{display:grid;grid-template-columns:minmax(0,auto) 1fr auto auto;align-items:end;gap:8px;padding:7px 0;border-bottom:1px solid rgba(212,168,48,.08);transition:.35s ease}.rowName{font-family:Georgia,serif;color:#fff1c6;font-size:15px}.rowDesc{font-size:12px;color:#cbb588;margin-top:2px;line-height:1.25}.dots{border-bottom:1px dotted rgba(212,168,48,.34);height:1px;margin-bottom:5px}.rowWeight{font-size:12px;color:#d9cda9;white-space:nowrap}.rowPrice{font-family:Georgia,serif;color:#d4a830;font-size:18px;white-space:nowrap}footer{text-align:center;color:#c5a657;font-family:Georgia,serif;font-size:14px;line-height:1.5;padding:1.2rem 0 0}.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1A1208;color:#F5E6A3;padding:11px 22px;border-radius:10px;z-index:99;box-shadow:0 10px 30px #000}.adminPage{background:#FDFAF5;color:#1A1208;min-height:100vh}.adminTop{background:#1A1208;color:#F5E6A3;padding:1.2rem;display:flex;gap:10px;align-items:center}.adminWrap{padding:1.2rem}.field{width:100%;padding:9px 12px;border:1px solid rgba(184,134,11,.22);border-radius:8px;background:white;margin-bottom:8px;font-size:14px}.adminCard{background:white;border:1px solid rgba(184,134,11,.22);border-radius:12px;padding:12px;margin-bottom:10px}.label{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#B8860B;margin:14px 0 8px}.fullPage{min-height:100vh;background:#120d08;color:#fff3c7;padding-bottom:2rem}.fullTop{position:sticky;top:0;z-index:20;background:rgba(18,13,8,.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(212,168,48,.25);padding:12px 14px;display:flex;align-items:center;justify-content:space-between}.fullImageCard{margin:14px;border-radius:16px;overflow:hidden;border:1px solid rgba(212,168,48,.42);background:linear-gradient(180deg,rgba(38,29,18,.95),rgba(15,10,6,.95));box-shadow:0 14px 38px rgba(0,0,0,.35)}.fullImageWrap{position:relative;background:#0f0b07}.fullImageWrap:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(212,168,48,.11),rgba(15,10,6,.26));mix-blend-mode:multiply}.fullImage{width:100%;display:block;filter:sepia(.28) saturate(.78) contrast(1.08) brightness(.78)}@media(max-width:520px){.romantika-hero{min-height:215px;padding:38px 36px 34px}.lunchCard{display:block}.lunchCard img{width:100%!important;height:170px}.hero-title{font-size:clamp(36px,11vw,48px)}.menuRow{grid-template-columns:minmax(0,auto) 1fr auto}.rowWeight{grid-column:3}.rowPrice{font-size:17px}}
`}</style>; }

function Hero({ menu, headerVisible, onAdmin }) { return <div className="romantika-hero" style={{ background: menu.heroImage ? `url(${menu.heroImage}) center/cover no-repeat` : 'linear-gradient(135deg,#20160a,#0d0905)', position: 'relative', opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'none' : 'translateY(-10px)', transition: '.5s ease' }}>
  <button className="iconBtn" style={{ right: 12, borderRadius: 8 }} onClick={onAdmin}>⚙</button>
  <div className="hero-copy"><div className="hero-kicker">Добре дошли в</div><div className="hero-title">{menu.restaurantName}</div><div className="hero-ornament"><span className="hero-heart">♡</span></div><div className="hero-subtitle">Ресторант</div></div>
</div>; }
function DecorTitle({ children }) { return <h2 className="decorTitle">{children}</h2>; }
function Loader() { return <div style={{ minHeight: '100vh', background: '#1A1208', display: 'grid', placeItems: 'center', color: '#B8860B' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 36 }}>🍽</div><div style={{ marginTop: 12, letterSpacing: '.2em', fontSize: 12 }}>ЗАРЕЖДАНЕ</div></div></div>; }
function FullMenuScreen({ menu, onBack }) { return <div className="fullPage"><div className="fullTop"><button onClick={onBack} style={backBtn}>← Назад</button><b style={{ color: '#d4a830', letterSpacing: '.08em' }}>ЦЯЛОТО МЕНЮ</b><span style={{ width: 72 }} /></div>{(menu.fullMenuImages || []).map((url, i) => <div key={url + i} className="fullImageCard"><div style={{ padding: '9px 13px', color: '#d4a830', borderBottom: '1px solid rgba(212,168,48,.22)', fontWeight: 800 }}>Страница {i + 1}</div><div className="fullImageWrap"><img className="fullImage" src={url} alt={`Страница ${i + 1}`} /></div></div>)}</div>; }
function LoginScreen({ password, setPassword, doLogin, loginError, onBack }) { return <div style={{ minHeight: '100vh', background: '#120d08', display: 'grid', placeItems: 'center', padding: 24 }}><div style={{ width: '100%', maxWidth: 340, color: '#F5E6A3', textAlign: 'center' }}><h2>Вход в администрацията</h2><input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} type="password" placeholder="Парола" style={{ ...adminInput, marginTop: 18 }} /><button onClick={doLogin} style={{ ...saveBtn, marginTop: 10 }}>Влез</button>{loginError && <div style={{ color: '#ff7777', marginTop: 8 }}>Грешна парола</div>}<button onClick={onBack} style={{ background: 'none', border: 0, color: '#c5a657', marginTop: 15 }}>← Назад</button></div></div>; }
function AdminScreen({ adminMenu, setAdminMenu, saveMenu, saving, onBack, updateDish, toggleBadge, addDish, deleteDish }) { return <div className="adminPage"><div className="adminTop"><button onClick={onBack} style={backBtn}>← Меню</button><b>Управление на менюто</b></div><div className="adminWrap"><div className="label">Ресторант</div><input className="field" value={adminMenu.restaurantName || ''} onChange={e => setAdminMenu({ ...adminMenu, restaurantName: e.target.value })} placeholder="Име на ресторант" /><input className="field" value={adminMenu.phone || ''} onChange={e => setAdminMenu({ ...adminMenu, phone: e.target.value })} placeholder="Телефон" /><input className="field" value={adminMenu.footerNote || ''} onChange={e => setAdminMenu({ ...adminMenu, footerNote: e.target.value })} placeholder="Бележка" /><div className="label">Фон на хедъра</div><ImageUploader value={adminMenu.heroImage || ''} onChange={url => setAdminMenu({ ...adminMenu, heroImage: url })} /><div className="label">Цяло меню — до 8 файла</div><FullMenuUploader value={adminMenu.fullMenuImages || []} onChange={imgs => setAdminMenu({ ...adminMenu, fullMenuImages: imgs })} />{(adminMenu.sections || []).map((sec, si) => <div key={si}><div className="label">{sec.label}</div>{sec.dishes.map((d, di) => <div key={di} className="adminCard"><div style={{ display: 'flex', gap: 8 }}><input className="field" value={d.name || ''} onChange={e => updateDish(si, di, 'name', e.target.value)} placeholder="Име" /><input className="field" style={{ width: 84 }} value={d.price || ''} onChange={e => updateDish(si, di, 'price', e.target.value)} placeholder="Цена" /><button onClick={() => deleteDish(si, di)} style={{ background: 'none', border: 0, color: '#E24B4A', fontSize: 24 }}>×</button></div><input className="field" value={d.desc || ''} onChange={e => updateDish(si, di, 'desc', e.target.value)} placeholder="Описание" /><input className="field" value={d.weight || ''} onChange={e => updateDish(si, di, 'weight', e.target.value)} placeholder="Грамаж" /><ImageUploader value={d.image || ''} onChange={url => updateDish(si, di, 'image', url)} /> <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>{['veg','spicy','new'].map(b => <button key={b} onClick={() => toggleBadge(si, di, b)} style={{ border: '1px solid #d7c59a', borderRadius: 16, padding: '4px 10px', background: d.badges?.includes(b) ? '#FAEEDA' : 'white' }}>{BADGE_LABELS[b]}</button>)}</div></div>)}<button onClick={() => addDish(si)} style={dashButton}>+ Добави ястие</button></div>)}<button onClick={saveMenu} disabled={saving} style={saveBtn}>{saving ? 'Записване...' : '💾 Запази менюто'}</button></div></div>; }
const dashButton = { padding: '8px 12px', border: '1px dashed rgba(184,134,11,.45)', borderRadius: 8, background: 'transparent', color: '#B8860B', fontSize: 13, cursor: 'pointer' };
const saveBtn = { width: '100%', padding: 13, background: '#1A1208', color: '#F5E6A3', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, marginTop: 16 };
const backBtn = { background: 'none', border: '1px solid rgba(245,230,163,.35)', color: '#F5E6A3', padding: '7px 11px', borderRadius: 8 };
const adminInput = { width: '100%', padding: '11px 13px', borderRadius: 9, border: '1px solid rgba(184,134,11,.35)', outline: 'none' };
const removeButton = { position: 'absolute', top: 4, right: 4, background: 'rgba(226,75,74,.92)', border: 'none', color: 'white', fontSize: 14, width: 22, height: 22, borderRadius: '50%', lineHeight: '22px', textAlign: 'center', padding: 0, cursor: 'pointer' };
const miniButton = (pos) => ({ position: 'absolute', ...pos, background: 'rgba(26,18,8,.82)', border: 'none', color: '#F5E6A3', fontSize: 10, padding: '2px 6px', borderRadius: 5, cursor: 'pointer' });
const lunchCard = { display: 'flex', background: 'rgba(35,27,18,.86)', border: '1px solid rgba(212,168,48,.35)', borderRadius: 14, overflow: 'hidden', marginBottom: 10, boxShadow: '0 12px 30px rgba(0,0,0,.22)', transition: '.35s ease' };
const menuRow = { display: 'grid', gridTemplateColumns: 'minmax(0,auto) 1fr auto auto', alignItems: 'end', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(212,168,48,.08)', transition: '.35s ease' };
const rowName = { fontFamily: 'Georgia,serif', color: '#fff1c6', fontSize: 15 };
const rowDesc = { fontSize: 12, color: '#cbb588', marginTop: 2, lineHeight: 1.25 };
const dots = { borderBottom: '1px dotted rgba(212,168,48,.34)', height: 1, marginBottom: 5 };
const rowWeight = { fontSize: 12, color: '#d9cda9', whiteSpace: 'nowrap' };
const rowPrice = { fontFamily: 'Georgia,serif', color: '#d4a830', fontSize: 18, whiteSpace: 'nowrap' };
