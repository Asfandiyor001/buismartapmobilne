/**
 * BIU Smart App — Asset Generator
 * Generates icon.png, adaptive-icon.png, favicon.png, splash-icon.png
 * Run: node generate-assets.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'assets', 'images');

// ─── Helpers ────────────────────────────────────────────────────────────────

function hex(h) {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r, g, b };
}

// Bilinear interpolation between two hex colours at fraction t
function lerpColor(c1, c2, t) {
  const a = hex(c1), b = hex(c2);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

// Build a raw RGBA pixel buffer with a diagonal gradient (top-left → bottom-right)
function buildGradientBuffer(w, h, colorA, colorB) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x / (w - 1) + y / (h - 1)) / 2;
      const c = lerpColor(colorA, colorB, t);
      const idx = (y * w + x) * 4;
      buf[idx] = c.r;
      buf[idx + 1] = c.g;
      buf[idx + 2] = c.b;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// Build a raw RGBA solid-colour buffer
function buildSolidBuffer(w, h, r, g, b, a = 255) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = a;
  }
  return buf;
}

// Draw a filled circle in an RGBA buffer (mutates buf in place)
function drawCircle(buf, W, cx, cy, radius, r, g, b, a = 255) {
  const r2 = radius * radius;
  for (let y = Math.max(0, cy - radius); y <= Math.min(W - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const idx = (y * W + x) * 4;
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
      }
    }
  }
}

// Apply a circular clip mask to a buffer (pixels outside radius become transparent)
function circularClip(buf, w, h) {
  const cx = w / 2, cy = h / 2;
  const r = Math.min(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r * r) {
        buf[(y * w + x) * 4 + 3] = 0;
      }
    }
  }
}

// Rounded-rect SVG clip mask (returns SVG string)
function roundedRectSVG(w, h, radius) {
  return `<svg width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`;
}

// ─── SVG overlays ────────────────────────────────────────────────────────────

function iconOverlaySVG(size, withRoundedRect = false, cornerRadius = 220) {
  const center = size / 2;
  const letterSize = Math.round(size * 0.52);
  const accentW = Math.round(size * 0.40);
  const accentH = Math.round(size * 0.018);
  const accentY = Math.round(center + size * 0.29);
  const accentX = center - accentW / 2;

  // Inner glow ring
  const glowR = Math.round(size * 0.46);

  const clip = withRoundedRect
    ? `<defs>
        <clipPath id="rr">
          <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
        </clipPath>
      </defs>
      <g clip-path="url(#rr)">`
    : '<g>';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="rgba(2,128,144,0)" />
      <stop offset="100%" stop-color="rgba(2,128,144,0.35)" />
    </radialGradient>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E2761"/>
      <stop offset="100%" stop-color="#028090"/>
    </linearGradient>
    <clipPath id="rr2">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${withRoundedRect ? cornerRadius : 0}" ry="${withRoundedRect ? cornerRadius : 0}"/>
    </clipPath>
  </defs>

  <!-- Background gradient -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#grad)" clip-path="url(#rr2)"/>

  <!-- Inner glow ring -->
  <circle cx="${center}" cy="${center}" r="${glowR}" fill="url(#glow)" clip-path="url(#rr2)"/>

  <!-- Letter B -->
  <text
    x="${center}"
    y="${center + letterSize * 0.36}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${letterSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    clip-path="url(#rr2)"
  >B</text>

  <!-- Accent line -->
  <rect
    x="${accentX}" y="${accentY}"
    width="${accentW}" height="${accentH}"
    rx="${accentH / 2}"
    fill="#CADCFC"
    clip-path="url(#rr2)"
  />
</svg>`;
}

function faviconSVG(size) {
  const center = size / 2;
  const letterSize = Math.round(size * 0.56);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E2761"/>
      <stop offset="100%" stop-color="#028090"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#grad)"/>
  <text
    x="${center}" y="${center + letterSize * 0.36}"
    font-family="Georgia, serif"
    font-size="${letterSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
  >B</text>
</svg>`;
}

function splashSVG(W, H) {
  const cx = W / 2;

  // Vertically centre the content block
  const logoR = 100;          // circle radius
  const logoY = H / 2 - 80;  // centre of logo circle
  const nameY = logoY + logoR + 24 + 28;     // "BIU Smart"
  const tagY = nameY + 48 + 12 + 16;         // tagline
  const dotsY = tagY + 24 + 40 + 5;          // dots centre
  const uniY = H - 80;                       // university name

  // Decoration circles
  const deco1Cx = W + 100, deco1Cy = -100, deco1R = 400;
  const deco2Cx = -80, deco2Cy = H + 80, deco2R = 300;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#028090"/>
      <stop offset="100%" stop-color="#1E2761"/>
    </linearGradient>
  </defs>

  <!-- Solid background -->
  <rect width="${W}" height="${H}" fill="#1E2761"/>

  <!-- Deco circles -->
  <circle cx="${deco1Cx}" cy="${deco1Cy}" r="${deco1R}" fill="rgba(2,128,144,0.15)"/>
  <circle cx="${deco2Cx}" cy="${deco2Cy}" r="${deco2R}" fill="rgba(2,128,144,0.10)"/>

  <!-- Logo circle -->
  <circle cx="${cx}" cy="${logoY}" r="${logoR}" fill="url(#logoGrad)"/>
  <circle cx="${cx}" cy="${logoY}" r="${logoR}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>

  <!-- "BIU" text inside circle -->
  <text
    x="${cx}" y="${logoY + 24}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="64"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    letter-spacing="4"
  >BIU</text>

  <!-- App name -->
  <text
    x="${cx}" y="${nameY}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="52"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
  >BIU Smart</text>

  <!-- Tagline -->
  <text
    x="${cx}" y="${tagY}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="26"
    font-weight="normal"
    fill="rgba(202,220,252,0.8)"
    text-anchor="middle"
  >Aqlli Korporativ Tizim</text>

  <!-- Loading dots -->
  <circle cx="${cx - 22}" cy="${dotsY}" r="10" fill="white"/>
  <circle cx="${cx}" cy="${dotsY}" r="10" fill="rgba(255,255,255,0.5)"/>
  <circle cx="${cx + 22}" cy="${dotsY}" r="10" fill="rgba(255,255,255,0.25)"/>

  <!-- University name -->
  <text
    x="${cx}" y="${uniY}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22"
    font-weight="normal"
    fill="rgba(255,255,255,0.5)"
    text-anchor="middle"
  >Buxoro Innovatsiyalar Universiteti</text>
</svg>`;
}

// ─── Generators ──────────────────────────────────────────────────────────────

async function generateIcon() {
  const SIZE = 1024;
  const svg = iconOverlaySVG(SIZE, true, 220);
  const outPath = path.join(OUT, 'icon.png');
  await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toFile(outPath);
  console.log('✓  icon.png            (1024×1024, rounded)');
}

async function generateAdaptiveIcon() {
  const SIZE = 1024;
  const svg = iconOverlaySVG(SIZE, false, 0);
  const outPath = path.join(OUT, 'adaptive-icon.png');
  await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toFile(outPath);
  console.log('✓  adaptive-icon.png   (1024×1024, no radius)');
}

async function generateFavicon() {
  const SIZE = 48;
  const svg = faviconSVG(SIZE);
  const outPath = path.join(OUT, 'favicon.png');
  await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toFile(outPath);
  console.log('✓  favicon.png         (48×48)');
}

async function generateSplash() {
  const W = 1284, H = 2778;
  const svg = splashSVG(W, H);
  const outPath = path.join(OUT, 'splash-icon.png');
  await sharp(Buffer.from(svg)).resize(W, H).png().toFile(outPath);
  console.log('✓  splash-icon.png     (1284×2778)');
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\nBIU Smart App — Asset Generator\n');
  try {
    await generateIcon();
    await generateAdaptiveIcon();
    await generateFavicon();
    await generateSplash();
    console.log('\nAll assets generated successfully in assets/images/\n');
  } catch (err) {
    console.error('\nError:', err.message);
    process.exit(1);
  }
})();
