import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CLOUD_NAME = 'dqunocngf';
const UPLOAD_PRESET = 'menu_upload';

const defaultMenu = {
  restaurantName: 'Ресторант Романтика',
  phone: '+359 88 888 8888',
  footerNote: 'Всички ястия се приготвят в момента на поръчката.\nАлергени при поискване.',
  heroImage: '',
  sections: [
    { label: 'Супа', dishes: [
      { name: 'Телешки бульон с фиде', desc: 'Домашен бульон, зеленчуци, магданоз', price: '4.50', weight: '300 мл', badges: [], image: '' },
      { name: 'Крем супа от тиква', desc: 'Орехи, сметана, черен пипер', price: '5.00', weight: '300 мл', badges: ['veg'], image: '' }
    ]},
    { label: 'Основно', dishes: [
      { name: 'Свинско с картофи на фурна', desc: 'Печено бавно, с розмарин и мащерка', price: '12.00', weight: '350 г', badges: [], image: '' },
      { name: 'Пилешко с гъби', desc: 'В маслено-чеснов сос, с ориз', price: '10.50', weight: '320 г', badges: ['new'], image: '' },
      { name: 'Гевречета с тахан', desc: 'Сезонни зеленчуци, хумус, кисело мляко', price: '9.00', weight: '280 г', badges: ['veg'], image: '' }
    ]},
    { label: 'Десерт', dishes: [
      { name: 'Баница с ябълки', desc: 'Хрупкава коричка, канела, пудра захар', price: '3.50', weight: '150 г', badges: [], image: '' },
      { name: 'Тирамису', desc: 'По класическа рецепта с маскарпоне', price: '5.50', weight: '180 г', badges: [], image: '' }
    ]}
  ]
};

const BADGE_LABELS = { veg: 'Вегетарианско', spicy: 'Пикантно', new: 'Ново' };

function getBadge(b, dark) {
  const map = {
    veg:   { bg: dark?'#1a2e0a':'#eaf3de', color: dark?'#7ec850':'#2e6b0a', border: dark?'#2a4a12':'#c5dba8' },
    spicy: { bg: dark?'#2e0a0a':'#faeae7', color: dark?'#e87070':'#7a1a0a', border: dark?'#4a1212':'#e8b8b0' },
    new:   { bg: dark?'#2a1a00':'#fff3e0', color: dark?'#e8a830':'#7a4a00', border: dark?'#4a3000':'#f0d090' },
  };
  return map[b] || {};
}

function formatDate() {
  const days = ['Неделя','Понеделник','Вторник','Сряда','Четвъртък','Петък','Събота'];
  const months = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];
  const d = new Date();
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function ImageUploader({ value, onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) onChange(data.secure_url);
    } catch(e) { alert('Грешка: ' + e.message); }
    setUploading(false);
    e.target.value = '';
  }
  return (
    <div style={{ marginTop: 8 }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="" style={{ width: 100, height: 68, objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid rgba(184,134,11,0.2)' }} />
          <button onClick={() => inputRef.current.click()} style={{ position:'absolute', bottom:3, right:3, background:'rgba(20,14,4,0.88)', border:'none', color:'#e8d68a', fontSize:10, padding:'2px 7px', borderRadius:4, cursor:'pointer' }}>Смени</button>
          <button onClick={() => onChange('')} style={{ position:'absolute', top:3, right:3, background:'rgba(200,50,50,0.9)', border:'none', color:'white', fontSize:13, width:19, height:19, borderRadius:'50%', lineHeight:'19px', textAlign:'center', padding:0, cursor:'pointer' }}>×</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={uploading}
          style={{ padding:'6px 14px', border:'1px dashed rgba(184,134,11,0.4)', borderRadius:8, background:'transparent', color: uploading?'#aaa':'#b8860b', fontSize:12, cursor: uploading?'default':'pointer' }}>
          {uploading ? '⏳ Качване...' : '📷 Добави снимка'}
        </button>
      )}
    </div>
  );
}

