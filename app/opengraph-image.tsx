import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'Covers — Tu música, a tu manera';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0f0f0f', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        {/* music bars decoration */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16 }}>
          {[80, 120, 60, 100, 140, 90, 110].map((h, i) => (
            <div key={i} style={{
              width: 18, height: h, borderRadius: 9,
              background: i % 2 === 0 ? '#f97316' : '#fb923c',
            }} />
          ))}
        </div>

        <div style={{ fontSize: 96, fontWeight: 800, color: '#f97316', letterSpacing: '0.08em', display: 'flex' }}>
          COVERS
        </div>

        <div style={{ fontSize: 36, color: '#888', letterSpacing: '0.05em', display: 'flex' }}>
          Tu música, a tu manera
        </div>
      </div>
    ),
    { ...size },
  );
}
