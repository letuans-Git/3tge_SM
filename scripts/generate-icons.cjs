const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// 1. Full Square Icon SVG (512x512)
function getSquareIconSvg(paddingPercent = 0.06) {
  // Safe zone scaling if padding is requested (for maskable icons)
  const scale = 1 - (paddingPercent * 2);
  const translate = 512 * paddingPercent;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background subtle gradient / shadow -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8FAFC" />
    </linearGradient>

    <!-- Sky Radial Gradient -->
    <radialGradient id="sky-radial" cx="32%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#E0F2FE" />
      <stop offset="55%" stop-color="#BAE6FD" />
      <stop offset="85%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </radialGradient>

    <!-- Sun Core & Glow -->
    <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#FBBF24" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#F97316" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="sun-core" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="25%" stop-color="#FEF08A" />
      <stop offset="60%" stop-color="#F59E0B" />
      <stop offset="90%" stop-color="#EA580C" />
      <stop offset="100%" stop-color="#C2410C" />
    </radialGradient>

    <!-- Eco Green Gradient -->
    <linearGradient id="green-arc" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#86EFAC" />
      <stop offset="25%" stop-color="#4ADE80" />
      <stop offset="55%" stop-color="#22C55E" />
      <stop offset="85%" stop-color="#16A34A" />
      <stop offset="100%" stop-color="#15803D" />
    </linearGradient>

    <!-- Blue Energy Ring Gradient -->
    <linearGradient id="blue-ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="30%" stop-color="#0284C7" />
      <stop offset="65%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#1E3A8A" />
    </linearGradient>

    <!-- Blue "3" Gradient -->
    <linearGradient id="blue-3" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="35%" stop-color="#0284C7" />
      <stop offset="70%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- White highlight for 3 -->
    <linearGradient id="highlight-white" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#BAE6FD" stop-opacity="0.2" />
    </linearGradient>

    <!-- Leaf Vein & Edge -->
    <linearGradient id="leaf-vein" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#DCFCE7" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#86EFAC" stop-opacity="0.3" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="shadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.28" />
    </filter>

    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Pure White Background Canvas (Square App Icon) -->
  <rect width="512" height="512" fill="#FFFFFF" />

  <g transform="translate(${translate}, ${translate}) scale(${scale})">
    <!-- Outer Badge Ring with Soft Shadow -->
    <g filter="url(#shadow)">
      <!-- Outer Border of Emblem -->
      <circle cx="256" cy="226" r="190" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" />
      
      <!-- Inner Emblem Circle with Sky Gradient -->
      <g clip-path="url(#badge-clip)">
        <defs>
          <clipPath id="badge-clip">
            <circle cx="256" cy="226" r="186" />
          </clipPath>
        </defs>

        <!-- Sky Background -->
        <rect x="70" y="40" width="372" height="372" fill="url(#sky-radial)" />

        <!-- Faint Clouds / Mountains in horizon -->
        <path d="M 80 170 Q 150 145, 220 160 Q 290 150, 360 175 Q 410 165, 450 190 L 450 250 L 70 250 Z" fill="#FFFFFF" opacity="0.55" />
        <path d="M 120 135 Q 190 120, 260 130 Q 330 120, 400 145 L 430 190 L 100 190 Z" fill="#FFFFFF" opacity="0.35" />

        <!-- Distant Green Hills / Trees -->
        <path d="M 270 310 Q 330 285, 395 290 Q 430 295, 450 305 L 450 370 L 250 370 Z" fill="#86EFAC" opacity="0.45" />
        <path d="M 315 320 Q 365 305, 420 310 Q 440 312, 450 320 L 450 370 L 280 370 Z" fill="#4ADE80" opacity="0.5" />

        <!-- Transmission / Solar Mast Silhouette -->
        <g stroke="#64748B" stroke-width="1.3" opacity="0.6">
          <line x1="395" y1="260" x2="395" y2="300" stroke-width="2" />
          <circle cx="395" cy="260" r="2.5" fill="#64748B" />
          <line x1="395" y1="260" x2="380" y2="245" />
          <line x1="395" y1="260" x2="410" y2="252" />
          <line x1="395" y1="260" x2="395" y2="278" />
          <line x1="422" y1="270" x2="422" y2="305" stroke-width="1.5" />
          <circle cx="422" cy="270" r="2" fill="#64748B" />
          <line x1="422" y1="270" x2="412" y2="258" />
          <line x1="422" y1="270" x2="432" y2="264" />
        </g>

        <!-- Golden Sun with Radiant Rays -->
        <g id="sun-element">
          <!-- Sun Outer Corona Glow -->
          <circle cx="180" cy="140" r="75" fill="url(#sun-glow)" />

          <!-- Sun Rays -->
          <g fill="url(#sun-core)">
            <polygon points="152,76 164,98 142,94" />
            <polygon points="186,60 195,84 174,78" />
            <polygon points="220,58 222,82 202,74" />
            <polygon points="126,104 144,118 126,128" />
            <polygon points="106,140 130,146 118,160" />
            <polygon points="94,180 120,180 112,192" />
          </g>

          <!-- Sun Orb -->
          <circle cx="178" cy="144" r="44" fill="url(#sun-core)" />
        </g>

        <!-- Dynamic Eco Green Arc Swoosh -->
        <path
          d="M 152 148 
             C 178 95, 245 70, 315 75 
             C 375 80, 415 125, 418 180 
             C 421 218, 396 260, 354 284 
             C 380 250, 390 208, 380 174 
             C 365 130, 322 102, 264 102 
             C 212 102, 170 125, 152 148 Z"
          fill="url(#green-arc)"
          filter="url(#shadow)"
        />

        <!-- Blue Orbit Curve / Arc -->
        <path
          d="M 160 150
             C 134 185, 118 228, 126 278
             C 137 342, 190 384, 265 386
             C 314 388, 372 366, 400 326
             C 362 356, 308 372, 260 369
             C 200 366, 152 328, 142 274
             C 135 228, 148 188, 172 154 Z"
          fill="url(#blue-ring)"
          filter="url(#shadow)"
        />

        <!-- Stylized Number "3" Motif -->
        <g filter="url(#shadow)">
          <path
            d="M 156 160
               L 272 160
               C 266 188, 254 208, 236 222
               L 204 222
               L 190 250
               C 206 240, 228 235, 252 244
               C 284 254, 295 288, 280 320
               C 262 354, 218 360, 176 350
               C 150 344, 132 328, 120 314
               L 154 284
               C 162 296, 178 310, 202 314
               C 220 316, 235 304, 242 290
               C 248 276, 240 262, 222 258
               C 204 255, 186 264, 172 272
               L 144 262
               L 176 160 Z"
            fill="url(#blue-3)"
          />

          <!-- Upper bevel highlight -->
          <path
            d="M 174 162 L 268 162 C 262 173, 255 184, 246 193 L 184 193 Z"
            fill="url(#highlight-white)"
            opacity="0.85"
          />

          <!-- Lower highlight curve -->
          <path
            d="M 202 314 C 178 310, 162 296, 154 284 L 162 276 C 170 288, 184 300, 204 303 Z"
            fill="#FFFFFF"
            opacity="0.6"
          />
        </g>

        <!-- Green Eco Leaf Element -->
        <g filter="url(#shadow)">
          <path
            d="M 276 158
               C 318 156, 370 158, 418 174
               C 429 202, 426 250, 392 300
               C 360 346, 305 378, 225 384
               C 258 356, 312 312, 355 255
               C 375 228, 392 200, 402 181
               C 355 194, 312 224, 282 266
               C 270 283, 262 303, 256 322
               C 263 280, 290 230, 340 189
               C 305 192, 281 210, 269 234
               L 276 158 Z"
            fill="url(#green-arc)"
          />

          <!-- Leaf Spine Vein -->
          <path
            d="M 402 181
               C 358 222, 305 295, 233 373
               C 284 322, 339 246, 402 181 Z"
            fill="url(#leaf-vein)"
          />
          <path d="M 355 242 Q 378 232, 395 235" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.6" />
          <path d="M 326 280 Q 352 268, 370 276" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.5" />
        </g>

        <!-- White Ribbon Banner for "3T GREEN ENERGY" -->
        <path
          d="M 80 330 Q 256 385, 432 330 L 444 410 Q 256 450, 68 410 Z"
          fill="#FFFFFF"
          opacity="0.97"
        />

        <!-- Brand Typography -->
        <g id="brand-text">
          <text
            x="110"
            y="370"
            font-family="system-ui, -apple-system, 'Plus Jakarta Sans', Roboto, sans-serif"
            font-size="44"
            font-weight="900"
            font-style="italic"
            letter-spacing="-1"
            fill="#1E3A8A"
          >3T</text>

          <text
            x="182"
            y="370"
            font-family="system-ui, -apple-system, 'Plus Jakarta Sans', Roboto, sans-serif"
            font-size="44"
            font-weight="900"
            font-style="italic"
            letter-spacing="0.5"
            fill="#16A34A"
          >GREEN</text>

          <text
            x="256"
            y="402"
            text-anchor="middle"
            font-family="system-ui, -apple-system, 'Plus Jakarta Sans', Roboto, sans-serif"
            font-size="20"
            font-weight="800"
            letter-spacing="6"
            fill="#0284C7"
          >ENERGY</text>
        </g>
      </g>
    </g>

    <!-- Bottom Tagline Pill / Badge: NĂNG LƯỢNG XANH - KIẾN TẠO TƯƠNG LAI -->
    <g transform="translate(256, 468)">
      <rect x="-175" y="-22" width="350" height="34" rx="17" fill="#0284C7" />
      <text
        x="0"
        y="1"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="system-ui, -apple-system, 'Plus Jakarta Sans', Roboto, sans-serif"
        font-size="13"
        font-weight="800"
        letter-spacing="1.2"
        fill="#FFFFFF"
      >NĂNG LƯỢNG XANH - KIẾN TẠO TƯƠNG LAI</text>
    </g>
  </g>
</svg>`;
}

// 2. Favicon SVG optimized for small 16-64px rendering
function getFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="fav-sky" cx="30%" cy="25%" r="80%">
      <stop offset="0%" stop-color="#E0F2FE" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </radialGradient>
    <radialGradient id="fav-sun" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EA580C" />
    </radialGradient>
    <linearGradient id="fav-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ADE80" />
      <stop offset="100%" stop-color="#15803D" />
    </linearGradient>
    <linearGradient id="fav-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#1E3A8A" />
    </linearGradient>
  </defs>

  <rect width="64" height="64" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
  
  <g transform="translate(6, 6) scale(0.81)">
    <!-- Sky Circle -->
    <circle cx="32" cy="32" r="28" fill="url(#fav-sky)" />
    
    <!-- Sun -->
    <circle cx="22" cy="20" r="10" fill="url(#fav-sun)" />

    <!-- Green Leaf Arc -->
    <path d="M 20 20 C 26 12, 38 8, 48 10 C 56 12, 60 20, 58 28 C 50 20, 38 18, 28 22 Z" fill="url(#fav-green)" />
    
    <!-- Blue Energy "3" / Arc -->
    <path d="M 18 22 L 36 22 C 34 28, 30 32, 26 34 L 22 34 L 20 38 C 24 36, 28 36, 32 38 C 36 40, 37 46, 34 50 C 30 55, 24 55, 18 53 L 20 47 C 22 49, 26 50, 28 48 C 30 46, 30 43, 27 42 C 24 41, 20 43, 18 44 Z" fill="url(#fav-blue)" />
    <path d="M 38 22 C 45 22, 54 26, 56 35 C 50 44, 42 50, 30 52 C 38 46, 46 38, 48 30 C 44 32, 39 34, 34 38 Z" fill="url(#fav-green)" />
    
    <!-- Bottom banner badge -->
    <rect x="8" y="46" width="48" height="13" rx="6.5" fill="#FFFFFF" />
    <text x="16" y="56" font-family="system-ui, sans-serif" font-size="10" font-weight="900" font-style="italic" fill="#1E3A8A">3T</text>
    <text x="31" y="56" font-family="system-ui, sans-serif" font-size="8" font-weight="900" fill="#16A34A">GE</text>
  </g>
</svg>`;
}

