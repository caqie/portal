import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary tertangkap:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('absen_pdf_parsed_results');
      localStorage.removeItem('absen_pdf_parse_errors');
      localStorage.removeItem('um_tariff_config');
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                {this.props.fallbackTitle || 'Terjadi Kendala Memuat Halaman'}
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Aplikasi mendeteksi format data tidak terduga pada sesi ini. Anda dapat menyegarkan halaman atau mereset data sementara.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-left max-h-32 overflow-y-auto">
                <p className="text-[10px] font-mono text-red-700 font-bold break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <i className="bi bi-arrow-clockwise"></i> Muat Ulang
              </button>
              <button
                onClick={this.handleResetCache}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <i className="bi bi-trash"></i> Bersihkan Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
