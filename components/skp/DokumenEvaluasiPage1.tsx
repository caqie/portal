import React from 'react';
import { LOGO_GARUDA_URL, getPegawaiDisplayInfo } from './skpDefaults';
import { Pegawai } from '../../types';

interface PageProps {
  data: any;
  pSubjek?: Pegawai;
  pPenilai?: Pegawai;
  pAtasan?: Pegawai;
}

export const DokumenEvaluasiPage1: React.FC<PageProps> = ({ data, pSubjek, pPenilai, pAtasan }) => {
  const subjekInfo = getPegawaiDisplayInfo(pSubjek, data.nip);
  const penilaiInfo = getPegawaiDisplayInfo(pPenilai, data.penilaiNip);
  const atasanInfo = getPegawaiDisplayInfo(pAtasan, data.atasanPenilaiNip);

  // In case user typed override names
  const namaSubjek = data.namaPegawai || subjekInfo.nama;
  const periodeText = data.periodeTeks || `${data.periodeMulai || '01 Oktober'} s.d ${data.periodeSelesai || '31 Desember 2025'}`;

  return (
    <div className="skp-page-item bg-white p-[1.2cm] text-black font-sans text-[8.5pt] leading-normal flex flex-col justify-between" style={{ width: '210mm', minHeight: '297mm' }}>
      <div>
        {/* Header Garuda & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <img 
            src={LOGO_GARUDA_URL} 
            alt="Garuda Pancasila" 
            className="w-16 h-16 object-contain mb-3"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-[11pt] font-bold tracking-wide uppercase leading-tight">
            DOKUMEN EVALUASI KINERJA PEGAWAI
          </h1>
          <p className="text-[9pt] font-bold uppercase tracking-wider mt-0.5">
            PERIODE : {data.periodeLabel || 'AKHIR'}
          </p>
          <p className="text-[8.5pt] font-medium mt-1">
            Periode Penilaian Kinerja
          </p>
          <p className="text-[8.5pt] font-bold">
            {periodeText}
          </p>
        </div>

        {/* Instansi Label */}
        <div className="text-[8.5pt] font-bold uppercase mb-1">
          KEMENTERIAN HUKUM RI
        </div>

        {/* Tabel 5 Bagian Resmi PermenPANRB 6 / BKN */}
        <div className="border border-black">
          
          {/* 1. PEGAWAI YANG DINILAI */}
          <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            1. PEGAWAI YANG DINILAI
          </div>
          <table className="w-full border-collapse text-[8pt]">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-48 px-2 py-0.5 font-normal">NAMA</td>
                <td className="w-4 px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 font-bold uppercase">{namaSubjek}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">{subjekInfo.nipLabel}</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5">{subjekInfo.nip}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">PANGKAT/GOL. RUANG</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{subjekInfo.pangkatGol}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">JABATAN</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{subjekInfo.jabatan}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">UNIT KERJA</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{subjekInfo.unitKerja}</td>
              </tr>
            </tbody>
          </table>

          {/* 2. PEJABAT PENILAI KINERJA */}
          <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            2. PEJABAT PENILAI KINERJA
          </div>
          <table className="w-full border-collapse text-[8pt]">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-48 px-2 py-0.5 font-normal">NAMA</td>
                <td className="w-4 px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 font-bold uppercase">{penilaiInfo.nama}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">NIP</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5">{penilaiInfo.nip}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">PANGKAT/GOL. RUANG</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{penilaiInfo.pangkatGol}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">JABATAN</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{penilaiInfo.jabatan}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">UNIT KERJA</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{penilaiInfo.unitKerja}</td>
              </tr>
            </tbody>
          </table>

          {/* 3. ATASAN PEJABAT PENILAI KINERJA */}
          <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            3. ATASAN PEJABAT PENILAI KINERJA
          </div>
          <table className="w-full border-collapse text-[8pt]">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-48 px-2 py-0.5 font-normal">NAMA</td>
                <td className="w-4 px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 font-bold uppercase">{atasanInfo.nama}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">NIP</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5">{atasanInfo.nip}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">PANGKAT/GOL. RUANG</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{atasanInfo.pangkatGol}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">JABATAN</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{atasanInfo.jabatan}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">UNIT KERJA</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 uppercase">{atasanInfo.unitKerja}</td>
              </tr>
            </tbody>
          </table>

          {/* 4. EVALUASI KINERJA */}
          <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            4. EVALUASI KINERJA
          </div>
          <table className="w-full border-collapse text-[8pt]">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-48 px-2 py-0.5 font-normal">CAPAIAN KINERJA ORGANISASI</td>
                <td className="w-4 px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 font-bold uppercase">{data.capaianOrganisasi || 'ISTIMEWA'}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="px-2 py-0.5 font-normal">PREDIKAT KINERJA PEGAWAI</td>
                <td className="px-1 py-0.5 text-center">:</td>
                <td className="px-2 py-0.5 font-bold uppercase">{data.predikatKinerja || 'SANGAT BAIK'}</td>
              </tr>
            </tbody>
          </table>

          {/* 5. CATATAN/REKOMENDASI */}
          <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            5. CATATAN/REKOMENDASI
          </div>
          <div className="px-2 py-1.5 min-h-[30px] text-[8pt]">
            {data.catatanRekomendasi || data.catatan || '-'}
          </div>

        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 text-[8.5pt] pt-8">
        <div className="flex flex-col items-center text-center">
          <p className="mb-20">Pegawai yang Dinilai</p>
          <p className="font-bold uppercase leading-none">{namaSubjek}</p>
          <p className="mt-1 text-[8pt]">{subjekInfo.nipLabel} {subjekInfo.nip}</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <p>{data.kotaTtd || 'Jakarta'}, {data.tglPenilaian || '06 Januari 2026'}</p>
          <p className="mb-20">Pejabat Penilai Kinerja</p>
          <p className="font-bold uppercase leading-none">{penilaiInfo.nama}</p>
          <p className="mt-1 text-[8pt]">NIP {penilaiInfo.nip}</p>
        </div>
      </div>
    </div>
  );
};
