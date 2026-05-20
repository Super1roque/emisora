import { getDb, getStorageBucket } from '@/lib/firebaseService';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form     = await req.formData();
    const file     = form.get('file')     as File   | null;
    const name     = form.get('name')     as string | null;
    const artist   = form.get('artist')   as string | null;
    const type     = form.get('type')     as string | null;
    const duration = parseFloat((form.get('duration') as string) || '0');

    if (!file || !name) return Response.json({ error: 'Faltan datos' }, { status: 400 });

    const db     = getDb();
    const bucket = getStorageBucket();

    // Get current max order
    const snap    = await db.collection('emisora_tracks').orderBy('order', 'desc').limit(1).get();
    const maxOrder = snap.empty ? 0 : (snap.docs[0].data().order ?? 0);

    // Upload to Storage
    const ext         = file.name.split('.').pop() || 'mp3';
    const storagePath = `emisora/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileRef     = bucket.file(storagePath);
    const buffer      = Buffer.from(await file.arrayBuffer());

    await fileRef.save(buffer, { contentType: file.type || 'audio/mpeg' });
    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Save metadata to Firestore
    const docRef = await db.collection('emisora_tracks').add({
      name:     name.trim(),
      artist:   (artist || '').trim(),
      type:     type === 'commercial' ? 'commercial' : 'song',
      duration,
      url,
      storagePath,
      order:     maxOrder + 1,
      active:    true,
      createdAt: new Date().toISOString(),
    });

    return Response.json({ id: docRef.id, url });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
