import { getDb } from '@/lib/firebaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db   = getDb();
    const snap = await db.collection('emisora_tracks').orderBy('order').get();
    const tracks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return Response.json(tracks);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const db = getDb();
    await db.collection('emisora_tracks').doc(id).delete();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...data } = await req.json();
    const db = getDb();
    await db.collection('emisora_tracks').doc(id).update(data);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
