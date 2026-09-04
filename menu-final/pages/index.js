import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, increment } from 'firebase/firestore';
import { supabase } from '../lib/supabase';

async function uploadImage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  const { error } = await supabase.storage.from('menu').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message || 'Upload failed');
  const { data } = supabase.storage.from('menu').getPublicUrl(path);
  return data.publicUrl;
}

const emptyCar = () => ({
  name: '', price: '', year: '', mileage: '', fuel: '', gearbox: '', power: '', engine: '',
  color: '', category: 'Автомобили', location: 'Варна', desc: '', image: '', gallery: [],
  badges: [], catalogId: ''
});

const defaultDealer = {
  dealershipName: 'PM SELECT AUTOMOTIVE',
  slogan: 'Подбрани автомобили за хора с високи изисквания.',
  phone: '+359 899 225 640',
  address: 'гр. Варна, бул. Цар Освободител 122',
  heroImage: '',
  cars: [
    { ...emptyCar(), name: 'BMW 530d', price: '19 999', year: '2018', mileage: '240 000', fuel: 'Дизел', gearbox: 'Автоматична', power: '265 к.с.', engine: '3.0', color: 'Черен металик', desc: 'Елегантност, комфорт и мощност в едно. Кожен салон, LED фарове, навигация, камера, подгрев и Apple CarPlay.', badges: ['leasing', 'trade'] },
    { ...emptyCar(), name: 'VW Touareg 3.6 FSI V6', price: '11 300', year: '2012', mileage: '220 000', fuel: 'Бензин', gearbox: 'Автоматична', power: '280 к.с.', engine: '3.6', color: 'Тъмно сив', category: 'SUV / 4x4', desc: 'Просторен и комфортен SUV с 4x4, кожен салон, панорама, камера и богато оборудване.', badges: ['leasing', 'trade', '4x4'] },
    { ...emptyCar(), name: 'Toyota Land Cruiser 3.0 D-4D', price: '9 999', year: '2002', mileage: '199 000', fuel: 'Дизел', gearbox: 'Ръчна', power: '163 к.с.', engine: '3.0', color: 'Сребърен', category: 'SUV / 4x4', desc: 'Подготвен за офроуд, повдигнат, с блокаж на диференциала и усилено окачване.', badges: ['trade', '4x4'] }
  ]
};

const BADGES = {
  leasing: 'Лизинг', trade: 'Бартер', newimport: 'Нов внос', registered: 'Регистриран', service: 'Обслужен', '4x4': '4x4'
};

function ImageUploader({ value, onChange, multiple = false }) {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);
  async function pick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadImage(f));
      onChange(multiple ? [...(Array.isArray(value) ? value : []), ...urls] : urls[0]);
    } catch (err) { alert('Грешка при качване: ' + err.message); }
    setUploading(false); e.target.value = '';
  }
  const list = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
  return <div style={{ marginTop: 7 }}>
    <input ref={ref} type="file" accept="image/*" multiple={multiple} onChange={pick} style={{ display:'none' }}/>
    <button type="button" onClick={() => ref.current?.click()} disabled={uploading} style={smallBtn}>{uploading ? 'Качване…' : multiple ? '＋ Добави снимки' : value ? 'Смени снимката' : '＋ Добави снимка'}</button>
    {list.length > 0 && <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:8 }}>{list.map((u,i)=><div key={u+i} style={{ position:'relative' }}><img src={u} alt="" style={{ width:80,height:60,objectFit:'cover',borderRadius:8 }}/><button type="button" onClick={()=>multiple ? onChange(list.filter((_,x)=>x!==i)) : onChange('')} style={{ position:'absolute',right:-5,top:-5,border:0,borderRadius:20,width:20,height:20,background:'#d33',color:'#fff',cursor:'pointer' }}>×</button></div>)}</div>}
  </div>;
}

const smallBtn = { padding:'7px 11px', border:'1px solid #d6d6d6', borderRadius:8, background:'#fff', color:'#222', fontSize:12, cursor:'pointer' };
const inputStyle = { width:'100%', padding:'10px 11px', border:'1px solid #dedede', borderRadius:8, fontSize:14, background:'#fff', outline:'none' };