async function renderPng(svgContent, width, height, outputPath) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated: ${outputPath} (${width}x${height}, ${pngBuffer.length} bytes)`);
}

async function main() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate SVG files
  const squareSvg = getSquareIconSvg(0.04);
  const maskableSvg = getSquareIconSvg(0.15); // safe zone 15% margin for Android maskable
  const faviconSvg = getFaviconSvg();

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), squareSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-vuong.svg'), squareSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

  // Generate PNG resolutions
  await renderPng(squareSvg, 512, 512, path.join(publicDir, 'pwa-512x512.png'));
  await renderPng(squareSvg, 512, 512, path.join(publicDir, 'logo-vuong.png'));
  await renderPng(maskableSvg, 512, 512, path.join(publicDir, 'pwa-maskable-512x512.png'));
  await renderPng(squareSvg, 192, 192, path.join(publicDir, 'pwa-192x192.png'));
  await renderPng(squareSvg, 180, 180, path.join(publicDir, 'apple-touch-icon.png'));
  await renderPng(faviconSvg, 32, 32, path.join(publicDir, 'favicon-32x32.png'));
  await renderPng(faviconSvg, 16, 16, path.join(publicDir, 'favicon-16x16.png'));

  // Also create favicon.ico from 32x32 PNG (browsers accept PNG-based favicon.ico)
  fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));
  console.log('Favicon.ico created successfully');
}

main().catch(console.error);
