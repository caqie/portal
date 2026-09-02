import React, { useState, useMemo } from 'react';
import { DIPA_SDM_POK_DATA, DipaPokItem } from '../dipaPokData';

interface DipaPokDetailViewProps {
  canEdit?: boolean;
}

export const DipaPokDetailView: React.FC<DipaPokDetailViewProps> = ({ canEdit = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKro, setSelectedKro] = useState<string>('ALL');
  const [selectedSubTim, setSelectedSubTim] = useState<string>('ALL');
  const [filterBlokir, setFilterBlokir] = useState<string>('ALL');
  const [filterRealisasi, setFilterRealisasi] = useState<'ALL' | 'WITH_REALISASI' | 'WITHOUT_REALISASI'>('ALL');
  const [showRealisasiColumns, setShowRealisasiColumns] = useState<boolean>(true);
  const [showRincianColumns, setShowRincianColumns] = useState<boolean>(true);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'prog-135-05-wa': true,
    'keg-7122': true,
    'kro-7122-eba': true,
    'ro-7122-eba-002': true,
    'komp-054-eba': true,
    'subkomp-054-a': true,
    'subkomp-054-b': true,
    'subkomp-054-d': true,
    'subkomp-054-e': true,
    'subkomp-054-f': true,
    'komp-055-eba': true,
    'subkomp-055-a': true,
    'subkomp-055-b': true,
    'subkomp-055-c': true,
    'kro-7122-ebc': true,
    'ro-7122-ebc-210': true,
    'komp-052-ebc': true,
    'subkomp-052-a': true,
    'komp-053-ebc': true,
    'subkomp-053-a': true,
    'kro-7122-ebd': true,
    'ro-7122-ebd-002': true,
    'komp-055-ebd': true,
    'subkomp-055-ebd-a': true,
    'subkomp-055-ebd-b': true,
    'subkomp-055-ebd-i': true,
    'komp-056-ebd': true,
    'subkomp-056-b': true,
    'subkomp-056-c': true,
    'subkomp-056-d': true,
    'subkomp-056-e': true,
    'subkomp-056-f': true,
    'subkomp-056-h': true,
    'subkomp-056-j': true,
    'subkomp-056-k': true
  });

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (val?: number | string) => {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') {
      return new Intl.NumberFormat('id-ID').format(val);
    }
    return val;
  };

  // Toggle single node
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (items: DipaPokItem[]) => {
      items.forEach(item => {
        allIds[item.id] = true;
        if (item.children) traverse(item.children);
      });
    };
    traverse(DIPA_SDM_POK_DATA);
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Export to CSV with Realisasi & Sisa Pagu
  const handleExportCSV = () => {
    const rows: string[][] = [
      [
        'KODE',
        'PROGRAM / AKTIVITAS / KRO / RO / KOMPONEN / SUBKOMPONEN / DETAIL',
        'RINCIAN PERHITUNGAN',
        'JUMLAH / VOLUME',
        'SATUAN',
        'HARGA SATUAN (RP)',
        'TOTAL PAGU (MENJADI RP)',
        'PENGURANGAN / PENAMBAHAN (REALISASI RP)',
        'SISA PAGU (RP)',
        '% REALISASI',
        'STATUS BLOKIR'
      ]
    ];

    const traverse = (items: DipaPokItem[]) => {
      items.forEach(item => {
        const realisasiVal = item.penguranganPenambahan ?? item.realisasi ?? 0;
        const sisaVal = (item.jumlah || 0) - realisasiVal;
        const pct = item.jumlah > 0 ? ((realisasiVal / item.jumlah) * 100).toFixed(1) + '%' : '-';

        rows.push([
          item.kode,
          item.nama,
          item.rincianPerhitungan || '',
          item.volume !== undefined ? String(item.volume) : '',
          item.satuan || '',
          item.hargaSatuan !== undefined ? String(item.hargaSatuan) : '',
          String(item.jumlah || 0),
          String(realisasiVal),
          String(sisaVal),
          pct,
          item.isBlokir ? 'BLOKIR' : 'AKTIF'
        ]);
        if (item.children) traverse(item.children);
      });
    };

    traverse(DIPA_SDM_POK_DATA);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DIPA_POK_SDM_DJKI_DENGAN_REALISASI_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to check if node or its children have realization
  const hasRealisasiValue = (node: DipaPokItem): boolean => {
    if ((node.penguranganPenambahan && node.penguranganPenambahan > 0) || (node.realisasi && node.realisasi > 0)) {
      return true;
    }
    if (node.children) {
      return node.children.some(hasRealisasiValue);
    }
    return false;
  };

  // Flatten and filter items for search/filtering
  const filterTree = (nodes: DipaPokItem[]): DipaPokItem[] => {
    const results: DipaPokItem[] = [];

    for (const node of nodes) {
      const matchesSearch =
        searchQuery === '' ||
        node.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.rincianPerhitungan && node.rincianPerhitungan.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesKro =
        selectedKro === 'ALL' ||
        node.kode.startsWith(selectedKro) ||
        node.level === 'PROGRAM' ||
        node.level === 'KEGIATAN';

      const matchesSubTim =
        selectedSubTim === 'ALL' ||
        !node.subTim ||
        node.subTim === selectedSubTim;

      const matchesBlokir =
        filterBlokir === 'ALL' ||
        (filterBlokir === 'BLOKIR' && node.isBlokir) ||
        (filterBlokir === 'NON_BLOKIR' && !node.isBlokir);

      const matchesRealisasi =
        filterRealisasi === 'ALL' ||
        (filterRealisasi === 'WITH_REALISASI' && hasRealisasiValue(node)) ||
        (filterRealisasi === 'WITHOUT_REALISASI' && !hasRealisasiValue(node));

      let filteredChildren: DipaPokItem[] = [];
      if (node.children && node.children.length > 0) {
        filteredChildren = filterTree(node.children);
      }

      const isSelfMatch = matchesSearch && matchesKro && matchesSubTim && matchesBlokir && matchesRealisasi;
      const hasMatchingChild = filteredChildren.length > 0;

      if (isSelfMatch || hasMatchingChild) {
        results.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });
      }
    }

    return results;
  };

  const visibleTree = useMemo(() => {
    return filterTree(DIPA_SDM_POK_DATA);
  }, [searchQuery, selectedKro, selectedSubTim, filterBlokir, filterRealisasi]);

  // Aggregate stats
  const totalDipa = 21134433000;
  const totalRealisasi = 531752000;
  const totalSisa = totalDipa - totalRealisasi;
  const totalPersen = ((totalRealisasi / totalDipa) * 100).toFixed(2);

  const kroEbaPagu = 6621672000;
  const kroEbaRealisasi = 199261000;
  const kroEbaSisa = kroEbaPagu - kroEbaRealisasi;
  const kroEbaPersen = ((kroEbaRealisasi / kroEbaPagu) * 100).toFixed(2);

  const kroEbcPagu = 2227420000;
  const kroEbcRealisasi = 66615000;
  const kroEbcSisa = kroEbcPagu - kroEbcRealisasi;
  const kroEbcPersen = ((kroEbcRealisasi / kroEbcPagu) * 100).toFixed(2);

  const kroEbdPagu = 12285341000;
  const kroEbdRealisasi = 265876000;
  const kroEbdSisa = kroEbdPagu - kroEbdRealisasi;
  const kroEbdPersen = ((kroEbdRealisasi / kroEbdPagu) * 100).toFixed(2);

  // Render tree row recursive
  const renderRow = (item: DipaPokItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedNodes[item.id] ?? true;

    const realisasiVal = item.penguranganPenambahan ?? item.realisasi;
    const hasRealisasi = realisasiVal !== undefined && realisasiVal > 0;
    const sisaPagu = item.jumlah - (realisasiVal || 0);
    const persen = item.jumlah > 0 && realisasiVal !== undefined ? ((realisasiVal / item.jumlah) * 100).toFixed(1) : undefined;

    // Styling based on Level matching official DIPA/POK sheet
    let rowBg = 'hover:bg-blue-50/40 transition-colors bg-white';
    let kodeClass = 'text-gray-700 font-mono text-xs';
    let namaClass = 'text-gray-800 text-xs';
    const indentPadding = depth * 14;

    if (item.level === 'PROGRAM') {
      rowBg = 'bg-slate-900 text-white font-black hover:bg-slate-800';
      kodeClass = 'text-amber-300 font-mono font-black text-xs tracking-wider';
      namaClass = 'text-white font-black text-xs uppercase tracking-wide';
    } else if (item.level === 'KEGIATAN') {
      rowBg = 'bg-indigo-900 text-white font-bold hover:bg-indigo-800';
      kodeClass = 'text-indigo-200 font-mono font-bold text-xs';
      namaClass = 'text-indigo-100 font-bold text-xs';
    } else if (item.level === 'KRO') {
      rowBg = 'bg-blue-800 text-white font-bold hover:bg-blue-700';
      kodeClass = 'text-cyan-300 font-mono font-bold text-xs';
      namaClass = 'text-cyan-100 font-bold text-xs uppercase';
    } else if (item.level === 'RO') {
      rowBg = 'bg-blue-100/90 text-blue-950 font-bold border-t border-b border-blue-200';
      kodeClass = 'text-blue-900 font-mono font-black text-xs';
      namaClass = 'text-blue-950 font-black text-xs';
    } else if (item.level === 'KOMPONEN') {
      rowBg = 'bg-amber-100/80 text-amber-950 font-bold border-t border-amber-200';
      kodeClass = 'text-amber-900 font-mono font-bold text-xs';
      namaClass = 'text-amber-950 font-bold text-xs';
    } else if (item.level === 'SUBKOMPONEN') {
      rowBg = 'bg-yellow-50 text-slate-900 font-semibold border-t border-yellow-200/60';
      kodeClass = 'text-amber-800 font-mono font-bold text-xs';
      namaClass = 'text-slate-900 font-bold text-xs';
    } else if (item.level === 'AKUN') {
      rowBg = 'bg-slate-50 text-slate-800 font-medium border-t border-slate-200';
      kodeClass = 'text-indigo-700 font-mono font-black text-xs bg-indigo-50 px-1.5 py-0.5 rounded';
      namaClass = 'text-slate-800 font-semibold text-xs';
    } else if (item.isBlokir) {
      rowBg = 'bg-rose-50/70 text-rose-950 hover:bg-rose-100/70';
      kodeClass = 'text-rose-700 font-mono text-xs';
      namaClass = 'text-rose-900 text-xs font-medium';
    }

    return (
      <React.Fragment key={item.id}>
        <tr className={`border-b border-gray-100 ${rowBg}`}>
          {/* KODE */}
          <td className="py-2.5 px-3 whitespace-nowrap align-top">
            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${indentPadding}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleNode(item.id)}
                  className="w-4 h-4 rounded flex items-center justify-center text-[11px] hover:bg-black/10 transition-colors shrink-0"
                >
                  <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                </button>
              ) : (
                <span className="w-4 shrink-0"></span>
              )}
              <span className={kodeClass}>{item.kode}</span>
            </div>
          </td>

          {/* PROGRAM / AKTIVITAS / DETAIL */}
          <td className="py-2.5 px-3 align-top min-w-[280px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={namaClass}>{item.nama}</span>
                {item.isBlokir && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                    <i className="bi bi-lock-fill text-[8px]"></i>
                    <span>Blokir</span>
                  </span>
                )}
                {hasRealisasi && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <i className="bi bi-check2-circle text-[8px]"></i>
                    <span>Teralokasi</span>
                  </span>
                )}
                {item.subTim && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {item.subTim}
                  </span>
                )}
              </div>
              {item.keterangan && (
                <p className="text-[10px] text-gray-500 italic mt-0.5">{item.keterangan}</p>
              )}
            </div>
          </td>

          {/* RINCIAN PERHITUNGAN */}
          {showRincianColumns && (
            <>
              <td className="py-2.5 px-3 text-left font-mono text-[11px] text-gray-700 whitespace-nowrap align-top">
                {item.rincianPerhitungan || ''}
              </td>

              {/* JUMLAH / VOLUME */}
              <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-gray-800 whitespace-nowrap align-top">
                {formatNumber(item.volume)}
              </td>

              {/* SATUAN */}
              <td className="py-2.5 px-3 text-center font-mono font-bold text-[11px] text-gray-600 whitespace-nowrap align-top">
                {item.satuan || ''}
              </td>

              {/* HARGA SATUAN */}
              <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700 whitespace-nowrap align-top">
                {item.hargaSatuan ? formatRupiah(item.hargaSatuan) : ''}
              </td>
            </>
          )}

          {/* TOTAL PAGU (MENJADI RP) */}
          <td className="py-2.5 px-3 text-right font-mono font-black text-xs whitespace-nowrap align-top">
            <span
              className={
                item.level === 'PROGRAM'
                  ? 'text-amber-300 text-xs'
                  : item.level === 'KRO'
                  ? 'text-cyan-200'
                  : 'text-gray-900'
              }
            >
              {formatRupiah(item.jumlah)}
            </span>
          </td>

          {/* REALISASI / PENGURANGAN / PENAMBAHAN */}
          {showRealisasiColumns && (
            <>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-xs whitespace-nowrap align-top bg-emerald-50/40">
                {hasRealisasi ? (
                  <span className="text-emerald-700 font-black bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                    {formatRupiah(realisasiVal)}
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal">-</span>
                )}
              </td>

              {/* SISA PAGU */}
              <td className="py-2.5 px-3 text-right font-mono font-bold text-xs whitespace-nowrap align-top bg-slate-50/50">
                <span className={sisaPagu < 0 ? 'text-rose-600 font-black' : 'text-gray-800'}>
                  {formatRupiah(sisaPagu)}
                </span>
              </td>

              {/* % REALISASI / SERAPAN */}
              <td className="py-2.5 px-3 text-center align-top">
                {persen !== undefined ? (
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                        Number(persen) >= 80
                          ? 'bg-emerald-600 text-white'
                          : Number(persen) > 0
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {persen}%
                    </span>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          Number(persen) >= 80 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, Number(persen))}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">-</span>
                )}
              </td>
            </>
          )}
        </tr>

        {/* Render Children if Expanded */}
        {hasChildren && isExpanded && item.children!.map(child => renderRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-gray-900">
      {/* Top Banner KPI Cards of DIPA Breakdown with Realisasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total DIPA */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-5 rounded-2xl shadow-md border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-200 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Total POK DIPA SDM</span>
            <i className="bi bi-wallet2 text-lg text-emerald-400"></i>
          </div>
          <p className="text-xl md:text-2xl font-black text-white">{formatRupiah(totalDipa)}</p>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10 text-[11px]">
            <span className="text-emerald-300 font-semibold">
              Realisasi: {formatRupiah(totalRealisasi)}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 font-mono font-black px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/30">
              {totalPersen}%
            </span>
          </div>
        </div>

        {/* Card 2: KRO 7122.EBA */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              7122.EBA - Manajemen Internal
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800">
              {kroEbaPersen}% Serapan
            </span>
          </div>
          <p className="text-lg font-black text-gray-900">{formatRupiah(kroEbaPagu)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
            <span>
              Realisasi: <strong className="text-emerald-600">{formatRupiah(kroEbaRealisasi)}</strong>
            </span>
            <span className="font-mono text-gray-600">Sisa: {formatRupiah(kroEbaSisa)}</span>
          </div>
        </div>

        {/* Card 3: KRO 7122.EBC */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              7122.EBC - Layanan SDM
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800">
              {kroEbcPersen}% Serapan
            </span>
          </div>
          <p className="text-lg font-black text-gray-900">{formatRupiah(kroEbcPagu)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
            <span>
              Realisasi: <strong className="text-emerald-600">{formatRupiah(kroEbcRealisasi)}</strong>
            </span>
            <span className="font-mono text-gray-600">Sisa: {formatRupiah(kroEbcSisa)}</span>
          </div>
        </div>

        {/* Card 4: KRO 7122.EBD */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              7122.EBD - Peningkatan &amp; Kinerja
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
              {kroEbdPersen}% Serapan
            </span>
          </div>
          <p className="text-lg font-black text-gray-900">{formatRupiah(kroEbdPagu)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
            <span>
              Realisasi: <strong className="text-emerald-600">{formatRupiah(kroEbdRealisasi)}</strong>
            </span>
            <span className="font-mono text-gray-600">Sisa: {formatRupiah(kroEbdSisa)}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <i className="bi bi-search absolute left-3.5 top-2.5 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari dalam POK: KRO, Komponen, Tiket, Narasumber, Paket Meeting, Ukom, BPSDM..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowRealisasiColumns(!showRealisasiColumns)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                showRealisasiColumns
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Toggle Kolom Realisasi & Sisa Pagu"
            >
              <i className="bi bi-graph-up-arrow"></i>
              <span>{showRealisasiColumns ? 'Sembunyikan Realisasi' : 'Tampilkan Realisasi'}</span>
            </button>

            <button
              onClick={() => setShowRincianColumns(!showRincianColumns)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                showRincianColumns
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Toggle Kolom Volume & Rincian Perhitungan"
            >
              <i className="bi bi-list-columns"></i>
              <span>{showRincianColumns ? 'Mode Ringkas' : 'Mode Rincian'}</span>
            </button>

            <button
              onClick={handleExpandAll}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              title="Buka seluruh sub-tingkatan"
            >
              <i className="bi bi-arrows-expand"></i>
              <span>Expand All</span>
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              title="Tutup seluruh tingkatan"
            >
              <i className="bi bi-arrows-collapse"></i>
              <span>Collapse All</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              <i className="bi bi-file-earmark-spreadsheet-fill"></i>
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <i className="bi bi-printer-fill"></i>
              <span>Cetak POK</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500">Filter KRO:</span>
            <select
              value={selectedKro}
              onChange={e => setSelectedKro(e.target.value)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua KRO (135.05.WA)</option>
              <option value="7122.EBA">7122.EBA - Manajemen Internal (Rp 6,62 M)</option>
              <option value="7122.EBC">7122.EBC - Layanan SDM (Rp 2,22 M)</option>
              <option value="7122.EBD">7122.EBD - Fasilitasi Peningkatan & Evaluasi (Rp 12,28 M)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500">Sub-Tim SDM:</span>
            <select
              value={selectedSubTim}
              onChange={e => setSelectedSubTim(e.target.value)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Sub-Tim Tupoksi</option>
              <option value="Sub-Tim 1 (Perencanaan & Layanan)">Sub-Tim 1 (Perencanaan & Layanan)</option>
              <option value="Sub-Tim 2 (Mutasi & Pengembangan)">Sub-Tim 2 (Mutasi & Pengembangan)</option>
              <option value="Sub-Tim 3 (Kesejahteraan & Disiplin)">Sub-Tim 3 (Kesejahteraan & Disiplin)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500">Status Realisasi:</span>
            <select
              value={filterRealisasi}
              onChange={e => setFilterRealisasi(e.target.value as any)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Item Anggaran</option>
              <option value="WITH_REALISASI">Hanya Yang Ada Realisasi / Pengurangan</option>
              <option value="WITHOUT_REALISASI">Belum Terealisasi</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500">Status Blokir:</span>
            <select
              value={filterBlokir}
              onChange={e => setFilterBlokir(e.target.value)}
              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Status Blokir</option>
              <option value="BLOKIR">Hanya Item Berstatus Blokir</option>
              <option value="NON_BLOKIR">Hanya Item Bebas Blokir (Aktif)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main RKA-K/L Table Sheet with Realization Columns */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-900">
          <div>
            <div className="flex items-center gap-2">
              <i className="bi bi-file-earmark-spreadsheet text-emerald-400 text-lg"></i>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Petunjuk Operasional Kegiatan (POK) RKA-K/L DIPA SDM DJKI Beserta Realisasi
              </h3>
            </div>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Kementerian Hukum &amp; Hak Asasi Manusia RI / Direktorat Jenderal Kekayaan Intelektual (T.A.{' '}
              {new Date().getFullYear()})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-300 font-bold">
              Total Realisasi: {formatRupiah(totalRealisasi)} ({totalPersen}%)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider sticky top-0 z-20 shadow-xs border-b border-slate-300">
              <tr>
                <th className="py-3 px-3 w-40">Kode</th>
                <th className="py-3 px-3">Program / Aktivitas / KRO / RO / Komponen / SubKomp / Detail</th>
                {showRincianColumns && (
                  <>
                    <th className="py-3 px-3 w-44">Rincian Perhitungan</th>
                    <th className="py-3 px-3 text-center w-16">Jumlah</th>
                    <th className="py-3 px-3 text-center w-16">Satuan</th>
                    <th className="py-3 px-3 text-right w-28">Harga Satuan</th>
                  </>
                )}
                <th className="py-3 px-3 text-right w-36 bg-slate-200/60">Pagu (Menjadi Rp)</th>
                {showRealisasiColumns && (
                  <>
                    <th className="py-3 px-3 text-right w-36 bg-emerald-100 text-emerald-950">
                      Pengurangan / Realisasi (Rp)
                    </th>
                    <th className="py-3 px-3 text-right w-36 bg-slate-200/70">Sisa Pagu (Rp)</th>
                    <th className="py-3 px-3 text-center w-20 bg-slate-200/50">% Realisasi</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans">
              {visibleTree.length > 0 ? (
                visibleTree.map(item => renderRow(item, 0))
              ) : (
                <tr>
                  <td
                    colSpan={showRincianColumns ? (showRealisasiColumns ? 10 : 7) : showRealisasiColumns ? 6 : 3}
                    className="py-12 text-center text-gray-500"
                  >
                    <i className="bi bi-inbox text-3xl text-gray-300 block mb-2"></i>
                    <p className="text-xs font-bold">
                      Tidak ada item POK yang sesuai dengan kriteria pencarian &amp; filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="bg-slate-900 text-white p-4 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-800 border border-white/20 inline-block"></span>
              <span className="text-gray-300">Program / Kegiatan</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-700 inline-block"></span>
              <span className="text-gray-300">KRO / RO</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
              <span className="text-gray-300">Komponen / Subkomp</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-gray-300">Teralokasi Realisasi</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-gray-300">Akun Blokir</span>
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Total Pagu:</span>
              <span className="text-sm font-black text-amber-300 font-mono">{formatRupiah(totalDipa)}</span>
            </div>
            {showRealisasiColumns && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Realisasi:</span>
                  <span className="text-sm font-black text-emerald-300 font-mono">
                    {formatRupiah(totalRealisasi)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Sisa:</span>
                  <span className="text-sm font-black text-white font-mono">{formatRupiah(totalSisa)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DipaPokDetailView;
