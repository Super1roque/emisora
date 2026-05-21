import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'Covers — Tu música, a tu manera';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

const P = 22; // tamaño de cada "pixel"

// Pixel art: nota musical (corchea)
const NOTE: [number, number][] = [
  // tallo vertical
  [3,0],[3,1],[3,2],[3,3],[3,4],[3,5],
  // bandera
  [4,0],[5,0],[6,0],[7,0],
  [7,1],[6,1],
  [7,2],[6,2],[5,2],
  [6,3],[5,3],
  // cabeza de nota (óvalo relleno)
  [1,6],[2,6],[3,6],
  [0,7],[1,7],[2,7],[3,7],[4,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],
  [1,9],[2,9],[3,9],
];

// Alturas de las barras del ecualizador (en unidades de P)
const EQ = [5, 9, 6, 13, 8, 11, 4, 14, 7, 10, 5, 12, 9, 6, 11, 8, 13, 5, 9, 7];

const ORANGE  = '#f97316';
const ORANGE2 = '#fb923c';
const DIM     = '#2a1a0a';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0a', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* ── Fondo: cuadrícula pixel ── */}
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

        {/* ── Ecualizador izquierdo ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 40, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {EQ.map((h, i) => (
            <div key={i} style={{
              width: 18, height: h * P,
              background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? ORANGE2 : DIM,
              borderRadius: '4px 4px 0 0',
              opacity: 0.7,
            }} />
          ))}
        </div>

        {/* ── Ecualizador derecho ── */}
        <div style={{ position: 'absolute', bottom: 0, right: 40, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {[...EQ].reverse().map((h, i) => (
            <div key={i} style={{
              width: 18, height: h * P,
              background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? ORANGE2 : DIM,
              borderRadius: '4px 4px 0 0',
              opacity: 0.7,
            }} />
          ))}
        </div>

        {/* ── Nota pixel art izquierda ── */}
        <div style={{ position: 'absolute', left: 520, top: 60, display: 'flex' }}>
          {NOTE.map(([x, y], i) => (
            <div key={i} style={{
              position: 'absolute',
              left: x * P, top: y * P,
              width: P - 2, height: P - 2,
              background: ORANGE,
              boxShadow: `0 0 8px ${ORANGE}`,
            }} />
          ))}
        </div>

        {/* ── Nota pixel art derecha (más pequeña, decorativa) ── */}
        <div style={{ position: 'absolute', right: 160, top: 40, display: 'flex', opacity: 0.4 }}>
          {NOTE.map(([x, y], i) => (
            <div key={i} style={{
              position: 'absolute',
              left: x * 12, top: y * 12,
              width: 10, height: 10,
              background: ORANGE2,
            }} />
          ))}
        </div>

        {/* ── Contenido central ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          zIndex: 10, marginTop: -40,
        }}>
          {/* Título enorme */}
          <div style={{
            fontSize: 200, fontWeight: 900, color: ORANGE,
            letterSpacing: '-0.03em', lineHeight: 0.9,
            textShadow: `0 0 60px ${ORANGE}88, 0 0 120px ${ORANGE}44`,
            fontFamily: 'sans-serif',
            display: 'flex',
          }}>
            COVERS
          </div>

          {/* Separador pixel */}
          <div style={{ display: 'flex', gap: 8, margin: '24px 0 20px' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                width: 12, height: 12,
                background: i % 2 === 0 ? ORANGE : ORANGE2,
                opacity: i % 3 === 0 ? 1 : 0.4,
              }} />
            ))}
          </div>

          {/* Subtítulo */}
          <div style={{
            fontSize: 38, color: '#aaa', letterSpacing: '0.18em',
            fontFamily: 'monospace', display: 'flex', textTransform: 'uppercase',
          }}>
            Tu música · A tu manera
          </div>
        </div>

      </div>
    ),
    { ...size },
  );
}
