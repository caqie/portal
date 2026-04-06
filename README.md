# Portal SDM DJKI - CAT System
Dibuat oleh: **CaqieStudio**

## Deskripsi Aplikasi
Portal SDM DJKI adalah platform manajemen sumber daya manusia yang terintegrasi dengan sistem **Computer Assisted Test (CAT)** untuk pelaksanaan Uji Kompetensi (UKOM) Pegawai. Aplikasi ini dirancang untuk memudahkan administrasi data pegawai, manajemen sesi ujian, dan pelaksanaan ujian secara real-time dengan transparansi tinggi.

### Fitur Utama:
- **Dashboard SDM**: Monitoring data pegawai, statistik, dan status sistem.
- **Manajemen Pegawai**: Pengelolaan data NIP, jabatan, dan unit kerja.
- **CAT System (Portal Ujian)**: Sistem ujian online yang aman dengan fitur pengawasan (Supervisor).
- **Integrasi Google Sheets**: Seluruh data disimpan dan dikelola melalui Google Sheets sebagai database yang fleksibel.
- **Mode Ujian Terisolasi**: Jalur khusus untuk peserta ujian guna mencegah akses ke data sensitif SDM.

## Tutorial Penggunaan

### 1. Persiapan Database (Google Sheets)
Aplikasi ini menggunakan Google Sheets sebagai backend. Pastikan Anda telah menyiapkan spreadsheet dengan sheet berikut:
- `Users`: Data admin/editor portal.
- `PesertaUkom`: Daftar peserta ujian kompetensi.
- `SoalUkom`: Bank soal ujian.
- `SesiUkom`: Pengaturan jadwal dan sesi ujian.
- `HasilUkom`: Tempat penyimpanan nilai peserta.
- `SystemConfig`: Pengaturan maintenance dan akses halaman.

### 2. Login Admin/Editor
- Buka URL utama aplikasi.
- Masukkan NIP dan Password Admin yang terdaftar di sheet `Users`.
- Di Dashboard, Anda dapat mengelola data pegawai dan memantau status sistem.

### 3. Pelaksanaan Ujian (Mode Peserta)
- Berikan URL khusus kepada peserta: `https://portalsdm.caqiestudio.my.id/ukomdjki`.
- Peserta login menggunakan **Nomor Peserta/NIP** dan **Password** (atau Tanggal Lahir format YYYY-MM-DD).
- Setelah login, peserta akan diarahkan ke Dashboard Ujian untuk membaca instruksi sebelum memulai tes.

### 4. Pengawasan Ujian (Mode Supervisor)
- Pengawas login melalui Portal Ujian dengan memilih mode "Pengawas".
- Pengawas dapat memantau status peserta (Sedang Mengerjakan, Selesai, atau Terkunci).
- Pengawas memiliki wewenang untuk membuka kunci akun peserta jika terjadi pelanggaran atau kendala teknis.

### 5. Pengaturan Sistem
- Gunakan menu **Pengaturan** di Dashboard utama untuk mengaktifkan mode maintenance atau membatasi akses halaman tertentu.

---
&copy; 2026 **CaqieStudio**. Seluruh hak cipta dilindungi.
