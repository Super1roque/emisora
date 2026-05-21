'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildPlaylist, type Track, type RadioSettings } from '@/lib/scheduler';

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function cleanName(name: string) {
  return name.replace(/\d{4}\s\d{4}/g, '').replace(/\d{8}/g, '').replace(/recortado/gi, '').replace(/\s+/g, ' ').trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RadioPlayer() {
  const [playlist,    setPlaylist]    = useState<Track[]>([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState('');
  const [shareOpen,   setShareOpen]   = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [visits,      setVisits]      = useState<number | null>(null);

  const audioRef    = useRef<HTMLAudioElement>(null);
  const playingRef  = useRef(false);
  const autoPlayRef = useRef(false);
  const playlistRef = useRef<Track[]>([]);
  const filteredRef = useRef<Track[]>([]);
  const queryRef    = useRef('');

  useEffect(() => { playingRef.current  = playing;  }, [playing]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { queryRef.current    = query;    }, [query]);

  const load = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([fetch('/api/tracks'), fetch('/api/settings')]);
    const tData = await tRes.json();
    const allTracks: Track[] = Array.isArray(tData) ? tData : [];
    const cfg: RadioSettings = await sRes.json();
    const songs       = shuffle(allTracks.filter(t => t.active && t.type === 'song'));
    const commercials = allTracks.filter(t => t.active && t.type === 'commercial');
    setPlaylist(buildPlaylist(songs, commercials, cfg.commercialInterval ?? 2));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/visits', { method: 'POST' })
      .then(r => r.json())
      .then(d => setVisits(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime     = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onPlay     = () => setPlaying(true);
    const onPause    = () => setPlaying(false);
    const onEnded    = () => { autoPlayRef.current = true; setCurrentIdx(i => nextIdx(i)); };
    audio.addEventListener('timeupdate',     onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);
    return () => {
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playlist.length) return;
    audio.src = playlist[currentIdx].url;
    setCurrentTime(0);
    setDuration(0);
    if (playingRef.current || autoPlayRef.current) {
      autoPlayRef.current = false;
      audio.play().catch(() => {});
    }
  }, [currentIdx, playlist]);

  function nextIdx(cur: number): number {
    const pl = playlistRef.current;
    const f  = filteredRef.current;
    if (queryRef.current && f.length) {
      const pos  = f.findIndex(t => pl.indexOf(t) === cur);
      const next = f[(pos + 1) % f.length];
      return pl.indexOf(next);
    }
    return (cur + 1) % pl.length;
  }

  function prevIdx(cur: number): number {
    const pl = playlistRef.current;
    const f  = filteredRef.current;
    if (queryRef.current && f.length) {
      const pos  = f.findIndex(t => pl.indexOf(t) === cur);
      const prev = f[(pos - 1 + f.length) % f.length];
      return pl.indexOf(prev);
    }
    return (cur - 1 + pl.length) % pl.length;
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  }

  function skipNext() { setCurrentIdx(i => nextIdx(i)); }

  function skipPrev() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) audio.currentTime = 0;
    else setCurrentIdx(i => prevIdx(i));
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  function playTrack(idx: number) {
    autoPlayRef.current = true;
    setCurrentIdx(idx);
  }

  const current  = playlist[currentIdx] ?? null;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const q        = query.trim().toLowerCase();
  const songs    = playlist.filter(t => t.type !== 'commercial');
  const filtered = q
    ? songs.filter(t => cleanName(t.name).toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    : songs;
  filteredRef.current = filtered;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Cargando...</p>
    </div>
  );

  if (!playlist.length) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>🎵</div>
      <p style={{ color: 'var(--muted)' }}>No hay canciones disponibles.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem 4rem', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          🎵 COVERS
        </div>
        {visits !== null && (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.3rem', letterSpacing: '0.05em' }}>
            👁 {visits.toLocaleString('es')} visitas
          </div>
        )}
      </div>

      {/* Player card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '2rem 1.75rem', marginBottom: '1.25rem',
        boxShadow: '0 0 60px rgba(249,115,22,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color:      current?.type === 'commercial' ? '#facc15' : 'var(--accent)',
            background: current?.type === 'commercial' ? 'rgba(250,204,21,0.1)' : 'rgba(249,115,22,0.1)',
            border: `1px solid ${current?.type === 'commercial' ? 'rgba(250,204,21,0.3)' : 'rgba(249,115,22,0.3)'}`,
            borderRadius: 6, padding: '0.2rem 0.6rem', marginBottom: '0.75rem',
          }}>
            {current?.type === 'commercial' ? '📢 Comercial' : '🎵 Canción'}
          </div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.3rem' }}>
            {current ? cleanName(current.name) : '—'}
          </h1>
          {current?.artist && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{current.artist}</p>
          )}
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <div onClick={seek} style={{ background: 'var(--border)', borderRadius: 4, height: 6, cursor: 'pointer', overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${progress}%`, transition: 'width 0.5s linear', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <button onClick={skipPrev} className="btn btn-ghost"
            style={{ width: 44, height: 44, borderRadius: '50%', fontSize: '1.2rem', padding: 0 }}>⏮</button>
          <button onClick={togglePlay} className="btn btn-primary"
            style={{ width: 72, height: 72, borderRadius: '50%', fontSize: '1.8rem', padding: 0,
              boxShadow: '0 0 32px rgba(249,115,22,0.4)' }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={skipNext} className="btn btn-ghost"
            style={{ width: 44, height: 44, borderRadius: '50%', fontSize: '1.2rem', padding: 0 }}>⏭</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar canción o artista..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '0.6rem 2.4rem 0.6rem 0.85rem', color: 'var(--text)', fontSize: '0.9rem',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{
            position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', padding: 0,
          }}>✕</button>
        )}
      </div>

      {/* Track list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '1.25rem', textAlign: 'center' }}>
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
        ) : filtered.map(t => {
          const idx      = playlist.indexOf(t);
          const isActive = idx === currentIdx;
          return (
            <div key={t.id} onClick={() => playTrack(idx)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 1rem', cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              background: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
            }}>
              <span style={{ width: 18, textAlign: 'center', flexShrink: 0, fontSize: '0.8rem',
                color: isActive ? 'var(--accent)' : 'transparent' }}>
                {isActive && playing ? '▶' : isActive ? '—' : ''}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: isActive ? 700 : 500, fontSize: '0.88rem',
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cleanName(t.name)}
                </p>
                {t.artist && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.artist}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>{fmtTime(t.duration)}</span>
            </div>
          );
        })}
      </div>

      {/* Botón compartir — fijo arriba a la derecha */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 1000 }}>
        <button
          onClick={() => setShareOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 50, padding: '0.5rem 1rem', cursor: 'pointer',
            color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Compartir
        </button>

        {shareOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden', minWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {/* WhatsApp — opción principal */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent('🎵 Escucha esta emisora de covers: ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setShareOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700,
                background: '#25d366', borderBottom: '1px solid var(--border)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Compartir por WhatsApp
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => { setCopied(false); setShareOpen(false); }, 1500);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '0.88rem', width: '100%',
                borderBottom: '1px solid var(--border)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              {copied ? '✅ ¡Copiado!' : 'Copiar enlace'}
            </button>
            <button
              onClick={async () => {
                try { await navigator.share({ title: 'Covers', text: '🎵 Escucha esta emisora de covers', url: window.location.href }); } catch {}
                setShareOpen(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '0.88rem', width: '100%' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Más opciones...
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp flotante — fijo abajo a la derecha */}
      <a
        href="https://wa.me/50496895978?text=He%20visto%20la%20emisora%20de%20covers%20y%20quiero%20mi%20propia%20cancion"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.25rem', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.65rem 1.1rem', borderRadius: 50,
          background: '#25d366', color: '#fff', textDecoration: 'none',
          fontWeight: 700, fontSize: '0.85rem',
          boxShadow: '0 4px 24px rgba(37,211,102,0.5)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Pedir información
      </a>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
