import React from 'react';

/**
 * High-fidelity vector logos for External Kepegawaian applications
 * Rendered crisply for the portal cards.
 */

// 1. SIMPEG HUKUM Logo
export const SimpegLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(10, 5)">
      {/* Hexagon & Kami PASTI Emblem */}
      <g transform="scale(0.42)">
        {/* Hexagon White/Blue Outline */}
        <path
          d="M100 10 L170 50 L170 90 L148 102 L148 62 L100 35 L52 62 L52 102 L30 90 L30 50 Z"
          fill="#1E3A8A"
        />
        <path
          d="M30 115 L52 103 L52 142 L100 170 L148 142 L148 103 L170 115 L170 155 L100 195 L30 155 Z"
          fill="#1E3A8A"
        />
        {/* Circle */}
        <circle cx="100" cy="102" r="36" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M66 102 A34 34 0 0 1 134 102 Z" fill="#DC2626" />
        <path d="M66 102 A34 34 0 0 0 134 102 Z" fill="#FFFFFF" />
        {/* Figures */}
        <g transform="translate(76, 76) scale(0.5)">
          <circle cx="48" cy="20" r="5" fill="#1E3A8A" />
          <path d="M48 26 L48 60 L38 80 M48 60 L58 80 M48 35 L28 45 M48 35 L68 45" stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" />
          <circle cx="28" cy="26" r="4.5" fill="#1E3A8A" />
          <path d="M28 32 L28 60 L20 80 M28 60 L36 80" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="68" cy="26" r="4.5" fill="#1E3A8A" />
          <path d="M68 32 L68 60 L60 80 M68 60 L76 80" stroke="#1E3A8A" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </g>

      {/* Typography */}
      <g transform="translate(86, 32)">
        <text x="0" y="8" fill="#1E3A8A" fontSize="18" fontWeight="900" letterSpacing="1" fontFamily="system-ui, -apple-system, sans-serif">
          SIMPEG
        </text>
        <text x="0" y="26" fill="#0284C7" fontSize="13" fontWeight="800" letterSpacing="3" fontFamily="system-ui, -apple-system, sans-serif">
          HUKUM
        </text>
        <text x="0" y="38" fill="#64748B" fontSize="7" fontWeight="700" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          KEMENKUMHAM RI
        </text>
      </g>
    </g>
  </svg>
);

// 2. SERAYA Kemenkumham Logo
export const SerayaLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(10, 8)">
      {/* Gold & Navy Hexagon S */}
      <g transform="scale(0.38)">
        <path d="M100 8 L175 52 L175 90 L160 90 L160 60 L100 25 L40 60 L40 90 L25 90 L25 52 Z" fill="#EAB308" />
        <path d="M25 110 L40 110 L40 140 L100 175 L160 140 L160 110 L175 110 L175 148 L100 192 L25 148 Z" fill="#EAB308" />
        <path d="M92 18 L108 18 L108 80 L92 80 Z" fill="#EAB308" />
        <path d="M92 120 L108 120 L108 182 L92 182 Z" fill="#EAB308" />
        <path d="M60 62 L145 62 L145 92 L88 92 L145 128 L145 158 L55 158 L55 128 L112 128 L55 92 Z" fill="#1E293B" />
      </g>

      {/* Typography */}
      <g transform="translate(80, 28)">
        <text x="0" y="10" fill="#EAB308" fontSize="20" fontWeight="900" letterSpacing="1.5" fontFamily="system-ui, -apple-system, sans-serif">
          SERAYA
        </text>
        <text x="0" y="27" fill="#0F172A" fontSize="10" fontWeight="800" letterSpacing="1" fontFamily="system-ui, -apple-system, sans-serif">
          LHKPN &amp; SPT
        </text>
        <text x="0" y="39" fill="#94A3B8" fontSize="7" fontWeight="700" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          KEMENKUMHAM RI
        </text>
      </g>
    </g>
  </svg>
);

// 3. SIASN BKN RI Logo
export const BknLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(10, 6)">
      {/* BKN Emblem */}
      <g transform="scale(0.38)">
        <circle cx="100" cy="12" r="10" fill="#E11D48" />
        <path d="M100 70 L50 25 L65 18 L100 60 Z" fill="#CBD5E1" />
        <path d="M100 70 L150 25 L135 18 L100 60 Z" fill="#CBD5E1" />
        <path d="M100 80 L18 70 L15 56 L100 72 Z" fill="#CBD5E1" />
        <path d="M100 80 L182 70 L185 56 L100 72 Z" fill="#CBD5E1" />
        <path d="M100 90 L75 160 L62 155 L90 85 Z" fill="#CBD5E1" />
        <path d="M100 90 L125 160 L138 155 L110 85 Z" fill="#CBD5E1" />
        <path d="M88 20 C88 50 72 80 30 130 L45 138 C82 92 98 60 98 20 Z" fill="#E11D48" />
        <path d="M112 20 C112 50 128 80 170 130 L155 138 C118 92 102 60 102 20 Z" fill="#E11D48" />
        <path d="M10 100 C60 85 140 85 190 100 L188 112 C140 98 60 98 12 112 Z" fill="#0284C7" />
        <path d="M55 150 C75 120 125 120 145 150 L133 158 C118 132 82 132 67 158 Z" fill="#0284C7" />
        <circle cx="100" cy="90" r="10" fill="#0284C7" />
      </g>

      {/* Typography */}
      <g transform="translate(82, 28)">
        <text x="0" y="12" fill="#0284C7" fontSize="22" fontWeight="900" letterSpacing="2" fontFamily="system-ui, -apple-system, sans-serif">
          B<tspan fill="#E11D48">K</tspan>N
        </text>
        <text x="0" y="27" fill="#334155" fontSize="10" fontWeight="800" letterSpacing="1" fontFamily="system-ui, -apple-system, sans-serif">
          SIASN DIGITAL
        </text>
        <text x="0" y="39" fill="#94A3B8" fontSize="7" fontWeight="700" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          BKN REPUBLIK INDONESIA
        </text>
      </g>
    </g>
  </svg>
);

