import QRCode from 'qrcode';

/**
 * Pure JavaScript ISO/IEC 18004 Standard QR Code Generator (SVG Output)
 * 100% Offline-First, Zero Telemetry, Full Error Correction (Reed-Solomon & BCH).
 */

export function generateQRCodeSVG(text, size = 260) {
  try {
    const cleanText = (text || ' ').toString();
    const qrData = QRCode.create(cleanText, { errorCorrectionLevel: 'L' });
    const modules = qrData.modules.size;
    const padding = 2;
    const totalModules = modules + padding * 2;
    const cellSize = size / totalModules;
    const rawData = qrData.modules.data;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="w-full h-full block rounded-2xl">`;
    svg += `<rect width="${size}" height="${size}" fill="#ffffff" rx="16"/>`;

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (rawData[r * modules + c]) {
          const x = (c + padding) * cellSize;
          const y = (r + padding) * cellSize;
          svg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cellSize + 0.25).toFixed(2)}" height="${(cellSize + 0.25).toFixed(2)}" fill="#000000"/>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  } catch (err) {
    console.error('Error generating standard QR SVG:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/></svg>`;
  }
}

export function generateSVGQRCode(text, size = 260) {
  return generateQRCodeSVG(text, size);
}
