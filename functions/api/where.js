// Cloudflare Pages Function used by /admin: returns the visitor's region as Cloudflare already resolves it for the request.
// Nothing is logged or stored.
const NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
export function onRequest({ request }) {
  const cf = request.cf || {};
  let country = cf.country || '';
  try { if (country) country = NAMES.of(country) || country; } catch (e) { }
  return new Response(JSON.stringify({ region: cf.region || '', country }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
