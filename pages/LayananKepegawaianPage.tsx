
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchSKPFromSheets, 
  fetchPAKFromSheets, 
  fetchKenaikanFromSheets, 
  fetchPengembanganFromSheets, 
  fetchPegawaiFromSheets, 
  getRetirementDetails, 
  fetchKGBFromSheets 
} from '../spreadsheetService';
import { AK_KOEFISIEN, PREDIKAT_MULTIPLIER } from '../constants';
import { SKP, PAK, KenaikanKarir, Pengembangan, Pegawai, KGB } from '../types';
import { useAuth } from '../AuthContext';

const ServiceCard = ({ icon, label, description, color, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-6 rounded-[2rem] border transition-all text-left flex flex-col h-full group no-print ${active ? `bg-white border-${color}-200 shadow-xl ring-4 ring-${color}-50` : 'bg-white/50 border-gray-100 hover:border-gray-300'}`}
  >
    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform bg-${color}-600`}>
      <i className={`bi ${icon} text-xl`}></i>
    </div>
    <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-tight mb-2 leading-tight">{label}</h4>
    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">{description}</p>
  </button>
);

const LayananKepegawaianPage = () => {
  const { user, canEdit } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'skp' | 'pak' | 'kenaikan' | 'pengembangan' | 'pensiun' | 'kgb'>('skp');
  const [data, setData] = useState<any[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [calcData, setCalcData] = useState({ nip: '', predikat: 'Baik', bulan: 12, tahun: new Date().getFullYear(), akLama: 0, akDasar: 0, akPendidikan: 0 });
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => { loadModuleData(); }, [activeModule]);

  const loadModuleData = async () => {
    setLoading(true);
    try {
      let res: any[] = [];
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);

      if (activeModule === 'skp') res = await fetchSKPFromSheets();
      else if (activeModule === 'pak') res = await fetchPAKFromSheets();
      else if (activeModule === 'kenaikan') res = await fetchKenaikanFromSheets();
      else if (activeModule === 'pengembangan') res = await fetchPengembanganFromSheets();
      else if (activeModule === 'kgb') res = await fetchKGBFromSheets();
      else if (activeModule === 'pensiun') res = pegawais;
      
      if (isViewer) {
        setData(res.filter((item: any) => item.nip === user?.nip));
      } else {
        setData(res);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCalculate = () => {
    const peg = pegawaiList.find(p => p.nip === calcData.nip);
    if (!peg) return;
    const jabUpper = (peg.jabatan || '').toUpperCase();
    let koefisienKey = jabUpper.includes('UTAMA') ? 'AHLI UTAMA' : jabUpper.includes('MADYA') ? 'AHLI MADYA' : jabUpper.includes('MUDA') ? 'AHLI MUDA' : jabUpper.includes('PERTAMA') ? 'AHLI PERTAMA' : jabUpper.includes('PENYELIA') ? 'PENYELIA' : jabUpper.includes('MAHIR') ? 'MAHIR' : jabUpper.includes('TERAMPIL') ? 'TERAMPIL' : 'PEMULA';
    const koefisien = AK_KOEFISIEN[koefisienKey] || 0;
    const multiplier = PREDIKAT_MULTIPLIER[calcData.predikat] || 1.0;
    const akBaru = (calcData.bulan / 12) * multiplier * koefisien;
    const totalKumulatif = Number(calcData.akDasar) + Number(calcData.akLama) + akBaru + Number(calcData.akPendidikan);
    setCalcResult({ pegawai: peg, akBaru: akBaru.toFixed(3), akLama: calcData.akLama, akDasar: calcData.akDasar, akPendidikan: calcData.akPendidikan, totalKumulatif: totalKumulatif.toFixed(3) });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">{isViewer ? 'Riwayat Karir Personal' : 'Manajemen Karir DJKI'}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{isViewer ? 'Rekapitulasi Pengembangan & Kinerja Individu' : 'Engine Karir Terintegrasi BKN 3/2023'}</p>
        </div>
        {!isViewer && (
           <div className="flex gap-2 no-print">
               <button onClick={() => navigate('/skp')} className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl flex items-center space-x-3"><i className="bi bi-graph-up-arrow"></i><span>Evaluasi SKP</span></button>
               <button onClick={() => navigate('/pelantikan-gen')} className="px-6 py-3.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center space-x-3"><i className="bi bi-file-earmark-pdf-fill"></i><span>BA Pelantikan</span></button>
           </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
        <ServiceCard icon="bi-graph-up-arrow" label="SKP" description="Kinerja" color="blue" active={activeModule === 'skp'} onClick={() => setActiveModule('skp')} />
        <ServiceCard icon="bi-award" label="PAK" description="Angka Kredit" color="indigo" active={activeModule === 'pak'} onClick={() => setActiveModule('pak')} />
        <ServiceCard icon="bi-cash-stack" label="KGB" description="Kenaikan Gaji" color="emerald" active={activeModule === 'kgb'} onClick={() => setActiveModule('kgb')} />
        <ServiceCard icon="bi-arrow-up-right-circle" label="Pangkat" description="Usulan KP" color="amber" active={activeModule === 'kenaikan'} onClick={() => setActiveModule('kenaikan')} />
        <ServiceCard icon="bi-journal-check" label="Diklat" description="Log Sertifikat" color="cyan" active={activeModule === 'pengembangan'} onClick={() => setActiveModule('pengembangan')} />
        <ServiceCard icon="bi-door-open" label="Pensiun" description="Batas Usia" color="rose" active={activeModule === 'pensiun'} onClick={() => setActiveModule('pensiun')} />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden no-print min-h-[400px]">
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Database {activeModule === 'pensiun' ? 'Batas Usia Pensiun' : activeModule.toUpperCase()}</h5>
              <button onClick={loadModuleData} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Refresh Data</button>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[7px] font-black border-b border-gray-100 tracking-widest">
                      <tr>
                          {activeModule === 'pensiun' ? (
                            <>
                              <th className="px-6 py-4 text-center">NIP</th>
                              <th className="px-4 py-4">Nama</th>
                              <th className="px-4 py-4">Jabatan</th>
                              <th className="px-4 py-4">Klasifikasi</th>
                              <th className="px-4 py-4 text-center">Gol</th>
                              <th className="px-4 py-4 text-center">L/P</th>
                              <th className="px-4 py-4">TMT Jabatan</th>
                              <th className="px-4 py-4">Tgl Lahir</th>
                              <th className="px-4 py-4">Tgl Pensiun</th>
                              <th className="px-4 py-4">TMT Pensiun</th>
                              <th className="px-4 py-4 text-center">Usia</th>
                              <th className="px-4 py-4 text-center">BUP</th>
                              <th className="px-4 py-4">Sisa Kerja</th>
                              <th className="px-4 py-4">Unit Kerja</th>
                              <th className="px-4 py-4">Eselon</th>
                              <th className="px-4 py-4">Jenis</th>
                              <th className="px-4 py-4">MPP</th>
                              <th className="px-6 py-4 text-right">Ket</th>
                            </>
                          ) : (
                            <>
                              <th className="px-8 py-4">Nama Pegawai</th>
                              <th className="px-4 py-4">NIP</th>
                              <th className="px-4 py-4">Unit Kerja</th>
                              {activeModule === 'kgb' && <><th className="px-4 py-4">TMT Baru</th><th className="px-4 py-4 text-right">Gaji Baru</th><th className="px-8 py-4 text-center">Status</th></>}
                              {activeModule === 'skp' && <><th className="px-4 py-4 text-center">Tahun</th><th className="px-4 py-4">Predikat</th></>}
                              {activeModule === 'kenaikan' && <><th className="px-4 py-4">Menjadi</th><th className="px-8 py-4 text-center">Status</th></>}
                              {activeModule === 'pengembangan' && <><th className="px-4 py-4">Kegiatan</th><th className="px-4 py-4 text-center">JPL</th></>}
                            </>
                          )}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {loading ? (
                          <tr><td colSpan={20} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Menghubungkan ke basis data...</td></tr>
                      ) : data.length > 0 ? data.map((item: any) => {
                        if (activeModule === 'pensiun') {
                          const det = getRetirementDetails(item.nip, item.jabatan || '', item.klasifikasiJabatan || '');
                          if (!det) return null;
                          
                          return (
                            <tr key={item.id} className="hover:bg-rose-50/10 transition-all text-[9px] font-bold text-gray-700">
                                <td className="px-6 py-4 font-mono text-center">{item.nip}</td>
                                <td className="px-4 py-4 uppercase font-black text-gray-900">{item.nama}</td>
                                <td className="px-4 py-4 text-[8px] uppercase truncate max-w-[150px]">{item.jabatan}</td>
                                <td className="px-4 py-4">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase text-[8px] font-black">
                                    {item.klasifikasiJabatan || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center font-mono">{item.golRuang}</td>
                                <td className="px-4 py-4 text-center">{item.gender}</td>
                                <td className="px-4 py-4">{item.tmtJabatan || '-'}</td>
                                <td className="px-4 py-4">{det.birthDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td className="px-4 py-4">{det.tglPensiun.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td className="px-4 py-4 text-rose-600 font-black">{det.tmtPensiun.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td className="px-4 py-4 text-center">{det.currentAge} Thn</td>
                                <td className="px-4 py-4 text-center font-black text-blue-600">{det.usiaPensiun} Thn</td>
                                <td className="px-4 py-4 text-rose-600 font-black uppercase">{det.sisaMasaKerja}</td>
                                <td className="px-4 py-4 text-[8px] uppercase truncate max-w-[150px]">{item.unitKerja}</td>
                                <td className="px-4 py-4 text-center">{item.eselon || '-'}</td>
                                <td className="px-4 py-4">{det.jenisPensiun}</td>
                                <td className="px-4 py-4">{det.mpp.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td className="px-6 py-4 text-right text-gray-400 font-black">-</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={item.id} className="hover:bg-blue-50/10 transition-all">
                              <td className="px-8 py-4"><p className="text-[10px] font-black text-gray-900 uppercase">{item.namaPegawai || item.nama || user?.name}</p></td>
                              <td className="px-4 py-4"><p className="text-[8px] font-mono text-gray-400 font-bold">{item.nip}</p></td>
                              <td className="px-4 py-4"><p className="text-[9px] font-bold text-gray-500 uppercase">{item.unitKerja || pegawaiList.find(p => p.nip === item.nip)?.unitKerja || '-'}</p></td>
                              {activeModule === 'kgb' && (
                                <><td className="px-4 py-4 text-[10px] font-black text-blue-600">{item.tmtBaru}</td>
                                <td className="px-4 py-4 text-right text-[10px] font-black text-emerald-600">Rp {item.gajiBaru?.toLocaleString('id-ID')}</td>
                                <td className="px-8 py-4 text-center"><span className="px-2 py-0.5 text-[8px] font-black uppercase rounded border border-emerald-100 bg-emerald-50 text-emerald-700">{item.status}</span></td></>
                              )}
                              {activeModule === 'skp' && (
                                <><td className="px-4 py-4 text-center text-[10px] font-bold text-gray-900">{item.tahun}</td>
                                <td className="px-4 py-4"><span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-indigo-50 text-indigo-700">{item.predikat}</span></td></>
                              )}
                              {activeModule === 'kenaikan' && (
                                <><td className="px-4 py-4 text-[10px] font-black text-blue-600">{item.menjadi}</td>
                                <td className="px-8 py-4 text-center"><span className="px-2 py-0.5 text-[8px] font-black uppercase rounded border border-amber-100 bg-amber-50 text-amber-700">{item.status}</span></td></>
                              )}
                              {activeModule === 'pengembangan' && (
                                <><td className="px-4 py-4 text-[10px] font-bold text-gray-700 uppercase line-clamp-1">{item.namaKegiatan}</td>
                                <td className="px-4 py-4 text-center text-[10px] font-black text-gray-900">{item.jumlahJpl}</td></>
                              )}
                          </tr>
                        )
                      }) : (
                          <tr><td colSpan={20} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Tidak ada data ditemukan</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default LayananKepegawaianPage;
