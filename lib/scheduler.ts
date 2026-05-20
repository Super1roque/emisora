export type Track = {
  id: string;
  name: string;
  artist: string;
  type: 'song' | 'commercial';
  duration: number; // seconds
  url: string;
  order: number;
};

export type RadioSettings = {
  commercialInterval: number; // every N songs insert a commercial
  epochMs: number;            // fixed start timestamp (ms)
};

// Build the broadcast playlist: [song, song, commercial, song, song, commercial, ...]
export function buildPlaylist(songs: Track[], commercials: Track[], interval: number): Track[] {
  if (!songs.length) return [];
  const playlist: Track[] = [];
  let songCount = 0;
  let commIdx   = 0;

  for (const song of songs) {
    playlist.push(song);
    songCount++;
    if (commercials.length && songCount % interval === 0) {
      playlist.push(commercials[commIdx % commercials.length]);
      commIdx++;
    }
  }
  return playlist;
}

export type NowPlaying = {
  track:     Track;
  offsetSec: number; // how many seconds into the track we are
  trackIdx:  number;
  playlist:  Track[];
};

export function getNowPlaying(playlist: Track[], epochMs: number): NowPlaying | null {
  if (!playlist.length) return null;

  const totalDur = playlist.reduce((s, t) => s + t.duration, 0);
  if (totalDur === 0) return null;

  const elapsedMs  = Date.now() - epochMs;
  const elapsedSec = ((elapsedMs % (totalDur * 1000)) / 1000 + totalDur * 1000) % (totalDur * 1000) / 1000;

  let acc = 0;
  for (let i = 0; i < playlist.length; i++) {
    const t = playlist[i];
    if (elapsedSec < acc + t.duration) {
      return { track: t, offsetSec: elapsedSec - acc, trackIdx: i, playlist };
    }
    acc += t.duration;
  }
  // Fallback (rounding edge)
  return { track: playlist[0], offsetSec: 0, trackIdx: 0, playlist };
}
