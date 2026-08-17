import { generateQRCodeSVG } from '../src/utils/qrcode.js';
import jsQR from 'jsqr';

function parseSVGAndDecode(name, text) {
  const svg = generateQRCodeSVG(text, 260);
  
  // Extract all rect elements
  const rectMatches = [...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="#000000"\/>/g)];
  
  // Render on 260x260 image
  const size = 260;
  const rgba = new Uint8ClampedArray(size * size * 4);
  rgba.fill(255);

  for (const m of rectMatches) {
    const rx = parseFloat(m[1]);
    const ry = parseFloat(m[2]);
    const rw = parseFloat(m[3]);
    const rh = parseFloat(m[4]);

    for (let y = Math.floor(ry); y < Math.ceil(ry + rh) && y < size; y++) {
      for (let x = Math.floor(rx); x < Math.ceil(rx + rw) && x < size; x++) {
        const idx = (y * size + x) * 4;
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 255;
      }
    }
  }

  const code = jsQR(rgba, size, size);
  if (code && code.data === text) {
    console.log(`✅ [SVG SCAN PASS] ${name}: Decoded "${code.data.substring(0, 35)}..." (${rectMatches.length} modules)`);
    return true;
  } else {
    console.error(`❌ [SVG SCAN FAIL] ${name}: Got "${code ? code.data : 'NULL'}"`);
    return false;
  }
}

console.log('Testing SVG decoding...');
parseSVGAndDecode('Texto Simple', 'Sálvate PWA 2026');
parseSVGAndDecode('Ficha Médica', JSON.stringify({ nombre: 'Carlos', sangre: 'O+' }));
parseSVGAndDecode('Token WebRTC', JSON.stringify({ t: 'O', u: 'user-1', uf: 'ab', pw: '12', sdp: 'test' }));
