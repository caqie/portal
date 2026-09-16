import React from 'react';
import { PPPKEvaluation } from '../../types';
import { resolveOfficialEvaluationDetails } from '../../services/pppkOfficialDocumentService';

interface PPPKOfficialDoc3PreviewProps {
  evaluation: PPPKEvaluation;
}

export const PPPKOfficialDoc3Preview: React.FC<PPPKOfficialDoc3PreviewProps> = ({ evaluation }) => {
  const d = resolveOfficialEvaluationDetails(evaluation);

  return (
    <div className="space-y-6 max-w-5xl mx-auto bg-slate-100 p-4 sm:p-6 rounded-2xl overflow-x-auto">
      <div className="bg-white shadow-md border border-slate-300 rounded-lg p-6 sm:p-8 text-slate-900 font-sans text-xs min-w-[760px]">
        
        {/* Title */}
        <div className="text-center font-bold text-sm tracking-wide mb-4">
          <p>PENILAIAN HASIL KERJA</p>
          <p className="text-[11px] font-semibold text-slate-700">*PEJABAT PENILAI KINERJA : PEJABAT MANAJERIAL/KETUA TIM KERJA</p>
          <p>PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)</p>
        </div>

        {/* Subheader */}
        <div className="flex justify-between items-end border-b border-slate-900 pb-2 mb-4">
          <span className="font-semibold text-xs text-slate-800">
            Direktorat Jenderal Kekayaan Intelektual
          </span>
          <div className="text-right text-xs">
            <span className="font-bold">Periode Penilaian : </span>
            <span>{d.periodeText}</span>
          </div>
        </div>

        {/* Identity Block */}
        <div className="grid grid-cols-2 border border-slate-900 mb-4 divide-x divide-slate-900 text-xs">
          <div>
            <div className="bg-[#cfe9f8] p-1.5 font-bold border-b border-slate-900">
              Pegawai Yang dinilai
            </div>
            <div className="p-2 space-y-1">
              <p><span className="font-semibold inline-block w-36">Nama</span>: {d.namaPegawai}</p>
              <p><span className="font-semibold inline-block w-36">NIP</span>: {d.nipPegawai}</p>
              <p><span className="font-semibold inline-block w-36">Pangkat / Gol Ruang</span>: {d.pangkatPegawai}</p>
              <p><span className="font-semibold inline-block w-36">Jabatan</span>: {d.jabatanPegawai}</p>
              <p><span className="font-semibold inline-block w-36">Unit Kerja</span>: {d.unitKerjaPegawai}</p>
            </div>
          </div>
          <div>
            <div className="bg-[#cfe9f8] p-1.5 font-bold border-b border-slate-900">
              Pejabat Penilai Kinerja
            </div>
            <div className="p-2 space-y-1">
              <p><span className="font-semibold inline-block w-36">Nama</span>: {d.pejabatPenilai.nama}</p>
              <p><span className="font-semibold inline-block w-36">NIP</span>: {d.pejabatPenilai.nip}</p>
              <p><span className="font-semibold inline-block w-36">Pangkat / Gol Ruang</span>: {d.pejabatPenilai.pangkatGolRuang}</p>
              <p><span className="font-semibold inline-block w-36">Jabatan</span>: {d.pejabatPenilai.jabatan}</p>
              <p><span className="font-semibold inline-block w-36">Unit Kerja</span>: {d.pejabatPenilai.unitKerja}</p>
            </div>
          </div>
        </div>

        {/* Table Hasil Kerja */}
        <div className="border border-slate-900 mb-6">
          <div className="bg-[#cfe9f8] p-1.5 font-bold border-b border-slate-900">
            Penilaian Hasil Kerja
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#cfe9f8] text-center font-bold divide-x divide-slate-900 border-b border-slate-900">
                <th className="p-1.5 w-12">No</th>
                <th className="p-1.5 text-left">Rencana Hasil Kerja</th>
                <th className="p-1.5 w-28">Target</th>
                <th className="p-1.5 w-28">Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {d.hasilKerjaList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 divide-x divide-slate-300">
                  <td className="p-1.5 text-center font-medium">{idx + 1}</td>
                  <td className="p-1.5 text-slate-800">{item.rencanaHasilKerja}</td>
                  <td className="p-1.5 text-center font-semibold">{item.target}</td>
                  <td className="p-1.5 text-center font-semibold">{item.realisasi}</td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-slate-100 font-bold divide-x divide-slate-400 border-t-2 border-slate-900">
                <td colSpan={2} className="p-2 text-center uppercase tracking-wider">Total</td>
                <td className="p-2 text-center text-blue-950">{d.totalTarget}</td>
                <td className="p-2 text-center text-blue-950">{d.totalRealisasi}</td>
              </tr>

              {/* Rating Hasil Kerja Row */}
              <tr className="bg-[#cfe9f8] font-bold divide-x divide-slate-400">
                <td colSpan={2} className="p-2 text-center uppercase tracking-wider">
                  Rating Hasil Kerja
                </td>
                <td colSpan={2} className="p-2 text-center font-black text-sm text-blue-950 uppercase">
                  {d.ratingHasilKerja}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Left = Legend, Right = Signature */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <div className="border border-slate-900 max-w-sm text-[10px]">
              <div className="grid grid-cols-3 divide-x divide-slate-900 bg-[#cfe9f8] font-bold border-b border-slate-900 text-center p-1">
                <div className="w-8">No</div>
                <div>Keterangan</div>
                <div>Rating Hasil Kerja</div>
              </div>
              <div className="divide-y divide-slate-300 text-center">
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-1">
                  <div className="w-8 font-semibold">1</div>
                  <div className="text-left pl-2">Realisasi &gt; Target</div>
                  <div className="font-semibold">Diatas Ekspektasi</div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-1">
                  <div className="w-8 font-semibold">2</div>
                  <div className="text-left pl-2">Realisasi = Target</div>
                  <div className="font-semibold">Sesuai Ekspektasi</div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-1">
                  <div className="w-8 font-semibold">3</div>
                  <div className="text-left pl-2">Realisasi &lt; Target</div>
                  <div className="font-semibold">Dibawah Ekspektasi</div>
                </div>
              </div>
            </div>
            <p className="text-[10px] italic text-slate-500 mt-1">*) Coret yang tidak perlu</p>
          </div>

          {/* Signature */}
          <div className="text-center pt-2">
            <p>{d.kotaTtd}, {d.tanggalTtd}</p>
            <p className="font-bold">Pejabat Penilai Kinerja</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{d.pejabatPenilai.nama}</p>
            <p className="text-slate-600">NIP. {d.pejabatPenilai.nip}</p>
          </div>
        </div>

      </div>
    </div>
  );
};
