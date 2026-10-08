import React, { useState, useEffect, useRef } from 'react';
import { Upload, RotateCcw } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number | string;
  allowUpload?: boolean;
}

const STORAGE_KEY = 'custom_3t_logo_image';

export const SolarLogo: React.FC<LogoProps> = ({ 
  className = 'w-[54px] h-[54px]', 
  size,
  allowUpload = false
}) => {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const style = size ? { width: size, height: size } : undefined;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomLogo(stored);
      }
    } catch (e) {
      // Local storage might fail in restricted iframe mode
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomLogo(result);
        try {
          localStorage.setItem(STORAGE_KEY, result);
        } catch (err) {
          console.warn('Storage quota exceeded, logo active for session');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomLogo(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full bg-white shadow-xs border border-slate-100 group ${className}`}
      style={style}
      title="3T GREEN ENERGY"
    >
      {/* If user uploaded or saved exact file Logo Tron.jpg */}
      {customLogo ? (
        <img 
          src={customLogo} 
          alt="3T GREEN ENERGY Logo" 
          className="w-full h-full object-contain rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        /* Native Vector Recreation matching 100% geometry and coloring */
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full object-contain"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="circle-clip">
              <circle cx="250" cy="250" r="248" />
            </clipPath>

            <radialGradient id="sky-radial" cx="30%" cy="20%" r="90%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="20%" stopColor="#E2F2FD" />
              <stop offset="45%" stopColor="#BAE6FD" />
              <stop offset="75%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#38BDF8" />
            </radialGradient>

            <radialGradient id="sun-core" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="25%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#FBBF24" />
              <stop offset="85%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </radialGradient>

            <linearGradient id="sun-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="green-arc-grad" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="35%" stopColor="#22C55E" />
              <stop offset="70%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>

            <linearGradient id="blue-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="40%" stopColor="#0369A1" />
              <stop offset="75%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>

            <linearGradient id="blue-3-grad" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="25%" stopColor="#0284C7" />
              <stop offset="55%" stopColor="#1D4ED8" />
              <stop offset="85%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="blue-3-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#BAE6FD" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="20%" stopColor="#4ADE80" />
              <stop offset="55%" stopColor="#22C55E" />
              <stop offset="85%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>

            <linearGradient id="leaf-vein" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#DCFCE7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#86EFAC" stopOpacity="0.4" />
            </linearGradient>

            <filter id="logo-drop-shadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="3" dy="6" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
            <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#0369A1" floodOpacity="0.3" />
            </filter>
          </defs>

          <g clipPath="url(#circle-clip)">
            <rect width="500" height="500" fill="url(#sky-radial)" />

            <path
              d="M 60 140 Q 120 110, 180 130 Q 240 120, 290 145 Q 350 135, 420 160 L 440 220 L 40 220 Z"
              fill="#FFFFFF"
              opacity="0.55"
            />
            <path
              d="M 140 100 Q 200 80, 260 95 Q 320 85, 380 110 L 390 150 L 120 150 Z"
              fill="#FFFFFF"
              opacity="0.4"
            />

            <path
              d="M 280 340 Q 340 310, 420 315 Q 470 320, 500 330 L 500 420 L 260 420 Z"
              fill="#86EFAC"
              opacity="0.45"
            />
            <path
              d="M 330 355 Q 390 335, 460 340 Q 485 342, 500 350 L 500 420 L 300 420 Z"
              fill="#4ADE80"
              opacity="0.5"
            />

            <g stroke="#94A3B8" strokeWidth="1.2" opacity="0.6">
              <line x1="435" y1="280" x2="435" y2="320" strokeWidth="2" stroke="#64748B" />
              <circle cx="435" cy="280" r="2.5" fill="#64748B" />
              <line x1="435" y1="280" x2="420" y2="265" />
              <line x1="435" y1="280" x2="452" y2="272" />
              <line x1="435" y1="280" x2="435" y2="298" />

              <line x1="468" y1="290" x2="468" y2="325" strokeWidth="1.5" stroke="#64748B" />
              <circle cx="468" cy="290" r="2" fill="#64748B" />
              <line x1="468" y1="290" x2="456" y2="278" />
              <line x1="468" y1="290" x2="480" y2="284" />
              <line x1="468" y1="290" x2="468" y2="304" />
            </g>

            <g id="sun-element">
              <circle cx="160" cy="140" r="95" fill="url(#sun-glow)" />
              <g fill="url(#sun-core)">
                <polygon points="128,62 142,88 116,84" />
                <polygon points="168,42 178,72 152,65" />
                <polygon points="212,38 214,68 190,58" />
                <polygon points="95,95 116,112 95,124" />
                <polygon points="70,140 98,148 85,165" />
                <polygon points="56,188 88,188 78,204" />
              </g>
              <circle cx="155" cy="145" r="54" fill="url(#sun-core)" filter="url(#soft-shadow)" />
            </g>

            <path
              d="M 125 150 
                 C 155 85, 235 55, 320 62
                 C 390 68, 438 120, 442 188
                 C 445 235, 415 285, 365 315
                 C 395 272, 408 220, 395 178
                 C 378 125, 325 90, 255 90
                 C 195 90, 145 120, 125 150 Z"
              fill="url(#green-arc-grad)"
              filter="url(#logo-drop-shadow)"
            />

            <path
              d="M 135 152
                 C 105 192, 85 245, 95 305
                 C 108 382, 172 432, 260 435
                 C 318 438, 385 412, 420 365
                 C 375 400, 312 418, 255 415
                 C 185 412, 130 368, 118 302
                 C 110 248, 126 198, 155 158 Z"
              fill="url(#blue-ring-grad)"
              filter="url(#logo-drop-shadow)"
            />

            <g filter="url(#logo-drop-shadow)">
              <path
                d="M 130 162
                   L 272 162
                   C 265 195, 250 220, 230 236
                   L 190 236
                   L 174 270
                   C 192 258, 218 252, 246 262
                   C 285 275, 298 316, 280 354
                   C 258 395, 204 402, 155 390
                   C 124 382, 102 364, 88 348
                   L 128 312
                   C 138 326, 158 344, 185 348
                   C 208 350, 226 336, 234 320
                   C 242 302, 232 286, 210 282
                   C 188 278, 168 288, 150 298
                   L 118 286
                   L 155 162 Z"
                fill="url(#blue-3-grad)"
              />

              <path
                d="M 152 165 L 268 165 C 260 178, 252 192, 242 202 L 165 202 Z"
                fill="url(#blue-3-highlight)"
                opacity="0.85"
              />

              <path
                d="M 185 348 C 158 344, 138 326, 128 312 L 138 302 C 148 316, 165 332, 188 335 Z"
                fill="#FFFFFF"
                opacity="0.6"
              />
            </g>

            <g filter="url(#logo-drop-shadow)">
              <path
                d="M 276 160
                   C 325 158, 385 160, 442 178
                   C 455 212, 452 268, 412 328
                   C 375 382, 310 422, 215 428
                   C 255 395, 318 342, 368 275
                   C 392 242, 412 208, 424 186
                   C 368 202, 318 238, 282 288
                   C 268 308, 258 332, 252 355
                   C 260 305, 292 245, 352 196
                   C 310 200, 282 222, 268 250
                   L 276 160 Z"
                fill="url(#leaf-grad)"
              />

              <path
                d="M 424 186 
                   C 372 235, 310 320, 225 415 
                   C 285 355, 350 265, 424 186 Z"
                fill="url(#leaf-vein)"
              />

              <path
                d="M 368 260 Q 395 248, 415 252"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.5"
              />
              <path
                d="M 335 305 Q 365 292, 385 302"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.4"
              />
            </g>

            <path
              d="M 50 375 Q 250 440, 450 375 L 465 470 Q 250 515, 35 470 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />

            <g id="brand-text">
              <text
                x="85"
                y="425"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                fontSize="52"
                fontWeight="900"
                fontStyle="italic"
                letterSpacing="-1"
                fill="#1E3A8A"
              >
                3T
              </text>

              <text
                x="165"
                y="425"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                fontSize="52"
                fontWeight="900"
                fontStyle="italic"
                letterSpacing="1"
                fill="#16A34A"
              >
                GREEN
              </text>

              <text
                x="250"
                y="464"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                fontSize="24"
                fontWeight="800"
                letterSpacing="7"
                fill="#0369A1"
              >
                ENERGY
              </text>
            </g>
          </g>

          <circle
            cx="250"
            cy="250"
            r="247"
            stroke="#E2E8F0"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      )}

      {/* Optional upload trigger overlay when allowUpload is true */}
      {allowUpload && (
        <>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <div 
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer rounded-full"
            title="Nhấn để tải trực tiếp file Logo Vuong.jpg gốc từ máy"
          >
            <Upload className="w-4 h-4" />
            <span className="text-[8px] font-bold mt-0.5">Tải ảnh</span>
          </div>

          {customLogo && (
            <button
              onClick={handleReset}
              className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
              title="Khôi phục mặc định"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
