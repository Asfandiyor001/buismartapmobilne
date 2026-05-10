// BIU binolari va masofa (map / bino tanlash uchun; backend alohida tekshiradi)

export const BUILDINGS = [
  {
    id: 1,
    name: 'Bino 1 — Asosiy bino',
    short: 'Bino 1',
    desc: "Ta'lim korpusi",
    latitude: 39.741066,
    longitude: 64.427637,
    color: '#028090',
    staffCount: 47,
  },
  {
    id: 2,
    name: 'Bino 2 — Ta\'lim korpusi 2-binos',
    short: 'Bino 2',
    desc: "Ta'lim korpusi 2-bino",
    latitude: 39.740624,
    longitude: 64.432623,
    color: '#7C3AED',
    staffCount: 23,
  },
  {
    id: 3,
    name: 'Bino 3 — Kutubxona',
    short: 'Bino 3',
    desc: "Ma'lumot markazi",
    latitude: 39.7402,
    longitude: 64.4348,
    color: '#F59E0B',
    staffCount: 15,
  },
];

// Dev sanity: list must stay 3 public campuses (no "Admin uyi" in client bundle)
console.log('[buildings.js] BUILDINGS count:', BUILDINGS.length);

export const GPS_RADIUS = 100;

export const WORK_START_H = 8;
export const WORK_START_M = 30;
export const WORK_END_H = 16;
export const WORK_END_M = 30;

export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWorkTime() {
  const now = new Date();
  const dow = now.getDay();
  // Dushanba–Shanba (1–6); Yakshanba (0) dam olish
  if (dow === 0) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const from = WORK_START_H * 60 + WORK_START_M;
  const to = WORK_END_H * 60 + WORK_END_M;
  return mins >= from && mins <= to;
}

export function detectBuilding(latitude, longitude) {
  let nearest = null;
  let minDist = Infinity;
  BUILDINGS.forEach((b) => {
    const d = getDistance(latitude, longitude, b.latitude, b.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = { ...b, distance: Math.round(d) };
    }
  });
  return {
    inBuilding: minDist <= GPS_RADIUS ? nearest : null,
    nearest,
    minDist: Math.round(minDist),
  };
}

export function formatDist(m) {
  if (m === undefined || m === null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
