import React from 'react';

interface PolaDistribusiCurveProps {
  capaianOrganisasi: string;
}

export const PolaDistribusiCurve: React.FC<PolaDistribusiCurveProps> = ({ capaianOrganisasi }) => {
  const raw = (capaianOrganisasi || '').toUpperCase();
  let key: 'ISTIMEWA' | 'BAIK' | 'CUKUP' | 'KURANG' | 'SANGAT_KURANG' = 'BAIK';
  if (raw.includes('ISTIMEWA')) key = 'ISTIMEWA';
  else if (raw.includes('SANGAT KURANG')) key = 'SANGAT_KURANG';
  else if (raw.includes('KURANG')) key = 'KURANG';
  else if (raw.includes('CUKUP') || raw.includes('BUTUH PERBAIKAN')) key = 'CUKUP';

  // Curve geometry matching official BKN PermenPANRB 6/2022 format
  // X positions: 
  // Sangat Kurang: 80, Kurang: 155, Butuh Perbaikan: 230, Baik: 305, Sangat Baik: 380
  const curves = {
    ISTIMEWA: {
      path: "M 35 110 C 120 110, 200 110, 270 90 C 320 70, 360 25, 380 25 C 395 25, 410 70, 420 110",
      peakX: 380,
      peakY: 25
    },
    BAIK: {
      path: "M 35 110 C 90 110, 160 100, 220 80 C 265 60, 290 25, 305 25 C 325 25, 350 75, 420 110",
      peakX: 305,
      peakY: 25
    },
    CUKUP: {
      path: "M 35 110 C 90 110, 150 75, 190 40 C 215 25, 245 25, 270 40 C 310 75, 370 110, 420 110",
      peakX: 230,
      peakY: 25
    },
    KURANG: {
      path: "M 35 110 C 70 110, 110 75, 135 40 C 145 25, 165 25, 180 40 C 220 75, 320 105, 420 110",
      peakX: 155,
      peakY: 25
    },
    SANGAT_KURANG: {
      path: "M 35 110 C 50 85, 65 30, 80 25 C 95 25, 120 70, 160 90 C 240 105, 340 110, 420 110",
      peakX: 80,
      peakY: 25
    }
  };

  const current = curves[key];
  const fillPath = `${current.path} L 420 110 L 35 110 Z`;

  return (
    <div className="w-full flex flex-col items-center justify-center p-1 bg-white">
      <svg 
        viewBox="0 0 450 145" 
        className="w-full max-w-[420px] overflow-visible"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <defs>
          <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bdd7ee" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#bdd7ee" stopOpacity="0.05" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
          </marker>
        </defs>

        {/* Y Axis with Arrow and Label */}
        <line x1="35" y1="110" x2="35" y2="12" stroke="#000" strokeWidth="1.2" markerEnd="url(#arrow)" />
        <text 
          x="30" 
          y="65" 
          textAnchor="middle" 
          fontSize="7.5px" 
          fontWeight="bold" 
          fill="#000"
          transform="rotate(-90 30 65)"
        >
          Frekuensi Pegawai
        </text>

        {/* Baseline X Axis */}
        <line x1="35" y1="110" x2="430" y2="110" stroke="#000" strokeWidth="1.2" />

        {/* Area fill under curve */}
        <path d={fillPath} fill={`url(#grad-${key})`} />

        {/* Curve Line */}
        <path d={current.path} fill="none" stroke="#000" strokeWidth="1.8" />

        {/* Peak vertical dashed line and marker */}
        <line 
          x1={current.peakX} 
          y1={current.peakY} 
          x2={current.peakX} 
          y2="110" 
          stroke="#000" 
          strokeWidth="1" 
          strokeDasharray="2,2" 
        />
        <circle cx={current.peakX} cy={current.peakY} r="3" fill="#000" />

        {/* Ticks on X axis */}
        {[80, 155, 230, 305, 380].map((xPos, idx) => (
          <line key={idx} x1={xPos} y1="110" x2={xPos} y2="114" stroke="#000" strokeWidth="1" />
        ))}

        {/* Category Labels on X Axis */}
        <text x="80" y="122" textAnchor="middle" fontSize="6.5px" fontWeight="bold" fill="#000">Sangat Kurang</text>
        <text x="155" y="122" textAnchor="middle" fontSize="6.5px" fontWeight="bold" fill="#000">Kurang/ Misconduct</text>
        <text x="230" y="122" textAnchor="middle" fontSize="6.5px" fontWeight="bold" fill="#000">Butuh Perbaikan</text>
        <text x="305" y="122" textAnchor="middle" fontSize="6.5px" fontWeight="bold" fill="#000">Baik</text>
        <text x="380" y="122" textAnchor="middle" fontSize="6.5px" fontWeight="bold" fill="#000">Sangat Baik</text>

        {/* Subtitle Under X-axis */}
        <text x="230" y="136" textAnchor="middle" fontSize="7.5px" fontWeight="bold" fill="#000">
          Predikat Kinerja Pegawai
        </text>
      </svg>
    </div>
  );
};
