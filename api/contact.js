// /api/contact.js
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, message } = req.body || {};
    // Basit validasyon
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.TO_EMAIL;
    const from = process.env.FROM_EMAIL;

    const html = `
      <div style="font-family:system-ui,Arial">
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Message:</b><br/>${escapeHtml(message).replace(/\\n/g,'<br/>')}</p>
        <hr/>
        <small>BDRC website form</small>
      </div>`;

    await resend.emails.send({ from, to, subject: `BDRC Contact — ${name}`, html });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Basit XSS önleme
function escapeHtml(str='') {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}
