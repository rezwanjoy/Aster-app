// Renders the original Aster star icon to PNGs (no dependencies).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const png = (size, rgba) => {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// 5-point star polygon: outer radius R, inner radius 0.45R
const starPoly = (cx, cy, R) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? R * 0.45 : R;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return pts;
};
const inside = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const inRoundRect = (x, y, s, rad) => {
  const dx = Math.max(rad - x, 0, x - (s - rad));
  const dy = Math.max(rad - y, 0, y - (s - rad));
  return dx * dx + dy * dy <= rad * rad;
};

const render = (size, { rounded, starScale }) => {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 3;
  const star = starPoly(size / 2, size * 0.53, size * starScale);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (rounded && !inRoundRect(px, py, size, size * 0.22)) continue;
          const t = (px + py) / (2 * size);
          let c = [138 + (58 - 138) * t, 109 + (31 - 109) * t, 255 + (160 - 255) * t];
          if (inside(star, px, py)) c = [255 - 30 * t, 243 - 50 * t, 212 - 100 * t];
          r += c[0]; g += c[1]; b += c[2]; hits++;
        }
      }
      const i = (y * size + x) * 4;
      if (hits) {
        buf[i] = r / hits; buf[i + 1] = g / hits; buf[i + 2] = b / hits;
        buf[i + 3] = Math.round((hits / (SS * SS)) * 255);
      }
    }
  }
  return png(size, buf);
};

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, { rounded: true, starScale: 0.38 }));
writeFileSync('public/icons/icon-512.png', render(512, { rounded: true, starScale: 0.38 }));
// Maskable: full-bleed square, star kept inside the 80% safe zone
writeFileSync('public/icons/maskable-512.png', render(512, { rounded: false, starScale: 0.3 }));
console.log('icons written');