// 4. SIAP Pegawai Logo (3 Professional Avatars)
export const SiapLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(10, 8)">
      {/* 3 Avatars */}
      <g transform="scale(0.38)">
        {/* Left */}
        <ellipse cx="62" cy="48" rx="22" ry="26" fill="#FBBF24" />
        <ellipse cx="60" cy="52" rx="18" ry="22" fill="#FDE68A" />
        <path d="M42 45 C42 28 55 22 75 22 C85 22 86 32 82 40 C75 30 58 35 42 45 Z" fill="#B45309" />
        <path d="M22 125 C22 90 40 75 62 75 C75 75 88 85 92 105 L62 125 Z" fill="#64748B" />
        {/* Right */}
        <ellipse cx="138" cy="52" rx="22" ry="26" fill="#FBBF24" />
        <ellipse cx="136" cy="56" rx="18" ry="22" fill="#FDE68A" />
        <path d="M118 48 C118 32 130 26 150 26 C160 26 162 35 158 44 C150 34 135 38 118 48 Z" fill="#B45309" />
        <path d="M108 105 C112 85 125 75 138 75 C160 75 178 90 178 125 L138 125 Z" fill="#16A34A" />
        {/* Center */}
        <ellipse cx="100" cy="118" rx="24" ry="28" fill="#FBBF24" />
        <ellipse cx="98" cy="122" rx="20" ry="24" fill="#FDE68A" />
        <path d="M74 112 C74 85 90 76 112 76 C128 76 130 90 128 112 C128 132 120 142 115 145 C118 130 112 105 100 105 C88 105 82 130 85 145 C80 142 74 132 74 112 Z" fill="#FACC15" />
        <path d="M55 190 C55 150 78 138 100 138 C122 138 145 150 145 190 Z" fill="#0284C7" />
        <path d="M82 138 L100 172 L118 138 Z" fill="#FFFFFF" />
      </g>

      {/* Typography */}
      <g transform="translate(80, 28)">
        <text x="0" y="10" fill="#4338CA" fontSize="20" fontWeight="900" letterSpacing="1" fontFamily="system-ui, -apple-system, sans-serif">
          SIAP
        </text>
        <text x="0" y="26" fill="#1E293B" fontSize="11" fontWeight="800" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          ADMIN SDM
        </text>
        <text x="0" y="38" fill="#94A3B8" fontSize="7" fontWeight="700" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          KEMENKUMHAM RI
        </text>
      </g>
    </g>
  </svg>
);

// 5. Dossier Digital Logo (Green Lever-Arch Folder)
export const DossierLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="translate(10, 8)">
      {/* Green Folder */}
      <g transform="scale(0.38)">
        <path d="M40 25 L155 12 L155 200 L40 220 Z" fill="#16A34A" />
        <path d="M12 30 L40 25 L40 220 L12 215 Z" fill="#15803D" />
        <path d="M42 25 L145 16 L148 24 L42 32 Z" fill="#F8FAFC" />
        <rect x="15" y="48" width="22" height="68" rx="2" fill="#FFFFFF" />
        <line x1="18" y1="58" x2="34" y2="58" stroke="#94A3B8" strokeWidth="1.5" />
        <line x1="18" y1="66" x2="34" y2="66" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="18" y1="74" x2="34" y2="74" stroke="#CBD5E1" strokeWidth="1" />
        <rect x="48" y="90" width="20" height="8" rx="4" fill="#E2E8F0" stroke="#475569" strokeWidth="1.5" />
        <rect x="48" y="142" width="20" height="8" rx="4" fill="#E2E8F0" stroke="#475569" strokeWidth="1.5" />
        <circle cx="26" cy="180" r="7" fill="#334155" />
      </g>

      {/* Typography */}
      <g transform="translate(78, 28)">
        <text x="0" y="10" fill="#15803D" fontSize="18" fontWeight="900" letterSpacing="1" fontFamily="system-ui, -apple-system, sans-serif">
          DOSSIER
        </text>
        <text x="0" y="26" fill="#1E293B" fontSize="11" fontWeight="800" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          ARSIP DIGITAL
        </text>
        <text x="0" y="38" fill="#94A3B8" fontSize="7" fontWeight="700" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">
          KEMENKUMHAM RI
        </text>
      </g>
    </g>
  </svg>
);

export const getExternalAppLogo = (appId: string, className?: string) => {
  switch (appId) {
    case 'simpeg':
      return <SimpegLogo className={className} />;
    case 'seraya':
      return <SerayaLogo className={className} />;
    case 'siasn':
      return <BknLogo className={className} />;
    case 'siap_admin':
      return <SiapLogo className={className} />;
    case 'dossier_admin':
      return <DossierLogo className={className} />;
    default:
      return <SimpegLogo className={className} />;
  }
};
