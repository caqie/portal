
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus",
  message = "Apakah Anda yakin ingin menghapus data ini secara permanen?",
  confirmText = "Ya, Hapus Data",
  cancelText = "Batal",
  isDanger = true,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-fadeIn" onClick={() => !loading && onClose()}></div>
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center animate-modalEnter border border-white/20">
        <div className={`h-20 w-20 ${isDanger ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-blue-50 text-blue-500 border-blue-100'} rounded-3xl flex items-center justify-center mb-6 border shadow-inner`}>
           <i className={`bi ${isDanger ? 'bi-trash3-fill' : 'bi-question-circle-fill'} text-4xl`}></i>
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{title}</h3>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-4 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 mt-10 w-full">
            <button 
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {cancelText}
            </button>
            <button 
              disabled={loading}
              onClick={onConfirm}
              className={`flex-[1.5] py-4 ${isDanger ? 'bg-rose-600 shadow-rose-600/30' : 'bg-blue-600 shadow-blue-600/30'} text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2`}
            >
              {loading && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              <span>{loading ? 'Memproses...' : confirmText}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
