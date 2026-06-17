import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const today = new Date().toISOString().slice(0, 10); // "2026-06-17"
  const ref = doc(db, 'stats', today);
  try {
    await setDoc(ref, { views: increment(1), date: today }, { merge: true });
    const snap = await getDoc(ref);
    res.status(200).json({ views: snap.data()?.views || 1 });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