function CarCard({ car, onOpen }) {
  return <article onClick={onOpen} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:14, overflow:'hidden', cursor:'pointer', boxShadow:'0 8px 24px rgba(0,0,0,.05)' }}>
    <div style={{ position:'relative', aspectRatio:'16/10', background:'#eee' }}>
      {car.image ? <img src={car.image} alt={car.name} style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }}/> : <div style={{ height:'100%',display:'grid',placeItems:'center',fontSize:50 }}>🚘</div>}
      <div style={{ position:'absolute',right:10,bottom:10,background:'rgba(0,0,0,.82)',color:'#fff',padding:'7px 10px',borderRadius:8,fontWeight:800,fontSize:17 }}>{car.price || '—'} €</div>
    </div>
    <div style={{ padding:14 }}>
      <div style={{ fontSize:18,fontWeight:800,color:'#111',marginBottom:8 }}>{car.name || 'Автомобил'}</div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'7px 10px',fontSize:12,color:'#555' }}>
        <span>📅 {car.year || '—'}</span><span>🛣 {car.mileage || '—'} км</span>
        <span>⛽ {car.fuel || '—'}</span><span>⚙️ {car.gearbox || '—'}</span>
        <span>🏁 {car.power || '—'}</span><span>🔧 {car.engine || '—'}</span>
      </div>
      {car.badges?.length>0 && <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginTop:10 }}>{car.badges.map(b=><span key={b} style={{ padding:'4px 8px',borderRadius:20,background:'#f1f1f1',fontSize:10,fontWeight:700 }}>{BADGES[b]||b}</span>)}</div>}
    </div>
  </article>;
}

