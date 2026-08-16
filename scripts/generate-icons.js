import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size * (isMaskable ? 0.5 : 0.42);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Slate 900 background: #0f172a
      let r = 15, g = 23, b = 42, a = 255;

      if (dist <= radius) {
        // Emerald circle backdrop: #10b981
        const heartDist = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - (center - size * 0.05), 2));
        if (heartDist < size * 0.3) {
          r = 16; g = 185; b = 129; // #10b981
        }
        
        // Inner pulse white cross / emblem
        const inArmX = Math.abs(x - center) < size * 0.06 && Math.abs(y - center) < size * 0.22;
        const inArmY = Math.abs(y - center) < size * 0.06 && Math.abs(x - center) < size * 0.22;
        if (inArmX || inArmY) {
          r = 255; g = 255; b = 255;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createIcon(512));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512-maskable.png'), createIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIcon(180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createIcon(64));

console.log('✅ Generated PWA icons successfully!');
