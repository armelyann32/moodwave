// Relais (serverless Vercel) vers l'API iTunes d'Apple.
// Pourquoi ? Sur iPhone, Apple redirige les recherches vers l'application Musique
// au lieu de renvoyer les résultats. En passant par notre serveur, la réponse
// arrive toujours en JSON, quel que soit l'appareil.
const ALLOWED = ['term', 'id', 'entity', 'media', 'limit', 'country'];

export default async function handler(req, res) {
  const type = req.query.type === 'lookup' ? 'lookup' : 'search';
  const params = new URLSearchParams();
  for (const key of ALLOWED) {
    if (req.query[key]) params.set(key, String(req.query[key]).slice(0, 300));
  }
  if (!params.get('country')) params.set('country', 'FR');
  try {
    const r = await fetch(`https://itunes.apple.com/${type}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MOODWAVE/1.0', Accept: 'application/json' },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'itunes_unavailable', message: String(err.message || err) });
  }
}
