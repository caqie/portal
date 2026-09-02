import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, FaceRegistration } from '../types';
import { formatPegawaiName } from '../constants';
import {
  validateRegistrationPhoto,
  PhotoValidationResult
} from '../services/smartPresensi/FaceTemplateService';
import {
  getFaceRegistrationByNip,
  saveFaceRegistration
} from '../services/smartPresensi/SmartAttendanceService';
import { PresensiNavigationHeader } from '../components/PresensiNavigationHeader';

export const FaceRegistrationPage: React.FC = () => {
  const { id, nip } = useParams<{ id?: string; nip?: string }>();
  const targetNip = id || nip;
  const { user, isSuperadmin, canEdit, logActivity } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pegawai, setPegawai] = useState<Pegawai | null>(null);
  const [existingReg, setExistingReg] = useState<FaceRegistration | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<PhotoValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load Pegawai Data & Existing Registration
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allPegawai = await fetchPegawaiFromSheets();
        const effectiveNip = targetNip || user?.nip;
        const found = allPegawai.find(p => p.nip === effectiveNip || p.id === effectiveNip) || null;

        if (found) {
          setPegawai(found);
          const reg = getFaceRegistrationByNip(found.nip);
          setExistingReg(reg);
        } else if (user) {
          // Fallback to logged-in user profile
          const userAsPegawai: Pegawai = {
            id: user.id,
            nip: user.nip,
            nama: user.name,
            jabatan: user.role,
            unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
            gender: 'L',
            golRuang: 'III/a',
            jenisPegawai: 'PNS',
            status: 'Aktif'
          };
          setPegawai(userAsPegawai);
          const reg = getFaceRegistrationByNip(user.nip);
          setExistingReg(reg);
        }
      } catch (err) {
        console.error('Error loading pegawai for face registration:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [targetNip, user]);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.');
      return;
    }

    setSelectedFile(file);
    setValidating(true);
    setValidationResult(null);

    try {
      const result = await validateRegistrationPhoto(file);
      setValidationResult(result);
    } catch (e: any) {
      setValidationResult({
        isValid: false,
        faceCount: 0,
        qualityScore: 0,
        isSingleFace: false,
        isClear: false,
        isGoodLighting: false,
        isFrontal: false,
        errorMessage: 'Terjadi kesalahan saat memproses gambar.',
        previewUrl: ''
      });
    } finally {
      setValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSaveRegistration = async () => {
    if (!pegawai || !validationResult || !validationResult.isValid || !validationResult.descriptorToken) {
      return;
    }

    setSaving(true);
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('id-ID');
    const newVersion = (existingReg?.version || 0) + 1;

    const newRegistration: FaceRegistration = {
      id: `FREG_${pegawai.nip}_v${newVersion}`,
      employee_id: pegawai.nip,
      nip: pegawai.nip,
      nama: pegawai.nama,
      unitKerja: pegawai.unitKerja,
      jabatan: pegawai.jabatan,
      status: 'REGISTERED',
      face_template_reference: validationResult.descriptorToken,
      source_type: 'UPLOAD',
      source_file_reference: validationResult.previewUrl,
      version: newVersion,
      quality_score: validationResult.qualityScore,
      face_count: validationResult.faceCount,
      notes: `Registrasi biometrik foto wajah v${newVersion} terverifikasi mandiri`,
      created_at: existingReg?.created_at || formattedTimestamp,
      created_by: existingReg?.created_by || user?.name || 'Self',
      updated_at: formattedTimestamp,
      updated_by: user?.name || 'Self',
      verified_at: formattedTimestamp,
      verified_by: 'System Biometric Engine'
    };

    saveFaceRegistration(newRegistration);
    setExistingReg(newRegistration);

    logActivity(
      existingReg ? 'UPDATE' : 'CREATE',
      'Face Registration',
      `Registrasi wajah untuk ${pegawai.nama} (NIP: ${pegawai.nip}) berhasil disimpan (Versi: v${newVersion}, Kualitas: ${validationResult.qualityScore}%).`
    );

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-500">Memuat data pegawai...</p>
        </div>
      </div>
    );
  }

  if (!pegawai) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center space-y-4">
        <i className="bi bi-person-x text-4xl text-gray-300"></i>
        <h3 className="text-base font-bold text-gray-900">Data Pegawai Tidak Ditemukan</h3>
        <p className="text-xs text-gray-500">Silakan pilih pegawai yang valid dari database.</p>
        <button onClick={() => navigate('/pegawai')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase">
          Kembali ke Database Pegawai
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-fadeIn">
      {/* Universal Presensi Hub Header */}
      <PresensiNavigationHeader 
        title="Registrasi Wajah Pegawai"
        subtitle="Biometric Enrollment Master • Pendaftaran Foto Master Presensi"
      />

      {/* Identity Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0 overflow-hidden shadow-inner">
              {existingReg?.source_file_reference ? (
                <img src={existingReg.source_file_reference} alt={pegawai.nama} className="w-full h-full object-cover" />
              ) : pegawai.foto ? (
                <img src={pegawai.foto} alt={pegawai.nama} className="w-full h-full object-cover" />
              ) : (
                <i className="bi bi-person-fill"></i>
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                {formatPegawaiName(pegawai.nama)}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-300 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 font-bold">
                  NIP. {pegawai.nip}
                </span>
                <span>•</span>
                <span className="text-slate-300 font-sans">{pegawai.jabatan || 'Pegawai ASN'}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {pegawai.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual'}
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl shrink-0 w-full md:w-auto">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Metode Pendaftaran</p>
            <p className="text-xs font-bold text-blue-300 flex items-center gap-1.5 mt-0.5">
              <i className="bi bi-cloud-arrow-up-fill"></i>
              HANYA UPLOAD FOTO (Bebas Izin Kamera)
            </p>
          </div>
        </div>
      </div>

      {/* Upload & Validation Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
        <div>
          <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
            <i className="bi bi-camera-fill text-blue-600"></i>
            <span>Unggah Foto Master Wajah</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Foto yang diunggah akan dianalisis secara lokal untuk mengekstrak template biometrik yang aman.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' 
              : 'border-gray-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white'
          }`}
          onClick={() => document.getElementById('face-photo-input')?.click()}
        >
          <input
            id="face-photo-input"
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-sm">
              <i className="bi bi-cloud-arrow-up"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Tarik & Lepaskan foto di sini, atau <span className="text-blue-600 underline">Pilih Foto</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Format yang didukung: JPG, PNG, WEBP (Maks. 10 MB)
              </p>
            </div>
          </div>
        </div>

        {/* Validation Progress / Feedback */}
        {validating && (
          <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-4 animate-pulse">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
            <div>
              <p className="text-xs font-bold text-blue-900">Menganalisis Foto Biometrik...</p>
              <p className="text-[11px] text-blue-700">Mendeteksi jumlah wajah, pencahayaan, ketajaman, dan orientasi wajah.</p>
            </div>
          </div>
        )}

        {/* Validation Result Box */}
        {validationResult && !validating && (
          <div className={`p-6 rounded-3xl border transition-all ${
            validationResult.isValid 
              ? 'bg-emerald-50/60 border-emerald-200' 
              : 'bg-rose-50/60 border-rose-200'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Photo Preview */}
              {validationResult.previewUrl && (
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0 bg-white">
                  <img
                    src={validationResult.previewUrl}
                    alt="Preview Validasi"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Status List */}
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    validationResult.isValid 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {validationResult.isValid ? '✓ Foto Memenuhi Persyaratan' : '✕ Foto Ditolak'}
                  </span>

                  <span className="text-xs font-black text-gray-700">
                    Skor Kualitas: <span className="text-blue-600">{validationResult.qualityScore}%</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium pt-1">
                  <div className={`flex items-center gap-2 ${validationResult.isSingleFace ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
                    <i className={`bi ${validationResult.isSingleFace ? 'bi-check-circle-fill text-emerald-600' : 'bi-x-circle-fill'}`}></i>
                    <span>{validationResult.faceCount === 1 ? '1 Wajah Terdeteksi' : `${validationResult.faceCount} Wajah Terdeteksi`}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${validationResult.isGoodLighting ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
                    <i className={`bi ${validationResult.isGoodLighting ? 'bi-check-circle-fill text-emerald-600' : 'bi-x-circle-fill'}`}></i>
                    <span>{validationResult.isGoodLighting ? 'Pencahayaan & Kontras Cukup' : 'Pencahayaan Buruk'}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${validationResult.isFrontal ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
                    <i className={`bi ${validationResult.isFrontal ? 'bi-check-circle-fill text-emerald-600' : 'bi-x-circle-fill'}`}></i>
                    <span>{validationResult.isFrontal ? 'Wajah Menghadap ke Depan' : 'Wajah Tidak Menghadap Depan'}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${validationResult.isClear ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
                    <i className={`bi ${validationResult.isClear ? 'bi-check-circle-fill text-emerald-600' : 'bi-x-circle-fill'}`}></i>
                    <span>{validationResult.isClear ? 'Wajah Terlihat Jelas' : 'Foto Buram/Tertutup'}</span>
                  </div>
                </div>

                {validationResult.errorMessage && (
                  <p className="text-xs font-bold text-rose-700 bg-white/70 p-2.5 rounded-xl border border-rose-200 mt-2">
                    {validationResult.errorMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            {validationResult.isValid && (
              <div className="mt-6 pt-4 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-emerald-800 font-medium">
                  Foto siap digunakan sebagai master biometrik presensi.
                </p>
                <button
                  onClick={handleSaveRegistration}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan Template...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check"></i>
                      <span>Simpan Registrasi Wajah</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-800 animate-fadeIn">
            <div className="flex items-center gap-3">
              <i className="bi bi-check-circle-fill text-xl text-emerald-600"></i>
              <div>
                <p className="text-xs font-bold">Registrasi Wajah Berhasil Disimpan!</p>
                <p className="text-[11px] text-emerald-700">Pegawai kini dapat melakukan presensi cerdas dengan verifikasi kamera live.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/presensi')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
            >
              Uji Presensi Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Guidelines & Privacy Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Persyaratan Foto */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <i className="bi bi-info-circle-fill text-blue-600"></i>
            <span>Standar Foto Master Wajah</span>
          </h4>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2">
              <i className="bi bi-dot text-blue-600 text-base leading-none"></i>
              <span>Foto wajib menampilkan <strong>hanya 1 (satu) orang</strong> (bukan foto bersama/grup).</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="bi bi-dot text-blue-600 text-base leading-none"></i>
              <span>Wajah tidak boleh tertutup masker, kacamata hitam, atau topi yang menghalangi dahi/mata.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="bi bi-dot text-blue-600 text-base leading-none"></i>
              <span>Wajah menghadap lurus ke depan dengan pencahayaan yang merata dan tidak buram.</span>
            </li>
          </ul>
        </div>

        {/* Kebijakan Privasi & Perlindungan Data Biometrik */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <i className="bi bi-shield-lock-fill text-indigo-600"></i>
            <span>Pernyataan Privasi &amp; Keamanan Data</span>
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Data biometrik diproses menggunakan <em>abstraction layer</em> terenkripsi di sisi klien. Template biometrik tidak diekspos melalui URL atau API publik, dan semata-mata digunakan untuk verifikasi kehadiran resmi ASN DJKI Kemenkumham RI.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistrationPage;
