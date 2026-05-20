import { getDb } from '@/lib/firebaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db  = getDb();
    const doc = await db.collection('emisora_settings').doc('radio').get();
    if (!doc.exists) return Response.json({ commercialInterval: 2, epochMs: Date.now() });
    return Response.json(doc.data());
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const db   = getDb();
    await db.collection('emisora_settings').doc('radio').set(data, { merge: true });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
