import { getDb } from '@/lib/firebaseService';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await getDb().collection('emisora_settings').doc('visits').get();
    return Response.json({ count: doc.exists ? (doc.data()?.count ?? 0) : 0 });
  } catch {
    return Response.json({ count: 0 });
  }
}

export async function POST() {
  try {
    const ref = getDb().collection('emisora_settings').doc('visits');
    await ref.set({ count: FieldValue.increment(1) }, { merge: true });
    const doc = await ref.get();
    return Response.json({ count: doc.data()?.count ?? 0 });
  } catch {
    return Response.json({ count: 0 });
  }
}
