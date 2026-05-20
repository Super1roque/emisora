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

export default function RadioPlayer() {
  const [playlist,    setPlaylist]    = useState<Track[]>([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [loading,     setLoading]     = useState(true);

  const audioRef      = useRef<HTMLAudioElement>(null);
  const playingRef    = useRef(false);
  const autoPlayRef   = useRef(false);

  useEffect(() => { playingRef.current = playing; }, [playing]);

  const load = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([fetch('/api/tracks'), fetch('/api/settings')]);
    const tData = await tRes.json();
    const allTracks: Track[] = Array.isArray(tData) ? tData : [];
    const cfg: RadioSettings = await sRes.json();
    const songs       = allTracks.filter(t => t.active && t.type === 'song');
    const commercials = allTracks.filter(t => t.active && t.type === 'commercial');
    setPlaylist(buildPlaylist(songs, commercials, cfg.commercialInterval ?? 2));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Wire up audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime     = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onPlay     = () => setPlaying(true);
    const onPause    = () => setPlaying(false);
    const onEnded    = () => { autoPlayRef.current = true; setCurrentIdx(i => (i + 1) % playlist.length); };
    audio.addEventListener('timeupdate',      onTime);
    audio.addEventListener('durationchange',  onDuration);
    audio.addEventListener('play',            onPlay);
    audio.addEventListener('pause',           onPause);
    audio.addEventListener('ended',           onEnded);
    return () => {
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [playlist]);

  // Load new track when index changes
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

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  }

  function skipNext() {
    setCurrentIdx(i => (i + 1) % playlist.length);
  }

  function skipPrev() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      setCurrentIdx(i => (i - 1 + playlist.length) % playlist.length);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  const current  = playlist[currentIdx] ?? null;
  const next     = playlist.length ? playlist[(currentIdx + 1) % playlist.length] : null;
  const progress = duration ? (currentTime / duration) * 100 : 0;

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          🎵 COVERS
        </div>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '2.5rem 2rem', maxWidth: 420, width: '100%',
        boxShadow: '0 0 60px rgba(249,115,22,0.08)',
      }}>
        {/* Track info */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color:      current?.type === 'commercial' ? '#facc15' : 'var(--accent)',
            background: current?.type === 'commercial' ? 'rgba(250,204,21,0.1)' : 'rgba(249,115,22,0.1)',
            border: `1px solid ${current?.type === 'commercial' ? 'rgba(250,204,21,0.3)' : 'rgba(249,115,22,0.3)'}`,
            borderRadius: 6, padding: '0.2rem 0.6rem', marginBottom: '1rem',
          }}>
            {current?.type === 'commercial' ? '📢 Comercial' : '🎵 Canción'}
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.4rem' }}>
            {current ? cleanName(current.name) : '—'}
          </h1>
          {current?.artist && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{current.artist}</p>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div onClick={seek} style={{ background: 'var(--border)', borderRadius: 4, height: 6, cursor: 'pointer', overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${progress}%`, transition: 'width 0.5s linear', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.75rem' }}>
          <button onClick={skipPrev} className="btn btn-ghost"
            style={{ width: 44, height: 44, borderRadius: '50%', fontSize: '1.2rem', padding: 0 }}>
            ⏮
          </button>
          <button onClick={togglePlay} className="btn btn-primary"
            style={{ width: 72, height: 72, borderRadius: '50%', fontSize: '1.8rem', padding: 0,
              boxShadow: '0 0 32px rgba(249,115,22,0.4)' }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={skipNext} className="btn btn-ghost"
            style={{ width: 44, height: 44, borderRadius: '50%', fontSize: '1.2rem', padding: 0 }}>
            ⏭
          </button>
        </div>

        {/* Next up */}
        {next && next !== current && (
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '0.75rem 1rem',
            border: '1px solid var(--border)', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              A continuación
            </span>
            <span style={{ fontWeight: 600 }}>{cleanName(next.name)}</span>
            {next.artist && <span style={{ color: 'var(--muted)', marginLeft: '0.4rem' }}>— {next.artist}</span>}
          </div>
        )}
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
