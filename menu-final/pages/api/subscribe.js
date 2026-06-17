// pages/api/subscribe.js
// Saves push subscription to Firestore

import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'No subscription' });
    // Use endpoint hash as doc ID
    const id = Buffer.from(subscription.endpoint).toString('base64').slice(-40).replace(/[^a-zA-Z0-9]/g, '');
    await setDoc(doc(db, 'subscriptions', id), { ...subscription, updatedAt: new Date().toISOString() });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
