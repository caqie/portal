import React from 'react';
import { getPegawaiDisplayInfo, SKPItemRHK, SKPPerilakuItem } from './skpDefaults';
import { Pegawai } from '../../types';

interface PageProps {
  data: any;
  pSubjek?: Pegawai;
  pPenilai?: Pegawai;
}

export const RekamanUmpanBalikPages78: React.FC<PageProps> = ({ data, pSubjek, pPenilai }) => {
  const subjekInfo = getPegawaiDisplayInfo(pSubjek, data.nip);
  const penilaiInfo = getPegawaiDisplayInfo(pPenilai, data.penilaiNip);
  const namaSubjek = data.namaPegawai || subjekInfo.nama;
  const periodeText = data.periodeTeks || `${data.periodeMulai || '01 Oktober'} s.d ${data.periodeSelesai || '31 Desember 2025'}`;

  const hasilKerja: SKPItemRHK[] = Array.isArray(data.hasilKerja) ? data.hasilKerja : [];
  const perilakuKerja: SKPPerilakuItem[] = Array.isArray(data.perilakuKerja) ? data.perilakuKerja : [];

  const rhkUtama = hasilKerja.filter(r => (r.kategori || 'UTAMA').toUpperCase() === 'UTAMA' && (r.rencanaPegawai || r.rencanaPimpinan || r.indikator));
  const rhkTambahan = hasilKerja.filter(r => (r.kategori || '').toUpperCase() === 'TAMBAHAN' && (r.rencanaPegawai || r.rencanaPimpinan || r.indikator));

  // Split perilaku items across Page 7 (items 0-1) and Page 8 (items 2-6)
  const perilakuPage7 = perilakuKerja.slice(0, 2);
  const perilakuPage8 = perilakuKerja.slice(2);

  return (
    <>
      {/* HALAMAN 7: REKAMAN INFORMASI UMPAN BALIK (BAGIAN 1) - LANDSCAPE */}
      <div 
        className="skp-page-item skp-landscape bg-white p-[1cm] text-black font-sans text-[7.5pt] leading-normal flex flex-col mb-8 shadow-sm" 
        data-orientation="landscape"
        style={{ width: '297mm', minHeight: '210mm' }}
      >
        <div>
          {/* Header Title */}
          <div className="text-center mb-3">
            <h1 className="text-[10.5pt] font-bold uppercase tracking-wide leading-tight">
              REKAMAN INFORMASI UMPAN BALIK BERKELANJUTAN
            </h1>
            <h2 className="text-[9pt] font-bold uppercase tracking-wide leading-tight mt-0.5">
              {data.jenisPendekatan || 'PENDEKATAN HASIL KERJA KUANTITATIF'}
            </h2>
            <h3 className="text-[8.5pt] font-bold uppercase tracking-wide leading-tight mt-0.5">
              {data.jenisJabatanKategori || 'BAGI PEJABAT ADMINISTRASI DAN PEJABAT FUNGSIONAL'}
            </h3>
            <p className="text-[8pt] font-bold uppercase mt-1">
              PERIODE : {data.periodeLabel || 'AKHIR'} | {periodeText}
            </p>
          </div>

          {/* Tabel Identitas Pegawai & Penilai */}
          <div className="border border-black mb-2">
            <div className="text-[8pt] font-bold uppercase px-2 py-0.5 border-b border-black">
              KEMENTERIAN HUKUM RI
            </div>
            <table className="w-full border-collapse text-[7.5pt]">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold">
                  <th className="w-8 p-1 border-r border-black text-center align-middle">NO</th>
                  <th className="p-1 border-r border-black text-left align-middle" colSpan={2}>PEGAWAI YANG DINILAI</th>
                  <th className="w-8 p-1 border-r border-black text-center align-middle">NO</th>
                  <th className="p-1 text-left align-middle" colSpan={2}>PEJABAT PENILAI KINERJA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center align-middle">1</td>
                  <td className="w-32 p-1 align-middle">NAMA</td>
                  <td className="p-1 border-r border-black font-bold uppercase align-middle">: {namaSubjek}</td>
                  <td className="p-1 border-r border-black text-center align-middle">1</td>
                  <td className="w-32 p-1 align-middle">NAMA</td>
                  <td className="p-1 font-bold uppercase align-middle">: {penilaiInfo.nama}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center align-middle">2</td>
                  <td className="p-1 align-middle">{subjekInfo.nipLabel}</td>
                  <td className="p-1 border-r border-black align-middle">: {subjekInfo.nip}</td>
                  <td className="p-1 border-r border-black text-center align-middle">2</td>
                  <td className="p-1 align-middle">NIP</td>
                  <td className="p-1 align-middle">: {penilaiInfo.nip}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center align-middle">3</td>
                  <td className="p-1 align-middle">PANGKAT/GOL. RUANG</td>
                  <td className="p-1 border-r border-black uppercase align-middle">: {subjekInfo.pangkatGol}</td>
                  <td className="p-1 border-r border-black text-center align-middle">3</td>
                  <td className="p-1 align-middle">PANGKAT/GOL. RUANG</td>
                  <td className="p-1 uppercase align-middle">: {penilaiInfo.pangkatGol}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center align-middle">4</td>
                  <td className="p-1 align-middle">JABATAN</td>
                  <td className="p-1 border-r border-black uppercase align-middle">: {subjekInfo.jabatan}</td>
                  <td className="p-1 border-r border-black text-center align-middle">4</td>
                  <td className="p-1 align-middle">JABATAN</td>
                  <td className="p-1 uppercase align-middle">: {penilaiInfo.jabatan}</td>
                </tr>
                <tr>
                  <td className="p-1 border-r border-black text-center align-middle">5</td>
                  <td className="p-1 align-middle">UNIT KERJA</td>
                  <td className="p-1 border-r border-black uppercase align-middle">: {subjekInfo.unitKerja}</td>
                  <td className="p-1 border-r border-black text-center align-middle">5</td>
                  <td className="p-1 align-middle">UNIT KERJA</td>
                  <td className="p-1 uppercase align-middle">: {penilaiInfo.unitKerja}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel HASIL KERJA */}
          <div className="border border-black mb-2">
            <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8pt] uppercase text-left">
              HASIL KERJA
            </div>
            <table className="w-full border-collapse text-[7pt] leading-tight">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold text-center">
                  <th className="w-8 py-2 px-1 border-r border-black align-middle">NO<br/>(1)</th>
                  <th className="w-56 py-2 px-1.5 border-r border-black align-middle">RENCANA HASIL KERJA PIMPINAN YANG DIINTERVENSI<br/>(2)</th>
                  <th className="w-56 py-2 px-1.5 border-r border-black align-middle">RENCANA HASIL KERJA<br/>(3)</th>
                  <th className="w-16 py-2 px-1 border-r border-black align-middle">ASPEK<br/>(4)</th>
                  <th className="w-44 py-2 px-1.5 border-r border-black align-middle">INDIKATOR KINERJA INDIVIDU<br/>(5)</th>
                  <th className="w-16 py-2 px-1 border-r border-black align-middle">TARGET<br/>(6)</th>
                  <th className="w-28 py-2 px-1.5 border-r border-black align-middle">REALISASI BERDASARKAN BUKTI DUKUNG<br/>(7)</th>
                  <th className="py-2 px-1.5 border-black align-middle">UMPAN BALIK BERKELANJUTAN BERDASARKAN BUKTI DUKUNG<br/>(8)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50 font-bold border-b border-black">
                  <td className="p-1.5 border-r border-black align-middle" colSpan={8}>A. KINERJA UTAMA</td>
                </tr>
                {rhkUtama.map((row, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="py-1.5 px-1 border-r border-black text-center align-top">{idx + 1}</td>
                    <td className="py-1.5 px-1.5 border-r border-black align-top">{row.rencanaPimpinan}</td>
                    <td className="py-1.5 px-1.5 border-r border-black align-top">{row.rencanaPegawai}</td>
                    <td className="py-1.5 px-1 border-r border-black text-center align-top">{row.aspek}</td>
                    <td className="py-1.5 px-1.5 border-r border-black align-top">{row.indikator}</td>
                    <td className="py-1.5 px-1 border-r border-black text-center align-top">{row.target}</td>
                    <td className="py-1.5 px-1.5 border-r border-black text-center align-top font-semibold">{row.realisasi || row.target}</td>
                    <td className="py-1.5 px-1.5 border-black align-top uppercase">{row.umpanBalik || 'DAPAT DIPERTAHANKAN'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rating Hasil Kerja & Row Perilaku Kerja Bagian 1 */}
          <div className="border border-black mb-2">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-black">
                  <td className="w-48 p-1.5 font-bold bg-[#bdd7ee] border-r border-black uppercase text-[8pt] align-middle">
                    RATING HASIL KERJA*
                  </td>
                  <td className="p-1.5 font-bold uppercase text-[8pt] align-middle">
                    {data.ratingHasilKerja || 'DI ATAS EKSPEKTASI'}
                  </td>
                </tr>
                <tr>
                  <td className="w-48 p-1.5 font-bold bg-[#bdd7ee] border-r border-black uppercase text-[8pt] align-middle">
                    PERILAKU KERJA
                  </td>
                  <td className="p-1.5 font-bold uppercase text-[8pt] align-middle">
                    {data.ratingPerilaku || 'DI ATAS EKSPEKTASI'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Perilaku items 1 & 2 */}
          <div className="border border-black">
            <table className="w-full border-collapse text-[7.2pt]">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold text-center">
                  <th className="p-1.5 border-r border-black text-left w-2/5 align-middle">CORE VALUES BERAKHLAK</th>
                  <th className="p-1.5 border-r border-black text-left w-1/4 align-middle">EKSPEKTASI KHUSUS PIMPINAN</th>
                  <th className="p-1.5 border-black text-left align-middle">UMPAN BALIK BERKELANJUTAN BERDASARKAN BUKTI DUKUNG</th>
                </tr>
              </thead>
              <tbody>
                {perilakuPage7.map((item, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="py-1.5 px-2 border-r border-black align-top">
                      <div className="font-bold mb-0.5">{idx + 1}. {item.poin}</div>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-[6.8pt]">
                        {item.subPoints?.map((sp, sIdx) => (
                          <li key={sIdx}>{sp}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-1.5 px-2 border-r border-black align-top font-medium">
                      {item.ekspektasi || 'Untuk Dapat Dipertahankan'}
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <div className="font-medium text-black">
                        {item.umpanBalik || 'Dapat dipertahankan'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-right text-[7pt] italic text-gray-500 mt-2">
          (Bersambung ke halaman berikutnya)
        </div>
      </div>

      {/* HALAMAN 8: REKAMAN INFORMASI UMPAN BALIK (BAGIAN 2 & TTD) - LANDSCAPE */}
      <div 
        className="skp-page-item skp-landscape bg-white p-[0.9cm] text-black font-sans text-[7.5pt] leading-normal flex flex-col mb-8 shadow-sm" 
        data-orientation="landscape"
        style={{ width: '297mm', minHeight: '210mm' }}
      >
        <div>
          {/* Perilaku items 3 to 7 */}
          <div className="border border-black mb-2">
            <table className="w-full border-collapse text-[7.2pt]">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold text-center">
                  <th className="p-1.5 border-r border-black text-left w-1/3 align-middle">CORE VALUES BERAKHLAK (Lanjutan)</th>
                  <th className="p-1.5 border-r border-black text-left w-1/3 align-middle">EKSPEKTASI KHUSUS PIMPINAN</th>
                  <th className="p-1.5 border-black text-left w-1/3 align-middle">UMPAN BALIK BERKELANJUTAN BERDASARKAN BUKTI DUKUNG</th>
                </tr>
              </thead>
              <tbody>
                {perilakuPage8.map((item, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="py-1.5 px-2 border-r border-black align-top">
                      <div className="font-bold mb-0.5">{idx + 3}. {item.poin}</div>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-[6.5pt]">
                        {item.subPoints?.map((sp, sIdx) => (
                          <li key={sIdx}>{sp}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-1.5 px-2 border-r border-black align-top font-medium text-[7pt]">
                      {item.ekspektasi || 'Untuk Dapat Dipertahankan'}
                    </td>
                    <td className="py-1.5 px-2 align-top text-[7pt]">
                      <div className="font-medium text-black">
                        {item.umpanBalik || 'Dapat dipertahankan'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rating Perilaku Kerja & Predikat Kinerja Pegawai */}
          <div className="border border-black">
            <table className="w-full border-collapse text-[7.5pt]">
              <tbody>
                <tr className="border-b border-black">
                  <td className="w-56 p-1.5 font-bold bg-[#bdd7ee] border-r border-black uppercase align-middle">
                    RATING PERILAKU KERJA*
                  </td>
                  <td className="p-1.5 font-bold uppercase align-middle">
                    {data.ratingPerilaku || 'DI ATAS EKSPEKTASI'}
                  </td>
                </tr>
                <tr>
                  <td className="w-56 p-1.5 font-bold bg-[#bdd7ee] border-r border-black uppercase align-middle">
                    PREDIKAT KINERJA PEGAWAI*
                  </td>
                  <td className="p-1.5 font-bold uppercase align-middle">
                    {data.predikatKinerja || 'SANGAT BAIK'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 text-[8pt] mt-6 pt-2">
          <div className="flex flex-col items-center text-center">
            <p className="mb-10">Pegawai yang Dinilai</p>
            <p className="font-bold uppercase leading-none">{namaSubjek}</p>
            <p className="mt-1 text-[7.5pt]">{subjekInfo.nipLabel} {subjekInfo.nip}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p>{data.kotaTtd || 'Jakarta'}, {data.tglPenilaian || '06 Januari 2026'}</p>
            <p className="mb-10">Pejabat Penilai Kinerja</p>
            <p className="font-bold uppercase leading-none">{penilaiInfo.nama}</p>
            <p className="mt-1 text-[7.5pt]">NIP {penilaiInfo.nip}</p>
          </div>
        </div>
      </div>
    </>
  );
};
