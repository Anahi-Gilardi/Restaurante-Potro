import React, { useEffect, useState } from 'react';

const DEFAULT_LOGO_SRC = '/logo-el-patron.jpeg?v=3';
const LOGO_STORAGE_KEY = 'el_potro_custom_logo';
const LEGACY_LOGO_STORAGE_KEY = 'el_patron_custom_logo';
const LOGO_CHANGE_EVENT = 'el_patron_logo_changed';

interface ElPatronLogoProps {
  className?: string;
  variant?: 'badge' | 'icon' | 'monochrome';
  color?: string;
}

const readStoredLogo = () => {
  try {
    localStorage.removeItem(LEGACY_LOGO_STORAGE_KEY);
    // Force one-time cleanup of old custom/cached logos to display the new official horse logo
    if (!localStorage.getItem('el_patron_logo_v3_migrated')) {
      localStorage.removeItem(LOGO_STORAGE_KEY);
      localStorage.setItem('el_patron_logo_v3_migrated', 'true');
    }
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
};

const updateFavicon = (srcUrl: string) => {
  try {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/jpeg';
    link.href = srcUrl;
  } catch {
    // Favicon sync is cosmetic; the logo render path still works.
  }
};

function MonogramFallback({ className, color }: { className: string; color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="100" cy="100" r="90" fill="#FAF4EE" stroke={color} strokeWidth="2" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.8" />
      <text
        x="100"
        y="126"
        fontFamily="'Cinzel', 'Playfair Display', 'Times New Roman', serif"
        fontSize="82"
        fontWeight="bold"
        fill={color}
        stroke="none"
        textAnchor="middle"
        className="select-none"
      >
        P
      </text>
    </svg>
  );
}

export default function ElPatronLogo({ className = 'w-16 h-16', color = '#5C4033' }: ElPatronLogoProps) {
  const [logoSrc, setLogoSrc] = useState<string>(() => readStoredLogo() || DEFAULT_LOGO_SRC);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    updateFavicon(logoSrc);

    const handleLogoChange = () => {
      const nextLogo = readStoredLogo() || DEFAULT_LOGO_SRC;
      setImgFailed(false);
      setLogoSrc(nextLogo);
      updateFavicon(nextLogo);
    };

    window.addEventListener(LOGO_CHANGE_EVENT, handleLogoChange);
    return () => {
      window.removeEventListener(LOGO_CHANGE_EVENT, handleLogoChange);
    };
  }, [logoSrc]);

  if (imgFailed) {
    return <MonogramFallback className={className} color={color} />;
  }

  return (
    <div className={`relative ${className} select-none overflow-hidden flex items-center justify-center`} id="el-patron-image-logo">
      <img
        src={logoSrc}
        alt="El Patrón Restaurante"
        loading="lazy" decoding="async"
        className="w-full h-full object-contain rounded-full bg-[#FAF4EE] border border-stone-300/40 p-0.5 shadow-sm"
        onError={() => {
          if (logoSrc !== DEFAULT_LOGO_SRC) {
            setLogoSrc(DEFAULT_LOGO_SRC);
            return;
          }
          setImgFailed(true);
        }}
      />
    </div>
  );
}
