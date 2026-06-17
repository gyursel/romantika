import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

const CLOUD_NAME = 'dqunocngf';
const UPLOAD_PRESET = 'menu_upload';

const defaultMenu = {
  restaurantName: 'Ресторант Романтика',
  phone: '+359 88 888 8888',
  footerNote: 'Всички ястия се приготвят в момента на поръчката.\nАлергени при поискване.',
  heroImage: '',
  sections: [
    {
      label: 'Супа',
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
const SECTION_ICONS = { 'Супа': '◌', 'Основно': '◈', 'Десерт': '◇' };

function getBadge(b, dark) {
  const map = {
    veg:   { bg: dark?'#1a2e0a':'#E8F3DC', color: dark?'#7ec850':'#2A5A0A', border: dark?'#3a6a1a':'#3D7A14' },
    spicy: { bg: dark?'#2e0a0a':'#FAECE7', color: dark?'#e86060':'#7A1A0A', border: dark?'#6a1a1a':'#A02810' },
    new:   { bg: dark?'#2e1f00':'#FFF0D6', color: dark?'#e8a830':'#6B3A00', border: dark?'#6a4a00':'#9A5500' },
  };
  return map[b] || {};
}

function formatDate() {
  const days = ['Неделя','Понеделник','Вторник','Сряда','Четвъртък','Петък','Събота'];
  const months = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];
  const d = new Date();
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function ImageUploader({ value, onChange, dark }) {
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
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) onChange(data.secure_url);
      else throw new Error(data.error?.message || 'Upload failed');
    } catch(err) { alert('Грешка при качване: ' + err.message); }
    setUploading(false);
    e.target.value = '';
  }
  return (
    <div style={{ marginTop: 8 }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(184,134,11,0.3)', display: 'block' }} />
          <button onClick={() => inputRef.current.click()} style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(26,18,8,0.85)', border: 'none', color: '#F5E6A3', fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}>Смени</button>
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(220,50,50,0.9)', border: 'none', color: 'white', fontSize: 14, width: 20, height: 20, borderRadius: '50%', lineHeight: '20px', textAlign: 'center', padding: 0, cursor: 'pointer' }}>×</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={uploading}
          style={{ padding: '6px 14px', border: '1px dashed rgba(184,134,11,0.5)', borderRadius: 8, background: 'transparent', color: uploading ? '#aaa' : '#B8860B', fontSize: 12, cursor: uploading ? 'default' : 'pointer' }}>
          {uploading ? '⏳ Качване...' : '📷 Добави снимка'}
        </button>
      )}
    </div>
  );
}

