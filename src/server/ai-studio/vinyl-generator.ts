import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export type VinylTheme = 'retro_vinyl' | 'gold_luxury' | 'neon_cyber' | 'minimal_studio' | 'waveform_pulse';

/**
 * Generate a hyper-realistic 12-inch vinyl record disc SVG (ROTATING BASE)
 * Contains vinyl PVC lacquer body, high-density spiral microgrooves, dead-wax runout matrix etchings,
 * and an authentic Swiss/Bauhaus printed paper center label.
 * (Light sheen reflection is kept separate so it stays stationary when the record spins!)
 */
export function generateVinylSVG(options: {
  djName?: string;
  showName?: string;
  labelTheme?: VinylTheme;
  size?: number;
}): string {
  const size = options.size || 600;
  const cx = size / 2;
  const cy = size / 2;
  const outerPlatterRadius = size * 0.485;
  const vinylRadius = size * 0.46;
  const deadWaxRadius = vinylRadius * 0.43;
  const labelRadius = vinylRadius * 0.35;
  const theme = (options.labelTheme || 'retro_vinyl') as VinylTheme;

  const dj = (options.djName || 'DEJAVUFM RESIDENT')
    .toUpperCase()
    .replace(/[^A-Z0-9 &._-]/g, '')
    .slice(0, 24);
  const show = (options.showName || 'LONDON UNDERGROUND')
    .toUpperCase()
    .replace(/[^A-Z0-9 &._-]/g, '')
    .slice(0, 26);

  // Theme palettes and styles
  let platterRimGrad = 'url(#platterSteelGrad)';
  let strobeColor = '#e2e8f0';
  let vinylBodyColor = 'url(#vinylObsidianBody)';
  let labelBg = 'url(#retroBurgundyGrad)';
  let labelBorder = '#d97706';
  let labelAccentText = '#fbbf24';
  let labelSubText = '#d97706';
  let deadWaxTextColor = '#3f3f46';

  if (theme === 'gold_luxury') {
    platterRimGrad = 'url(#platterGoldGrad)';
    strobeColor = '#fef08a';
    vinylBodyColor = 'url(#vinylGoldBody)';
    labelBg = 'url(#goldLuxuryLabelGrad)';
    labelBorder = '#eab308';
    labelAccentText = '#fef08a';
    labelSubText = '#ca8a04';
    deadWaxTextColor = '#713f12';
  } else if (theme === 'neon_cyber') {
    platterRimGrad = 'url(#platterCyberGrad)';
    strobeColor = '#00f0ff';
    vinylBodyColor = 'url(#vinylCyberBody)';
    labelBg = 'url(#cyberLabelGrad)';
    labelBorder = '#00f0ff';
    labelAccentText = '#00f0ff';
    labelSubText = '#b026ff';
    deadWaxTextColor = '#312e81';
  } else if (theme === 'minimal_studio') {
    platterRimGrad = 'url(#platterTitaniumGrad)';
    strobeColor = '#f8fafc';
    vinylBodyColor = 'url(#vinylObsidianBody)';
    labelBg = 'url(#slateLabelGrad)';
    labelBorder = '#94a3b8';
    labelAccentText = '#ffffff';
    labelSubText = '#64748b';
    deadWaxTextColor = '#334155';
  } else if (theme === 'waveform_pulse') {
    platterRimGrad = 'url(#platterMintGrad)';
    strobeColor = '#34d399';
    vinylBodyColor = 'url(#vinylMintBody)';
    labelBg = 'url(#mintLabelGrad)';
    labelBorder = '#10b981';
    labelAccentText = '#6ee7b7';
    labelSubText = '#059669';
    deadWaxTextColor = '#064e3b';
  }

  // 1. Technics SL-1200 Style Stroboscopic Pitch Calibration Dots
  let strobeDots = '';
  const strobeRadius1 = outerPlatterRadius - 3;
  const strobeRadius2 = outerPlatterRadius - 7.5;
  const numDots1 = 52;
  const numDots2 = 40;

  for (let i = 0; i < numDots1; i++) {
    const angle = (i * 2 * Math.PI) / numDots1;
    const x = cx + strobeRadius1 * Math.cos(angle);
    const y = cy + strobeRadius1 * Math.sin(angle);
    strobeDots += `    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.3" fill="${strobeColor}" opacity="0.85" />\n`;
  }
  for (let i = 0; i < numDots2; i++) {
    const angle = (i * 2 * Math.PI) / numDots2;
    const x = cx + strobeRadius2 * Math.cos(angle);
    const y = cy + strobeRadius2 * Math.sin(angle);
    strobeDots += `    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.1" fill="${strobeColor}" opacity="0.65" />\n`;
  }

  // 2. Ultra-Dense Realistic Microgrooves & Song Track Separation Bands
  let grooves = '';
  const minR = deadWaxRadius + 4;
  const maxR = vinylRadius - 8;
  const totalGrooves = 56;
  const trackGaps = [
    minR + (maxR - minR) * 0.35,
    minR + (maxR - minR) * 0.68
  ];

  for (let i = 0; i < totalGrooves; i++) {
    const r = minR + (i * (maxR - minR)) / totalGrooves;
    
    // Check if in song separation gap (silent ungrooved band)
    const isNearGap1 = Math.abs(r - trackGaps[0]) < 2.8;
    const isNearGap2 = Math.abs(r - trackGaps[1]) < 2.8;

    if (isNearGap1 || isNearGap2) {
      grooves += `    <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.04" />\n`;
      continue;
    }

    const op = (i % 8 === 0) ? 0.22 : (i % 4 === 0) ? 0.14 : (i % 2 === 0) ? 0.08 : 0.04;
    const strokeW = (i % 12 === 0) ? 0.9 : (i % 3 === 0) ? 0.6 : 0.35;
    grooves += `    <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="${strokeW}" opacity="${op}" />\n`;
  }

  // Lead-in outer groove & run-out spiral lines
  grooves += `    <circle cx="${cx}" cy="${cy}" r="${(vinylRadius - 3).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.35" />\n`;
  grooves += `    <circle cx="${cx}" cy="${cy}" r="${(deadWaxRadius + 2).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.4" />\n`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Platter Metallic Rim Gradients -->
    <linearGradient id="platterSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#52525b" />
      <stop offset="25%" stop-color="#18181b" />
      <stop offset="50%" stop-color="#a1a1aa" />
      <stop offset="75%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#3f3f46" />
    </linearGradient>

    <linearGradient id="platterGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ca8a04" />
      <stop offset="30%" stop-color="#422006" />
      <stop offset="50%" stop-color="#fef08a" />
      <stop offset="70%" stop-color="#713f12" />
      <stop offset="100%" stop-color="#a16207" />
    </linearGradient>

    <linearGradient id="platterCyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="30%" stop-color="#090514" />
      <stop offset="50%" stop-color="#b026ff" />
      <stop offset="70%" stop-color="#03010a" />
      <stop offset="100%" stop-color="#00f0ff" />
    </linearGradient>

    <linearGradient id="platterTitaniumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="30%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="70%" stop-color="#020617" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>

    <linearGradient id="platterMintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="30%" stop-color="#022c22" />
      <stop offset="50%" stop-color="#6ee7b7" />
      <stop offset="70%" stop-color="#01140e" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Photorealistic Deep PVC Lacquer Bodies -->
    <radialGradient id="vinylObsidianBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#262626" />
      <stop offset="25%" stop-color="#171717" />
      <stop offset="60%" stop-color="#0a0a0a" />
      <stop offset="92%" stop-color="#121212" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>

    <radialGradient id="vinylGoldBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#eab308" />
      <stop offset="35%" stop-color="#a16207" />
      <stop offset="75%" stop-color="#451a03" />
      <stop offset="95%" stop-color="#ca8a04" />
      <stop offset="100%" stop-color="#1c1003" />
    </radialGradient>

    <radialGradient id="vinylCyberBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e1035" />
      <stop offset="45%" stop-color="#0d071a" />
      <stop offset="80%" stop-color="#05020a" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>

    <radialGradient id="vinylMintBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="45%" stop-color="#022c22" />
      <stop offset="80%" stop-color="#011812" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>

    <!-- Matte Paper Center Labels -->
    <radialGradient id="retroBurgundyGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#45120c" />
      <stop offset="50%" stop-color="#210805" />
      <stop offset="100%" stop-color="#0d0302" />
    </radialGradient>

    <radialGradient id="goldLuxuryLabelGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#262626" />
      <stop offset="60%" stop-color="#0a0a0a" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>

    <radialGradient id="cyberLabelGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2a0845" />
      <stop offset="60%" stop-color="#120320" />
      <stop offset="100%" stop-color="#04010a" />
    </radialGradient>

    <radialGradient id="slateLabelGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="60%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>

    <radialGradient id="mintLabelGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="60%" stop-color="#022c22" />
      <stop offset="100%" stop-color="#01140e" />
    </radialGradient>
  </defs>

  <!-- Turntable Platter Base -->
  <circle cx="${cx}" cy="${cy}" r="${outerPlatterRadius}" fill="${platterRimGrad}" stroke="#000000" stroke-width="2" />
  <circle cx="${cx}" cy="${cy}" r="${outerPlatterRadius - 9}" fill="#09090b" stroke="#27272a" stroke-width="1.2" />

  <!-- Stroboscopic Calibration Rim Dots -->
  <g id="strobe_dots">
${strobeDots}
  </g>

  <!-- Dark Felt Slipmat Base -->
  <circle cx="${cx}" cy="${cy}" r="${vinylRadius + 2}" fill="#09090b" stroke="${labelBorder}" stroke-width="0.8" opacity="0.5" />

  <!-- 12-Inch Black PVC Vinyl Record Body -->
  <circle cx="${cx}" cy="${cy}" r="${vinylRadius}" fill="${vinylBodyColor}" stroke="#0a0a0a" stroke-width="1.5" />

  <!-- High-Density Microgrooves -->
  <g id="vinyl_grooves">
${grooves}
  </g>

  <!-- Inner Dead Wax Area (Smooth PVC Runout with Hand-Etched Matrix Numbers) -->
  <circle cx="${cx}" cy="${cy}" r="${deadWaxRadius}" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.12" />
  <path id="dead_wax_path" d="M ${(cx - deadWaxRadius + 12).toFixed(1)},${cy} A ${(deadWaxRadius - 12).toFixed(1)} ${(deadWaxRadius - 12).toFixed(1)} 0 1,1 ${(cx + deadWaxRadius - 12).toFixed(1)},${cy}" fill="none" />
  <text font-family="DejaVu Sans, monospace" font-size="6" font-weight="bold" fill="${deadWaxTextColor}" opacity="0.65" letter-spacing="1.5">
    <textPath href="#dead_wax_path" startOffset="10%">
      ★ DJV-923-A1 • MASTERDISK STEREO • DEJAVUFM LONDON ★
    </textPath>
  </text>

  <!-- Center Paper Label & Pressing Ridge -->
  <circle cx="${cx}" cy="${cy}" r="${labelRadius}" fill="${labelBg}" stroke="${labelBorder}" stroke-width="2.5" />
  <!-- Stamped Paper Pressing Ridge Ring -->
  <circle cx="${cx}" cy="${cy}" r="${labelRadius - 3}" fill="none" stroke="#ffffff" stroke-width="0.6" opacity="0.2" />
  <circle cx="${cx}" cy="${cy}" r="${labelRadius - 10}" fill="none" stroke="${labelBorder}" stroke-width="0.8" opacity="0.5" stroke-dasharray="4,2" />

  <!-- Swiss/Bauhaus Typography Center Label Content -->
  <!-- Top Arch Station Identifier -->
  <path id="label_arch" d="M ${(cx - labelRadius + 14).toFixed(1)},${cy - 8} A ${(labelRadius - 14).toFixed(1)} ${(labelRadius - 14).toFixed(1)} 0 0,1 ${(cx + labelRadius - 14).toFixed(1)},${cy - 8}" fill="none" />
  <text font-family="DejaVu Sans, Arial, sans-serif" font-size="7" font-weight="900" fill="${labelAccentText}" letter-spacing="2.5">
    <textPath href="#label_arch" startOffset="50%" text-anchor="middle">
      DEJAVUFM 92.3 LONDON
    </textPath>
  </text>

  <!-- Side & Speed Identifiers -->
  <text x="${cx - 52}" y="${cy - 22}" fill="${labelAccentText}" font-family="DejaVu Sans, monospace" font-size="7" font-weight="bold" text-anchor="start">SIDE A</text>
  <text x="${cx + 52}" y="${cy - 22}" fill="${labelAccentText}" font-family="DejaVu Sans, monospace" font-size="7" font-weight="bold" text-anchor="end">33⅓ RPM</text>

  <!-- Center Station Emblem / DJ Name -->
  <text x="${cx}" y="${cy - 10}" fill="#ffffff" font-family="DejaVu Sans, Arial, sans-serif" font-size="${dj.length > 18 ? 10 : 12}" font-weight="900" text-anchor="middle" letter-spacing="1">
    ${dj}
  </text>
  <text x="${cx}" y="${cy + 4}" fill="${labelAccentText}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${show.length > 20 ? 7 : 8}" font-weight="bold" text-anchor="middle" letter-spacing="0.8">
    ${show}
  </text>

  <!-- Bottom Copyright & Master Info -->
  <text x="${cx}" y="${cy + 22}" fill="${labelSubText}" font-family="DejaVu Sans, monospace" font-size="5.5" font-weight="bold" text-anchor="middle" letter-spacing="1">
    ORIGINAL BROADCAST MASTER
  </text>
  <text x="${cx}" y="${cy + 30}" fill="#94a3b8" font-family="DejaVu Sans, monospace" font-size="5" font-weight="bold" text-anchor="middle" opacity="0.7">
    ALL RIGHTS RESERVED • DJV-923
  </text>

  <!-- Center Spindle Hole & Metal Bushing -->
  <circle cx="${cx}" cy="${cy}" r="14" fill="#18181b" stroke="#71717a" stroke-width="1" />
  <circle cx="${cx}" cy="${cy}" r="9" fill="#09090b" stroke="${labelBorder}" stroke-width="0.8" />
  <circle cx="${cx}" cy="${cy}" r="4.5" fill="#000000" stroke="#a1a1aa" stroke-width="0.8" />
</svg>`;
}

/**
 * Generate a hyper-realistic STATIONARY anisotropic specular light sheen overlay SVG.
 * Sitting in a fixed orientation (light coming from top-left overhead studio spotlight),
 * keeping light reflections perfectly stationary while the record turns beneath!
 */
export function generateVinylSheenSVG(options: { size?: number }): string {
  const size = options.size || 600;
  const cx = size / 2;
  const cy = size / 2;
  const vinylRadius = size * 0.46;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Anisotropic Dual-Conical Specular Reflection Bowtie Gradients -->
    <linearGradient id="sheenPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38" />
      <stop offset="25%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.01" />
      <stop offset="75%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.38" />
    </linearGradient>

    <linearGradient id="sheenSecondary" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30" />
      <stop offset="30%" stop-color="#fef08a" stop-opacity="0.08" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.01" />
      <stop offset="70%" stop-color="#fef08a" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.30" />
    </linearGradient>

    <!-- Studio Overhead Vignette Shadow -->
    <radialGradient id="studioVignette" cx="40%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="60%" stop-color="#000000" stop-opacity="0.0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.3" />
    </radialGradient>
  </defs>

  <!-- Stationary Studio Overhead Vignette -->
  <circle cx="${cx}" cy="${cy}" r="${vinylRadius}" fill="url(#studioVignette)" pointer-events="none" />

  <!-- Dual Anisotropic Bowtie Sheen Cones (Anchored to Studio Lighting) -->
  <g pointer-events="none">
    <!-- Top-Left & Bottom-Right High-Light Cones -->
    <path d="M ${cx},${cy} L ${(cx - vinylRadius * 0.75).toFixed(1)},${(cy - vinylRadius * 0.65).toFixed(1)} A ${vinylRadius} ${vinylRadius} 0 0,1 ${(cx - vinylRadius * 0.25).toFixed(1)},${(cy - vinylRadius * 0.95).toFixed(1)} Z" fill="url(#sheenPrimary)" />
    <path d="M ${cx},${cy} L ${(cx + vinylRadius * 0.75).toFixed(1)},${(cy + vinylRadius * 0.65).toFixed(1)} A ${vinylRadius} ${vinylRadius} 0 0,1 ${(cx + vinylRadius * 0.25).toFixed(1)},${(cy + vinylRadius * 0.95).toFixed(1)} Z" fill="url(#sheenPrimary)" />

    <!-- Cross Fill Soft Reflection -->
    <path d="M ${cx},${cy} L ${(cx + vinylRadius * 0.65).toFixed(1)},${(cy - vinylRadius * 0.75).toFixed(1)} A ${vinylRadius} ${vinylRadius} 0 0,1 ${(cx + vinylRadius * 0.95).toFixed(1)},${(cy - vinylRadius * 0.25).toFixed(1)} Z" fill="url(#sheenSecondary)" />
    <path d="M ${cx},${cy} L ${(cx - vinylRadius * 0.65).toFixed(1)},${(cy + vinylRadius * 0.75).toFixed(1)} A ${vinylRadius} ${vinylRadius} 0 0,1 ${(cx - vinylRadius * 0.95).toFixed(1)},${(cy + vinylRadius * 0.25).toFixed(1)} Z" fill="url(#sheenSecondary)" />
  </g>

  <!-- Center Spindle Specular Highlight Pin Spot -->
  <circle cx="${cx - 1.5}" cy="${cy - 1.5}" r="2" fill="#ffffff" opacity="0.8" pointer-events="none" />
</svg>`;
}

