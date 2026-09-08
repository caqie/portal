import React from 'react';
import { getPegawaiDisplayInfo, SKPItemRHK, SKPPerilakuItem } from './skpDefaults';
import { Pegawai } from '../../types';

interface PageProps {
  data: any;
  pSubjek?: Pegawai;
  pPenilai?: Pegawai;
}

export const SasaranKinerjaPages34: React.FC<PageProps> = ({ data, pSubjek, pPenilai }) => {
  const subjekInfo = getPegawaiDisplayInfo(pSubjek, data.nip);
  const penilaiInfo = getPegawaiDisplayInfo(pPenilai, data.penilaiNip);
  const namaSubjek = data.namaPegawai || subjekInfo.nama;
  const periodeText = data.periodeTeks || `${data.periodeMulai || '01 Oktober'} s.d ${data.periodeSelesai || '31 Desember 2025'}`;

  const hasilKerja: SKPItemRHK[] = Array.isArray(data.hasilKerja) ? data.hasilKerja : [];
  const perilakuKerja: SKPPerilakuItem[] = Array.isArray(data.perilakuKerja) ? data.perilakuKerja : [];

  const rhkUtama = hasilKerja.filter(r => (r.kategori || 'UTAMA').toUpperCase() === 'UTAMA');
  const rhkTambahan = hasilKerja.filter(r => (r.kategori || '').toUpperCase() === 'TAMBAHAN');

  return (
    <>
      {/* HALAMAN 3: SASARAN KINERJA PEGAWAI (HASIL KERJA) */}
      <div className="skp-page-item bg-white p-[1.2cm] text-black font-sans text-[8pt] leading-normal flex flex-col justify-between mb-8 shadow-sm" style={{ width: '210mm', minHeight: '297mm' }}>
        <div>
          {/* Header Title */}
          <div className="text-center mb-5">
            <h1 className="text-[11pt] font-bold uppercase tracking-wide">
              SASARAN KINERJA PEGAWAI
            </h1>
            <h2 className="text-[9pt] font-bold uppercase tracking-wide">
              {data.jenisPendekatan || 'PENDEKATAN HASIL KERJA KUANTITATIF'}
            </h2>
            <h3 className="text-[8.5pt] font-bold uppercase tracking-wide">
              {data.jenisJabatanKategori || 'BAGI JABATAN FUNGSIONAL UMUM'}
            </h3>
            <p className="text-[8pt] font-bold uppercase mt-1">
              PERIODE PENILAIAN : {periodeText}
            </p>
          </div>

          {/* Tabel Identitas Pegawai & Penilai */}
          <div className="border border-black mb-4">
            <div className="text-[8pt] font-bold uppercase px-2 py-0.5 border-b border-black">
              KEMENTERIAN HUKUM RI
            </div>
            <table className="w-full border-collapse text-[7.5pt]">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold">
                  <th className="w-6 p-1 border-r border-black text-center">NO</th>
                  <th className="p-1 border-r border-black text-left" colSpan={2}>PEGAWAI YANG DINILAI</th>
                  <th className="w-6 p-1 border-r border-black text-center">NO</th>
                  <th className="p-1 text-left" colSpan={2}>PEJABAT PENILAI KINERJA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center">1</td>
                  <td className="w-24 p-1">NAMA</td>
                  <td className="p-1 border-r border-black font-bold uppercase">: {namaSubjek}</td>
                  <td className="p-1 border-r border-black text-center">1</td>
                  <td className="w-24 p-1">NAMA</td>
                  <td className="p-1 font-bold uppercase">: {penilaiInfo.nama}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center">2</td>
                  <td className="p-1">{subjekInfo.nipLabel}</td>
                  <td className="p-1 border-r border-black">: {subjekInfo.nip}</td>
                  <td className="p-1 border-r border-black text-center">2</td>
                  <td className="p-1">NIP</td>
                  <td className="p-1">: {penilaiInfo.nip}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center">3</td>
                  <td className="p-1">PANGKAT/GOL. RUANG</td>
                  <td className="p-1 border-r border-black uppercase">: {subjekInfo.pangkatGol}</td>
                  <td className="p-1 border-r border-black text-center">3</td>
                  <td className="p-1">PANGKAT/GOL. RUANG</td>
                  <td className="p-1 uppercase">: {penilaiInfo.pangkatGol}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 border-r border-black text-center">4</td>
                  <td className="p-1">JABATAN</td>
                  <td className="p-1 border-r border-black uppercase">: {subjekInfo.jabatan}</td>
                  <td className="p-1 border-r border-black text-center">4</td>
                  <td className="p-1">JABATAN</td>
                  <td className="p-1 uppercase">: {penilaiInfo.jabatan}</td>
                </tr>
                <tr>
                  <td className="p-1 border-r border-black text-center">5</td>
                  <td className="p-1">UNIT KERJA</td>
                  <td className="p-1 border-r border-black uppercase">: {subjekInfo.unitKerja}</td>
                  <td className="p-1 border-r border-black text-center">5</td>
                  <td className="p-1">UNIT KERJA</td>
                  <td className="p-1 uppercase">: {penilaiInfo.unitKerja}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel HASIL KERJA */}
          <div className="border border-black">
            <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8pt] uppercase text-left">
              HASIL KERJA
            </div>
            <table className="w-full border-collapse text-[7pt] leading-tight">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold text-center">
                  <th className="w-6 p-1 border-r border-black">NO<br/>(1)</th>
                  <th className="w-48 p-1 border-r border-black">RENCANA HASIL KERJA ATASAN YANG DIINTERVENSI<br/>(2)</th>
                  <th className="w-48 p-1 border-r border-black">RENCANA HASIL KERJA<br/>(3)</th>
                  <th className="w-16 p-1 border-r border-black">ASPEK<br/>(4)</th>
                  <th className="p-1 border-r border-black">INDIKATOR KINERJA INDIVIDU<br/>(5)</th>
                  <th className="w-16 p-1 border-black">TARGET<br/>(6)</th>
                </tr>
              </thead>
              <tbody>
                {/* A. UTAMA */}
                <tr className="bg-gray-50 font-bold border-b border-black">
                  <td className="p-1 border-r border-black" colSpan={6}>A. UTAMA</td>
                </tr>
                {rhkUtama.length > 0 ? (
                  rhkUtama.map((row, idx) => (
                    <tr key={idx} className="border-b border-black">
                      <td className="p-1 border-r border-black text-center align-top">{idx + 1}</td>
                      <td className="p-1 border-r border-black align-top">{row.rencanaPimpinan}</td>
                      <td className="p-1 border-r border-black align-top">{row.rencanaPegawai}</td>
                      <td className="p-1 border-r border-black text-center align-top">{row.aspek}</td>
                      <td className="p-1 border-r border-black align-top">{row.indikator}</td>
                      <td className="p-1 border-black text-center align-top">{row.target}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-black">
                    <td className="p-1 border-r border-black text-center">1</td>
                    <td className="p-1 border-r border-black">-</td>
                    <td className="p-1 border-r border-black">-</td>
                    <td className="p-1 border-r border-black text-center">-</td>
                    <td className="p-1 border-r border-black">-</td>
                    <td className="p-1 border-black text-center">-</td>
                  </tr>
                )}

                {/* B. TAMBAHAN (If Any) */}
                {rhkTambahan.length > 0 && (
                  <>
                    <tr className="bg-gray-50 font-bold border-b border-black">
                      <td className="p-1 border-r border-black" colSpan={6}>B. TAMBAHAN</td>
                    </tr>
                    {rhkTambahan.map((row, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="p-1 border-r border-black text-center align-top">{idx + 1}</td>
                        <td className="p-1 border-r border-black align-top">{row.rencanaPimpinan}</td>
                        <td className="p-1 border-r border-black align-top">{row.rencanaPegawai}</td>
                        <td className="p-1 border-r border-black text-center align-top">{row.aspek}</td>
                        <td className="p-1 border-r border-black align-top">{row.indikator}</td>
                        <td className="p-1 border-black text-center align-top">{row.target}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-right text-[7pt] italic text-gray-500 mt-2">
          (Bersambung ke halaman berikutnya)
        </div>
      </div>

      {/* HALAMAN 4: SASARAN KINERJA PEGAWAI (PERILAKU KERJA & TTD) */}
      <div className="skp-page-item bg-white p-[1.2cm] text-black font-sans text-[8pt] leading-normal flex flex-col justify-between mb-8 shadow-sm" style={{ width: '210mm', minHeight: '297mm' }}>
        <div>
          {/* Header Title / Context */}
          <div className="border border-black">
            <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8pt] uppercase text-left">
              PERILAKU KERJA
            </div>
            <table className="w-full border-collapse text-[7.5pt]">
              <thead>
                <tr className="bg-[#bdd7ee] border-b border-black font-bold text-center">
                  <th className="p-1.5 border-r border-black text-left w-3/5">PERILAKU KERJA</th>
                  <th className="p-1.5 border-black text-left">EKSPEKTASI KHUSUS PIMPINAN</th>
                </tr>
              </thead>
              <tbody>
                {perilakuKerja.map((item, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="p-1.5 border-r border-black align-top">
                      <div className="font-bold mb-0.5">{idx + 1}. {item.poin}</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[7pt]">
                        {item.subPoints?.map((sp, sIdx) => (
                          <li key={sIdx}>{sp}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-1.5 align-top">
                      <div className="font-medium text-[7.5pt]">
                        {item.ekspektasi || 'Untuk Dapat Dipertahankan'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 text-[8.5pt] pt-8">
          <div className="flex flex-col items-center text-center">
            <p className="mb-20">Pegawai Yang Dinilai,</p>
            <p className="font-bold uppercase leading-none">{namaSubjek}</p>
            <p className="mt-1 text-[8pt]">{subjekInfo.nipLabel} {subjekInfo.nip}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p>{data.kotaTtd || 'Jakarta'}, {data.tglPenilaian || '06 Januari 2026'}</p>
            <p className="mb-20">Pejabat Penilai Kinerja,</p>
            <p className="font-bold uppercase leading-none">{penilaiInfo.nama}</p>
            <p className="mt-1 text-[8pt]">NIP {penilaiInfo.nip}</p>
          </div>
        </div>
      </div>
    </>
  );
};
