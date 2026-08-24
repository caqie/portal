import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchLayananSDMFromSheets, 
  fetchPesanPengajuanFromSheets, 
  fetchMasterLayananFromSheets 
} from '../../spreadsheetService';
import { 
  generateLayananSDMNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  formatNotifRelativeTime,
  playNotificationChime
} from '../../layananSDMNotificationService';
import { NotifikasiSDM, PengajuanSDM, PesanPengajuan, MasterLayanan } from '../../types';

export const NotificationBellSDM: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'URGENT'>('ALL');
  const [pengajuanList, setPengajuanList] = useState<PengajuanSDM[]>([]);
  const [pesanList, setPesanList] = useState<PesanPengajuan[]>([]);
  const [masterList, setMasterList] = useState<MasterLayanan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Data
  const loadData = async (forceRemote = false) => {
    try {
      setIsLoading(true);
      const [pData, msgData, mData] = await Promise.all([
        fetchLayananSDMFromSheets(forceRemote),
        fetchPesanPengajuanFromSheets(undefined, forceRemote),
        fetchMasterLayananFromSheets(forceRemote)
      ]);
      setPengajuanList(pData || []);
      setPesanList(msgData || []);
      setMasterList(mData || []);
    } catch (err) {
      console.warn('Gagal memuat notifikasi Layanan SDM:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Event listener storage & custom sync
    const handleSync = () => {
      loadData();
    };
    window.addEventListener('storage_updated', handleSync);
    window.addEventListener('sdm_notifications_updated', handleSync);

    // Polling setiap 45 detik
    const interval = setInterval(() => {
      loadData(true);
    }, 45000);

    return () => {
      window.removeEventListener('storage_updated', handleSync);
      window.removeEventListener('sdm_notifications_updated', handleSync);
      clearInterval(interval);
    };
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Generate All Notifications
  const allNotifications = useMemo(() => {
    return generateLayananSDMNotifications(user, pengajuanList, pesanList, masterList);
  }, [user, pengajuanList, pesanList, masterList]);

  const unreadNotifications = useMemo(() => {
    return allNotifications.filter(n => !n.dibaca);
  }, [allNotifications]);

  const unreadCount = unreadNotifications.length;
  const hasHighPriority = unreadNotifications.some(n => n.prioritas === 'HIGH');

  // Play audio chime if new unread notification arrives
  useEffect(() => {
    if (prevUnreadCount !== null && unreadCount > prevUnreadCount) {
      playNotificationChime();
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount]);

  // Filtered Notifications based on Tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') {
      return allNotifications.filter(n => !n.dibaca);
    }
    if (activeTab === 'URGENT') {
      return allNotifications.filter(n => n.prioritas === 'HIGH' || n.tipe === 'PERLU_PERBAIKAN' || n.tipe === 'SLA_WARNING');
    }
    return allNotifications;
  }, [allNotifications, activeTab]);

  const handleNotificationClick = (notif: NotifikasiSDM) => {
    markNotificationAsRead(notif.id, user?.nip);
    setIsOpen(false);
    navigate(notif.link);
  };

  const handleMarkAllRead = () => {
    const ids = allNotifications.map(n => n.id);
    markAllNotificationsAsRead(ids, user?.nip);
  };

  const getNotifIconConfig = (tipe: string, prioritas?: string) => {
    switch (tipe) {
      case 'PERLU_PERBAIKAN':
        return {
          icon: 'bi-exclamation-octagon-fill',
          bg: 'bg-amber-100 text-amber-600 border border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'SELESAI':
        return {
          icon: 'bi-check-circle-fill',
          bg: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'TIKET_BARU':
        return {
          icon: 'bi-inbox-fill',
          bg: 'bg-blue-100 text-blue-600 border border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'PESAN_BARU':
        return {
          icon: 'bi-chat-dots-fill',
          bg: 'bg-purple-100 text-purple-600 border border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'SLA_WARNING':
        return {
          icon: 'bi-alarm-fill',
          bg: 'bg-rose-100 text-rose-600 border border-rose-200',
          dot: 'bg-rose-500'
        };
      case 'DITOLAK':
        return {
          icon: 'bi-x-circle-fill',
          bg: 'bg-red-100 text-red-600 border border-red-200',
          dot: 'bg-red-500'
        };
      default:
        return {
          icon: 'bi-info-circle-fill',
          bg: 'bg-slate-100 text-slate-600 border border-slate-200',
          dot: 'bg-blue-500'
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="btn-sdm-notif-bell"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadData();
        }}
        className={`relative h-9 w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
          isOpen 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/80'
        }`}
        title="Notifikasi Layanan SDM"
      >
        <i className={`bi ${unreadCount > 0 ? 'bi-bell-fill' : 'bi-bell'} text-base md:text-lg`}></i>

        {/* Badge Count */}
        {unreadCount > 0 && (
          <span 
            className={`absolute -top-1 -right-1 min-w-[18px] md:min-w-[20px] h-[18px] md:h-[20px] px-1 rounded-full text-[9px] md:text-[10px] font-black flex items-center justify-center text-white border-2 border-white shadow-md ${
              hasHighPriority ? 'bg-rose-600 animate-pulse' : 'bg-blue-600'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-3 w-[330px] sm:w-[400px] md:w-[440px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden animate-fadeIn"
          style={{ transformOrigin: 'top right' }}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <i className="bi bi-headset text-sm"></i>
              </div>
              <div>
                <h4 className="text-xs font-black tracking-tight leading-none text-white">Notifikasi Layanan SDM</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900 px-2.5 py-1 rounded-lg border border-blue-500/20 transition-all flex items-center gap-1"
                title="Tandai semua sudah dibaca"
              >
                <i className="bi bi-check2-all"></i>
                <span>Tandai Dibaca</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/80 px-2 pt-2 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-2 rounded-t-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-white text-blue-600 shadow-sm border-t border-x border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Semua</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-gray-200 text-gray-700">
                {allNotifications.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              className={`px-3 py-2 rounded-t-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'UNREAD'
                  ? 'bg-white text-blue-600 shadow-sm border-t border-x border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Belum Dibaca</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-600 text-white font-black">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('URGENT')}
              className={`px-3 py-2 rounded-t-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'URGENT'
                  ? 'bg-white text-amber-600 shadow-sm border-t border-x border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Perlu Perhatian</span>
              {allNotifications.some(n => n.prioritas === 'HIGH') && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
            {isLoading && allNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <i className="bi bi-arrow-clockwise animate-spin text-xl block mb-2 text-blue-600"></i>
                Memperbarui notifikasi...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <div className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-300 mx-auto flex items-center justify-center text-2xl mb-3">
                  <i className="bi bi-bell-slash"></i>
                </div>
                <p className="text-xs font-bold text-gray-700">Tidak Ada Notifikasi</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {activeTab === 'UNREAD' 
                    ? 'Semua notifikasi telah Anda baca.' 
                    : activeTab === 'URGENT' 
                    ? 'Tidak ada tiket yang memerlukan tindakan mendesak.' 
                    : 'Belum ada aktivitas layanan SDM.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const style = getNotifIconConfig(notif.tipe, notif.prioritas);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-blue-50/50 cursor-pointer transition-all flex items-start gap-3 relative group ${
                      !notif.dibaca ? 'bg-blue-50/20 font-medium' : 'bg-white opacity-85'
                    }`}
                  >
                    {/* Unread Indicator Bar */}
                    {!notif.dibaca && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                    )}

                    {/* Icon */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-base ${style.bg}`}>
                      <i className={`bi ${style.icon}`}></i>
                    </div>

                    {/* Detail */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {notif.nomorTiket}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                          {formatNotifRelativeTime(notif.timestamp)}
                        </span>
                      </div>

                      <h5 className={`text-xs font-bold truncate leading-tight ${
                        notif.tipe === 'PERLU_PERBAIKAN' ? 'text-amber-700' :
                        notif.tipe === 'SELESAI' ? 'text-emerald-700' :
                        notif.tipe === 'SLA_WARNING' ? 'text-rose-700' : 'text-gray-900'
                      }`}>
                        {notif.judul}
                      </h5>

                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.pesan}
                      </p>

                      {notif.namaLayanan && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold truncate max-w-[200px]">
                            <i className="bi bi-tag-fill mr-1"></i>
                            {notif.namaLayanan}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 ml-auto">
                            Lihat <i className="bi bi-arrow-right text-[9px]"></i>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/layanan-sdm/pengajuan-saya');
              }}
              className="text-gray-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <i className="bi bi-inboxes"></i>
              <span>Pengajuan Saya</span>
            </button>

            {(user?.role?.includes('Admin') || user?.role === 'Superadmin') && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/layanan-sdm');
                }}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <i className="bi bi-shield-check"></i>
                <span>Admin Layanan SDM</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBellSDM;
