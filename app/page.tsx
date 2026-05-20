'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildPlaylist, type Track, type RadioSettings } from '@/lib/scheduler';

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function cleanName(name: string) {
  return name.replace(/\d{4}\s\d{4}/g, '').replace(/recortado/gi, '').replace(/\s+/g, ' ').trim();
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

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