export default function Home() {
  const [dealer,setDealer]=useState(null), [admin,setAdmin]=useState(null), [screen,setScreen]=useState('list');
  const [selected,setSelected]=useState(null), [loading,setLoading]=useState(true), [saving,setSaving]=useState(false);
  const [password,setPassword]=useState(''), [loginError,setLoginError]=useState(false), [currentPass,setCurrentPass]=useState(process.env.NEXT_PUBLIC_ADMIN_PASS || 'Maxxium121');
  const [search,setSearch]=useState(''), [brand,setBrand]=useState('Всички'), [fuel,setFuel]=useState('Всички'), [gearbox,setGearbox]=useState('Всички'), [maxPrice,setMaxPrice]=useState('');
  const [todayViews,setTodayViews]=useState(0), [catalog,setCatalog]=useState([]), [toast,setToast]=useState('');

  useEffect(()=>{(async()=>{
    try {
      const snap=await getDoc(doc(db,'menu','daily'));
      const data=snap.exists()?snap.data():null;
      if(data?.dealershipName && Array.isArray(data.cars)) setDealer(data); else setDealer(defaultDealer);
    } catch { setDealer(defaultDealer); }
    try { const p=await getDoc(doc(db,'settings','admin')); if(p.exists()&&p.data().password) setCurrentPass(p.data().password); } catch {}
    setLoading(false);
  })();},[]);

  useEffect(()=>{(async()=>{try{const d=new Date();const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const r=doc(db,'stats',`cars_${key}`);if(!sessionStorage.getItem(`cars_${key}`)){await setDoc(r,{count:increment(1),date:key},{merge:true});sessionStorage.setItem(`cars_${key}`,'1');}const s=await getDoc(r);setTodayViews(s.exists()?(s.data().count||0):0);}catch{}})()},[]);

  const flash=m=>{setToast(m);setTimeout(()=>setToast(''),2200)};
  const brands=['Всички',...Array.from(new Set((dealer?.cars||[]).map(c=>(c.name||'').split(' ')[0]).filter(Boolean)))];
  const fuels=['Всички',...Array.from(new Set((dealer?.cars||[]).map(c=>c.fuel).filter(Boolean)))];
  const gearboxes=['Всички',...Array.from(new Set((dealer?.cars||[]).map(c=>c.gearbox).filter(Boolean)))];
  const cars=(dealer?.cars||[]).filter(c=>{
    const q=search.trim().toLowerCase(); const p=Number(String(c.price||'').replace(/\D/g,'')); const mx=Number(maxPrice||0);
    return (!q || `${c.name} ${c.desc} ${c.year}`.toLowerCase().includes(q)) && (brand==='Всички'||(c.name||'').startsWith(brand)) && (fuel==='Всички'||c.fuel===fuel) && (gearbox==='Всички'||c.gearbox===gearbox) && (!mx||p<=mx);
  });

  function login(){if(password===currentPass){setAdmin(JSON.parse(JSON.stringify(dealer)));setScreen('admin');setLoginError(false)}else setLoginError(true)}
  function updateCar(i,f,v){const x=structuredClone(admin);x.cars[i][f]=v;setAdmin(x)}
  function addCar(){const x=structuredClone(admin);x.cars.unshift(emptyCar());setAdmin(x)}
  function delCar(i){const x=structuredClone(admin);x.cars.splice(i,1);setAdmin(x)}
  function toggleBadge(i,b){const x=structuredClone(admin);const a=x.cars[i].badges||[];x.cars[i].badges=a.includes(b)?a.filter(v=>v!==b):[...a,b];setAdmin(x)}
  async function save(){setSaving(true);try{const x=structuredClone(admin);for(const c of x.cars){if(!c.name?.trim())continue;const data={...c};if(c.catalogId) await setDoc(doc(db,'cars',c.catalogId),data,{merge:true});else {const r=await addDoc(collection(db,'cars'),data);c.catalogId=r.id;}}await setDoc(doc(db,'menu','daily'),x);setDealer(x);setAdmin(x);flash('Автокъщата е записана ✓');setScreen('list')}catch(e){console.error(e);flash('Грешка при записване')}setSaving(false)}
  async function loadCatalog(){try{const s=await getDocs(collection(db,'cars'));setCatalog(s.docs.map(d=>({id:d.id,...d.data()})))}catch{flash('Грешка при каталога')}}
  function addFromCatalog(c){const x=structuredClone(admin);x.cars.unshift({...emptyCar(),...c,catalogId:c.id});setAdmin(x);flash('Автомобилът е добавен')}

  if(loading) return <div style={{ minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Arial',background:'#0b0b0b',color:'#fff' }}>Зареждане…</div>;

  return <>
    <Head><title>{dealer?.dealershipName || 'Автокъща'} — Автомобили</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
    <style>{`*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;color:#111}button,input,textarea,select{font:inherit}@media(max-width:700px){.cars-grid{grid-template-columns:1fr!important}.filters{grid-template-columns:1fr 1fr!important}.hero{padding:28px 18px!important}.admin-grid{grid-template-columns:1fr!important}}`}</style>

    {screen==='list' && <div>
      <header className="hero" style={{ padding:'42px 6vw',background:dealer.heroImage?`linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.72)),url(${dealer.heroImage}) center/cover`:'linear-gradient(135deg,#060606,#252525)',color:'#fff',position:'relative' }}>
        <button onClick={()=>{setPassword('');setScreen('login')}} style={{ position:'absolute',right:14,top:14,border:'1px solid rgba(255,255,255,.28)',background:'rgba(0,0,0,.35)',color:'#fff',borderRadius:8,padding:'7px 9px',cursor:'pointer' }}>⚙</button>
        <div style={{ maxWidth:1120,margin:'0 auto' }}><div style={{ fontSize:12,letterSpacing:'.22em',textTransform:'uppercase',opacity:.7 }}>Premium Cars</div><h1 style={{ margin:'7px 0 6px',fontSize:'clamp(30px,5vw,58px)',lineHeight:1,fontWeight:900 }}>{dealer.dealershipName}</h1><div style={{ maxWidth:650,fontSize:15,opacity:.82 }}>{dealer.slogan}</div><div style={{ display:'flex',gap:14,flexWrap:'wrap',marginTop:18,fontSize:13 }}><a href={`tel:${dealer.phone.replace(/\s/g,'')}`} style={{ color:'#fff',textDecoration:'none' }}>☎ {dealer.phone}</a><span>📍 {dealer.address}</span></div></div>
      </header>
      <main style={{ maxWidth:1160,margin:'0 auto',padding:'22px 16px 50px' }}>
        <div className="filters" style={{ display:'grid',gridTemplateColumns:'2fr repeat(4,1fr)',gap:9,background:'#fff',padding:12,border:'1px solid #e5e5e5',borderRadius:12,marginBottom:18 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Търси автомобил…" style={inputStyle}/>
          <select value={brand} onChange={e=>setBrand(e.target.value)} style={inputStyle}>{brands.map(v=><option key={v}>{v}</option>)}</select>
          <select value={fuel} onChange={e=>setFuel(e.target.value)} style={inputStyle}>{fuels.map(v=><option key={v}>{v}</option>)}</select>
          <select value={gearbox} onChange={e=>setGearbox(e.target.value)} style={inputStyle}>{gearboxes.map(v=><option key={v}>{v}</option>)}</select>
          <input value={maxPrice} onChange={e=>setMaxPrice(e.target.value.replace(/\D/g,''))} placeholder="Макс. цена €" inputMode="numeric" style={inputStyle}/>
        </div>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'end',margin:'18px 2px 12px' }}><div><div style={{ fontSize:24,fontWeight:900 }}>Налични автомобили</div><div style={{ fontSize:12,color:'#777',marginTop:3 }}>{cars.length} резултата</div></div></div>
        <div className="cars-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16 }}>{cars.map((c,i)=><CarCard key={(c.catalogId||c.name)+i} car={c} onOpen={()=>{setSelected(c);setScreen('detail')}}/>)}</div>
        {!cars.length && <div style={{ textAlign:'center',padding:50,color:'#777' }}>Няма автомобили по избраните критерии.</div>}
      </main>
    </div>}

    {screen==='detail' && selected && <div style={{ minHeight:'100vh',background:'#f5f5f5' }}>
      <div style={{ maxWidth:980,margin:'0 auto',padding:'16px' }}><button onClick={()=>setScreen('list')} style={smallBtn}>← Назад към автомобилите</button>
        <div style={{ marginTop:14,background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid #e5e5e5' }}>
          {selected.image && <img src={selected.image} alt={selected.name} style={{ width:'100%',maxHeight:560,objectFit:'cover',display:'block' }}/>} 
          <div style={{ padding:'20px' }}><div style={{ display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap' }}><div><h1 style={{ margin:0,fontSize:30 }}>{selected.name}</h1><div style={{ color:'#777',marginTop:5 }}>{selected.category} · {selected.location}</div></div><div style={{ fontSize:28,fontWeight:900 }}>{selected.price} €</div></div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,margin:'20px 0' }}>{[['Година',selected.year],['Пробег',`${selected.mileage} км`],['Гориво',selected.fuel],['Скорости',selected.gearbox],['Мощност',selected.power],['Двигател',selected.engine],['Цвят',selected.color]].map(([a,b])=><div key={a} style={{ background:'#f7f7f7',padding:12,borderRadius:10 }}><div style={{ fontSize:10,color:'#888',textTransform:'uppercase' }}>{a}</div><div style={{ fontWeight:800,marginTop:4 }}>{b||'—'}</div></div>)}</div>
          <p style={{ lineHeight:1.7,color:'#444',whiteSpace:'pre-wrap' }}>{selected.desc}</p>
          {selected.gallery?.length>0 && <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:18 }}>{selected.gallery.map((u,i)=><img key={u+i} src={u} alt="" style={{ width:'100%',aspectRatio:'4/3',objectFit:'cover',borderRadius:10 }}/>)}</div>}
          <a href={`tel:${dealer.phone.replace(/\s/g,'')}`} style={{ display:'block',textAlign:'center',marginTop:20,padding:14,borderRadius:10,background:'#111',color:'#fff',fontWeight:800,textDecoration:'none' }}>Обади се за оглед / тест драйв</a>
          </div>
        </div>
      </div>
    </div>}

    {screen==='login' && <div style={{ minHeight:'100vh',display:'grid',placeItems:'center',padding:20 }}><div style={{ width:'100%',maxWidth:340,background:'#fff',border:'1px solid #e5e5e5',borderRadius:14,padding:20 }}><h2 style={{ marginTop:0 }}>Администрация</h2><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Парола" style={inputStyle}/>{loginError&&<div style={{ color:'#c33',fontSize:12,marginTop:7 }}>Грешна парола</div>}<button onClick={login} style={{ ...smallBtn,width:'100%',marginTop:10,background:'#111',color:'#fff' }}>Влез</button><button onClick={()=>setScreen('list')} style={{ ...smallBtn,width:'100%',marginTop:8 }}>Назад</button></div></div>}

    {screen==='admin' && admin && <div style={{ minHeight:'100vh',background:'#efefef' }}>
      <div style={{ position:'sticky',top:0,zIndex:10,background:'#111',color:'#fff',padding:'12px 16px',display:'flex',gap:10,alignItems:'center' }}><button onClick={()=>setScreen('list')} style={{...smallBtn,background:'#222',borderColor:'#444',color:'#fff'}}>← Сайт</button><b>Управление на автокъщата</b><span style={{ marginLeft:'auto',fontSize:12,opacity:.7 }}>👁 Днес: {todayViews}</span></div>
      <div style={{ maxWidth:1000,margin:'0 auto',padding:16 }}>
        <section style={{ background:'#fff',borderRadius:12,padding:14,marginBottom:14 }}><h3 style={{ marginTop:0 }}>Автокъща</h3><div className="admin-grid" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}><input value={admin.dealershipName} onChange={e=>setAdmin({...admin,dealershipName:e.target.value})} placeholder="Име" style={inputStyle}/><input value={admin.phone} onChange={e=>setAdmin({...admin,phone:e.target.value})} placeholder="Телефон" style={inputStyle}/><input value={admin.address} onChange={e=>setAdmin({...admin,address:e.target.value})} placeholder="Адрес" style={inputStyle}/><input value={admin.slogan} onChange={e=>setAdmin({...admin,slogan:e.target.value})} placeholder="Слоган" style={inputStyle}/></div><div style={{ marginTop:9 }}>Фон на хедъра<ImageUploader value={admin.heroImage||''} onChange={u=>setAdmin({...admin,heroImage:u})}/></div></section>
        <div style={{ display:'flex',gap:8,marginBottom:12 }}><button onClick={addCar} style={{...smallBtn,background:'#111',color:'#fff'}}>＋ Нов автомобил</button><button onClick={async()=>{await loadCatalog()}} style={smallBtn}>↻ Зареди каталог</button></div>
        {catalog.length>0 && <section style={{ background:'#fff',padding:12,borderRadius:12,marginBottom:14 }}><b>Каталог с автомобили</b><div style={{ display:'flex',gap:7,overflowX:'auto',paddingTop:9 }}>{catalog.map(c=><button key={c.id} onClick={()=>addFromCatalog(c)} style={{...smallBtn,whiteSpace:'nowrap'}}>＋ {c.name}</button>)}</div></section>}
        {admin.cars.map((c,i)=><section key={i} style={{ background:'#fff',borderRadius:12,padding:14,marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:8 }}><b>Автомобил #{i+1}</b><button onClick={()=>delCar(i)} style={{...smallBtn,color:'#b22'}}>Изтрий</button></div>
          <div className="admin-grid" style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8,marginTop:10 }}>
            <input value={c.name} onChange={e=>updateCar(i,'name',e.target.value)} placeholder="Марка и модел" style={inputStyle}/><input value={c.price} onChange={e=>updateCar(i,'price',e.target.value)} placeholder="Цена €" style={inputStyle}/><input value={c.year} onChange={e=>updateCar(i,'year',e.target.value)} placeholder="Година" style={inputStyle}/>
            <input value={c.mileage} onChange={e=>updateCar(i,'mileage',e.target.value)} placeholder="Пробег км" style={inputStyle}/><input value={c.fuel} onChange={e=>updateCar(i,'fuel',e.target.value)} placeholder="Гориво" style={inputStyle}/><input value={c.gearbox} onChange={e=>updateCar(i,'gearbox',e.target.value)} placeholder="Скорости" style={inputStyle}/>
            <input value={c.power} onChange={e=>updateCar(i,'power',e.target.value)} placeholder="Мощност" style={inputStyle}/><input value={c.engine} onChange={e=>updateCar(i,'engine',e.target.value)} placeholder="Двигател" style={inputStyle}/><input value={c.color} onChange={e=>updateCar(i,'color',e.target.value)} placeholder="Цвят" style={inputStyle}/>
            <input value={c.category} onChange={e=>updateCar(i,'category',e.target.value)} placeholder="Категория" style={inputStyle}/><input value={c.location} onChange={e=>updateCar(i,'location',e.target.value)} placeholder="Град" style={inputStyle}/>
          </div>
          <textarea value={c.desc} onChange={e=>updateCar(i,'desc',e.target.value)} placeholder="Описание, оборудване, условия за лизинг/бартер…" rows={4} style={{...inputStyle,marginTop:8,resize:'vertical'}}/>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:8 }}><div><b style={{fontSize:12}}>Основна снимка</b><ImageUploader value={c.image||''} onChange={u=>updateCar(i,'image',u)}/></div><div><b style={{fontSize:12}}>Галерия</b><ImageUploader multiple value={c.gallery||[]} onChange={u=>updateCar(i,'gallery',u)}/></div></div>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:10 }}>{Object.entries(BADGES).map(([b,l])=><button key={b} onClick={()=>toggleBadge(i,b)} style={{...smallBtn,background:(c.badges||[]).includes(b)?'#111':'#fff',color:(c.badges||[]).includes(b)?'#fff':'#222'}}>{l}</button>)}</div>
        </section>)}
        <button onClick={save} disabled={saving} style={{ width:'100%',padding:14,border:0,borderRadius:10,background:'#111',color:'#fff',fontWeight:800,cursor:'pointer' }}>{saving?'Записване…':'💾 Запази автокъщата'}</button>
      </div>
    </div>}
    {toast && <div style={{ position:'fixed',left:'50%',bottom:18,transform:'translateX(-50%)',background:'#111',color:'#fff',padding:'10px 16px',borderRadius:9,zIndex:50 }}>{toast}</div>}
  </>;
}
