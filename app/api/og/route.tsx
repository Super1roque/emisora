import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const ORANGE = '#f97316';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name   = searchParams.get('name')   ?? 'Canción';
  const artist = searchParams.get('artist') ?? '';

  const fontSize = name.length > 32 ? 58 : name.length > 22 ? 70 : 84;

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0d00 50%, #0a0a0a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Orange glow circle behind text */}
        <div style={{
          position: 'absolute',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-250px, -250px)',
          display: 'flex',
        }} />

        {/* Top label */}
        <div style={{
          position: 'absolute', top: 40, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: ORANGE,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            display: 'flex',
          }}>
            COVERS
          </div>
        </div>

        {/* Orange top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
          display: 'flex',
        }} />

        {/* Orange bottom bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
          display: 'flex',
        }} />

        {/* Main content */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0 80px', zIndex: 1, maxWidth: 1200,
        }}>

          {/* Song name */}
          <div style={{
            fontSize,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {name}
          </div>

          {/* Orange divider */}
          <div style={{
            width: 80, height: 4,
            background: ORANGE,
            borderRadius: 2,
            marginTop: 28,
            marginBottom: artist ? 20 : 0,
            display: 'flex',
          }} />

          {/* Artist */}
          {artist && (
            <div style={{
              fontSize: 32, color: ORANGE, fontWeight: 600,
              letterSpacing: '0.05em', display: 'flex',
            }}>
              {artist}
            </div>
          )}
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute', bottom: 28, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 20, color: '#555', letterSpacing: '0.12em',
            display: 'flex', fontFamily: 'monospace',
          }}>
            Tu música · A tu manera
          </div>
        </div>

      </div>
    ),
    { width: 1200, height: 630 },
  );
}
