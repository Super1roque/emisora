'use client';
import { useEffect } from 'react';

export default function ClientRedirect({ id }: { id: string }) {
  useEffect(() => {
    window.location.replace(`/?song=${id}`);
  }, [id]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', color: '#f97316', fontFamily: 'monospace', fontSize: '1.1rem',
    }}>
      🎵 Cargando canción...
    </div>
  );
}
