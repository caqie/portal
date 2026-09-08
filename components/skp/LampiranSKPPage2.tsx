import React from 'react';
import { getPegawaiDisplayInfo } from './skpDefaults';
import { Pegawai } from '../../types';

interface PageProps {
  data: any;
  pSubjek?: Pegawai;
  pPenilai?: Pegawai;
}

export const LampiranSKPPage2: React.FC<PageProps> = ({ data, pSubjek, pPenilai }) => {
  const subjekInfo = getPegawaiDisplayInfo(pSubjek, data.nip);
  const penilaiInfo = getPegawaiDisplayInfo(pPenilai, data.penilaiNip);
  const namaSubjek = data.namaPegawai || subjekInfo.nama;
  const periodeText = data.periodeTeks || `${data.periodeMulai || '01 Oktober'} s.d ${data.periodeSelesai || '31 Desember 2025'}`;

  const lampiran = data.lampiran || {};
  const dukunganSumberDaya: string[] = Array.isArray(lampiran.dukunganSumberDaya) 
    ? lampiran.dukunganSumberDaya 
    : (typeof lampiran.dukunganSumberDaya === 'string' ? lampiran.dukunganSumberDaya.split('\n').filter(Boolean) : []);
  
  const skemaPertanggungjawaban: string[] = Array.isArray(lampiran.skemaPertanggungjawaban) 
    ? lampiran.skemaPertanggungjawaban 
    : (typeof lampiran.skemaPertanggungjawaban === 'string' ? lampiran.skemaPertanggungjawaban.split('\n').filter(Boolean) : []);

  const konsekuensi: string[] = Array.isArray(lampiran.konsekuensi) 
    ? lampiran.konsekuensi 
    : (typeof lampiran.konsekuensi === 'string' ? lampiran.konsekuensi.split('\n').filter(Boolean) : []);

  return (
    <div className="skp-page-item bg-white p-[1.2cm] text-black font-sans text-[8.5pt] leading-normal flex flex-col justify-between" style={{ width: '210mm', minHeight: '297mm' }}>
      <div>
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-[11pt] font-bold uppercase tracking-wide">
            LAMPIRAN SASARAN KINERJA PEGAWAI
          </h1>
        </div>

        {/* Instansi & Periode Header */}
        <div className="flex justify-between items-center text-[8.5pt] font-bold uppercase mb-1">
          <div>KEMENTERIAN HUKUM RI</div>
          <div>PERIODE PENILAIAN : {periodeText}</div>
        </div>

        {/* Tables */}
        <div className="border border-black">
          
          {/* DUKUNGAN SUMBER DAYA */}
          <div className="bg-[#bdd7ee] border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            DUKUNGAN SUMBER DAYA
          </div>
          <table className="w-full border-collapse text-[8.5pt]">
            <tbody>
              {dukunganSumberDaya.length > 0 ? (
                dukunganSumberDaya.map((item, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="w-8 px-2 py-1 text-center align-top">{idx + 1}</td>
                    <td className="px-2 py-1 border-l border-black align-top">{item}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="w-8 px-2 py-1 text-center align-top">1</td>
                  <td className="px-2 py-1 border-l border-black align-top">-</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* SKEMA PERTANGGUNGJAWABAN */}
          <div className="bg-[#bdd7ee] border-t border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            SKEMA PERTANGGUNGJAWABAN
          </div>
          <table className="w-full border-collapse text-[8.5pt]">
            <tbody>
              {skemaPertanggungjawaban.length > 0 ? (
                skemaPertanggungjawaban.map((item, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="w-8 px-2 py-1 text-center align-top">{idx + 1}</td>
                    <td className="px-2 py-1 border-l border-black align-top">{item}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="w-8 px-2 py-1 text-center align-top">1</td>
                  <td className="px-2 py-1 border-l border-black align-top">-</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* KONSEKUENSI */}
          <div className="bg-[#bdd7ee] border-t border-b border-black px-2 py-1 font-bold text-[8.5pt] uppercase">
            KONSEKUENSI
          </div>
          <table className="w-full border-collapse text-[8.5pt]">
            <tbody>
              {konsekuensi.length > 0 ? (
                konsekuensi.map((item, idx) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="w-8 px-2 py-1 text-center align-top">{idx + 1}</td>
                    <td className="px-2 py-1 border-l border-black align-top">{item}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="w-8 px-2 py-1 text-center align-top">1</td>
                  <td className="px-2 py-1 border-l border-black align-top">-</td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      </div>

      {/* Signatures */}
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
  );
};