function DishCard({ d, dark, idx }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 50 + idx * 50); return () => clearTimeout(t); }, [idx]);
  return (
    <div style={{
      background: dark ? '#1a1510' : '#ffffff',
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      boxShadow: dark ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)',
      border: `1px solid ${dark ? 'rgba(184,134,11,0.1)' : 'rgba(0,0,0,0.06)'}`,
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      {d.image && (
        <div style={{ position:'relative', height: 190, overflow:'hidden' }}>
          <img src={d.image} alt={d.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
        </div>
      )}
      <div style={{ padding: '1rem 1.1rem 1.1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:600, color: dark?'#f0e0b0':'#1a1208', letterSpacing:'0.01em', lineHeight:1.3 }}>{d.name}</div>
            {d.desc && <div style={{ fontSize:12.5, color: dark?'#8a7558':'#7a6a50', marginTop:4, lineHeight:1.6, fontFamily:"'Inter',sans-serif" }}>{d.desc}</div>}
            {d.weight && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:7, fontSize:11, color: dark?'rgba(200,160,60,0.7)':'rgba(140,100,20,0.7)', fontFamily:"'Inter',sans-serif", letterSpacing:'0.03em' }}>
                <span style={{ opacity:0.6 }}>—</span> {d.weight}
              </div>
            )}
            {d.badges?.length > 0 && (
              <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {d.badges.map(b => {
                  const bc = getBadge(b, dark);
                  return <span key={b} style={{ fontSize:10, padding:'2px 9px', borderRadius:20, fontWeight:600, background:bc.bg, color:bc.color, border:`1px solid ${bc.border}`, fontFamily:"'Inter',sans-serif", letterSpacing:'0.04em' }}>{BADGE_LABELS[b]}</span>;
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize:17, fontWeight:700, color: dark?'#c8a040':'#8a6000', whiteSpace:'nowrap', letterSpacing:'0.01em', paddingTop:2 }}>{d.price} €</div>
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
    if (localStorage.getItem('menu_dark') === '1') setDark(true);
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'menu', 'daily'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.sections) data.sections = data.sections.map(s => ({ ...s, dishes: s.dishes.map(d => ({ weight:'', image:'', ...d })) }));
          setMenu(data);
        } else setMenu(defaultMenu);
      } catch { setMenu(defaultMenu); }
      setLoading(false);
      setTimeout(() => setHeaderVis(true), 60);
      try { const r = await fetch('/api/view', { method:'POST' }); const v = await r.json(); setTodayViews(v.views); } catch {}
    }
    load();
  }, []);

  function toggleDark() { const n = !dark; setDark(n); localStorage.setItem('menu_dark', n?'1':'0'); }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }
  function doLogin() {
    if (password === ADMIN_PASS) { setAdminMenu(JSON.parse(JSON.stringify(menu))); setScreen('admin'); setLoginError(false); }
    else setLoginError(true);
  }
  async function saveMenu() {
    setSaving(true);
    try { await setDoc(doc(db, 'menu', 'daily'), adminMenu); setMenu(adminMenu); showToast('Менюто е записано ✓'); setTimeout(() => setScreen('menu'), 1200); }
    catch { showToast('Грешка!'); }
    setSaving(false);
  }
  function updateDish(si, di, f, v) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes[di][f] = v; setAdminMenu(m); }
  function toggleBadge(si, di, b) { const m = JSON.parse(JSON.stringify(adminMenu)); const d = m.sections[si].dishes[di]; const i = d.badges.indexOf(b); if (i>-1) d.badges.splice(i,1); else d.badges.push(b); setAdminMenu(m); }
  function deleteDish(si, di) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes.splice(di,1); setAdminMenu(m); }
  function addDish(si) { const m = JSON.parse(JSON.stringify(adminMenu)); m.sections[si].dishes.push({ name:'', desc:'', price:'', weight:'', badges:[], image:'' }); setAdminMenu(m); }

  const bg = dark ? '#0f0c08' : '#f5f0e8';
  const cardBg = dark ? '#1a1510' : '#ffffff';
  const textMain = dark ? '#f0e0b0' : '#1a1208';
  const textSub = dark ? '#8a7558' : '#7a6a50';

  const inputStyle = {
    width:'100%', padding:'10px 13px',
    border:`1px solid ${dark?'rgba(184,134,11,0.2)':'rgba(0,0,0,0.1)'}`,
    borderRadius:10, fontSize:14,
    background: dark?'#1a1510':'#faf8f4',
    color: textMain, outline:'none', marginBottom:9, display:'block',
    fontFamily:"'Inter',sans-serif"
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0f0c08' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.92)}50%{opacity:1;transform:scale(1.08)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize:38, animation:'pulse 1.5s ease infinite' }}>🍽</div>
      <div style={{ marginTop:18, color:'#b8860b', fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', fontFamily:"'Inter',sans-serif" }}>Зареждане</div>
      <div style={{ marginTop:16, width:28, height:28, border:'1.5px solid rgba(184,134,11,0.15)', borderTop:'1.5px solid #b8860b', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
    </div>
  );

  return (
    <>
      <Head>
        <title>{menu?.restaurantName || 'Меню'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={dark?'#0f0c08':'#1a1208'} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Cormorant Garamond',Georgia,serif;background:${bg};transition:background 0.35s}
        input,button,textarea{font-family:'Inter',sans-serif}
        @keyframes fadeDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── MENU ── */}
      {screen === 'menu' && menu && (
        <div style={{ background:bg, minHeight:'100vh' }}>

          {/* Phone — subtle top bar */}
          {menu.phone && (
            <div style={{ background: dark?'#1a1510':'#1a1208', textAlign:'center', padding:'9px 1rem', animation:'fadeDown 0.4s ease' }}>
              <a href={`tel:${menu.phone.replace(/\s/g,'')}`}
                style={{ color: dark?'rgba(200,160,60,0.75)':'rgba(200,170,80,0.85)', textDecoration:'none', fontSize:12, letterSpacing:'0.12em', fontFamily:"'Inter',sans-serif", fontWeight:400 }}>
                ✦ {menu.phone} ✦
              </a>
            </div>
          )}

          {/* Header */}
          <div style={{
            background: menu.heroImage
              ? `linear-gradient(rgba(10,6,2,0.52), rgba(10,6,2,0.7)), url(${menu.heroImage}) center/cover no-repeat`
              : dark ? 'linear-gradient(160deg,#100d08 0%,#1e1508 100%)' : 'linear-gradient(160deg,#1a1208 0%,#2d1e08 100%)',
            color:'#f0e0b0',
            padding:'3rem 1.5rem 2.5rem',
            textAlign:'center',
            position:'relative',
            minHeight: menu.heroImage ? 220 : 190,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            opacity: headerVis?1:0,
            transform: headerVis?'translateY(0)':'translateY(-14px)',
            transition:'opacity 0.6s ease, transform 0.6s ease',
          }}>
            <button onClick={toggleDark} style={{ position:'absolute', top:'1rem', left:'1rem', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(200,160,60,0.2)', color:'rgba(200,160,60,0.6)', fontSize:14, width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {dark?'☀':'🌙'}
            </button>
            <button onClick={() => { setPassword(''); setScreen('login'); }} style={{ position:'absolute', top:'1rem', right:'1rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(200,160,60,0.15)', color:'rgba(200,160,60,0.4)', fontSize:10, padding:'5px 11px', borderRadius:6, cursor:'pointer', letterSpacing:'0.08em' }}>
              АДМИН
            </button>

            <div style={{ fontSize:9, letterSpacing:'0.32em', color:'rgba(200,160,60,0.6)', textTransform:'uppercase', marginBottom:10, fontFamily:"'Inter',sans-serif", fontWeight:300 }}>Добре дошли в</div>
            <div style={{ fontSize:34, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', lineHeight:1.1, color:'#f0e0b0', textShadow:'0 2px 24px rgba(0,0,0,0.6)' }}>{menu.restaurantName}</div>
            <div style={{ fontSize:20, color:'rgba(200,160,60,0.65)', margin:'10px 0 7px', lineHeight:1 }}>♥</div>
            <div style={{ fontSize:9, letterSpacing:'0.3em', color:'rgba(200,160,60,0.5)', textTransform:'uppercase', fontFamily:"'Inter',sans-serif", fontWeight:300 }}>Обедно меню</div>
          </div>

          {/* Sections */}
          <div style={{ padding:'1.5rem 1rem 1rem' }}>
            {(menu.sections||[]).map((sec, si) => {
              let offset=0; menu.sections.slice(0,si).forEach(s => offset+=s.dishes.length);
              return (
                <div key={si} style={{ marginBottom:'2rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, animation:`fadeUp 0.5s ease ${0.1+si*0.07}s both` }}>
                    <div style={{ height:'0.5px', width:16, background: dark?'rgba(184,134,11,0.25)':'rgba(0,0,0,0.12)' }} />
                    <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.22em', textTransform:'uppercase', color: dark?'rgba(184,134,11,0.6)':'rgba(140,100,20,0.7)', fontFamily:"'Inter',sans-serif" }}>{sec.label}</div>
                    <div style={{ flex:1, height:'0.5px', background: dark?'rgba(184,134,11,0.25)':'rgba(0,0,0,0.12)' }} />
                  </div>
                  {sec.dishes.map((d,di) => <DishCard key={di} d={d} dark={dark} idx={offset+di} />)}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign:'center', padding:'0.5rem 1.5rem 3rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginBottom:12 }}>
              <div style={{ width:20, height:'0.5px', background: dark?'rgba(184,134,11,0.2)':'rgba(0,0,0,0.1)' }} />
              <div style={{ width:4, height:4, borderRadius:'50%', background: dark?'rgba(184,134,11,0.3)':'rgba(0,0,0,0.15)' }} />
              <div style={{ width:20, height:'0.5px', background: dark?'rgba(184,134,11,0.2)':'rgba(0,0,0,0.1)' }} />
            </div>
            <div style={{ fontSize:12, color:textSub, lineHeight:1.8, fontFamily:"'Inter',sans-serif", fontWeight:300, letterSpacing:'0.02em' }}>
              {menu.footerNote?.split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN ── */}
      {screen === 'login' && (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem', background:bg }}>
          <div style={{ fontSize:22, fontWeight:600, color:textMain, marginBottom:4, letterSpacing:'0.04em' }}>Администрация</div>
          <div style={{ fontSize:12, color:textSub, marginBottom:'1.75rem', fontFamily:"'Inter',sans-serif", letterSpacing:'0.05em' }}>Въведете паролата</div>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="Парола"
            style={{ ...inputStyle, maxWidth:300 }} />
          <button onClick={doLogin} style={{ width:'100%', maxWidth:300, padding:12, background:'#1a1208', color:'#f0e0b0', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer', letterSpacing:'0.08em' }}>ВЛЕЗ</button>
          {loginError && <div style={{ color:'#c04040', fontSize:12, marginTop:8, fontFamily:"'Inter',sans-serif" }}>Грешна парола</div>}
          <button onClick={()=>setScreen('menu')} style={{ marginTop:'1.2rem', background:'none', border:'none', color:textSub, fontSize:12, cursor:'pointer', fontFamily:"'Inter',sans-serif", letterSpacing:'0.05em' }}>← Назад</button>
        </div>
      )}

      {/* ── ADMIN ── */}
      {screen === 'admin' && adminMenu && (
        <div style={{ background: dark?'#0f0c08':'#f5f0e8', minHeight:'100vh' }}>
          <div style={{ background:'#1a1208', color:'#f0e0b0', padding:'1.1rem 1.25rem', display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>setScreen('menu')} style={{ background:'none', border:'1px solid rgba(240,224,176,0.2)', color:'rgba(240,224,176,0.7)', padding:'5px 12px', borderRadius:6, fontSize:12, cursor:'pointer', letterSpacing:'0.05em' }}>← Меню</button>
            <span style={{ fontSize:16, fontWeight:600, letterSpacing:'0.04em' }}>Управление</span>
          </div>

          <div style={{ padding:'1.25rem' }}>
            {/* Views */}
            <div style={{ background:'linear-gradient(135deg,#1a1208,#2a1a08)', borderRadius:14, padding:'1.1rem 1.4rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:16, boxShadow:'0 4px 24px rgba(0,0,0,0.35)' }}>
              <div style={{ fontSize:28 }}>👁</div>
              <div>
                <div style={{ fontSize:10, color:'rgba(200,160,60,0.45)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:3, fontFamily:"'Inter',sans-serif" }}>Прегледи днес</div>
                <div style={{ fontSize:34, fontWeight:700, color:'#f0e0b0', lineHeight:1, fontFamily:"'Cormorant Garamond',serif" }}>{todayViews ?? '—'}</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:11, color:'rgba(200,160,60,0.3)', textAlign:'right', lineHeight:1.7, fontFamily:"'Inter',sans-serif" }}>
                {new Date().toLocaleDateString('bg-BG',{day:'numeric',month:'long'})}
              </div>
            </div>

            {/* Info */}
            <div style={{ marginBottom:'1.5rem' }}>
              <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(140,100,20,0.8)', marginBottom:10 }}>Ресторант</div>
              <input value={adminMenu.restaurantName} onChange={e=>setAdminMenu({...adminMenu,restaurantName:e.target.value})} placeholder="Име" style={inputStyle} />
              <input value={adminMenu.phone||''} onChange={e=>setAdminMenu({...adminMenu,phone:e.target.value})} placeholder="Телефон" style={inputStyle} />
              <input value={adminMenu.footerNote||''} onChange={e=>setAdminMenu({...adminMenu,footerNote:e.target.value})} placeholder="Бележка" style={inputStyle} />
              <div style={{ fontSize:10, color:'rgba(140,100,20,0.7)', marginBottom:7, letterSpacing:'0.1em', textTransform:'uppercase' }}>Фонова снимка</div>
              <ImageUploader value={adminMenu.heroImage||''} onChange={url=>setAdminMenu({...adminMenu,heroImage:url})} />
            </div>

            {adminMenu.sections.map((sec,si) => (
              <div key={si} style={{ marginBottom:'1.5rem' }}>
                <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(140,100,20,0.8)', marginBottom:10 }}>{sec.label}</div>
                {sec.dishes.map((d,di) => (
                  <div key={di} style={{ background:cardBg, border:`1px solid ${dark?'rgba(184,134,11,0.12)':'rgba(0,0,0,0.07)'}`, borderRadius:12, padding:'0.85rem 1rem', marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, marginBottom:7 }}>
                      <input value={d.name} onChange={e=>updateDish(si,di,'name',e.target.value)} placeholder="Ястие" style={{ ...inputStyle, flex:1, marginBottom:0 }} />
                      <input value={d.price} onChange={e=>updateDish(si,di,'price',e.target.value)} placeholder="Цена" style={{ ...inputStyle, width:68, marginBottom:0 }} />
                      <button onClick={()=>deleteDish(si,di)} style={{ background:'none', border:'none', color:'#c04040', fontSize:22, opacity:0.6, cursor:'pointer', padding:'0 3px' }}>×</button>
                    </div>
                    <input value={d.desc} onChange={e=>updateDish(si,di,'desc',e.target.value)} placeholder="Описание" style={{ ...inputStyle, marginBottom:7 }} />
                    <input value={d.weight||''} onChange={e=>updateDish(si,di,'weight',e.target.value)} placeholder="Грамаж (350 г)" style={{ ...inputStyle, marginBottom:4 }} />
                    <ImageUploader value={d.image||''} onChange={url=>updateDish(si,di,'image',url)} />
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:9 }}>
                      {['veg','spicy','new'].map(b => {
                        const bc = getBadge(b, false);
                        return <button key={b} onClick={()=>toggleBadge(si,di,b)}
                          style={{ fontSize:10, padding:'3px 10px', borderRadius:20, border: d.badges.includes(b)?`1px solid ${bc.border}`:'1px solid rgba(0,0,0,0.1)', background: d.badges.includes(b)?bc.bg:'transparent', color: d.badges.includes(b)?bc.color:'#7a6a50', cursor:'pointer', fontWeight: d.badges.includes(b)?600:400 }}>
                          {b==='veg'?'🌿':b==='spicy'?'🌶':'✨'} {BADGE_LABELS[b]}
                        </button>;
                      })}
                    </div>
                  </div>
                ))}
                <button onClick={()=>addDish(si)} style={{ width:'100%', padding:9, border:'1px dashed rgba(140,100,20,0.3)', borderRadius:10, background:'transparent', color:'rgba(140,100,20,0.7)', fontSize:13, cursor:'pointer' }}>
                  + Добави ястие
                </button>
              </div>
            ))}

            <button onClick={saveMenu} disabled={saving}
              style={{ width:'100%', padding:14, background:saving?'#444':'#1a1208', color:'#f0e0b0', border:'none', borderRadius:12, fontSize:14, fontWeight:500, letterSpacing:'0.1em', marginTop:'0.5rem', cursor:saving?'default':'pointer' }}>
              {saving ? 'ЗАПИСВАНЕ...' : '✦ ЗАПАЗИ МЕНЮТО'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'1.25rem', left:'50%', transform:'translateX(-50%)', background:'#1a1208', color:'#f0e0b0', padding:'11px 24px', borderRadius:10, fontSize:12, zIndex:99, whiteSpace:'nowrap', boxShadow:'0 4px 24px rgba(0,0,0,0.4)', letterSpacing:'0.05em', fontFamily:"'Inter',sans-serif", animation:'fadeUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}
