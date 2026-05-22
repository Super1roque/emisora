import type { Metadata } from 'next';
import { getDb } from '@/lib/firebaseService';
import ClientRedirect from './ClientRedirect';

interface Props {
  params: Promise<{ id: string }>;
}

async function getTrack(id: string) {
  try {
    const doc = await getDb().collection('emisora_tracks').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as { name: string; artist?: string };
  } catch {
    return null;
  }
}

function cleanName(name: string) {
  return name
    .replace(/\d{4}\s\d{4}/g, '')
    .replace(/\d{8}/g, '')
    .replace(/recortado/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const track = await getTrack(id);

  const name   = track ? cleanName(track.name)       : 'Covers';
  const artist = track ? (track.artist ?? '')         : '';
  const title  = artist ? `${name} — ${artist}`       : name;
  const desc   = artist
    ? `Escucha "${name}" de ${artist} en Covers`
    : `Escucha "${name}" en Covers`;

  const ogImage = `/api/og?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export default async function SongPage({ params }: Props) {
  const { id } = await params;
  return <ClientRedirect id={id} />;
}