function DishCard({ d, dark, idx }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 60 + idx * 55); return () => clearTimeout(t); }, [idx]);

  return (
    <div style={{
      background: dark ? '#1c1710' : '#FFFFFF',
      border: `1px solid ${dark ? 'rgba(184,134,11,0.12)' : 'rgba(184,134,11,0.18)'}`,
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
      boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 10px rgba(184,134,11,0.07)',
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>
      {d.image && (
        <div style={{ position: 'relative', overflow: 'hidden', height: 180 }}>
          <img src={d.image} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.45) 100%)' }} />
        </div>
      )}
      <div style={{ padding: '0.9rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: dark ? '#F5E6A3' : '#1A1208', marginBottom: 3, letterSpacing: '0.01em' }}>{d.name}</div>
            {d.desc && <div style={{ fontSize: 12.5, color: dark ? '#9a8060' : '#6B5E3E', lineHeight: 1.55 }}>{d.desc}</div>}
            {d.weight && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 11, color: dark ? 'rgba(184,134,11,0.7)' : 'rgba(120,90,0,0.75)', background: dark ? 'rgba(184,134,11,0.08)' : 'rgba(184,134,11,0.06)', padding: '2px 8px', borderRadius: 20, border: `0.5px solid ${dark ? 'rgba(184,134,11,0.15)' : 'rgba(184,134,11,0.15)'}` }}>
                ⚖ {d.weight}
              </div>
            )}
            {d.badges?.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                {d.badges.map(b => {
                  const bc = getBadge(b, dark);
                  return <span key={b} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: bc.bg, color: bc.color, border: `0.5px solid ${bc.border}` }}>{BADGE_LABELS[b]}</span>;
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: dark ? '#d4a830' : '#7A5200', whiteSpace: 'nowrap', paddingTop: 2 }}>{d.price} €</div>
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
  const [dark, setDark] = useState(false);
  const [headerVis, setHeaderVis] = useState(false);
  const [todayViews, setTodayViews] = useState(null);

  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || '1234';

  useEffect(() => {
    const saved = localStorage.getItem('menu_dark');
    if (saved === '1') setDark(true);
    async function loadMenu() {
      try {
        const snap = await getDoc(doc(db, 'menu', 'daily'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.sections) data.sections = data.sections.map(sec => ({ ...sec, dishes: sec.dishes.map(d => ({ weight: '', image: '', ...d })) }));
          setMenu(data);
        } else setMenu(defaultMenu);
      } catch(e) { setMenu(defaultMenu); }
      setLoading(false);
      setTimeout(() => setHeaderVis(true), 60);
      try {
        const r = await fetch('/api/view', { method: 'POST' });
        const vd = await r.json();
        setTodayViews(vd.views);
      } catch(e) {}
    }
    loadMenu();
  }, []);

  function toggleDark() { const n = !dark; setDark(n); localStorage.setItem('menu_dark', n ? '1' : '0'); }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function doLogin() {
    if (password === ADMIN_PASS) { setAdminMenu(JSON.parse(JSON.stringify(menu))); setScreen('admin'); setLoginError(false); }
    else setLoginError(true);
  }

  async function saveMenu() {
    setSaving(true);
    try {
      await setDoc(doc(db, 'menu', 'daily'), adminMenu);
      setMenu(adminMenu);
      showToast('Менюто е записано ✓');
      setTimeout(() => setScreen('menu'), 1200);
    } catch(e) { showToast('Грешка при записване!'); }
    setSaving(false);
  }

  function updateDish(si, di, f, v) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes[di][f] = v; setAdminMenu(m); }
  function toggleBadge(si, di, b) { const m = JSON.parse(JSON.stringify(adminMenu)); const d = m.sections[si].dishes[di]; const i = d.badges.indexOf(b); if (i > -1) d.badges.splice(i,1); else d.badges.push(b); setAdminMenu(m); }
  function deleteDish(si, di) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes.splice(di,1); setAdminMenu(m); }
  function addDish(si) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes.push({ name:'', desc:'', price:'', weight:'', badges:[], image:'' }); setAdminMenu(m); }

  const bg = dark ? '#110e08' : '#F7F3EC';
  const textMain = dark ? '#F5E6A3' : '#1A1208';
  const textSub = dark ? '#9a8060' : '#6B5E3E';
  const inputStyle = { width: '100%', padding: '9px 12px', border: `1px solid ${dark?'rgba(184,134,11,0.2)':'rgba(184,134,11,0.25)'}`, borderRadius: 8, fontSize: 14, background: dark?'#1c1710':'white', color: dark?'#F5E6A3':'#1A1208', outline: 'none', marginBottom: 8, display: 'block' };
  const smallInputStyle = { ...inputStyle, marginBottom: 0 };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#1A1208' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.4;transform:scale(0.94)}50%{opacity:1;transform:scale(1.06)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize:36, animation:'pulse 1.4s ease infinite' }}>🍽</div>
      <div style={{ marginTop:16, color:'#B8860B', fontSize:11, letterSpacing:'0.22em', textTransform:'uppercase' }}>Зареждане</div>
      <div style={{ marginTop:14, width:30, height:30, border:'2px solid rgba(184,134,11,0.2)', borderTop:'2px solid #B8860B', borderRadius:'50%', animation:'spin 0.85s linear infinite' }} />
    </div>
  );

  return (
    <>
      <Head>
        <title>{menu?.restaurantName || 'Меню'} — Обедно меню</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={dark?'#110e08':'#1A1208'} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Playfair Display',Georgia,serif;background:${bg};transition:background 0.3s}
        input,button{font-family:inherit}
        @keyframes fadeDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── MENU ── */}
      {screen === 'menu' && menu && (
        <div style={{ background: bg, minHeight: '100vh' }}>

          {/* Phone bar */}
          {menu.phone && (
            <div style={{ background: '#B8860B', textAlign: 'center', padding: '8px 1rem', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', animation: 'fadeDown 0.4s ease' }}>
              📞 <a href={`tel:${menu.phone.replace(/\s/g,'')}`} style={{ color: '#1A1208', textDecoration: 'none' }}>{menu.phone}</a>
            </div>
          )}

          {/* Header */}
          <div style={{
            background: menu.heroImage
              ? `linear-gradient(rgba(26,18,8,${dark?'0.72':'0.58'}), rgba(26,18,8,${dark?'0.88':'0.75'})), url(${menu.heroImage}) center/cover no-repeat`
              : dark ? 'linear-gradient(135deg, #0d0a05 0%, #1a1208 100%)' : 'linear-gradient(135deg, #1A1208 0%, #2d1e0a 100%)',
            color: '#F5E6A3',
            padding: '3rem 1.5rem 2.25rem',
            textAlign: 'center',
            position: 'relative',
            minHeight: menu.heroImage ? 200 : 160,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: headerVis ? 1 : 0,
            transform: headerVis ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 0.55s ease, transform 0.55s ease',
          }}>
            {/* Dark toggle */}
            <button onClick={toggleDark} style={{ position:'absolute', top:'1rem', left:'1rem', background:'rgba(245,230,163,0.08)', border:'1px solid rgba(245,230,163,0.2)', color:'rgba(245,230,163,0.75)', fontSize:16, width:34, height:34, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {/* Admin */}
            <button onClick={() => { setPassword(''); setLoginError(false); setScreen('login'); }} style={{ position:'absolute', top:'1rem', right:'1rem', background:'rgba(245,230,163,0.08)', border:'1px solid rgba(245,230,163,0.2)', color:'rgba(245,230,163,0.6)', fontSize:11, padding:'5px 10px', borderRadius:5, cursor:'pointer' }}>
              ⚙ Админ
            </button>

            <div style={{ fontSize: 10, letterSpacing: '0.25em', color: 'rgba(245,230,163,0.45)', textTransform: 'uppercase', marginBottom: 10 }}>Обедно меню</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{menu.restaurantName}</div>
            <div style={{ fontSize: 12, color: 'rgba(245,230,163,0.5)', marginTop: 6, letterSpacing: '0.06em' }}>{formatDate()}</div>
            <div style={{ width: 50, height: 1.5, background: 'linear-gradient(90deg, transparent, #B8860B, transparent)', margin: '14px auto 0' }} />
          </div>

          {/* Sections */}
          <div style={{ padding: '1.4rem 1.1rem' }}>
            {(menu.sections || []).map((sec, si) => {
              let offset = 0;
              menu.sections.slice(0, si).forEach(s => offset += s.dishes.length);
              return (
                <div key={si} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, animation: `fadeUp 0.5s ease ${0.1 + si * 0.08}s both` }}>
                    <span style={{ fontSize: 11, color: dark ? 'rgba(184,134,11,0.5)' : 'rgba(184,134,11,0.4)' }}>{SECTION_ICONS[sec.label] || '◆'}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B8860B' }}>{sec.label}</span>
                    <div style={{ flex: 1, height: 1, background: dark ? 'rgba(184,134,11,0.1)' : 'rgba(184,134,11,0.15)' }} />
                  </div>
                  {sec.dishes.map((d, di) => <DishCard key={di} d={d} dark={dark} idx={offset + di} />)}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', padding: '0.5rem 1.5rem 2.5rem' }}>
            <div style={{ width: 40, height: 1, background: dark ? 'rgba(184,134,11,0.2)' : 'rgba(184,134,11,0.25)', margin: '0 auto 1rem' }} />
            <div style={{ fontSize: 11.5, color: textSub, lineHeight: 1.7 }}>
              {menu.footerNote?.split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN ── */}
      {screen === 'login' && (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem', background: bg }}>
          <div style={{ fontSize:20, fontWeight:600, color:textMain, marginBottom:5 }}>Администрация</div>
          <div style={{ fontSize:13, color:textSub, marginBottom:'1.5rem' }}>Въведете паролата</div>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="Парола"
            style={{ ...inputStyle, maxWidth:320 }} />
          <button onClick={doLogin} style={{ width:'100%', maxWidth:320, padding:12, background:'#1A1208', color:'#F5E6A3', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 }}>Влез</button>
          {loginError && <div style={{ color:'#E24B4A', fontSize:12, marginTop:8 }}>Грешна парола</div>}
          <button onClick={()=>setScreen('menu')} style={{ marginTop:'1.2rem', background:'none', border:'none', color:textSub, fontSize:13, cursor:'pointer' }}>← Назад</button>
        </div>
      )}

      {/* ── ADMIN ── */}
      {screen === 'admin' && adminMenu && (
        <div style={{ background: dark?'#110e08':'#F7F3EC', minHeight:'100vh' }}>
          <div style={{ background:'#1A1208', color:'#F5E6A3', padding:'1.1rem 1.25rem', display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>setScreen('menu')} style={{ background:'none', border:'1px solid rgba(245,230,163,0.25)', color:'rgba(245,230,163,0.8)', padding:'5px 11px', borderRadius:5, fontSize:12, cursor:'pointer' }}>← Меню</button>
            <span style={{ fontSize:15, fontWeight:600 }}>Управление на менюто</span>
          </div>

          <div style={{ padding:'1.25rem' }}>
            {/* Views counter */}
            <div style={{ background:'linear-gradient(135deg,#1A1208,#2d1e0a)', borderRadius:14, padding:'1.1rem 1.4rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:16, boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize:30 }}>👁</div>
              <div>
                <div style={{ fontSize:10, color:'rgba(245,230,163,0.45)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:3 }}>Прегледи днес</div>
                <div style={{ fontSize:36, fontWeight:700, color:'#F5E6A3', lineHeight:1 }}>{todayViews ?? '—'}</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:11, color:'rgba(245,230,163,0.35)', textAlign:'right', lineHeight:1.7 }}>
                {new Date().toLocaleDateString('bg-BG',{day:'numeric',month:'long'})}
              </div>
            </div>

            {/* Restaurant info */}
            <div style={{ marginBottom:'1.5rem' }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'#B8860B', marginBottom:10 }}>Ресторант</div>
              <input value={adminMenu.restaurantName} onChange={e=>setAdminMenu({...adminMenu,restaurantName:e.target.value})} placeholder="Име на ресторант" style={inputStyle} />
              <input value={adminMenu.phone||''} onChange={e=>setAdminMenu({...adminMenu,phone:e.target.value})} placeholder="Телефон (+359...)" style={inputStyle} />
              <input value={adminMenu.footerNote||''} onChange={e=>setAdminMenu({...adminMenu,footerNote:e.target.value})} placeholder="Бележка" style={inputStyle} />
              <div style={{ fontSize:10, color:'#B8860B', marginBottom:6, letterSpacing:'0.1em', textTransform:'uppercase' }}>Фонова снимка</div>
              <ImageUploader value={adminMenu.heroImage||''} onChange={url=>setAdminMenu({...adminMenu,heroImage:url})} />
            </div>

            {/* Dishes */}
            {adminMenu.sections.map((sec,si) => (
              <div key={si} style={{ marginBottom:'1.5rem' }}>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'#B8860B', marginBottom:10 }}>{sec.label}</div>
                {sec.dishes.map((d,di) => (
                  <div key={di} style={{ background: dark?'#1c1710':'white', border:`1px solid ${dark?'rgba(184,134,11,0.15)':'rgba(184,134,11,0.2)'}`, borderRadius:10, padding:'0.85rem 1rem', marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, marginBottom:7 }}>
                      <input value={d.name} onChange={e=>updateDish(si,di,'name',e.target.value)} placeholder="Ястие" style={{ ...smallInputStyle, flex:1 }} />
                      <input value={d.price} onChange={e=>updateDish(si,di,'price',e.target.value)} placeholder="Цена" style={{ ...smallInputStyle, width:68 }} />
                      <button onClick={()=>deleteDish(si,di)} style={{ background:'none', border:'none', color:'#E24B4A', fontSize:22, opacity:0.65, cursor:'pointer', padding:'0 3px' }}>×</button>
                    </div>
                    <input value={d.desc} onChange={e=>updateDish(si,di,'desc',e.target.value)} placeholder="Описание" style={{ ...smallInputStyle, marginBottom:7 }} />
                    <input value={d.weight||''} onChange={e=>updateDish(si,di,'weight',e.target.value)} placeholder="Грамаж (350 г / 300 мл)" style={{ ...smallInputStyle, marginBottom:4 }} />
                    <ImageUploader value={d.image||''} onChange={url=>updateDish(si,di,'image',url)} />
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:9 }}>
                      {['veg','spicy','new'].map(b => {
                        const bc = getBadge(b, false);
                        return (
                          <button key={b} onClick={()=>toggleBadge(si,di,b)}
                            style={{ fontSize:10.5, padding:'3px 10px', borderRadius:20, border: d.badges.includes(b)?`1px solid ${bc.border}`:'1px solid rgba(184,134,11,0.2)', background: d.badges.includes(b)?bc.bg:'white', color: d.badges.includes(b)?bc.color:'#6B5E3E', cursor:'pointer', fontWeight: d.badges.includes(b)?600:400 }}>
                            {b==='veg'?'🌿':b==='spicy'?'🌶':'✨'} {BADGE_LABELS[b]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button onClick={()=>addDish(si)} style={{ width:'100%', padding:9, border:'1px dashed rgba(184,134,11,0.35)', borderRadius:9, background:'transparent', color:'#B8860B', fontSize:13, cursor:'pointer' }}>
                  + Добави ястие
                </button>
              </div>
            ))}

            <button onClick={saveMenu} disabled={saving}
              style={{ width:'100%', padding:14, background:saving?'#444':'#1A1208', color:'#F5E6A3', border:'none', borderRadius:11, fontSize:15, fontWeight:600, letterSpacing:'0.05em', marginTop:'0.5rem', cursor:saving?'default':'pointer', transition:'background 0.2s' }}>
              {saving ? 'Записване...' : '💾 Запази менюто'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'1.2rem', left:'50%', transform:'translateX(-50%)', background:'#1A1208', color:'#F5E6A3', padding:'11px 22px', borderRadius:9, fontSize:13, zIndex:99, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,0.3)', animation:'fadeUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}
