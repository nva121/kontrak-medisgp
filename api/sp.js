// Vercel Serverless Function — Surat Peringatan
// Compose pesan dari template, forward ke Discord webhook (channel terpisah dari kontrak)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  const webhook = process.env.DISCORD_SP_WEBHOOK_URL;
  if (!webhook) {
    return res.status(500).json({
      error: 'Server belum dikonfigurasi. DISCORD_SP_WEBHOOK_URL belum di-set di Vercel.'
    });
  }

  try {
    const { type, namaP, jabatanP, namaA, jabatanA, alasan, discordId } = req.body || {};

    // Validasi
    if (!['sp1', 'sp2', 'sp3'].includes(type)) {
      return res.status(400).json({ error: 'Tipe surat tidak valid' });
    }
    const required = { namaP, jabatanP, namaA, jabatanA, alasan };
    for (const [k, v] of Object.entries(required)) {
      if (!v || !v.toString().trim()) {
        return res.status(400).json({ error: `Field "${k}" wajib diisi` });
      }
    }
    // Validasi Discord ID — harus snowflake numeric 16-20 digit
    if (!discordId || !/^\d{16,20}$/.test(discordId.toString().trim())) {
      return res.status(400).json({ error: 'Discord ID anggota tidak valid (harus berupa angka 16-20 digit)' });
    }
    const cleanDiscordId = discordId.toString().trim();

    // Tanggal hari ini (format DD/MM/YYYY)
    const t = new Date();
    const wibOffset = 7 * 60; // Asia/Jakarta UTC+7
    const localTime = new Date(t.getTime() + (t.getTimezoneOffset() + wibOffset) * 60000);
    const dd = String(localTime.getDate()).padStart(2, '0');
    const mm = String(localTime.getMonth() + 1).padStart(2, '0');
    const yyyy = localTime.getFullYear();
    const today = `${dd}/${mm}/${yyyy}`;

    // === Compose text per tipe (plain text, no markdown) ===
    let title, body;

    if (type === 'sp1') {
      title = 'SURAT PERINGATAN KE 1';
      body =
`SURAT PERINGATAN KE 1
Tanggal : ${today}

Dengan Hormat,
Saya yang bertanda tangan dibawah ini :

Nama         : ${namaP}
Jabatan      : ${jabatanP}

Medis yang di sebutkan di bawah ini telah MELANGGAR SOP yang sudah berlaku, saya berlakukan surat peringatan 1 terhadap tenaga medis dibawah ini :

Nama         : ${namaA}
Jabatan      : ${jabatanA}
Alasan       : ${alasan}

Demikian Surat Peringatan 1 ini saya sampaikan. Apabila masih ditemukan pelanggaran SOP dalam kurun waktu yang ditentukan, maka akan diberlakukan tindakan tegas berupa Surat Peringatan 2 ataupun 3. Terima kasih.

Regards,
${namaP}`;
    }

    else if (type === 'sp2') {
      title = 'SURAT PERINGATAN KE 2';
      body =
`SURAT PERINGATAN KE 2
Tanggal : ${today}

Dengan Hormat,
Saya yang bertanda tangan dibawah ini :

Nama         : ${namaP}
Jabatan      : ${jabatanP}

Medis yang di sebutkan di bawah ini telah MELANGGAR SOP yang sudah berlaku, saya berlakukan surat peringatan 2 terhadap tenaga medis dibawah ini :

Nama         : ${namaA}
Jabatan      : ${jabatanA}
Alasan       : ${alasan}

Demikian Surat Peringatan 2 ini saya sampaikan. Apabila masih ditemukan pelanggaran SOP dalam kurun waktu yang ditentukan, maka akan diberlakukan tindakan tegas berupa Surat Peringatan 3. Terima kasih.

Regards,
${namaP}`;
    }

    else { // sp3
      title = 'SURAT PEMBERHENTIAN TIDAK DENGAN HORMAT (PTDH) / SP-3';
      body =
`SURAT PEMBERHENTIAN TIDAK DENGAN HORMAT (PTDH) / SURAT PERINGATAN KE 3
Tanggal : ${today}

Dengan Hormat,
Saya yang bertanda tangan di bawah ini :

Nama         : ${namaP}
Jabatan      : ${jabatanP}

Dengan ini menyatakan bahwa tenaga medis yang disebutkan di bawah ini telah melakukan pelanggaran SOP secara berulang dan/atau tidak menunjukkan perbaikan setelah diberikan Surat Peringatan sebelumnya. Oleh karena itu, diberikan Surat Peringatan ke-3 sekaligus Pemberhentian Tidak Dengan Hormat (PTDH) kepada :

Nama         : ${namaA}
Jabatan      : ${jabatanA}
Alasan       : ${alasan}

Diwajibkan untuk ybs segera kerumah sakit untuk mengembalikan kendaraan beserta alat medis dan membayar denda PTDH, jika tidak membayar denda PTDH maka ybs akan diblacklist dari seluruh instansi.

Keputusan ini bersifat final. Terhitung sejak tanggal ditetapkan, yang bersangkutan tidak lagi menjadi bagian dari instansi medis.

Regards,
${namaP}`;
    }

    // Wrap surat di code block (jadi dark box style di Discord),
    // lalu mention di luar code block (biar nge-ping + render @nickname)
    const content = `\`\`\`\n${body}\n\`\`\`\n<@${cleanDiscordId}>`;

    const payload = {
      content,
      allowed_mentions: { users: [cleanDiscordId] }
    };

    const dResp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!dResp.ok) {
      const text = await dResp.text();
      console.error('Discord webhook SP error:', dResp.status, text);
      return res.status(502).json({
        error: `Gagal kirim ke Discord (${dResp.status}). Hubungi developer.`
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('SP submit error:', e);
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan di server' });
  }
}
