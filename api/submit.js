// Vercel Serverless Function
// Menerima image (base64) + data dari frontend, lalu forward ke Discord webhook.
// Webhook URL disimpan sebagai environment variable supaya gak exposed di kode.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // image bisa cukup besar, terutama dengan scale: 2
    }
  }
};

export default async function handler(req, res) {
  // CORS — kalau ada yang akses dari domain lain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return res.status(500).json({
      error: 'Server belum dikonfigurasi. Hubungi petinggi (DISCORD_WEBHOOK_URL belum di-set di Vercel).'
    });
  }

  try {
    const { image, data } = req.body || {};

    if (!image || !data) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    // Validasi minimal field
    const required = ['nama', 'ttl', 'nohp', 'cid', 'jabatan'];
    for (const f of required) {
      if (!data[f]) return res.status(400).json({ error: `Field "${f}" wajib diisi` });
    }

    // Convert base64 ke buffer
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // Validasi ukuran (Discord limit ~25MB tapi kita batas lebih ketat)
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Ukuran gambar terlalu besar' });
    }

    // Bangun Discord embed
    const payload = {
      content: `📋 **Kontrak Kerja Baru** dari **${data.nama}**`,
      embeds: [{
        title: 'Surat Perjanjian Kontrak Kerja - Tenaga Medis',
        description: `**${data.nama}** (${data.jabatan}) telah menandatangani kontrak kerja.`,
        color: 0x8b1a1a,
        fields: [
          { name: 'Nama Lengkap', value: data.nama || '-', inline: false },
          { name: 'Tempat, Tgl Lahir', value: data.ttl || '-', inline: true },
          { name: 'No. Telepon', value: data.nohp || '-', inline: true },
          { name: 'CID', value: data.cid || '-', inline: true },
          { name: 'Jabatan', value: data.jabatan || '-', inline: true },
          { name: 'Nomor Surat', value: data.nomor || '-', inline: true },
          { name: 'Tanggal', value: data.tanggal || '-', inline: true }
        ],
        image: { url: 'attachment://kontrak.png' },
        footer: {
          text: `${data.rs || 'Rumah Sakit'} • Sistem Kontrak Otomatis`
        },
        timestamp: new Date().toISOString()
      }]
    };

    // Kirim ke Discord pakai multipart form data
    const form = new FormData();
    form.append('payload_json', JSON.stringify(payload));
    form.append(
      'files[0]',
      new Blob([buffer], { type: 'image/png' }),
      `kontrak-${data.cid || 'anon'}-${Date.now()}.png`
    );

    const dResp = await fetch(webhook, {
      method: 'POST',
      body: form
    });

    if (!dResp.ok) {
      const text = await dResp.text();
      console.error('Discord webhook error:', dResp.status, text);
      return res.status(502).json({
        error: `Gagal kirim ke Discord (${dResp.status}). Hubungi petinggi.`
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Submit error:', e);
    return res.status(500).json({
      error: e.message || 'Terjadi kesalahan di server'
    });
  }
}
