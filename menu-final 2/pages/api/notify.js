// pages/api/notify.js
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:menu@romantika.bg',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { restaurantName } = req.body || {};

  try {
    const snap = await getDocs(collection(db, 'subscriptions'));
    const payload = JSON.stringify({
      title: '🍽 Ново обедно меню!',
      body: `${restaurantName || 'Ресторантът'} — Менюто за днес е готово!`,
      url: 'https://romantika.vercel.app'
    });

    const results = await Promise.allSettled(
      snap.docs.map(d => webpush.sendNotification(d.data(), payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.status(200).json({ sent, total: snap.docs.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