/**
 * Renders both the rotating vinyl disc PNG AND the stationary light sheen overlay PNG assets.
 */
export function createVinylDiscPNG(options: {
  djName?: string;
  showName?: string;
  labelTheme?: VinylTheme;
  outputPngPath: string;
}): { discPath: string; sheenPath: string } | null {
  try {
    const tempSvgPath = options.outputPngPath.replace(/\.png$/i, '.svg');
    const sheenPngPath = options.outputPngPath.replace(/\.png$/i, '_sheen.png');
    const tempSheenSvgPath = options.outputPngPath.replace(/\.png$/i, '_sheen.svg');

    // 1. Generate Disc SVG
    const svgContent = generateVinylSVG({
      djName: options.djName,
      showName: options.showName,
      labelTheme: options.labelTheme,
      size: 600
    });
    fs.writeFileSync(tempSvgPath, svgContent, 'utf-8');

    // 2. Generate Sheen SVG
    const sheenSvgContent = generateVinylSheenSVG({ size: 600 });
    fs.writeFileSync(tempSheenSvgPath, sheenSvgContent, 'utf-8');

    // Convert both to PNG via FFmpeg Lanczos scaling
    const resDisc = spawnSync('ffmpeg', [
      '-y',
      '-i', tempSvgPath,
      '-vf', 'scale=600:600:flags=lanczos',
      options.outputPngPath
    ], { encoding: 'utf-8' });

    const resSheen = spawnSync('ffmpeg', [
      '-y',
      '-i', tempSheenSvgPath,
      '-vf', 'scale=600:600:flags=lanczos',
      sheenPngPath
    ], { encoding: 'utf-8' });

    // Clean up temporary SVG files
    try {
      if (fs.existsSync(tempSvgPath)) fs.unlinkSync(tempSvgPath);
      if (fs.existsSync(tempSheenSvgPath)) fs.unlinkSync(tempSheenSvgPath);
    } catch {}

    if (
      resDisc.status === 0 &&
      fs.existsSync(options.outputPngPath) &&
      resSheen.status === 0 &&
      fs.existsSync(sheenPngPath)
    ) {
      return { discPath: options.outputPngPath, sheenPath: sheenPngPath };
    } else if (fs.existsSync(options.outputPngPath)) {
      return { discPath: options.outputPngPath, sheenPath: options.outputPngPath };
    }
    return null;
  } catch (err) {
    console.warn('[Vinyl Generator] Failed to generate vinyl disc PNG:', err);
    return null;
  }
}
