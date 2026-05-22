import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const ORANGE  = '#f97316';
const ORANGE2 = '#fb923c';

const P = 20;

const NOTE: [number, number][] = [
  [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],
  [4,0],[5,0],[6,0],[7,0],
  [7,1],[6,1],
  [7,2],[6,2],[5,2],
  [6,3],[5,3],
  [1,6],[2,6],[3,6],
  [0,7],[1,7],[2,7],[3,7],[4,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],
  [1,9],[2,9],[3,9],
];

const EQ = [4, 7, 5, 10, 6, 9, 3, 11, 5, 8, 4, 9, 7, 5, 8, 6, 10, 4, 7, 5];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name   = searchParams.get('name')   ?? 'Canción';
  const artist = searchParams.get('artist') ?? '';

  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0a', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}>

        {/* Grid background */}
        {Array.from({ length: 40 }).map((_, col) =>
          Array.from({ length: 21 }).map((_, row) => (
            <div key={`g-${col}-${row}`} style={{
              position: 'absolute',
              left: col * 30, top: row * 30,
              width: 29, height: 29,
              background: (col + row) % 7 === 0 ? '#111' : 'transparent',
            }} />
          ))
        )}

        {/* EQ bars left */}
        <div style={{ position: 'absolute', bottom: 0, left: 30, display: 'flex', alignItems: 'flex-end', gap: 5 }}>
          {EQ.map((h, i) => (
            <div key={i} style={{
              width: 16, height: h * P,
              background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? ORANGE2 : '#2a1a0a',
              borderRadius: '3px 3px 0 0',
              opacity: 0.6,
            }} />
          ))}
        </div>

        {/* EQ bars right */}
        <div style={{ position: 'absolute', bottom: 0, right: 30, display: 'flex', alignItems: 'flex-end', gap: 5 }}>
          {[...EQ].reverse().map((h, i) => (
            <div key={i} style={{
              width: 16, height: h * P,
              background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? ORANGE2 : '#2a1a0a',
              borderRadius: '3px 3px 0 0',
              opacity: 0.6,
            }} />
          ))}
        </div>

        {/* Pixel note top-left */}
        <div style={{ position: 'absolute', left: 48, top: 40, display: 'flex' }}>
          {NOTE.map(([x, y], i) => (
            <div key={i} style={{
              position: 'absolute',
              left: x * P, top: y * P,
              width: P - 2, height: P - 2,
              background: ORANGE,
              boxShadow: `0 0 6px ${ORANGE}`,
            }} />
          ))}
        </div>

        {/* Central content */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          zIndex: 10, padding: '0 160px', maxWidth: 1200, marginTop: -20,
        }}>

          {/* COVERS label */}
          <div style={{
            fontSize: 28, fontWeight: 700, color: ORANGE2,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            display: 'flex', marginBottom: 24,
          }}>
            COVERS
          </div>

          {/* Song name */}
          <div style={{
            fontSize: name.length > 30 ? 62 : name.length > 20 ? 74 : 88,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            textAlign: 'center',
            textShadow: `0 0 40px rgba(255,255,255,0.15)`,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            wordBreak: 'break-word',
          }}>
            {name}
          </div>

          {/* Artist */}
          {artist && (
            <div style={{
              fontSize: 36, color: ORANGE, fontWeight: 600,
              marginTop: 20, letterSpacing: '0.04em',
              display: 'flex',
            }}>
              {artist}
            </div>
          )}

          {/* Pixel separator */}
          <div style={{ display: 'flex', gap: 7, marginTop: 28 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10,
                background: i % 2 === 0 ? ORANGE : ORANGE2,
                opacity: i % 3 === 0 ? 1 : 0.4,
              }} />
            ))}
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 26, color: '#888', marginTop: 18,
            letterSpacing: '0.1em', display: 'flex',
            fontFamily: 'monospace',
          }}>
            Tu música · A tu manera
          </div>
        </div>

      </div>
    ),
    { width: 1200, height: 630 },
  );
}
