import fs from 'fs';
import { PNG } from 'pngjs';

function drawTransparentIcon(size) {
  const png = new PNG({ width: size, height: size });
  const pad = size * 0.06;

  // Colors
  const emeraldR = 16, emeraldG = 185, emeraldB = 129; // #10b981
  const mintR = 52, mintG = 211, mintB = 153; // #34d399
  const darkShieldR = 8, darkShieldG = 32, darkShieldB = 22; // #082016
  const whiteR = 255, whiteG = 255, whiteB = 255;

  const activeSize = size - pad * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Coordinate normalization to [0, 1]
      const nx = (x - pad) / activeSize;
      const ny = (y - pad) / activeSize;

      let r = 0, g = 0, b = 0, a = 0;

      // Shield Geometry: top at ny=0.08, bottom at ny=0.92, cx at nx=0.5
      if (nx >= 0.08 && nx <= 0.92 && ny >= 0.06 && ny <= 0.94) {
        const sx = (nx - 0.5) * 2; // -1 to 1
        const sy = (ny - 0.06) / 0.88; // 0 to 1

        const topCurv = Math.cos(sx * Math.PI * 0.5) * 0.08;
        const widthAtY = sy < 0.35 
          ? 0.82 
          : 0.82 * Math.cos(((sy - 0.35) / 0.65) * (Math.PI * 0.48));

        if (sy >= topCurv && Math.abs(sx) <= widthAtY) {
          // Inside Shield
          const borderDist = Math.abs(Math.abs(sx) - widthAtY);
          const isOuterBorder = borderDist < 0.09 || Math.abs(sy - topCurv) < 0.04;
          const isInnerBevel = Math.abs(borderDist - 0.16) < 0.02 && sy > 0.08 && sy < 0.85;

          if (isOuterBorder) {
            // Gradient emerald border
            const edgeGrad = 1 - Math.abs(sx) * 0.3;
            r = Math.round(emeraldR * edgeGrad);
            g = Math.round(emeraldG * edgeGrad);
            b = Math.round(emeraldB * edgeGrad);
            a = 255;
          } else if (isInnerBevel) {
            r = mintR;
            g = mintG;
            b = mintB;
            a = 160;
          } else {
            // Dark tactical inner shield fill
            const grad = 1 - sy * 0.6;
            r = Math.round(darkShieldR * grad);
            g = Math.round(darkShieldG * grad);
            b = Math.round(darkShieldB * grad);
            a = 245;
          }
        }
      }

      // Draw Seismic Lifeline Wave
      // Segment path: (0.16, 0.50) -> (0.34, 0.50) -> (0.41, 0.36) -> (0.50, 0.66) -> (0.58, 0.30) -> (0.66, 0.60) -> (0.71, 0.50) -> (0.84, 0.50)
      const points = [
        [0.16, 0.50],
        [0.34, 0.50],
        [0.41, 0.36],
        [0.50, 0.66],
        [0.58, 0.30],
        [0.66, 0.60],
        [0.71, 0.50],
        [0.84, 0.50]
      ];

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const x1 = pad + p1[0] * activeSize;
        const y1 = pad + p1[1] * activeSize;
        const x2 = pad + p2[0] * activeSize;
        const y2 = pad + p2[1] * activeSize;

        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        let t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / l2));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dist = Math.hypot(x - projX, y - projY);

        const lineWidth = size * 0.042;
        if (dist <= lineWidth) {
          const coreT = dist / lineWidth;
          const blend = Math.max(0, 1 - coreT);
          r = Math.round(mintR * (1 - blend) + whiteR * blend);
          g = Math.round(mintG * (1 - blend) + whiteG * blend);
          b = Math.round(mintB * (1 - blend) + whiteB * blend);
          a = 255;
        }
      }

      // Draw Rescue Beacon Dot at highest peak (0.58, 0.30)
      const peakX = pad + 0.58 * activeSize;
      const peakY = pad + 0.30 * activeSize;
      const peakDist = Math.hypot(x - peakX, y - peakY);
      const dotRadius = size * 0.035;

      if (peakDist <= dotRadius) {
        r = 255;
        g = 255;
        b = 255;
        a = 255;
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return png;
}

function saveTransparentPng(filename, size) {
  const png = drawTransparentIcon(size);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filename, buffer);
  console.log(`✅ Generado ${filename} (${size}x${size}, fondo transparente)`);
}

// Generate all transparent PWA and Apple Touch assets
saveTransparentPng('public/pwa-512x512.png', 512);
saveTransparentPng('public/pwa-512x512-maskable.png', 512);
saveTransparentPng('public/pwa-192x192.png', 192);
saveTransparentPng('public/apple-touch-icon.png', 180);
saveTransparentPng('public/favicon.ico', 32);

console.log('🎉 Todos los iconos sin fondo de Sálvate PWA han sido generados.');
