import React from 'react';

interface SheetErrorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  errorMessage?: string;
  moduleName?: string;
}

const SheetErrorGuideModal: React.FC<SheetErrorGuideModalProps> = ({
  isOpen,
  onClose,
  title = "Terjadi Gangguan Penyambungan Google Spreadsheet",
  errorMessage = "",
  moduleName = "PEGAWAI"
}) => {
  if (!isOpen) return null;

  const spreadsheetId = localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4';

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
      ></div>
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex flex-col animate-modalEnter border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
          <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center border border-amber-100 shadow-inner shrink-0">
            <i className="bi bi-exclamation-triangle-fill text-3xl animate-pulse"></i>
          </div>
          <div>
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Status Koneksi Terganggu
            </span>
            <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight mt-1">{title}</h3>
          </div>
        </div>

        {/* Error Detail Display */}
        {errorMessage && (
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mb-6">
            <span className="text-[8px] font-black text-amber-600 tracking-wider uppercase block mb-1">Detail Galat Resmi:</span>
            <code className="text-xs font-mono text-amber-900 break-words block">
              "{errorMessage}"
            </code>
          </div>
        )}

        {/* Step-by-Step Instructions */}
        <div className="space-y-6">
          <h4 className="text-[10px] md:text-[11px] font-black text-gray-900 tracking-widest uppercase border-b border-gray-100 pb-2">
            Panduan Mengatasi Gagal Fetch Data (Langkah Cepat)
          </h4>

          {/* Step 1 */}
          <div className="flex gap-4 items-start">
            <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100">
              1
            </div>
            <div className="space-y-1">
              <h5 className="text-[12px] font-black uppercase text-gray-800 tracking-wide">
                Ubah Akses Spreadsheet ke Publik
              </h5>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Buka file Google Sheets Anda. Klik tombol hijau/biru <strong className="text-gray-900">Share (Bagikan)</strong> di bagian kanan atas, lalu ubah akses umum menjadi <strong className="text-blue-600">"Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view)</strong>. Jika dibatasi, sistem tidak bisa mengambil salinan data.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 items-start">
            <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100">
              2
            </div>
            <div className="space-y-1">
              <h5 className="text-[12px] font-black uppercase text-gray-800 tracking-wide">
                Publikasikan Ke Web (Publish to Web sebagai CSV)
              </h5>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Di Google Sheets, klik menu <strong className="text-gray-900">File &gt; Share &gt; Publikasikan ke web (Publish to Web)</strong>. 
                Pilih tab <strong className="text-gray-900">Link (Tautan)</strong>, pilih <strong className="text-gray-900">Seluruh Dokumen (Entire Document)</strong>, 
                dan ubah opsi dropdown disebelahnya menjadi <strong className="text-blue-600">Comma-separated values (.csv)</strong>. 
                Klik tombol <strong className="text-gray-900 font-black">Publish</strong> dan setujui konfirmasi yang muncul.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 items-start">
            <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100">
              3
            </div>
            <div className="space-y-1">
              <h5 className="text-[12px] font-black uppercase text-gray-800 tracking-wide">
                Periksa Kecocokan ID Spreadsheet
              </h5>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Masuk ke menu <strong className="text-gray-900">Pengaturan Administrasi / Settings</strong> di sidebar kiri bawah. Pastikan <strong className="text-gray-900">ID Spreadsheet</strong> yang diinput sama persis dengan kode acak panjang di URL browser lembar dokumen Anda:
                <br />
                <code className="bg-gray-50 px-2 py-1 text-[10px] text-sky-800 select-all font-mono rounded mt-1.5 inline-block break-all">
                  https://docs.google.com/spreadsheets/d/<strong className="text-rose-600 font-extrabold">{spreadsheetId}</strong>/edit
                </code>
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4 items-start">
            <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100">
              4
            </div>
            <div className="space-y-1">
              <h5 className="text-[12px] font-black uppercase text-gray-800 tracking-wide">
                Deploy Google Apps Script Web App (Opsional untuk Edit Data)
              </h5>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Jika Anda ingin melakukan update data secara langsung dari aplikasi ini ke Google Sheet, pastikan URL Apps Script Web App di Pengaturan sudah valid dan ter-deploy dengan akses diatur ke <strong className="text-gray-900">"Anyone" (Siapa saja bahkan anonim)</strong> saat update versi deploy.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-4 bg-sky-50 text-sky-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 text-center flex items-center justify-center gap-2 border border-sky-100"
          >
            <i className="bi bi-box-arrow-up-right"></i> Buka Google Sheet Anda
          </a>
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 text-center flex items-center justify-center"
          >
            Paham & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export default SheetErrorGuideModal;
