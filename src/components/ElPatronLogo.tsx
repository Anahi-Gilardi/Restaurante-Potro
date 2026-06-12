import React, { useState, useEffect } from 'react';

interface ElPatronLogoProps {
  className?: string;
  variant?: 'badge' | 'icon' | 'monochrome';
  color?: string; // e.g. '#624A3E'
}

export default function ElPatronLogo({ className = 'w-16 h-16', variant = 'badge', color = '#5C4033' }: ElPatronLogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('el_patron_custom_logo');
    } catch (e) {
      return null;
    }
  });
  const [imgFailed, setImgFailed] = useState(false);

  // Listen to live brand updates across the entire UI and sync browser tab favicon
  useEffect(() => {
    const updateFavicon = (srcUrl: string | null) => {
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = srcUrl || "/logo-el-patron.jpeg";
      } catch (err) {}
    };

    // Sync initial favicon on load
    updateFavicon(customLogo);

    const handleLogoChange = () => {
      try {
        const freshLogo = localStorage.getItem('el_patron_custom_logo');
        setCustomLogo(freshLogo);
        setImgFailed(false);
        updateFavicon(freshLogo);
      } catch (e) {}
    };

    window.addEventListener('el_patron_logo_changed', handleLogoChange);
    return () => {
      window.removeEventListener('el_patron_logo_changed', handleLogoChange);
    };
  }, [customLogo]);

  // 1. If user uploaded a brand logo in-app, prioritize it immediately
  if (customLogo) {
    return (
      <div className={`relative ${className} select-none overflow-hidden flex items-center justify-center`} id="el-patron-custom-local-logo">
        <img 
          src={customLogo} 
          alt="El Patrón Restaurante" 
          className="w-full h-full object-contain rounded-full bg-[#FAF4EE] border border-stone-300/40 p-0.5 shadow-sm"
          onError={() => {
            // If the base64 string or image fails, fall back to default
            setCustomLogo(null);
          }}
        />
      </div>
    );
  }

  // 2. Direct static image loading from public directory.
  if (!imgFailed) {
    return (
      <div className={`relative ${className} select-none overflow-hidden flex items-center justify-center`} id="el-patron-real-image-logo">
        <img 
          src="/logo-el-patron.jpeg" 
          alt="El Patrón Restaurante" 
          className="w-full h-full object-contain rounded-full bg-[#FAF4EE] border border-stone-300/40 p-0.5 shadow-sm"
          onError={() => {
            setImgFailed(true);
          }}
        />
      </div>
    );
  }

  if (variant === 'icon') {
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
        {/* Elegant Minimalist Monogram Icon */}
        <circle cx="100" cy="100" r="90" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="100" cy="100" r="84" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.8" />
        
        {/* Clean central 'P' in classic high-contrast serif representation */}
        <text
          x="100"
          y="126"
          fontFamily="'Cinzel', 'Playfair Display', 'Times New Roman', serif"
          fontSize="82"
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          className="select-none font-medium"
        >
          P
        </text>

        {/* Small decorative stars / leaf buds */}
        <path d="M 100,28 L 102,34 L 108,34 L 103,38 L 105,44 L 100,40 L 95,44 L 97,38 L 92,34 L 98,34 Z" fill={color} stroke="none" />
      </svg>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`} id="el-patron-badge-logo">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 320"
        className="w-full h-full"
      >
        {/* Soft elegant warm-cream background matching the uploaded logo exactly */}
        <circle cx="160" cy="160" r="150" fill="#FAF4EE" />
        
        {/* Multiple concentric boundaries matching the vintage outline */}
        <circle cx="160" cy="160" r="141" fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx="160" cy="160" r="137" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.8" />
        <circle cx="160" cy="160" r="133" fill="none" stroke={color} strokeWidth="1.0" />

        {/* --- Side Symmetrical Flourishes (Left & Right Leaf Buds) --- */}
        {/* Left Side Flourish */}
        <g transform="translate(38, 160) scale(0.85)" stroke={color} fill="none" strokeWidth="1.5" strokeLinecap="round">
          {/* Center stem */}
          <line x1="0" y1="-12" x2="0" y2="12" />
          {/* Leaves */}
          <path d="M 0,0 C -5,-4 -8,-3 -10,-8 C -5,-7 -2,-4 0,0" fill={color} />
          <path d="M 0,0 C 5,-4 8,-3 10,-8 C 5,-7 2,-4 0,0" fill={color} />
          {/* Little decorative dots */}
          <circle cx="0" cy="0" r="2.2" fill={color} />
          <circle cx="0" cy="-17" r="1.5" fill={color} />
          <circle cx="0" cy="17" r="1.5" fill={color} />
        </g>
        
        {/* Right Side Flourish */}
        <g transform="translate(282, 160) scale(0.85) rotate(180)" stroke={color} fill="none" strokeWidth="1.5" strokeLinecap="round">
          {/* Center stem */}
          <line x1="0" y1="-12" x2="0" y2="12" />
          {/* Leaves */}
          <path d="M 0,0 C -5,-4 -8,-3 -10,-8 C -5,-7 -2,-4 0,0" fill={color} />
          <path d="M 0,0 C 5,-4 8,-3 10,-8 C 5,-7 2,-4 0,0" fill={color} />
          {/* Little decorative dots */}
          <circle cx="0" cy="0" r="2.2" fill={color} />
          <circle cx="0" cy="-17" r="1.5" fill={color} />
          <circle cx="0" cy="17" r="1.5" fill={color} />
        </g>

        {/* --- Top Text "El Patrón" --- */}
        <g transform="translate(160, 80)">
          {/* Highly stylized, curved-like appearance using the loaded elegant cursive typography */}
          <text 
            fontFamily="'Alex Brush', 'Great Vibes', cursive"
            fontSize="52" 
            fontWeight="normal"
            fill={color} 
            textAnchor="middle"
            className="select-none drop-shadow-[0.5px_0.5px_0px_rgba(0,0,0,0.15)] filter-contrast-125"
          >
            El Patrón
          </text>
        </g>

        {/* Brand Underline Flourishes (Delicate curls directly below word) */}
        <g stroke={color} strokeWidth="0.8" fill="none" opacity="0.85" transform="translate(160, 92)">
          <path d="M -50,-2 C -20,5 20,5 50,-2" />
          <circle cx="0" cy="3" r="1.5" fill={color} />
        </g>

        {/* --- Central Premium Monogram (Replaces horse head) --- */}
        <g transform="translate(160, 162)">
          {/* Wreath circle indicator */}
          <circle cx="0" cy="-3" r="42" fill="none" stroke={color} strokeWidth="0.75" strokeDasharray="4 3" opacity="0.4" />
          
          {/* Majestic laurel-style minimal olive leaves accents surrounding the letter */}
          <g stroke={color} fill="none" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
            {/* Left side arc */}
            <path d="M -30,20 C -45,0 -40,-25 -20,-35" />
            <path d="M -36,6 C -42,6 -44,1 -40,-4" fill={color} />
            <path d="M -32,-14 C -38,-15 -39,-21 -33,-24" fill={color} />
            
            {/* Right side arc */}
            <path d="M 30,20 C 45,0 40,-25 20,-35" />
            <path d="M 36,6 C 42,6 44,1 40,-4" fill={color} />
            <path d="M 32,-14 C 38,-15 39,-21 33,-24" fill={color} />
          </g>

          {/* Central Luxury Monogram "P" letter */}
          <text
            fontFamily="'Cinzel', 'Playfair Display', 'Times New Roman', serif"
            fontSize="72"
            fontWeight="bold"
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            y="-6"
            className="select-none"
          >
            P
          </text>

          {/* 3 stars above the P monogram to form a real restaurant seal of quality */}
          <g transform="translate(0, -48)" fill={color} stroke="none">
            {/* Middle star */}
            <path d="M 0,-4 L 1.2,0 L 5,0 L 2,2.2 L 3.2,6 Q 0,4.2 -3.2,6 L -2,2.2 L -5,0 L -1.2,0 Z" />
            {/* Left star */}
            <path d="M -16,-1 L -15,2 L -12,2 L -14.5,3.5 L -13.5,6 Q -16,4.8 -18.5,6 L -17.5,3.5 L -20,2 L -17,2 Z" transform="scale(0.8) translate(-4, 0)" />
            {/* Right star */}
            <path d="M 16,-1 L 17,2 L 20,2 L 17.5,3.5 L 18.5,6 Q 16,4.8 13.5,6 L 14.5,3.5 L 12,2 L 15,2 Z" transform="scale(0.8) translate(4, 0)" />
          </g>
        </g>
        
        {/* --- Bottom Text "RESTAURANTE" --- */}
        <g transform="translate(160, 248)">
          <text
            fontFamily="'Cinzel', 'Times New Roman', serif"
            fontSize="14"
            fontWeight="bold"
            fill={color}
            letterSpacing="8"
            textAnchor="middle"
            className="select-none tracking-[0.25em] font-medium"
          >
            RESTAURANTE
          </text>
        </g>

        {/* --- Bottom Elegance Flourish (Mirror Ribbon scroll) --- */}
        <g transform="translate(160, 268) scale(0.75)" stroke={color} fill="none" strokeWidth="1.5" strokeLinecap="round">
          {/* Flowing central line ribbon */}
          <path d="M -40,0 C -20,10 -10,-10 0,0 C 10,-10 20,10 40,0" />
          <path d="M -22,1 C -10,6 -5,-2 0,-1 C 5,-2 10,6 22,1" opacity="0.75" strokeWidth="1" />
          {/* Accentuating circles and leaf dots */}
          <circle cx="0" cy="8" r="2.5" fill={color} />
          <circle cx="-55" cy="-2" r="1.5" fill={color} />
          <circle cx="55" cy="-2" r="1.5" fill={color} />
          {/* Little scroll loops */}
          <path d="M -40,0 C -45,-3 -50,2 -48,5 C -46,8 -41,5 -40,0 Z" strokeWidth="1.0" />
          <path d="M 40,0 C 45,-3 50,2 48,5 C 46,8 41,5 40,0 Z" strokeWidth="1.0" />
        </g>

      </svg>
    </div>
  );
}
