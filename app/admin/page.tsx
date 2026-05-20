'use client';
import { useEffect, useRef, useState } from 'react';
import { buildPlaylist, getNowPlaying, type Track } from '@/lib/scheduler';

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || 'covers2024';

function fmtDur(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AdminPage() {
  const [auth,     setAuth]     = useState(false);
  const [pass,     setPass]     = useState('');
  const [tracks,   setTracks]   = useState<Track[]>([]);
  const [interval, setInterval_] = useState(2);
  const [epochMs,  setEpochMs]  = useState(0);
  const [uploading,setUploading]= useState(false);
  const [msg,      setMsg]      = useState('');

  // Upload form state
  const [file,     setFile]     = useState<File | null>(null);
  const [name,     setName]     = useState('');
  const [artist,   setArtist]   = useState('');
  const [type,     setType]     = useState<'song'|'commercial'>('song');
  const [duration, setDuration] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem('emisora_auth') === ADMIN_PASS) setAuth(true);
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadData();
  }, [auth]);

  async function loadData() {
    const [tRes, sRes] = await Promise.all([fetch('/api/tracks'), fetch('/api/settings')]);
    const tData = await tRes.json();
    setTracks(Array.isArray(tData) ? tData : []);
    const cfg = await sRes.json();
    setInterval_(cfg.commercialInterval ?? 2);
    setEpochMs(cfg.epochMs ?? 0);
  }

  function login() {
    if (pass === ADMIN_PASS) {
      localStorage.setItem('emisora_auth', pass);
      setAuth(true);
    } else {
      setMsg('Contraseña incorrecta');
    }
  }

  function handleFileChange(f: File) {
    setFile(f);
    setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    // Read duration
    const audio = new Audio(URL.createObjectURL(f));
    audio.onloadedmetadata = () => setDuration(Math.round(audio.duration));
  }

  async function upload() {
    if (!file || !name.trim()) return;
    setUploading(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file',     file);
      fd.append('name',     name.trim());
      fd.append('artist',   artist.trim());
      fd.append('type',     type);
      fd.append('duration', String(duration));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { msg = (await res.json()).error || msg; } catch { msg = res.statusText || msg; }
        throw new Error(msg);
      }
      setMsg('✅ Subido correctamente');
      setFile(null); setName(''); setArtist(''); setDuration(0);
      if (fileRef.current) fileRef.current.value = '';
      await loadData();
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'Error'));
    } finally {
      setUploading(false);
    }
  }

  async function deleteTrack(id: string) {
    if (!confirm('¿Eliminar esta pista?')) return;
    await fetch('/api/tracks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await loadData();
  }

  async function toggleActive(t: Track) {
    await fetch('/api/tracks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, active: !t.active }) });
    await loadData();
  }

  async function saveSettings() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commercialInterval: interval, epochMs }) });
    setMsg('✅ Configuración guardada');
  }

  async function resetEpoch() {
    const now = Date.now();
    setEpochMs(now);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commercialInterval: interval, epochMs: now }) });
    setMsg('✅ Emisora reiniciada desde ahora');
  }

  async function skipNext() {
    const songs       = tracks.filter(t => t.active && t.type === 'song');
    const commercials = tracks.filter(t => t.active && t.type === 'commercial');
    const playlist    = buildPlaylist(songs, commercials, interval);
    const np          = getNowPlaying(playlist, epochMs);
    if (!np) return;
    const nextIdx = (np.trackIdx + 1) % playlist.length;
    let nextStart = 0;
    for (let i = 0; i < nextIdx; i++) nextStart += playlist[i].duration;
    const newEpoch = Date.now() - nextStart * 1000;
    setEpochMs(newEpoch);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commercialInterval: interval, epochMs: newEpoch }) });
    setMsg('⏭ Saltando a la siguiente pista');
  }

  function cleanName(name: string) {
    return name.replace(/\d{4}\s\d{4}/g, '').replace(/\s+/g, ' ').trim();
  }

  const box: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' };
  const label: React.CSSProperties = { fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' };
  const input: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '0.55rem 0.75rem', color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.85rem' };

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...box, width: 320 }}>
        <h2 style={{ marginBottom: '1rem', fontWeight: 700 }}>🔒 Admin — Covers Radio</h2>
        <label style={label}>Contraseña</label>
        <input style={input} type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()} autoFocus />
        {msg && <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{msg}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={login}>Entrar</button>
      </div>
    </div>
  );

  const songs       = tracks.filter(t => t.type === 'song');
  const commercials = tracks.filter(t => t.type === 'commercial');

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>📻 Covers Radio — Admin</h1>
        <a href="/" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Ver emisora →</a>
      </div>

      {msg && <div style={{ background: 'rgba(78,201,160,0.08)', border: '1px solid rgba(78,201,160,0.25)', borderRadius: 8,
        padding: '0.6rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>{msg}</div>}

      {/* Upload */}
      <div style={box}>
        <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>⬆ Subir pista</h2>
        <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
        <div onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '1.5rem', textAlign: 'center',
            cursor: 'pointer', marginBottom: '1rem', background: file ? 'rgba(78,201,160,0.04)' : 'transparent' }}>
          {file ? <span style={{ color: 'var(--success)' }}>🎵 {file.name} {duration > 0 ? `(${fmtDur(duration)})` : ''}</span>
                : <span style={{ color: 'var(--muted)' }}>Haz clic o arrastra un MP3</span>}
        </div>
        <label style={label}>Nombre de la canción *</label>
        <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cover" />
        <label style={label}>Artista original</label>
        <input style={input} value={artist} onChange={e => setArtist(e.target.value)} placeholder="Ej: Los Beatles" />
        <label style={label}>Tipo</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['song', 'commercial'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} className="btn"
              style={{ flex: 1, border: type === t ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: type === t ? 'rgba(249,115,22,0.15)' : 'var(--surface2)',
                color: type === t ? 'var(--accent)' : 'var(--muted)' }}>
              {t === 'song' ? '🎵 Canción' : '📢 Comercial'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={upload}
          disabled={!file || !name.trim() || uploading}>
          {uploading ? '⏳ Subiendo...' : '⬆ Subir'}
        </button>
      </div>

      {/* Settings */}
      <div style={box}>
        <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>⚙️ Configuración</h2>
        <label style={label}>Comercial cada cuántas canciones</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setInterval_(n)} className="btn"
              style={{ border: interval === n ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: interval === n ? 'rgba(249,115,22,0.15)' : 'var(--surface2)',
                color: interval === n ? 'var(--accent)' : 'var(--muted)' }}>
              Cada {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={saveSettings} style={{ flex: 1 }}>Guardar</button>
          <button className="btn btn-ghost" onClick={skipNext} style={{ flex: 1 }}>⏭ Siguiente canción</button>
          <button className="btn btn-ghost" onClick={resetEpoch} style={{ flex: 1 }}>🔄 Reiniciar emisora</button>
        </div>
        {epochMs > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.6rem' }}>
          Emisora activa desde: {new Date(epochMs).toLocaleString('es')}
        </p>}
      </div>

      {/* Track list */}
      {[{ label: '🎵 Canciones', list: songs }, { label: '📢 Comerciales', list: commercials }].map(({ label: lbl, list }) => (
        <div key={lbl} style={box}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>{lbl} ({list.length})</h2>
          {list.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin pistas aún.</p>
            : list.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0',
                borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: t.active ? 1 : 0.45,
              }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem', minWidth: 24, textAlign: 'right' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                  {t.artist && <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t.artist}</p>}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', flexShrink: 0 }}>{fmtDur(t.duration)}</span>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => toggleActive(t)}>
                  {t.active ? 'Al aire' : 'Oculta'}
                </button>
                <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => deleteTrack(t.id)}>🗑</button>
              </div>
            ))
          }
        </div>
      ))}
    </div>
  );
}
