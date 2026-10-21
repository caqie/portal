# Panduan Troubleshooting & Deployment Cloudflare Pages (Vite + React 19)

Panduan ini disusun khusus untuk proyek **Portal SDM DJKI** agar proses build dan deployment di **Cloudflare Pages / Workers & Pages** selalu berhasil secara konsisten, stabil, dan bebas dari kegagalan build (10–16 detik error).

---

## 1. Ringkasan Konfigurasi Build di Dashboard Cloudflare

Buka **Cloudflare Dashboard** > **Workers & Pages** > Pilih proyek **`portalsdm`** > Tab **Settings** > **Builds & deployments** > **Build configurations**:

| Parameter | Nilai yang Benar | Keterangan |
|---|---|---|
| **Framework preset** | `Vite` (atau `None`) | Menghindari preset Create React App yang mencari folder `build` |
| **Build command** | `npm run build` | Menjalankan bundling Vite (`vite build`) |
| **Build output directory** | `dist` | Folder hasil kompilasi Vite |
| **Root directory** | `/` *(kosongkan)* | Root repository |

---

## 2. Variabel Lingkungan (Environment Variables) Wajib

Di menu **Settings** > **Environment variables**, tambahkan variabel berikut pada **Production** dan **Preview**:

```ini
NODE_VERSION=20
NPM_FLAGS=--include=dev
```

### Mengapa Variabel Ini Wajib?
1. **`NODE_VERSION=20`**:
   Cloudflare Pages Build Image v1 secara *default* menggunakan Node 12.18.0 atau Node 16. Proyek ini menggunakan **Vite 6** dan **React 19** yang mensyaratkan Node.js $\ge$ 18.0.0. Tanpa variabel ini, build akan gagal dalam 10–15 detik dengan error `EBADENGINE` atau sintaks ES yang tidak didukung.
2. **`NPM_FLAGS=--include=dev`**:
   Secara *default*, lingkungan produksi mengabaikan `devDependencies`. Menyetel flag ini memastikan seluruh pustaka build selalu terinstal.

---

## 3. Berkas Konfigurasi Otomatis di Repository

Repository ini telah dilengkapi dengan berkas otomatis agar Cloudflare langsung mengenali lingkungan yang tepat:

### A. `.nvmrc` & `.node-version`
Menentukan versi Node.js yang digunakan build runner Cloudflare:
```
20
```

### B. `.npmrc`
Mencegah kegagalan instalasi paket akibat perbedaan *peer dependencies* pada React 19:
```ini
legacy-peer-deps=true
engine-strict=false
auto-install-peers=true
```

### C. `public/_redirects`
Menjamin Single Page Application (SPA) routing bekerja ketika pengguna melakukan refresh halaman atau membuka URL langsung seperti `/pegawai` atau `/dashboard`:
```
/*    /index.html   200
```

---

## 4. Verifikasi `package.json`

Pastikan bagian skrip dan dependensi pada `package.json` memenuhi kriteria berikut:

```json
{
  "name": "portal-sdm-djki",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "start": "node server.ts",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### Checklist Verifikasi `package.json`:
- [x] **Tidak ada `"main": "index.tsx"`**: Entri `"main"` dihapus agar Cloudflare Workers tidak mencoba mengompilasi `index.tsx` sebagai server backend worker.
- [x] **`vite` & `@vitejs/plugin-react` berada di `dependencies`**: Memastikan perintah `vite build` selalu tersedia meskipun runner build menerapkan aturan prune `devDependencies`.
- [x] **Skrip `"build"` murni `"vite build"`**: Tidak menggabungkan perintah yang dapat memicu kegagalan fatal yang tidak perlu saat bundling produksi.

---

## 5. Troubleshooting Masalah Umum di Cloudflare Pages

### ❌ Masalah 1: `Failed 10s - 16s` (Build gagal dalam waktu sangat singkat)
* **Penyebab**: Versi Node.js di Cloudflare masih menggunakan versi lama (< 18), atau `npm ci` gagal akibat peer-dependencies.
* **Solusi**:
  1. Pastikan file `.nvmrc` dan `.npmrc` ada di branch `main`.
  2. Tambahkan `NODE_VERSION=20` di Settings > Environment variables di Cloudflare.

---

### ❌ Masalah 2: `sh: 1: vite: not found`
* **Penyebab**: Cloudflare berjalan dalam mode `NODE_ENV=production` dan tidak menginstal paket `devDependencies`.
* **Solusi**:
  1. Pindahkan `vite` ke `dependencies` (sudah dilakukan di repositori ini).
  2. Tambahkan variabel lingkungan `NPM_FLAGS=--include=dev`.

---

### ❌ Masalah 3: `Directory "build" not found` atau `Deploy error`
* **Penyebab**: Konfigurasi **Build output directory** di Cloudflare keliru diisi `build` (bawaan Create-React-App).
* **Solusi**:
  1. Ubah **Build output directory** menjadi `dist`.
  2. Ubah **Framework preset** menjadi `Vite`.

---

### ❌ Masalah 4: Halaman 404 saat Refresh di Rute Tertentu (`/pegawai`, `/dashboard`)
* **Penyebab**: Web server Cloudflare mencoba mencari file fisik `/pegawai/index.html` yang tidak ada dalam arsitektur React SPA.
* **Solusi**:
  File `public/_redirects` dengan isi `/* /index.html 200` telah ditambahkan di repositori. Cloudflare akan otomatis menyalin file ini ke `dist/_redirects` saat build.

---

## 6. Prosedur Uji Coba Deployment (Trigger Rebuild)

Setelah melakukan perubahan atau memastikan pengaturan di atas:
1. Buka dashboard Cloudflare Pages > tab **Deployments**.
2. Klik tombol **`Manage deployment`** (atau titik tiga pada deployment terakhir) > klik **`Retry deployment`**.
3. Atau tekan **`Create deployment`** baru dari branch `main`.
4. Anda dapat memantau log build secara real-time dengan mengeklik tautan **`Build ↗`**. Build normal akan memakan waktu sekitar **35–50 detik** dan berstatus **Success**.
