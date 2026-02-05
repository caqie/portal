import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchMagangPKLFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, MagangPKL } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const MagangPKLPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  
  const [pesertaList, setPesertaList] = useState<MagangPKL[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'generator'>('list');
  const [genStep, setGenStep] = useState<'SELECT' | 'PREVIEW'>('SELECT');
  const [docType, setDocType] = useState<'BALASAN' | 'NOTA' | 'SERTIFIKAT'>('BALASAN');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'Proses' | 'Selesai'>('SEMUA');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([fetchPegawaiFromSheets(), fetchMagangPKLFromSheets()]);
      setPegawaiList(p);
      setPesertaList(m);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredData = useMemo(() => {
    return pesertaList.filter(p => {
      const matchSearch = (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'SEMUA' || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [pesertaList, searchTerm, filterStatus]);

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={false} onClose={() => {}} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter">Magang & PKL</h3>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
           <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b">
              <tr><th className="px-10 py-5">Nama Peserta</th><th className="px-4 py-5">Penempatan</th><th className="px-10 py-5 text-right">Opsi</th></tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {filteredData.map(p => (
                <tr key={p.id}>
                   <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p></td>
                   <td className="px-4 py-5 text-[9px] font-bold text-gray-400 uppercase">{p.penempatan}</td>
                   <td className="px-10 py-5 text-right"><button className="text-blue-600 text-[10px] font-black uppercase">Detail</button></td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default MagangPKLPage;