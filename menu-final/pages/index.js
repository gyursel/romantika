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
          <img src={value} alt="" style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 6, border: '0.5px solid rgba(184,134,11,0.3)', display: 'block' }} />
          <button onClick={() => inputRef.current.click()} style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(26,18,8,0.82)', border: 'none', color: '#F5E6A3', fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}>Смени</button>
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(226,75,74,0.9)', border: 'none', color: 'white', fontSize: 13, width: 18, height: 18, borderRadius: '50%', lineHeight: '18px', textAlign: 'center', padding: 0, cursor: 'pointer' }}>×</button>
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
          <div style={{ fontSize: 15, fontWeight: 600, color: dark ? '#FBEFC2' : '#1A1208', marginBottom: 3 }}>{d.name}</div>
          {d.desc && <div style={{ fontSize: 12, color: dark ? '#cbb588' : '#6B5E3E', lineHeight: 1.5 }}>{d.desc}</div>}
          {d.weight && <div style={{ fontSize: 11, color: '#B8860B', marginTop: 4, opacity: 0.85 }}>⚖ {d.weight}</div>}
          {d.badges?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {d.badges.map(b => (
                <span key={b} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: badgeColors[b]?.bg, color: badgeColors[b]?.color }}>{BADGE_LABELS[b]}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: dark ? '#d4a830' : '#7A5C00', whiteSpace: 'nowrap' }}>{d.price} €</div>
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
  const [headerVisible, setHeaderVisible] = useState(false);

  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || '1234';
  const badgeColors = getBadgeColors(dark);

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('menu_dark');
    if (saved === '1') setDark(true);

    async function loadMenu() {
      try {
        const snap = await getDoc(doc(db, 'menu', 'daily'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.sections) {
            data.sections = data.sections.map(sec => ({
              ...sec,
              dishes: sec.dishes.map(d => ({ weight: '', ...d }))
            }));
          }
          setMenu(data);
        } else setMenu(defaultMenu);
      } catch(e) { setMenu(defaultMenu); }
      setLoading(false);
      setTimeout(() => setHeaderVisible(true), 50);
    }
    loadMenu();
  }, []);

  function toggleDark() {
    const next = !dark;*
    setDark(next);
    localStorage.setItem('menu_dark', next ? '1' : '0');
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function doLogin() {
    if (password === ADMIN_PASS) {
      setAdminMenu(JSON.parse(JSON.stringify(menu)));
      setScreen('admin');
      setLoginError(false);
    } else setLoginError(true);
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

  function updateDish(si, di, field, val) {
    const m = JSON.parse(JSON.stringify(adminMenu));
    m.sections[si].dishes[di][field] = val;
    setAdminMenu(m);
  }

  function toggleBadge(si, di, badge) {
    const m = JSON.parse(JSON.stringify(adminMenu));
    const d = m.sections[si].dishes[di];
    const idx = d.badges.indexOf(badge);
    if (idx > -1) d.badges.splice(idx, 1); else d.badges.push(badge);
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

  const bg = dark ? '#1b150d' : '#(';
  const cardBg = dark ? '#2b2419' : 'white';
  const textMain = dark ? '#F5E6A3' : '#1A1208';
  const textSub = dark ? '#a08c5e' : '#6B5E3E';
  const border = dark ? 'rgba(184,134,11,0.15)' : 'rgba(184,134,11,0.2)';

  // Splash loader
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
        <title>{menu?.restaurantName || 'Меню'} — Обедно меню</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={dark ? '#110e08' : '#1A1208'} />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${bg}; transition: background 0.3s; }
        input, button { font-family: inherit; }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .section-label { animation: fadeUp 0.5s ease both; }
        .romantika-hero {
          min-height: 92px;
          padding: 20px 56px 16px;
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
        .hero-ornament::before, .hero-ornament::after {
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
          .romantika-hero { min-height: 132px; padding: 18px 44px 14px; }
          .hero-kicker { font-size: 12px; }
          .hero-title { font-size: clamp(24px, 8vw, 32px); }
          .hero-subtitle { font-size: 10px; }
        }
      `}</style>

      {/* ── MENU ── */}
      {screen === 'menu' && menu && (
        <div style={{ background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>

          {/* Phone bar */}
          {menu.phone && (
            <div style={{ background: '#B8860B', color: '#1A1208', textAlign: 'center', padding: '7px 1rem', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', animation: 'fadeDown 0.4s ease' }}>
              📞 <a href={`tel:${menu.phone.replace(/\s/g,'')}`} style={{ color: '#1A1208', textDecoration: 'none' }}>{menu.phone}</a>
            </div>
          )}

          {/* Header */}
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
            <button onClick={() => { setPassword(''); setLoginError(false); setScreen('login'); }}
              style={{ position: 'absolute', zIndex: 2, top: 10, right: 10, background: 'rgba(14,9,4,0.46)', border: '1px solid rgba(234,201,111,0.42)', color: '#f2d98c', fontSize: 10, padding: '4px 7px', borderRadius: 4, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              ⚙
            </button>
            <button onClick={toggleDark}
              style={{ position: 'absolute', zIndex: 2, top: 10, left: 10, background: 'rgba(14,9,4,0.46)', border: '1px solid rgba(234,201,111,0.42)', color: '#f2d98c', fontSize: 13, width: 27, height: 27, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
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

          {/* Sections */}
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
              {menu.footerNote?.split('\n').map((l, i) => <span key={i}>{l}<br/></span>)}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN ── */}
      {screen === 'login' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: bg }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: textMain, marginBottom: 4 }}>Вход в администрацията</div>
          <div style={{ fontSize: 13, color: textSub, marginBottom: '1.5rem' }}>Въведете паролата за управление</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="Парола"
            style={{ width: '100%', maxWidth: 320, padding: '10px 14px', border: `0.5px solid ${border}`, borderRadius: 8, fontSize: 14, marginBottom: 10, outline: 'none', background: cardBg, color: textMain }} />
          <button onClick={doLogin}
            style={{ width: '100%', maxWidth: 320, padding: 11, background: '#1A1208', color: '#F5E6A3', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Влез</button>
          {loginError && <div style={{ color: '#E24B4A', fontSize: 12, marginTop: 8 }}>Грешна парола</div>}
          <button onClick={() => setScreen('menu')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: textSub, fontSize: 13, cursor: 'pointer' }}>← Назад към менюто</button>
        </div>
      )}

      {/* ── ADMIN ── */}
      {screen === 'admin' && adminMenu && (
        <div style={{ background: '#FDFAF5', minHeight: '100vh' }}>
          <div style={{ background: '#1A1208', color: '#F5E6A3', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setScreen('menu')} style={{ background: 'none', border: '0.5px solid rgba(245,230,163,0.3)', color: 'rgba(245,230,163,0.8)', padding: '5px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>← Меню</button>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Управление на менюто</span>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8860B', marginBottom: 10 }}>Ресторант</div>
              <input value={adminMenu.restaurantName} onChange={e => setAdminMenu({...adminMenu, restaurantName: e.target.value})}
                placeholder="Ime na restorant"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', marginBottom: 8 }} />
              <input value={adminMenu.phone || ''} onChange={e => setAdminMenu({...adminMenu, phone: e.target.value})}
                placeholder="Телефон за връзка"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', marginBottom: 8 }} />
              <input value={adminMenu.footerNote} onChange={e => setAdminMenu({...adminMenu, footerNote: e.target.value})}
                placeholder="Бележка в долната част"
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none' }} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: '#B8860B', marginBottom: 6 }}>ФОНОВА СНИМКА НА ХЕДЪРА</div>
                <ImageUploader value={adminMenu.heroImage || ''} onChange={url => setAdminMenu({...adminMenu, heroImage: url})} />
              </div>
            </div>

            {adminMenu.sections.map((sec, si) => (
              <div key={si} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8860B', marginBottom: 10 }}>{sec.label}</div>
                {sec.dishes.map((d, di) => (
                  <div key={di} style={{ background: 'white', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input value={d.name} onChange={e => updateDish(si, di, 'name', e.target.value)} placeholder="Ястие"
                        style={{ flex: 1, padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none' }} />
                      <input value={d.price} onChange={e => updateDish(si, di, 'price', e.target.value)} placeholder="Цена"
                        style={{ width: 65, padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none' }} />
                      <button onClick={() => deleteDish(si, di)} style={{ background: 'none', border: 'none', color: '#E24B4A', fontSize: 20, opacity: 0.6, padding: '0 4px', cursor: 'pointer' }}>×</button>
                    </div>
                    <input value={d.desc} onChange={e => updateDish(si, di, 'desc', e.target.value)} placeholder="Описание"
                      style={{ width: '100%', padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none', marginBottom: 6, display: 'block' }} />
                    <input value={d.weight || ''} onChange={e => updateDish(si, di, 'weight', e.target.value)} placeholder="Грамаж (напр. 350 г)"
                      style={{ width: '100%', padding: '6px 8px', border: '0.5px solid rgba(184,134,11,0.2)', borderRadius: 4, fontSize: 13, background: '#FDFAF5', outline: 'none', marginBottom: 6, display: 'block' }} />
                    <ImageUploader value={d.image || ''} onChange={url => updateDish(si, di, 'image', url)} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {['veg', 'spicy', 'new'].map(b => {
                        const bc = getBadgeColors(false);
                        return (
                          <button key={b} onClick={() => toggleBadge(si, di, b)}
                            style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, border: d.badges.includes(b) ? `0.5px solid ${bc[b].color}` : '0.5px solid rgba(184,134,11,0.2)', background: d.badges.includes(b) ? bc[b].bg : 'white', color: d.badges.includes(b) ? bc[b].color : '#6B5E3E', cursor: 'pointer' }}>
                            {b === 'veg' ? '🌿' : b === 'spicy' ? '🌶' : '✨'} {BADGE_LABELS[b]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button onClick={() => addDish(si)}
                  style={{ width: '100%', padding: 8, border: '0.5px dashed rgba(184,134,11,0.3)', borderRadius: 8, background: 'transparent', color: '#B8860B', fontSize: 13, cursor: 'pointer' }}>
                  + Добави ястие
                </button>
              </div>
            ))}

            <button onClick={saveMenu} disabled={saving}
              style={{ width: '100%', padding: 13, background: saving ? '#555' : '#1A1208', color: '#F5E6A3', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, letterSpacing: '0.04em', marginTop: '0.5rem', cursor: saving ? 'default' : 'pointer' }}>
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
