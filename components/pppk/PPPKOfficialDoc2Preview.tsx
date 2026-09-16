import React from 'react';
import { PPPKEvaluation } from '../../types';
import { resolveOfficialEvaluationDetails } from '../../services/pppkOfficialDocumentService';

interface PPPKOfficialDoc2PreviewProps {
  evaluation: PPPKEvaluation;
}

export const PPPKOfficialDoc2Preview: React.FC<PPPKOfficialDoc2PreviewProps> = ({ evaluation }) => {
  const d = resolveOfficialEvaluationDetails(evaluation);

  return (
    <div className="space-y-6 max-w-5xl mx-auto bg-slate-100 p-4 sm:p-6 rounded-2xl overflow-x-auto">
      <div className="bg-white shadow-md border border-slate-300 rounded-lg p-6 sm:p-8 text-slate-900 font-sans text-xs min-w-[760px]">
        
        {/* Header Title */}
        <div className="text-center font-bold text-sm tracking-wide mb-4">
          <p>PENILAIAN PERILAKU KERJA</p>
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

        {/* Main 7 Aspects Table */}
        <div className="overflow-x-auto border border-slate-900 mb-6">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#cfe9f8] text-center font-bold divide-x divide-slate-900 border-b border-slate-900">
                <th rowSpan={3} className="p-2 w-8">No</th>
                <th rowSpan={3} className="p-2 text-left min-w-[240px]">
                  Standar Penilaian Perilaku Kerja<br />
                  <span className="font-normal text-[10px]">Aspek Penilaian</span>
                </th>
                <th colSpan={3} className="p-1.5">Penilaian Perilaku (Bobot 60%)</th>
                <th colSpan={2} className="p-1.5">Penilaian Kehadiran (Bobot 40%)</th>
                <th rowSpan={3} className="p-2 w-28">
                  Nilai Akhir Perilaku Kerja<br />
                  <span className="font-normal text-[9px]">((pejabat x 60%) + (rekan : 2 x 40%)) x 60%</span>
                </th>
                <th rowSpan={3} className="p-2 w-24">
                  Nilai Kehadiran<br />
                  <span className="font-normal text-[9px]">(Skor * 40%)</span>
                </th>
              </tr>
              <tr className="bg-[#cfe9f8] text-center font-bold divide-x divide-slate-900 border-b border-slate-900 text-[10px]">
                <th className="p-1">Pejabat Penilai Kinerja (60%)</th>
                <th colSpan={2} className="p-1">Rekan Kerja (40%)</th>
                <th rowSpan={2} className="p-1 w-12">Alfa</th>
                <th rowSpan={2} className="p-1 w-24">Analisis Kehadiran Berdasarkan Tabel</th>
              </tr>
              <tr className="bg-[#cfe9f8] text-center font-bold divide-x divide-slate-900 border-b border-slate-900 text-[10px]">
                <th className="p-1 w-16">Skor Jawaban</th>
                <th className="p-1 w-16">Rekan Kerja PNS</th>
                <th className="p-1 w-16">Rekan Kerja PPPK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400">
              {d.berakhlakList.map((asp, aspIdx) => (
                <React.Fragment key={asp.no}>
                  {asp.subItems.map((sub, subIdx) => (
                    <tr key={sub.code} className="hover:bg-slate-50 divide-x divide-slate-300">
                      {subIdx === 0 && (
                        <td
                          rowSpan={asp.subItems.length}
                          className="p-1.5 text-center font-bold align-middle bg-slate-50/50"
                        >
                          {asp.no}
                        </td>
                      )}
                      <td className="p-1.5 text-slate-800">
                        <strong>{sub.code}.</strong> {sub.pertanyaan}
                      </td>
                      <td className="p-1.5 text-center font-semibold">{sub.skorPejabat}</td>
                      <td className="p-1.5 text-center font-semibold">{sub.skorRekanPns}</td>
                      <td className="p-1.5 text-center font-semibold">{sub.skorRekanPppk}</td>

                      {/* Span Kehadiran across entire aspects */}
                      {aspIdx === 0 && subIdx === 0 && (
                        <>
                          <td rowSpan={28} className="p-2 text-center align-middle font-bold bg-slate-50/30">
                            {d.alfaCount}
                          </td>
                          <td rowSpan={28} className="p-2 text-center align-middle font-bold bg-slate-50/30">
                            {d.analisisKehadiranSkor}
                          </td>
                        </>
                      )}

                      {subIdx === 0 && (
                        <td
                          rowSpan={asp.subItems.length}
                          className="p-1.5 text-center align-middle font-bold bg-[#cfe9f8]/40"
                        >
                          {asp.nilaiAkhirAspek.toFixed(2).replace('.', ',')}
                        </td>
                      )}

                      {aspIdx === 0 && subIdx === 0 && (
                        <td
                          rowSpan={28}
                          className="p-2 text-center align-middle font-black bg-[#cfe9f8]/40 text-blue-950"
                        >
                          {d.nilaiKehadiranBobot.toFixed(2).replace('.', ',')}
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* Rata-rata row */}
              <tr className="bg-slate-100 font-bold divide-x divide-slate-400 border-t-2 border-slate-900">
                <td colSpan={5} className="p-2 text-right">
                  Rata-rata Nilai Perilaku & Nilai Kehadiran :
                </td>
                <td colSpan={2}></td>
                <td className="p-2 text-center bg-[#cfe9f8]">
                  {d.totalPerilakuRataRata.toFixed(2).replace('.', ',')}
                </td>
                <td className="p-2 text-center bg-[#cfe9f8]">
                  {d.nilaiKehadiranBobot.toFixed(2).replace('.', ',')}
                </td>
              </tr>

              {/* Jumlah Nilai row */}
              <tr className="bg-[#cfe9f8] font-bold divide-x divide-slate-400">
                <td colSpan={7} className="p-2 text-left uppercase">
                  Jumlah Nilai perilaku + Nilai Kehadiran
                </td>
                <td colSpan={2} className="p-2 text-center font-black text-sm text-blue-950">
                  {d.jumlahPerilakuPlusKehadiran.toFixed(2).replace('.', ',')}
                </td>
              </tr>

              {/* Rating Penilaian row */}
              <tr className="bg-[#cfe9f8] font-bold divide-x divide-slate-400">
                <td colSpan={7} className="p-2 text-left uppercase">
                  Rating Penilaian Perilaku Kerja
                </td>
                <td colSpan={2} className="p-2 text-center font-black text-sm text-blue-900">
                  {d.ratingPerilakuKerja}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Section: 3 Reference Tables (Left) & Signature (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            {/* Table 1: Skala Penilaian */}
            <div className="border border-slate-900 max-w-xs text-[10px]">
              <div className="bg-[#cfe9f8] p-1 font-bold border-b border-slate-900 text-center">
                1. Tabel Skala Penilaian Perilaku Kerja
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-900 border-b border-slate-900 font-semibold text-center bg-slate-50">
                <div className="p-0.5">Skala Penilaian</div>
                <div className="p-0.5">Keterangan</div>
              </div>
              <div className="divide-y divide-slate-300 text-center">
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>1</span><span>Sangat Kurang</span></div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>2</span><span>Kurang</span></div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>3</span><span>Cukup</span></div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>4</span><span>Baik</span></div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>5</span><span>Sangat Baik</span></div>
              </div>
            </div>

            {/* Table 2: Analisis Kehadiran */}
            <div className="border border-slate-900 max-w-sm text-[10px]">
              <div className="bg-[#cfe9f8] p-1 font-bold border-b border-slate-900 text-center">
                2. Tabel Analisis Kehadiran
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-900 border-b border-slate-900 font-semibold text-center bg-slate-50">
                <div className="p-0.5">Skala</div>
                <div className="p-0.5">Keterangan</div>
                <div className="p-0.5">Kriteria</div>
              </div>
              <div className="divide-y divide-slate-300 text-center">
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-0.5"><span>1</span><span>Sangat Kurang</span><span>Alfa : &gt;8 kali</span></div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-0.5"><span>2</span><span>Kurang</span><span>Alfa : 6 - 8 kali</span></div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-0.5"><span>3</span><span>Cukup</span><span>Alfa : 3 - 5 kali</span></div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-0.5"><span>4</span><span>Baik</span><span>Alfa : 1 - 2 kali</span></div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 p-0.5"><span>5</span><span>Sangat Baik</span><span>Alfa : 0 kali</span></div>
              </div>
            </div>

            {/* Table 3: Rating Perilaku */}
            <div className="border border-slate-900 max-w-xs text-[10px]">
              <div className="bg-[#cfe9f8] p-1 font-bold border-b border-slate-900 text-center">
                3. Tabel Rating Penilaian Perilaku Kerja
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-900 border-b border-slate-900 font-semibold text-center bg-slate-50">
                <div className="p-0.5">Range</div>
                <div className="p-0.5">Rating Perilaku</div>
              </div>
              <div className="divide-y divide-slate-300 text-center">
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>4,32 - 5</span><span>Diatas Ekspektasi</span></div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>3,60 - 4,31</span><span>Sesuai Ekspektasi</span></div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 p-0.5"><span>1 - 3,59</span><span>Dibawah Ekspektasi</span></div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="text-center pt-8">
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
