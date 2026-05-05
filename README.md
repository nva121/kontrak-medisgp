# Formulir Kontrak Kerja Medis — RP

Web form yang bisa diisi anggota medis sendiri, di-tanda tangani digital, lalu otomatis dikirim ke channel Discord sebagai foto kontrak.

## Alur Kerja

```
┌───────────────────────┐    ┌────────────────────────┐    ┌─────────────────────────┐
│  1. Petinggi share    │ -> │  2. Anggota isi data,  │ -> │  3. Foto kontrak masuk  │
│     link form         │    │     baca, tanda tangan │    │     ke channel Discord  │
└───────────────────────┘    │     & klik kirim       │    └────────────┬────────────┘
                             └────────────────────────┘                 │
                                                                        v
                                                          ┌──────────────────────────┐
                                                          │  4. Petinggi salin URL   │
                                                          │     foto Discord, paste  │
                                                          │     ke printer in-game   │
                                                          └──────────────────────────┘
```

## Struktur File

```
.
├── index.html       # form + kontrak + signature + submit (frontend)
├── api/
│   └── submit.js    # serverless function: forward ke Discord (backend)
└── README.md        # dokumentasi ini
```

## Setup

### Step 1 — Bikin Discord Webhook

1. Di Discord, buka channel tempat lo mau kontrak masuk
2. Klik ikon ⚙️ (Edit Channel) → **Integrations** → **Webhooks** → **New Webhook**
3. Kasih nama (misal: "Sistem Kontrak"), pilih channel, **copy Webhook URL**
4. Simpan URL ini, nanti dipakai di Vercel

### Step 2 — Deploy ke Vercel

**Cara paling cepet (drag & drop):**

1. Buka https://vercel.com, sign up
2. Dashboard → **Add New** → **Project**
3. Drag folder yang isinya `index.html` + `api/` ke jendela Vercel
4. **PENTING:** sebelum klik Deploy, scroll ke **Environment Variables**
5. Tambahkan:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: paste URL webhook dari Step 1
6. Klik **Deploy**
7. Tunggu ~30 detik, dapet link `https://nama-project.vercel.app`

**Atau pake Vercel CLI:**

```bash
npm i -g vercel
cd folder-project
vercel env add DISCORD_WEBHOOK_URL    # paste webhook URL pas diminta
vercel --prod
```

### Step 3 — Test

1. Buka link Vercel-nya
2. Isi form pakai data dummy
3. Klik tanda tangan → klik kirim
4. Cek channel Discord — harusnya muncul embed + foto kontrak

## URL Parameter (Optional)

Petinggi bisa kustomisasi nama RS & nomor surat lewat URL:

```
https://link-lo.vercel.app/?rs=Rumah Sakit Pusat Kota&nomor=042/SPK/V/2026
```

| Param | Default | Fungsi |
|-------|---------|--------|
| `rs` | `Rumah Sakit Pusat Kota` | Nama rumah sakit |
| `nomor` | `001/SPK/RSPK/V/2026` | Nomor surat |
| `stamp` | (auto dari `rs`) | Tulisan di stempel bulat |

Kalau gak di-set, pake default. Lo juga bisa edit default-nya langsung di file `index.html` (cari baris `params.get('rs')`).

## Cara Print Foto di Game

1. Anggota selesai submit kontrak
2. Discord channel auto-receive foto kontrak
3. Petinggi klik kanan foto → **Copy Link** (atau **Copy Image Address**)
4. Buka printer in-game, paste URL-nya
5. Print

> **Tip**: foto Discord CDN URL bentuknya `https://cdn.discordapp.com/attachments/...` — printer in-game biasanya support format ini langsung. Kalau printer tertentu butuh URL yang berakhiran `.png`, Discord URL biasanya udah memenuhi syarat.

## Kustomisasi

### Ganti pasal-pasal kontrak
Edit `index.html`, cari bagian `<!-- PASAL X -->`. Setiap pasal dipisah jelas, gampang ditambah/dikurangin.

### Ganti font tanda tangan
Di file `index.html`, cari `--signature: 'Sacramento'`. Ganti pake font Google lain kayak:
- `Allison` — modern signature
- `Mrs Saint Delafield` — formal classic
- `Great Vibes` — flourished
- `Homemade Apple` — handwritten casual

Jangan lupa update juga link Google Fonts di `<head>`.

### Ganti warna logo / accent
Di CSS (top of `index.html`), ubah variable:
- `--accent: #8b1a1a` — warna merah (logo, stempel, accent)
- `--gold: #b89b6a` — warna emas (eyebrow, accent dark theme)

### Ganti logo salib jadi gambar
Cari `<div class="crest"></div>` di body. Ganti jadi:
```html
<div class="crest"><img src="https://link-logo-lo.png" style="width:100%;height:100%;border-radius:50%;"></div>
```
Dan hapus aturan CSS `.crest::before`, `.crest::after`.

## Troubleshooting

**Status "Server belum dikonfigurasi"**
→ `DISCORD_WEBHOOK_URL` belum di-set di Vercel. Settings → Environment Variables. Setelah set, **redeploy** project (Deployments → tab terakhir → ⋯ → Redeploy).

**Status "Gagal kirim ke Discord"**
→ Cek webhook URL bener gak. Coba test webhook langsung pake curl:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"content":"test"}' WEBHOOK_URL_LO
```

**Foto kontrak ke-crop / kepotong**
→ Refresh halaman, pastikan font Google udah load semua sebelum klik kirim.

**Tanda tangan gak muncul di foto**
→ Tunggu 1-2 detik setelah klik tanda tangan sebelum klik kirim. Browser butuh waktu render font Sacramento.

## Keamanan (Catatan RP)

- Webhook URL gak terexpose di frontend, aman dari spam langsung.
- Tapi `/api/submit` endpoint masih bisa di-spam orang yang tau URL-nya. Untuk RP biasa gak masalah — kalo ada masalah, regenerate webhook di Discord (lama langsung mati).
- Anggota bisa technically inspect element & ganti data sebelum submit. Karena ini RP, trust-based aja. Foto yang dihasilkan tetep yang ke-render terakhir di browser, jadi data yang muncul di foto = data yang submit ke Discord.
