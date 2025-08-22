// /api/contact.js
import { Resend } from 'resend';

// ---- helpers ----
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Some runtimes may not populate req.body; read from stream just in case.
async function readJson(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// For production, restrict to your site domain:
const ALLOW_ORIGIN = '*'; // e.g. 'https://biodynamicscenter.com'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, message, website } = await readJson(req); // website = honeypot

    // Honeypot: if filled, silently succeed to deter bots
    if (website) {
      return res.status(200).json({ ok: true });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const { RESEND_API_KEY, TO_EMAIL, FROM_EMAIL } = process.env;
    if (!RESEND_API_KEY || !TO_EMAIL || !FROM_EMAIL) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    const resend = new Resend(RESEND_API_KEY);

    const html = `
      <div style="font-family:system-ui,Arial">
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g,'<br/>')}</p>
        <hr/>
        <small>BDRC website form</small>
      </div>`;

    const send = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: `BDRC Contact — ${name}`,
      reply_to: email,
      html
    });

    if (send?.error) {
      return res.status(502).json({ error: String(send.error) });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact] error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}