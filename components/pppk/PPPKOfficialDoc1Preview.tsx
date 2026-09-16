import React from 'react';
import { PPPKEvaluation } from '../../types';
import { resolveOfficialEvaluationDetails } from '../../services/pppkOfficialDocumentService';

interface PPPKOfficialDoc1PreviewProps {
  evaluation: PPPKEvaluation;
}

export const PPPKOfficialDoc1Preview: React.FC<PPPKOfficialDoc1PreviewProps> = ({ evaluation }) => {
  const d = resolveOfficialEvaluationDetails(evaluation);

  const isPerpanjang = d.rekomendasi.includes('PERPANJANGAN');
  const isPemutusan = d.rekomendasi.includes('PEMUTUSAN');
  const isDipertahankan = d.catatanKinerja.includes('DIPERTAHANKAN');
  const isRotasi = d.catatanKinerja.includes('ROTASI');
  const isBangkom = d.catatanKinerja.includes('PENGEMBANGAN KARIR');
  const isBimbingan = d.catatanKinerja.includes('BIMBINGAN KINERJA');

  return (
    <div className="space-y-8 max-w-4xl mx-auto bg-slate-100 p-4 sm:p-6 rounded-2xl">
      {/* HALAMAN 1 (PORTRAIT) */}
      <div className="bg-white shadow-md border border-slate-300 rounded-lg p-6 sm:p-10 text-slate-900 font-sans text-xs">
        {/* Title */}
        <div className="text-center font-bold text-sm tracking-wide mb-6">
          <p>EVALUASI PENILAIAN KINERJA</p>
          <p>PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)</p>
        </div>

        {/* Subheader */}
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
          <span className="font-bold text-[11px] uppercase tracking-wider">
            DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL
          </span>
          <div className="text-right">
            <span className="font-bold block text-[11px]">PERIODE PENILAIAN</span>
            <span className="text-slate-700">{d.periodeText}</span>
          </div>
        </div>

        {/* Tabel 1: Pegawai yang dinilai */}
        <div className="border border-slate-900 mb-[-1px]">
          <div className="grid grid-cols-12 bg-[#cfe9f8] border-b border-slate-900 font-bold">
            <div className="col-span-1 border-r border-slate-900 p-1.5 text-center">1</div>
            <div className="col-span-11 p-1.5 uppercase">PEGAWAI YANG DINILAI</div>
          </div>
          <div className="divide-y divide-slate-400">
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">NAMA</div>
              <div className="col-span-8">: {d.namaPegawai}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">NIP</div>
              <div className="col-span-8">: {d.nipPegawai}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">PANGKAT/GOL RUANG</div>
              <div className="col-span-8">: {d.pangkatPegawai}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">JABATAN</div>
              <div className="col-span-8">: {d.jabatanPegawai}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">UNIT KERJA</div>
              <div className="col-span-8">: {d.unitKerjaPegawai}</div>
            </div>
          </div>
        </div>

        {/* Tabel 2: Pejabat Penilai Kinerja */}
        <div className="border border-slate-900 mb-[-1px]">
          <div className="grid grid-cols-12 bg-[#cfe9f8] border-b border-slate-900 font-bold">
            <div className="col-span-1 border-r border-slate-900 p-1.5 text-center">2</div>
            <div className="col-span-11 p-1.5 uppercase">PEJABAT PENILAI KINERJA</div>
          </div>
          <div className="divide-y divide-slate-400">
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">NAMA</div>
              <div className="col-span-8">: {d.pejabatPenilai.nama}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">NIP</div>
              <div className="col-span-8">: {d.pejabatPenilai.nip}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">PANGKAT/GOL RUANG</div>
              <div className="col-span-8">: {d.pejabatPenilai.pangkatGolRuang}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">JABATAN</div>
              <div className="col-span-8">: {d.pejabatPenilai.jabatan}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">UNIT KERJA</div>
              <div className="col-span-8">: {d.pejabatPenilai.unitKerja}</div>
            </div>
          </div>
        </div>

        {/* Tabel 3: Atasan Pejabat Penilai Kinerja */}
        <div className="border border-slate-900 mb-[-1px]">
          <div className="grid grid-cols-12 bg-[#cfe9f8] border-b border-slate-900 font-bold">
            <div className="col-span-1 border-r border-slate-900 p-1.5 text-center">3</div>
            <div className="col-span-11 p-1.5 uppercase">ATASAN PEJABAT PENILAI KINERJA</div>
          </div>
          <div className="divide-y divide-slate-400">
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">NAMA</div>
              <div className="col-span-8">: {d.atasanPejabatPenilai.nama}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">NIP</div>
              <div className="col-span-8">: {d.atasanPejabatPenilai.nip}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">PANGKAT/GOL RUANG</div>
              <div className="col-span-8">: {d.atasanPejabatPenilai.pangkatGolRuang}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">JABATAN</div>
              <div className="col-span-8">: {d.atasanPejabatPenilai.jabatan}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-3 font-semibold">UNIT KERJA</div>
              <div className="col-span-8">: {d.atasanPejabatPenilai.unitKerja}</div>
            </div>
          </div>
        </div>

        {/* Tabel 4: Evaluasi Penilaian Kinerja */}
        <div className="border border-slate-900 mb-[-1px]">
          <div className="grid grid-cols-12 bg-[#cfe9f8] border-b border-slate-900 font-bold">
            <div className="col-span-1 border-r border-slate-900 p-1.5 text-center">4</div>
            <div className="col-span-11 p-1.5 uppercase">EVALUASI PENILAIAN KINERJA</div>
          </div>
          <div className="divide-y divide-slate-400">
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-5 font-semibold">RATING HASIL KERJA</div>
              <div className="col-span-6 font-bold">: {d.ratingHasilKerja}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5">
              <div className="col-span-1"></div>
              <div className="col-span-5 font-semibold">RATING PERILAKU KERJA</div>
              <div className="col-span-6 font-bold">: {d.ratingPerilakuKerja}</div>
            </div>
            <div className="grid grid-cols-12 p-1.5 bg-blue-50/50">
              <div className="col-span-1"></div>
              <div className="col-span-5 font-bold text-blue-950">PREDIKAT PENILAIAN KINERJA</div>
              <div className="col-span-6 font-black text-blue-900">: {d.predikatPenilaianKinerja}</div>
            </div>
          </div>
        </div>

        {/* Tabel 5: Catatan atau Rekomendasi */}
        <div className="border border-slate-900 mb-8">
          <div className="grid grid-cols-12 bg-[#cfe9f8] border-b border-slate-900 font-bold">
            <div className="col-span-1 border-r border-slate-900 p-1.5 text-center">5</div>
            <div className="col-span-11 p-1.5 uppercase">CATATAN ATAU REKOMENDASI</div>
          </div>
          <div className="p-2 space-y-2">
            <div>
              <span className="font-bold block mb-1">REKOMENDASI</span>
              <div className="pl-4 space-y-1">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isPerpanjang} readOnly className="rounded text-blue-600" />
                  <span className={isPerpanjang ? 'font-bold text-slate-900' : 'text-slate-600'}>
                    PERPANJANGAN PERJANJIAN KINERJA
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isPemutusan} readOnly className="rounded text-blue-600" />
                  <span className={isPemutusan ? 'font-bold text-slate-900' : 'text-slate-600'}>
                    PEMUTUSAN PERJANJIAN KINERJA
                  </span>
                </label>
              </div>
            </div>

            <div>
              <span className="font-bold block mb-1">CATATAN</span>
              <div className="grid grid-cols-2 gap-2 pl-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isDipertahankan} readOnly className="rounded text-blue-600" />
                  <span className={isDipertahankan ? 'font-bold text-slate-900' : 'text-slate-600'}>DIPERTAHANKAN</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isRotasi} readOnly className="rounded text-blue-600" />
                  <span className={isRotasi ? 'font-bold text-slate-900' : 'text-slate-600'}>ROTASI</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isBangkom} readOnly className="rounded text-blue-600" />
                  <span className={isBangkom ? 'font-bold text-slate-900' : 'text-slate-600'}>PENGEMBANGAN KARIR</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isBimbingan} readOnly className="rounded text-blue-600" />
                  <span className={isBimbingan ? 'font-bold text-slate-900' : 'text-slate-600'}>BIMBINGAN KINERJA</span>
                </label>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-300">
              <span className="font-semibold">CATATAN TAMBAHAN : </span>
              <span className="text-slate-700">{d.catatanTambahan}</span>
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 gap-6 text-center mb-8">
          <div>
            <p>Pegawai yang dinilai</p>
            <div className="h-16"></div>
            <p className="font-bold">{d.namaPegawai}</p>
            <p className="text-slate-600">{d.nipPegawai}</p>
          </div>
          <div>
            <p>{d.kotaTtd}, {d.tanggalTtd}</p>
            <p>Pejabat Penilai Kinerja</p>
            <p className="text-[10px] text-slate-500">(Pejabat Manajerial/Ketua Tim Kerja)</p>
            <div className="h-12"></div>
            <p className="font-bold">{d.pejabatPenilai.nama}</p>
            <p className="text-slate-600">{d.pejabatPenilai.nip}</p>
          </div>
        </div>

        {/* Mengetahui Atasan */}
        <div className="text-center pt-2">
          <p>Mengetahui</p>
          <p className="font-bold uppercase tracking-wider">ATASAN PEJABAT PENILAI KINERJA</p>
          <p className="text-[10px] text-slate-600">{d.atasanPejabatPenilai.jabatan}</p>
          <div className="h-14"></div>
          <p className="font-bold">{d.atasanPejabatPenilai.nama}</p>
          <p className="text-slate-600">{d.atasanPejabatPenilai.nip}</p>
        </div>
      </div>

      {/* HALAMAN 2: MATRIKS PERMENPAN RB NO 6 TAHUN 2022 */}
      <div className="bg-white shadow-md border border-slate-300 rounded-lg p-6 sm:p-10 text-slate-900 font-sans text-xs">
        <h4 className="font-bold text-center text-xs uppercase mb-4 tracking-wider">
          Matriks Predikat Kinerja Pegawai (Permenpan RB Nomor 6 Tahun 2022)
        </h4>

        <table className="w-full border-collapse border border-slate-900 text-left">
          <thead>
            <tr className="bg-[#cfe9f8] text-center font-bold">
              <th className="border border-slate-900 p-2 w-12">Nomor</th>
              <th className="border border-slate-900 p-2 w-44">Predikat Kinerja Pegawai</th>
              <th className="border border-slate-900 p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-400">
            <tr>
              <td className="border border-slate-900 p-2 text-center font-bold">1</td>
              <td className="border border-slate-900 p-2 text-center font-bold">Sangat Baik</td>
              <td className="border border-slate-900 p-2">
                Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai diatas ekspektasi.
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 text-center font-bold">2</td>
              <td className="border border-slate-900 p-2 text-center font-bold">Baik</td>
              <td className="border border-slate-900 p-2">
                1. Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai sesuai ekspektasi<br />
                2. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai sesuai ekspektasi<br />
                3. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai diatas ekspektasi
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 text-center font-bold">3</td>
              <td className="border border-slate-900 p-2 text-center font-bold">Butuh Perbaikan</td>
              <td className="border border-slate-900 p-2">
                1. Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai diatas ekspektasi<br />
                2. Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai sesuai ekspektasi
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 text-center font-bold">4</td>
              <td className="border border-slate-900 p-2 text-center font-bold">Kurang</td>
              <td className="border border-slate-900 p-2">
                1. Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai dibawah ekspektasi<br />
                2. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai dibawah ekspektasi
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 text-center font-bold">5</td>
              <td className="border border-slate-900 p-2 text-center font-bold">Sangat Kurang</td>
              <td className="border border-slate-900 p-2">
                Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai dibawah ekspektasi
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-[10px] italic text-slate-500 mt-2">
          *) Predikat Kinerja Pegawai didasarkan pada Permenpan RB Nomor 6 Tahun 2022
        </p>
      </div>
    </div>
  );
};
