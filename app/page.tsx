'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildPlaylist, getNowPlaying, type Track, type RadioSettings, type NowPlaying } from '@/lib/scheduler';

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function RadioPlayer() {
  const [tracks,   setTracks]   = useState<Track[]>([]);
  const [settings, setSettings] = useState<RadioSettings | null>(null);
  const [now,      setNow]      = useState<NowPlaying | null>(null);
  const [offset,   setOffset]   = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [started,  setStarted]  = useState(false);

  const audioRef    = useRef<HTMLAudioElement>(null);
  const trackIdRef  = useRef<string>('');
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([
      fetch('/api/tracks'),
      fetch('/api/settings'),
    ]);
    const allTracks: Track[] = await tRes.json();
    const cfg: RadioSettings = await sRes.json();
    setTracks(allTracks);
    setSettings(cfg);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sync audio position every second
  useEffect(() => {
    if (!settings || !tracks.length || !started) return;

    const songs       = tracks.filter(t => t.active && t.type === 'song');
    const commercials = tracks.filter(t => t.active && t.type === 'commercial');
    const playlist    = buildPlaylist(songs, commercials, settings.commercialInterval);

    function tick() {
      const np = getNowPlaying(playlist, settings!.epochMs);
      if (!np) return;
      setNow(np);
      setOffset(np.offsetSec);

      const audio = audioRef.current;
      if (!audio) return;

      // New track → load it
      if (np.track.id !== trackIdRef.current) {
        trackIdRef.current = np.track.id;
        audio.src          = np.track.url;
        audio.currentTime  = np.offsetSec;
        audio.play().catch(() => {});
        setPlaying(true);
      } else {
        // Drift correction: if more than 2s off, resync
        const drift = Math.abs(audio.currentTime - np.offsetSec);
        if (drift > 2) audio.currentTime = np.offsetSec;
      }
    }

    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [settings, tracks, started]);

  function handleStart() {
    setStarted(true);
    audioRef.current?.play().catch(() => {});
  }

  const playlist = settings && tracks.length
    ? buildPlaylist(
        tracks.filter(t => t.active && t.type === 'song'),
        tracks.filter(t => t.active && t.type === 'commercial'),
        settings.commercialInterval,
      )
    : [];

  const nextTrack = now ? playlist[(now.trackIdx + 1) % playlist.length] : null;
  const progress  = now ? (offset / now.track.duration) * 100 : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Cargando emisora...</p>
    </div>
  );

  if (!playlist.length) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>📻</div>
      <p style={{ color: 'var(--muted)' }}>La emisora aún no tiene canciones.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          📻 COVERS RADIO
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.15em' }}>EN VIVO</div>
      </div>

      {/* Player card */}
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
            color: now?.track.type === 'commercial' ? '#facc15' : 'var(--accent)',
            background: now?.track.type === 'commercial' ? 'rgba(250,204,21,0.1)' : 'rgba(249,115,22,0.1)',
            border: `1px solid ${now?.track.type === 'commercial' ? 'rgba(250,204,21,0.3)' : 'rgba(249,115,22,0.3)'}`,
            borderRadius: 6, padding: '0.2rem 0.6rem', marginBottom: '1rem',
          }}>
            {now?.track.type === 'commercial' ? '📢 Comercial' : '🎵 Al Aire'}
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.4rem' }}>
            {now?.track.name ?? '—'}
          </h1>
          {now?.track.artist && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{now.track.artist}</p>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ background: 'var(--border)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${progress}%`, transition: 'width 1s linear', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <span>{fmtTime(offset)}</span>
            <span>{now ? fmtTime(now.track.duration) : '–'}</span>
          </div>
        </div>

        {/* Play button */}
        <div style={{ textAlign: 'center', margin: '1.75rem 0' }}>
          {!started ? (
            <button onClick={handleStart} className="btn btn-primary"
              style={{ width: 72, height: 72, borderRadius: '50%', fontSize: '1.8rem', padding: 0,
                boxShadow: '0 0 32px rgba(249,115,22,0.4)' }}>
              ▶
            </button>
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(249,115,22,0.12)',
              border: '2px solid var(--accent)', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.5rem' }}>
              {playing ? '🔊' : '⏳'}
            </div>
          )}
        </div>

        {/* Next up */}
        {nextTrack && (
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '0.75rem 1rem',
            border: '1px solid var(--border)', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              A continuación
            </span>
            <span style={{ fontWeight: 600 }}>{nextTrack.name}</span>
            {nextTrack.artist && <span style={{ color: 'var(--muted)', marginLeft: '0.4rem' }}>— {nextTrack.artist}</span>}
          </div>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />

      <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
        Todos los oyentes escuchan lo mismo al mismo tiempo
      </p>
    </div>
  );
}
