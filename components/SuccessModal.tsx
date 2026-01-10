
import React, { useEffect } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, title = "Berhasil Disimpan", message = "Data Anda telah berhasil diperbarui di sistem." }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm animate-fadeIn" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center animate-modalEnter">
        <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6 border border-emerald-100 shadow-inner">
           <i className="bi bi-check-circle-fill text-6xl animate-bounce"></i>
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 leading-relaxed">
          {message}
        </p>
        <button 
          onClick={onClose}
          className="mt-8 px-10 py-3.5 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all w-full"
        >
          Tutup Notifikasi
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
