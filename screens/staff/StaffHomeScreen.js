// ═══════════════════════════════════════════════════════════
// SCREEN 03 — staff/StaffHomeScreen.js
// Real-time GPS monitoring: 50m aniqlik, ish vaqti 08:30–16:30
// Binolar avtomatik almashadi, tashqarida ogohlantirish
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Modal, Pressable, ActivityIndicator, Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  MapPin, Clock, BarChart2, Settings, Building2,
  Bell, ChevronRight, Inbox,
  CheckCircle2, AlertTriangle,
  X, Zap, CheckCheck, Navigation, RefreshCw, Users,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import {
  StatusPill, SectionHeader, ProgressBar, Card, BottomNav,
} from '../../components';
import {
  BUILDINGS, GPS_RADIUS, getDistance, detectBuilding,
  formatDist, isWorkTime,
  WORK_START_H, WORK_START_M, WORK_END_H, WORK_END_M,
} from '../../src/utils/buildings';
import { useWorkStore, useAuthStore, useNotificationStore } from '../../src/store';
import { getCurrentLocation, startSilentTracking, pushOfflineEvent, startOfflineSync } from '../../src/utils/location';
import { workAPI } from '../../src/api/work.api';
import { StaffMessagesPanel, TYPE_META, formatHomeActivityTime } from './MessagesScreen';
import MyReportScreen from './MyReportScreen';
import ProfileScreen from './ProfileScreen';

/** Veb: RCTAnimation yo‘q; `useNativeDriver: true` ogohlantirish bermasligi uchun */
const NATIVE_DRIVER = Platform.OS !== 'web';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const pad = (n) => String(n).padStart(2, '0');

function toHHMM(value) {
  if (value == null || value === '') return '--:--';
  if (typeof value === 'string') {
    const t = value.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) return t.slice(0, 5);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapSessionLogs(logs) {
  if (!Array.isArray(logs)) return [];
  return logs.map((l) => ({
    building: l.buildingName || l.building || 'Bino',
    entry: toHHMM(l.entryTime),
    exit: l.exitTime ? toHHMM(l.exitTime) : null,
  }));
}

const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function useWorkTimer(startTime = '08:30', endTime = '16:30') {
  const calc = () => {
    const now = new Date();
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startSec = sh * 3600 + sm * 60;
    const endSec   = eh * 3600 + em * 60;
    const totalSec = Math.max(1, endSec - startSec);
    const curSec   = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const elapsed  = Math.min(Math.max(0, curSec - startSec), totalSec);
    return { elapsed, totalSec };
  };
  const [state, setState] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setState(calc()), 1000);
    return () => clearInterval(t);
  }, [startTime, endTime]);
  const { elapsed, totalSec } = state;
  const timer    = `${pad(Math.floor(elapsed / 3600))}:${pad(Math.floor((elapsed % 3600) / 60))}:${pad(elapsed % 60)}`;
  const progress = elapsed / totalSec;
  return { timer, progress };
}

// ═══════════════════════════════════════════════════════════
// REAL-TIME GPS MONITOR HOOK
// watchPositionAsync — har 15 sek yoki 10 metr harakatda yangilanadi
// status: scanning | in_building | outside | off_work | denied | error
// ═══════════════════════════════════════════════════════════
function useGPSMonitor() {
  const [monitor, setMonitor] = useState({
    status:          'scanning',
    currentBuilding: null,   // { id, name, short, distance, color, ... }
    nearestBuilding: null,   // eng yaqin bino (hatto 50m dan uzoq bo'lsa ham)
    minDist:         null,   // eng yaqin binoga masofa (metr)
    accuracy:        null,   // GPS aniqlik (metr)
    coords:          null,   // { latitude, longitude }
    lastUpdate:      null,   // yangilangan vaqt
    isWorkTime:      isWorkTime(),
  });

  const subRef = useRef(null);

  const processLocation = useCallback((coords) => {
    const work = isWorkTime();
    const { inBuilding, nearest, minDist } = detectBuilding(coords.latitude, coords.longitude);

    let status;
    if (!work)       status = 'off_work';
    else if (inBuilding) status = 'in_building';
    else             status = 'outside';

    setMonitor({
      status,
      currentBuilding: inBuilding,
      nearestBuilding: nearest,
      minDist,
      accuracy:    Math.round(coords.accuracy || 10),
      coords:      { latitude: coords.latitude, longitude: coords.longitude },
      lastUpdate:  nowTime(),
      isWorkTime:  work,
    });

    // Silent server geofencing: every location sample is stored; no UI / notifications.
    workAPI
      .ping(coords.latitude, coords.longitude, coords.accuracy ?? null)
      .catch(() => {});
  }, []);

  const startWatching = useCallback(async () => {
    setMonitor(prev => ({ ...prev, status: 'scanning' }));

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setMonitor(prev => ({ ...prev, status: 'denied' }));
      return;
    }

    // Veb: watchPositionAsync obyektining .remove() expo webda ishonchli emas
    // (LocationEventEmitter.removeSubscription) — faqat bir martalik o‘qish
    if (Platform.OS === 'web') {
      subRef.current = null;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        processLocation(loc.coords);
      } catch {
        setMonitor(prev => ({ ...prev, status: 'error' }));
      }
      return;
    }

    // Dastlab bir marta tez olish
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      processLocation(loc.coords);
    } catch { /* ignore — watch boshlanganda keladi */ }

    // Doimiy kuzatish: har 15 sek yoki 10 metr harakatda
    try {
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.High,
          timeInterval:     15000,   // 15 sekund
          distanceInterval: 10,      // 10 metr
        },
        (loc) => processLocation(loc.coords),
      );
    } catch {
      setMonitor(prev => ({ ...prev, status: 'error' }));
    }
  }, [processLocation]);

  useEffect(() => {
    startSilentTracking();
    startWatching();
    // Ish vaqti o'zgarganda (minutiga bir marta tekshir)
    const tick = setInterval(() => {
      setMonitor(prev => {
        if (prev.status === 'denied' || prev.status === 'scanning') return prev;
        const work = isWorkTime();
        if (prev.isWorkTime === work) return prev;
        // Ish vaqti holati o'zgardi
        return { ...prev, isWorkTime: work,
          status: prev.currentBuilding ? (work ? 'in_building' : 'off_work')
                  : (work ? 'outside' : 'off_work') };
      });
    }, 60000);

    return () => {
      try {
        subRef.current?.remove?.();
      } catch { /* veb / eski sub */ }
      subRef.current = null;
      clearInterval(tick);
    };
  }, [startWatching]);

  const refresh = useCallback(() => {
    try {
      subRef.current?.remove?.();
    } catch { /* */ }
    subRef.current = null;
    startWatching();
  }, [startWatching]);

  return { monitor, refresh };
}

// ═══════════════════════════════════════════════════════════
// GPS ANTI-CHEAT HOOK
// Polls Location.hasServicesEnabledAsync every 10 seconds.
// On first detection of GPS-off, pushes a gps_off event to
// the offline queue (deduplicated with gpsOffLoggedRef).
// Returns isGpsOff boolean for rendering the lock overlay.
// ═══════════════════════════════════════════════════════════
function useGPSAntiCheat() {
  const [isGpsOff, setIsGpsOff] = useState(false);
  const gpsOffLoggedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let mounted = true;

    const check = async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!mounted) return;

        if (!enabled) {
          setIsGpsOff(true);
          if (!gpsOffLoggedRef.current) {
            gpsOffLoggedRef.current = true;
            await pushOfflineEvent({
              type: 'gps_off',
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          setIsGpsOff(false);
          gpsOffLoggedRef.current = false;
        }
      } catch { /* ignore permission errors */ }
    };

    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return isGpsOff;
}

// ═══════════════════════════════════════════════════════════
// WORK LOG HELPERS
// ═══════════════════════════════════════════════════════════
const secFrom = (t) => { const [h, m] = t.split(':').map(Number); return h * 3600 + m * 60; };
const hhmmss  = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
const durStr  = (s) => {
  if (!s || s <= 0) return '0d';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}s ${m}d` : `${m}d`;
};

const parseEntryTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

function calcWork(logs, workEnd) {
  const now = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const end = secFrom(workEnd);
  let total = 0;
  let activeBuilding = null;
  const rows = logs.map(log => {
    const entryDate = parseEntryTime(log.entry);

    let dur;
    if (log.exit) {
      const exitDate = parseEntryTime(log.exit);
      dur = Math.max(0, (exitDate - entryDate) / 1000);
    } else {
      dur = Math.max(0, (now - entryDate) / 1000);
      activeBuilding = log.building;
    }
    const durInt = Math.floor(dur);
    total += durInt;
    return { ...log, dur: durInt };
  });
  const regular   = Math.min(total, 8 * 3600);
  const hasActive = activeBuilding !== null;
  const isOvertime = nowSec > end && hasActive;
  const overtime  = isOvertime ? Math.max(0, total - 8 * 3600) : 0;
  return { total, regular, overtime, hasActive, isOvertime, activeBuilding, rows };
}

// ── WORK TIMER CARD ──────────────────────────────────────
function WorkTimerCard({ workLogs, workEnd = '16:30', isDayFinished = false, finishedAt = null, firstEntryTime, statusLabelOverride, frozenSeconds = null, initialSeconds = 0, activeLog: activeLogProp = null }) {
  const [elapsed, setElapsed] = useState(initialSeconds || 0);
  const dotAnim = useRef(new Animated.Value(1)).current;

  // Start timer from server-provided liveTotal and tick up every second
  useEffect(() => {
    if (isDayFinished || frozenSeconds !== null) return;
    setElapsed(initialSeconds || 0);
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds, isDayFinished, frozenSeconds]);

  // Compute timeline rows from raw API logs (supports both old mapped and new raw format)
  const rows = useMemo(() => {
    if (!Array.isArray(workLogs)) return [];
    return workLogs.map(log => ({
      building: log.buildingName || log.building || 'Bino',
      entry: toHHMM(log.entryTime || log.entry),
      exit: (log.exitTime != null || log.exit != null)
        ? toHHMM(log.exitTime ?? log.exit)
        : null,
      dur: parseInt(log.durationSeconds ?? log.dur ?? 0),
    }));
  }, [workLogs]);

  const hasActive = activeLogProp != null;
  const activeBuilding = activeLogProp?.buildingName ?? null;

  useEffect(() => {
    if (!hasActive || isDayFinished) { dotAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.2, duration: 650, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(dotAnim, { toValue: 1,   duration: 650, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasActive, isDayFinished]);

  const nowCheck = new Date();
  const workEndDate = new Date();
  workEndDate.setHours(16, 30, 0, 0);
  const isOT = nowCheck > workEndDate;

  const total    = frozenSeconds !== null ? frozenSeconds : elapsed;
  const regular  = Math.min(total, 8 * 3600);
  const overtime = isOT ? Math.max(0, total - 8 * 3600) : 0;
  const isOvertime = isOT && hasActive;

  const regFrac = regular / (8 * 3600);
  const otFrac  = Math.min(overtime / (2 * 3600), 1);
  const status  = isDayFinished ? 'finished' : !hasActive ? 'done' : isOvertime ? 'overtime' : 'active';
  const dotClr  = status === 'active' ? Colors.success
    : status === 'overtime' ? Colors.warning
    : Colors.textMuted;
  const statusLbl = statusLabelOverride ?? (isDayFinished ? 'Ish kuni tugadi'
    : status === 'active' ? `Aktiv — ${activeBuilding}`
    : status === 'overtime' ? "Qo'shimcha vaqt"
    : 'Tugadi');

  return (
    <Card style={s.card}>

      {/* 1 — Header */}
      <View style={wt.hRow}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
          <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={s.cardCap}>
            {firstEntryTime ?? workLogs[0]?.entry ?? '08:30'} dan
          </Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
          <Animated.View style={[wt.dot, { backgroundColor: dotClr, opacity: (status === 'done' || isDayFinished) ? 1 : dotAnim }]} />
          <Text style={[wt.statusLbl, { color: dotClr }]}>{statusLbl}</Text>
        </View>
      </View>

      {/* 2 — Counters */}
      <View style={wt.counters}>
        <View style={wt.cBox}>
          <Text style={[wt.cVal, { color: Colors.secondary }]}>{hhmmss(regular)}</Text>
          <Text style={[wt.cLbl, { color: Colors.secondary }]}>Ish vaqti</Text>
        </View>
        {overtime > 0 && (
          <>
            <View style={wt.cDiv} />
            <View style={wt.cBox}>
              <Text style={[wt.cVal, { color: Colors.warning }]}>{hhmmss(overtime)}</Text>
              <Text style={[wt.cLbl, { color: Colors.warning }]}>Qo'shimcha</Text>
            </View>
          </>
        )}
      </View>

      {/* 3 — Dual progress bar */}
      <View style={{ marginBottom: Spacing.sm }}>
        <View style={wt.barTrack}>
          <View style={[wt.barTeal,  { width: `${regFrac * 75}%` }]} />
          <View style={[wt.barAmber, { width: `${otFrac  * 25}%` }]} />
        </View>
        <View style={wt.barFoot}>
          <Text style={s.cardCap}>8s — ish vaqti</Text>
          <Text style={[s.cardCap, { color: overtime > 0 ? Colors.warning : Colors.textMuted }]}>
            {overtime > 0 ? `+${durStr(overtime)} qo'shimcha` : `${workEnd} chiqish`}
          </Text>
        </View>
      </View>

      {/* 4 — Building activity timeline */}
      <View style={wt.timeline}>
        {rows.map((log, i) => (
          <View key={i} style={[wt.tRow, i > 0 && wt.tRowBorder]}>
            <Animated.View style={[wt.tDot, {
              backgroundColor: !log.exit ? Colors.success : Colors.secondary,
              opacity: (!log.exit && !isDayFinished) ? dotAnim : 1,
            }]} />
            <Text style={wt.tBuilding}>{log.building}</Text>
            <Text style={wt.tTime}>{log.entry} → {log.exit ?? 'hozir'}</Text>
            <Text style={wt.tDur}>{durStr(log.dur)}</Text>
            {!log.exit && !isDayFinished
              ? <Text style={wt.tActive}>AKTIV</Text>
              : <CheckCircle2 size={13} color={Colors.success} strokeWidth={2.5} />
            }
          </View>
        ))}
      </View>

      {/* 5 — Summary footer */}
      <View style={wt.sumRow}>
        <Text style={wt.sumItem}>
          Jami:{' '}<Text style={[wt.sumBold, { color: Colors.secondary }]}>{durStr(total)}</Text>
        </Text>
        <View style={wt.sumDiv} />
        <Text style={wt.sumItem}>
          Qo'shimcha:{' '}<Text style={[wt.sumBold, { color: overtime > 0 ? Colors.warning : Colors.textMuted }]}>{durStr(overtime)}</Text>
        </Text>
        <View style={wt.sumDiv} />
        <Text style={wt.sumItem}>
          Binolar:{' '}<Text style={wt.sumBold}>{rows.length} ta</Text>
        </Text>
      </View>

      {/* 6 — Day finished summary card */}
      {isDayFinished && (
        <View style={wt.summaryCard}>
          <Text style={wt.summaryTitle}>🏁 Bugungi ish yakunlandi</Text>
          <View style={wt.summaryRow}>
            <Text style={wt.summaryLabel}>Jami ish vaqti</Text>
            <Text style={wt.summaryValue}>{durStr(total)}</Text>
          </View>
          {overtime > 0 && (
            <View style={wt.summaryRow}>
              <Text style={wt.summaryLabel}>Qo'shimcha</Text>
              <Text style={[wt.summaryValue, { color: Colors.warning }]}>{durStr(overtime)}</Text>
            </View>
          )}
          <View style={[wt.summaryRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
            <Text style={wt.summaryLabel}>Binolar</Text>
            <View style={wt.buildingChipsWrap}>
              {[...new Set(rows.map(l => l.building))].map((b, i) => (
                <View key={i} style={wt.buildingChip}>
                  <Text style={wt.buildingChipTxt} numberOfLines={1}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[wt.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={wt.summaryLabel}>Tugadi</Text>
            <Text style={wt.summaryValue}>{finishedAt}</Text>
          </View>
        </View>
      )}

    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// GPS OFF LOCK OVERLAY — full-screen, unclosable
// ═══════════════════════════════════════════════════════════
function GpsOffLockOverlay() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={gpsLock.overlay} pointerEvents="box-only">
      <Animated.View style={[gpsLock.iconWrap, { opacity: pulseAnim }]}>
        <AlertTriangle size={80} color="#fff" strokeWidth={2} />
      </Animated.View>
      <Text style={gpsLock.title}>⚠️ GPS o'chirilgan!</Text>
      <Text style={gpsLock.body}>Davomat to'xtatildi.</Text>
      <Text style={gpsLock.body}>Iltimos, GPS ni yoqing.</Text>
      <View style={gpsLock.badge}>
        <Text style={gpsLock.badgeTxt}>Avtomatik chiqish amalga oshirildi</Text>
      </View>
    </View>
  );
}

const gpsLock = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999, backgroundColor: '#B91C1C',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: { marginBottom: 24 },
  title: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 16,
  },
  body: {
    fontSize: 20, fontWeight: '600', color: '#FFE4E4',
    textAlign: 'center', lineHeight: 32,
  },
  badge: {
    marginTop: 32, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 32, paddingHorizontal: 20, paddingVertical: 10,
  },
  badgeTxt: { color: '#FECACA', fontSize: 14, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════════
// MODAL COMPONENTS
// ═══════════════════════════════════════════════════════════

function ComingSoonModal({ visible, onClose, title, desc, Icon, iconColor = Colors.secondary }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.sheet} onPress={() => {}}>
          <TouchableOpacity style={m.closeBtn} onPress={onClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
            <X size={20} color={Colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
          <View style={[m.iconWrap, { backgroundColor: iconColor + '18' }]}>
            {Icon && <Icon size={32} color={iconColor} strokeWidth={2} />}
          </View>
          <Text style={m.sheetTitle}>{title}</Text>
          <Text style={m.sheetDesc}>{desc || 'Bu funksiya tez orada qo\'shiladi!'}</Text>
          <View style={m.comingSoonBadge}>
            <Zap size={13} color={Colors.warning} strokeWidth={2} />
            <Text style={m.comingSoonTxt}>Tez orada ishga tushadi</Text>
          </View>
          <TouchableOpacity style={m.primaryBtn} onPress={onClose}>
            <Text style={m.primaryBtnTxt}>Tushunarli</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CheckOutModal({ visible, onClose, onConfirm, timer, user }) {
  const [done, setDone] = useState(false);
  const handleConfirm = async () => {
    try {
      await onConfirm();
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1800);
    } catch {
      setDone(false);
    }
  };
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={!done ? onClose : undefined}>
      <Pressable style={m.overlay} onPress={!done ? onClose : undefined}>
        <Pressable style={[m.sheet, { paddingBottom: Spacing.xl }]} onPress={() => {}}>
          {!done ? (
            <>
              <TouchableOpacity style={m.closeBtn} onPress={onClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
                <X size={20} color={Colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
              <View style={[m.iconWrap, { backgroundColor: Colors.amberTint }]}>
                <AlertTriangle size={32} color={Colors.warning} strokeWidth={2} />
              </View>
              <Text style={m.sheetTitle}>Ish kunini tugatish</Text>
              <Text style={m.sheetDesc}>Bugungi ish kunini yakunlamoqchimisiz?</Text>
              <View style={m.checkoutInfo}>
                <View style={m.checkoutRow}>
                  <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
                  <Text style={m.checkoutLbl}>Ish boshlangan:</Text>
                  <Text style={m.checkoutVal}>{user.startTime}</Text>
                </View>
                <View style={m.checkoutRow}>
                  <Clock size={15} color={Colors.secondary} strokeWidth={2} />
                  <Text style={m.checkoutLbl}>Hozirgi vaqt:</Text>
                  <Text style={[m.checkoutVal, { color: Colors.secondary }]}>{nowTime()}</Text>
                </View>
                <View style={[m.checkoutRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 }]}>
                  <CheckCircle2 size={15} color={Colors.success} strokeWidth={2} />
                  <Text style={m.checkoutLbl}>Jami ish vaqti:</Text>
                  <Text style={[m.checkoutVal, { color: Colors.success, fontWeight: FontWeight.bold }]}>{timer}</Text>
                </View>
              </View>
              <View style={m.btnRow}>
                <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                  <Text style={m.cancelBtnTxt}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[m.dangerBtn, { backgroundColor: Colors.success }]} onPress={handleConfirm}>
                  <CheckCircle2 size={16} color={Colors.white} strokeWidth={2} />
                  <Text style={m.dangerBtnTxt}>Tasdiqlash</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={m.successState}>
              <View style={m.successCircle}>
                <CheckCheck size={40} color={Colors.white} strokeWidth={2.5} />
              </View>
              <Text style={m.successTitle}>Qayd etildi!</Text>
              <Text style={m.successSub}>Ish vaqti muvaffaqiyatli qayd etildi.{'\n'}Yaxshi dam oling! 👋</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// GPS STATUS BANNER — ish vaqtida binoda emasligi haqida
// ═══════════════════════════════════════════════════════════
function GPSStatusBanner({ monitor, onGoMap }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (monitor.status !== 'outside') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 700, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [monitor.status]);

  if (monitor.status === 'scanning') {
    return (
      <View style={[ban.wrap, ban.scanning]}>
        <ActivityIndicator size="small" color={Colors.secondary} />
        <Text style={[ban.txt, { color: Colors.secondary }]}>GPS joylashuvingiz aniqlanmoqda...</Text>
      </View>
    );
  }

  if (monitor.status === 'denied' || monitor.status === 'error') {
    return (
      <View style={[ban.wrap, ban.error]}>
        <AlertTriangle size={16} color={Colors.danger} strokeWidth={2} />
        <Text style={[ban.txt, { color: Colors.danger }]}>
          {monitor.status === 'denied' ? 'GPS ruxsati kerak!' : 'GPS xato yuz berdi'}
        </Text>
      </View>
    );
  }

  // Ish vaqtida, lekin binoda emas — QIZIL OGOHLANTIRISH
  if (monitor.status === 'outside') {
    return (
      <Animated.View style={[ban.wrap, ban.outside, { opacity: pulseAnim }]}>
        <AlertTriangle size={16} color={Colors.danger} strokeWidth={2.5} />
        <View style={{ flex: 1 }}>
          <Text style={[ban.title, { color: Colors.danger }]}>Siz hozir binoda emassiz!</Text>
          <Text style={[ban.sub, { color: '#B91C1C' }]}>
            Ish vaqti: 08:30–16:30  •  Yaqin:{' '}
            {monitor.nearestBuilding?.short} ({formatDist(monitor.minDist)})
          </Text>
        </View>
        <TouchableOpacity onPress={onGoMap} style={ban.mapBtn}>
          <MapPin size={14} color={Colors.danger} strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Ish vaqtida, binoda — YASHIL TASDIQLASH
  if (monitor.status === 'in_building') {
    return (
      <View style={[ban.wrap, ban.inBuilding]}>
        <CheckCircle2 size={16} color={Colors.success} strokeWidth={2.5} />
        <View style={{ flex: 1 }}>
          <Text style={[ban.title, { color: Colors.success }]}>
            {monitor.currentBuilding?.short || 'Bino'} da ishlayapsiz ✓
          </Text>
          <Text style={[ban.sub, { color: Colors.success }]}>
            GPS tasdiqlandi  •  ± {monitor.accuracy} m  •  {monitor.lastUpdate}
          </Text>
        </View>
      </View>
    );
  }

  // Ish vaqtidan tashqari
  if (monitor.status === 'off_work') {
    return (
      <View style={[ban.wrap, ban.offWork]}>
        <Clock size={16} color={Colors.textMuted} strokeWidth={2} />
        <Text style={[ban.txt, { color: Colors.textMuted }]}>
          Ish vaqti: 08:30 – 16:30  •  Hozir: {nowTime()}
        </Text>
      </View>
    );
  }

  return null;
}

const ban = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.sm + 2, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md, marginHorizontal: Spacing.md, marginTop: Spacing.sm, gap: 8 },
  scanning:  { backgroundColor: Colors.secondaryTint, borderWidth: 1, borderColor: Colors.secondary + '40' },
  error:     { backgroundColor: Colors.dangerTint,    borderWidth: 1, borderColor: Colors.danger + '40' },
  outside:   { backgroundColor: '#FEF2F2',            borderWidth: 1.5, borderColor: Colors.danger },
  inBuilding:{ backgroundColor: Colors.successTint,   borderWidth: 1, borderColor: Colors.success + '40' },
  offWork:   { backgroundColor: Colors.borderLight,   borderWidth: 1, borderColor: Colors.border },
  txt:       { flex: 1, fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  title:     { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  sub:       { fontSize: FontSize.xs, marginTop: 1 },
  mapBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.dangerTint, alignItems: 'center', justifyContent: 'center' },
});

// ═══════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── HOME TAB ────────────────────────────────────────────
function HomeTab({
  user, navigation, onNavigateTab, monitor, refreshGPS, workLogs, onCheckout,
  isDayFinished, sessionFinished, finishedAt, activeSessionLog, firstEntryTime,
  todaySession, workTimerStatusLabel, canViewTeam,
}) {
  const { timer, progress: workProgress } = useWorkTimer(user.startTime || '08:30', user.endTime || '16:30');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [settingsModal,   setSettingsModal]   = useState(false);

  const liveTotal    = todaySession?.liveTotal    ?? 0;
  const liveRegular  = todaySession?.liveRegular  ?? 0;
  const liveOvertime = todaySession?.liveOvertime ?? 0;

  const activeWorkRow = workLogs.find((log) => log.exit === null);
  const lastBuildingFromLogs = useMemo(() => {
    const logs = todaySession?.logs ?? [];
    if (!logs.length) return null;
    const sorted = [...logs].sort((a, b) => String(a.entryTime ?? '').localeCompare(String(b.entryTime ?? '')));
    const last = sorted[sorted.length - 1];
    return last?.buildingName ?? last?.building ?? null;
  }, [todaySession]);

  const activeEntryTime =
    (activeSessionLog?.entry_time && toHHMM(activeSessionLog.entry_time)) ||
    activeWorkRow?.entry ||
    '--:--';

  let activeBuildingName = 'Joylashuv aniqlanmadi';
  let cardSubLine = '';

  if (activeSessionLog) {
    activeBuildingName = `${activeSessionLog.building_name ?? 'Bino'} • GPS tasdiqlangan ✓`;
    cardSubLine = `Kirdi: ${activeEntryTime}`;
  } else if (todaySession?.is_finished) {
    activeBuildingName = 'Ish kuni yakunlandi';
    cardSubLine = lastBuildingFromLogs ? `Oxirgi bino: ${lastBuildingFromLogs}` : '';
  } else if (!todaySession) {
    activeBuildingName = 'Hali checkin qilinmagan';
    cardSubLine = 'Binoga kiring';
  } else if (!todaySession?.is_finished) {
    activeBuildingName = 'Hozir binoda emassiz';
    cardSubLine = 'Bino tanlash uchun bosing';
  }

  const locationCardNavigate = () => {
    if (!activeSessionLog && todaySession && !todaySession?.is_finished) {
      navigation?.navigate('BuildingSelect');
      return;
    }
    navigation?.navigate('Map');
  };

  const [buildingElapsed, setBuildingElapsed] = useState('00:00');
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!activeWorkRow) return;
    const t = setInterval(() => {
      const [h, m] = activeWorkRow.entry.split(':').map(Number);
      const entry  = new Date();
      entry.setHours(h, m, 0, 0);
      const secs   = Math.max(0, (new Date() - entry) / 1000);
      const bh     = Math.floor(secs / 3600);
      const bm     = Math.floor((secs % 3600) / 60);
      setBuildingElapsed(bh > 0 ? `${bh}s ${bm}d` : `${bm}d`);
    }, 1000);
    return () => clearInterval(t);
  }, [activeWorkRow?.entry]);

  useEffect(() => {
    if (!activeWorkRow) return;
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim,    { toValue: 1.8, duration: 1000, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(pulseAnim,    { toValue: 1,   duration: 1000, useNativeDriver: NATIVE_DRIVER }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0,   duration: 1000, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 1000, useNativeDriver: NATIVE_DRIVER }),
        ]),
      ])
    ).start();
  }, [activeWorkRow]);

  // Joylashuv kartochkasi uchun dinamik
  const isScanning  = monitor.status === 'scanning';
  const isVerified  = monitor.status === 'in_building';
  const isOutside   = monitor.status === 'outside';
  const cardBg      = isVerified ? Colors.successTint : isOutside ? '#FEF2F2' : Colors.primaryTint;
  const pinColor    = isVerified ? Colors.success : isOutside ? Colors.danger : Colors.secondary;
  const locName     = isVerified
    ? (monitor.currentBuilding?.name || 'Binoda')
    : isOutside
    ? 'Binodan tashqarda'
    : user.building + ' — Asosiy bino';
  const locSub      = isScanning  ? 'GPS aniqlanmoqda...'
    : isVerified ? `✓ GPS tasdiqlandi  •  ± ${monitor.accuracy} m  •  ${monitor.lastUpdate}`
    : isOutside  ? `⚠ Yaqin: ${monitor.nearestBuilding?.short} (${formatDist(monitor.minDist)})`
    : monitor.status === 'off_work' ? 'Ish vaqtidan tashqari'
    : monitor.status === 'denied'   ? 'GPS ruxsati berilmagan'
    : 'GPS aniqlanmoqda...';
  const locSubColor = isVerified ? Colors.success : isOutside ? Colors.danger : Colors.textMuted;

  const ACTIONS = [
    { key:'building', label:"Bino o'zgartir",  Icon:Building2,    bg:Colors.primaryTint,                                 color:Colors.secondary,                              onPress:() => navigation?.navigate('BuildingSelect'), disabled:false },
    { key:'checkout', label:'Chiqish qayd',     Icon:CheckCircle2, bg:sessionFinished ? Colors.borderLight : Colors.dangerTint, color:sessionFinished ? Colors.textMuted : Colors.danger, onPress:sessionFinished ? undefined : onCheckout,       disabled:sessionFinished },
    { key:'report',   label:'Hisobotim',        Icon:BarChart2,    bg:Colors.successTint,                                color:Colors.success,                                onPress:() => onNavigateTab(2),                       disabled:false },
    { key:'settings', label:'Sozlamalar',       Icon:Settings,     bg:Colors.purpleTint,                                 color:Colors.purple,                                 onPress:() => setSettingsModal(true),                 disabled:false },
  ];

  const notifications = useNotificationStore((state) => state.notifications);
  const recentActivity = useMemo(() => {
    const seen = new Set();
    const unique = notifications.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    const sorted = unique.sort((a, b) => {
      const ta = new Date(a.createdAt || a.raw?.created_at || 0).getTime();
      const tb = new Date(b.createdAt || b.raw?.created_at || 0).getTime();
      return tb - ta;
    });
    return sorted.slice(0, 5);
  }, [notifications]);

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Bugungi holat" />

        {/* Joylashuv kartochkasi — aktiv bino */}
        <Card style={s.card} onPress={locationCardNavigate}>
          <View style={s.cardRow}>
            <View style={s.activeDotWrap}>
              <Animated.View style={[s.activeDotPulse, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
              <View style={s.activeDot} />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardCap}>Hozirgi joylashuv</Text>
              <Text style={s.cardTitle} numberOfLines={1}>{activeBuildingName}</Text>
              {cardSubLine ? <Text style={s.cardOk}>{cardSubLine}</Text> : null}
            </View>
            <View style={s.buildingTimer}>
              <Text style={s.buildingTimerText}>{buildingElapsed}</Text>
              <Text style={s.buildingTimerLabel}>bu binoda</Text>
            </View>
          </View>
        </Card>

        {/* Ish vaqti taymer */}
        <WorkTimerCard
          frozenSeconds={todaySession?.is_finished ? liveTotal : null}
          initialSeconds={liveTotal}
          workLogs={todaySession?.logs ?? []}
          activeLog={todaySession?.activeLog}
          isDayFinished={isDayFinished}
          finishedAt={finishedAt}
          firstEntryTime={firstEntryTime}
          statusLabelOverride={workTimerStatusLabel}
        />

        {canViewTeam ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation?.navigate('TeamScreen')}
          >
            <Card style={[s.card, s.teamPromoCard]}>
              <View style={s.cardRow}>
                <View style={[s.iconCircle, { backgroundColor: 'rgba(2,128,144,0.12)' }]}>
                  <Users size={22} color={Colors.secondary} strokeWidth={2.2} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardCap}>Boshqaruv</Text>
                  <Text style={s.cardTitle}>Jamoam holati</Text>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 }}>
                    Hodimlarning real vaqt holati (binoda / tashqarida)
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.secondary} strokeWidth={2.2} />
              </View>
            </Card>
          </TouchableOpacity>
        ) : null}

        {/* Abet */}
        <Card style={[s.card, s.abetCard]}>
          <View style={s.cardRow}>
            <View style={[s.iconCircle, { backgroundColor: Colors.amberTint }]}>
              <Clock size={22} color={Colors.warning} strokeWidth={2} />
            </View>
            <View style={s.cardBody}>
              <Text style={[s.cardCap, { color:'#92400E' }]}>Abet vaqti</Text>
              <Text style={[s.cardTitle, { color:'#92400E' }]}>13:00 — 14:00</Text>
              <Text style={{ fontSize: FontSize.sm, color:'#B45309' }}>Bugun 13:00 da abet boshlanadi</Text>
            </View>
          </View>
        </Card>

        <SectionHeader title="Tezkor harakatlar" />
        <View style={s.actionsGrid}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.key} style={[s.actionCard, a.disabled && { opacity: 0.5 }]} activeOpacity={0.82} onPress={a.onPress} disabled={a.disabled}>
              <View style={[s.actionIcon, { backgroundColor: a.bg }]}>
                <a.Icon size={26} color={a.color} strokeWidth={2} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader
          title="Oxirgi faoliyat"
          actionLabel="Barchasi"
          onAction={() => onNavigateTab(3)}
        />
        <View style={s.activityFeedCard}>
          {recentActivity.length > 0 ? (
            recentActivity.map((item, index) => {
              const meta = TYPE_META[item.type] || TYPE_META.jadval;
              const RowIcon = meta.Icon;
              const iso = item.createdAt || item.raw?.created_at;
              const isLast = index === recentActivity.length - 1;
              return (
                <View
                  key={String(item.id)}
                  style={[s.activityRow, !isLast ? s.activityRowBorder : null]}
                >
                  <View style={[s.activityIconWrap, { backgroundColor: meta.bg }]}>
                    <RowIcon size={20} color={meta.color} strokeWidth={2.2} />
                  </View>
                  <View style={s.activityRowMid}>
                    <Text style={s.activityRowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.body ? (
                      <Text style={s.activityRowBody} numberOfLines={1}>
                        {item.body}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={s.activityRowTime}>{formatHomeActivityTime(iso)}</Text>
                </View>
              );
            })
          ) : (
            <View style={s.activityEmpty}>
              <Inbox size={40} color={Colors.textMuted} strokeWidth={1.6} />
              <Text style={s.activityEmptyText}>Hozircha faoliyat yo'q</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CheckOutModal visible={checkoutVisible} onClose={() => setCheckoutVisible(false)}
        onConfirm={() => setCheckoutVisible(false)} timer={timer} user={user} />
      <ComingSoonModal visible={settingsModal} onClose={() => setSettingsModal(false)}
        title="Sozlamalar"
        desc={"Tizim sozlamalari tez orada qo'shiladi!"}
        Icon={Settings} iconColor={Colors.purple} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function StaffHomeScreen({ navigation, route }) {
  const screenFocused = useIsFocused();
  const authUser = useAuthStore((s) => s.user);
  const canViewTeam =
    authUser?.role === 'admin' || authUser?.role === 'staff';
  const user = route?.params?.user ?? authUser ?? {
    id: '',
    name: 'Mehmon',
    initials: '?',
    position: '',
    department: '',
    building: '—',
    attendance: 0,
    workDays: '—',
    email: '',
    phone_work: '',
    startTime: '08:30',
    endTime: '16:30',
    messages: [],
    reports: {
      thisMonth: { workDays: 0, present: 0, absent: 0, late: 0, totalHours: '0s', avgPerDay: '0:00' },
      monthly: [],
    },
  };

  const todaySession = useWorkStore((s) => s.todaySession);
  const activeLog = useWorkStore((s) => s.activeLog);
  const fetchToday = useWorkStore((s) => s.fetchToday);
  const fetchActiveLog = useWorkStore((s) => s.fetchActiveLog);
  const checkOut = useWorkStore((s) => s.checkOut);

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useFocusEffect(
    useCallback(() => {
      fetchToday();
      fetchActiveLog();
    }, [fetchToday, fetchActiveLog]),
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const workLogs = useMemo(() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const raw = todaySession?.logs ?? [];
    const todayLogs = raw.filter((log) => {
      if (!log.entryTime) return false;
      const et = log.entryTime;
      const day =
        typeof et === 'string'
          ? et.slice(0, 10)
          : `${new Date(et).getFullYear()}-${pad(new Date(et).getMonth() + 1)}-${pad(new Date(et).getDate())}`;
      return day === todayStr;
    });
    return mapSessionLogs(todayLogs);
  }, [todaySession]);

  const nowClock = new Date();
  const [wh, wm] = (user.endTime || '16:30').split(':').map(Number);
  const isAfterWork =
    nowClock.getHours() > wh ||
    (nowClock.getHours() === wh && nowClock.getMinutes() >= wm);

  const workTimerDayFinished = !!(todaySession?.is_finished && isAfterWork);

  let workTimerStatusLabel;
  if (!todaySession) workTimerStatusLabel = 'Ish kuni boshlanmagan';
  else if (todaySession.is_finished && isAfterWork) workTimerStatusLabel = undefined;
  else if (todaySession.is_finished && !isAfterWork) workTimerStatusLabel = 'Aktiv emas';
  else if (todaySession.status === 'active') workTimerStatusLabel = 'Ishlayapti';

  const finishedAt = toHHMM(todaySession?.finished_at || todaySession?.last_exit_time);

  const totalSecs = todaySession?.liveTotal ?? todaySession?.total_seconds ?? 0;
  const hw = Math.floor(totalSecs / 3600);
  const mw = Math.floor((totalSecs % 3600) / 60);
  const workTimeDisplay = hw > 0 ? `${hw}s ${mw}d` : `${mw}d`;
  const attendancePct = todaySession
    ? Math.min(Math.round((totalSecs / (8 * 3600)) * 100), 100)
    : 0;

  const firstEntryTime = todaySession?.first_entry_time
    ? toHHMM(todaySession.first_entry_time)
    : workLogs[0]?.entry;

  const [tab, setTab]     = useState(0);
  const bellScale         = useRef(new Animated.Value(1)).current;
  const insets            = useSafeAreaInsets();

  const { monitor, refresh: refreshGPS } = useGPSMonitor();
  const isGpsOff = useGPSAntiCheat();

  // Start the offline sync listener once on mount
  useEffect(() => {
    startOfflineSync();
  }, []);

  const handleCheckout = useCallback(async () => {
    const hasOpen = workLogs.some((log) => !log.exit) || !!activeLog;
    if (!hasOpen) {
      Alert.alert('', 'Ish kuni allaqachon yakunlangan');
      return;
    }
    try {
      const { lat, lon } = await getCurrentLocation();
      const result = await checkOut(lat, lon);
      const tf = result?.totalFormatted || '';
      const of = result?.overtimeFormatted || '';
      Alert.alert(
        '✅ Ish kuni yakunlandi',
        `${tf ? `Jami: ${tf}\n` : ''}${of ? `Qo'shimcha: ${of}\n` : ''}Muvaffaqiyatli qayd etildi`,
        [{ text: 'OK' }],
      );
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato';
      Alert.alert('', msg);
    }
  }, [workLogs, activeLog, checkOut]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(bellScale, { toValue:1.25, duration:150, useNativeDriver:NATIVE_DRIVER }),
        Animated.timing(bellScale, { toValue:1,    duration:200, useNativeDriver:NATIVE_DRIVER }),
      ])
    ).start();
  }, []);

  const tabs = [
    { label:'Bosh sahifa' }, { label:'Joylashuv' },
    { label:'Hisobot' }, { label:'Xabarlar' }, { label:'Profil' },
  ];
  const handleTabPress = (i) => {
    if (i === 1) { navigation?.navigate('Map'); return; }
    setTab(i);
  };

  // Header uchun GPS status rangi
  const headerGpsColor =
    monitor.status === 'in_building' ? Colors.success :
    monitor.status === 'outside'     ? Colors.danger  :
    Colors.accent;

  const headerTitles = ['','','Hisobot','Xabarlar','Profil'];

  return (
    <View style={s.root}>
      {screenFocused ? <StatusBar style="light" /> : null}

      {/* HEADER — Profil tabida yashiriladi: ProfileScreen o‘z gradienti status bargacha cho‘ziladi */}
      {tab !== 4 ? (
        <LinearGradient
          colors={['#1E2761','#1a3a6b','#028090']}
          start={{ x:0, y:0 }} end={{ x:1, y:1 }}
          style={[s.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={s.decor1} />
          <View style={s.decor2} />

          <View style={s.topRow}>
            <View style={s.topLeft}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user.initials}</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                {tab === 0 ? (
                  <>
                    <Text style={s.greeting}>Xayrli kun, {user.name}</Text>
                    <Text style={s.greetingSub}>{user.department}  •  {user.building}</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.greeting}>{headerTitles[tab]}</Text>
                    <Text style={s.greetingSub}>{user.name}  •  {user.department}</Text>
                  </>
                )}
              </View>
            </View>
            <Animated.View style={{ transform:[{ scale: bellScale }] }}>
              <TouchableOpacity style={s.bellWrap} onPress={() => setTab(3)}>
                <Bell size={22} color={Colors.white} strokeWidth={2} />
                {unreadCount > 0 && <View style={s.bellBadge} />}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {tab === 0 && (
            <>
              {/* GPS statusiga qarab pill — to'liq header ichida */}
              {monitor.status === 'in_building' ? (
                <StatusPill status="working" time={user.startTime || '08:30'} />
              ) : monitor.status === 'outside' ? (
                <View style={s.outsidePill}>
                  <AlertTriangle size={14} color={Colors.danger} strokeWidth={2.5} />
                  <Text style={s.outsidePillTxt}>Ish vaqtida binoda emassiz!</Text>
                </View>
              ) : monitor.status === 'off_work' ? (
                <View style={s.offWorkPill}>
                  <Clock size={14} color="rgba(255,255,255,0.75)" strokeWidth={2} />
                  <Text style={s.offWorkPillTxt}>
                    Ish vaqti: {user.startTime || '08:30'} – {user.endTime || '16:30'}{'  '}•{'  '}Hozir: {nowTime()}
                  </Text>
                </View>
              ) : monitor.status === 'scanning' ? (
                <View style={s.offWorkPill}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                  <Text style={s.offWorkPillTxt}>GPS aniqlanmoqda...</Text>
                </View>
              ) : (
                <StatusPill status="working" time={user.startTime || '08:30'} />
              )}

              <View style={s.statsRow}>
                {[
                  { v: monitor.currentBuilding?.short || user.building, l:'Joylashuv' },
                  { v: workTimeDisplay,                                   l:'Ish vaqti' },
                  { v: `${attendancePct}%`,                              l:'Davomat'   },
                ].map((st, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={s.statDiv} />}
                    <View style={s.stat}>
                      <Text style={s.statV}>{st.v}</Text>
                      <Text style={s.statL}>{st.l}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
          {tab === 2 && (
            <View style={s.subHeaderInfo}>
              <Text style={s.subHeaderBig}>Mening hisobotim</Text>
              <Text style={s.subHeaderSm}>Oylik davomat va moliya</Text>
            </View>
          )}
          {tab === 3 && (
            <View style={s.subHeaderInfo}>
              <Text style={s.subHeaderSm}>
                {unreadCount > 0 ? `${unreadCount} ta o'qilmagan xabar` : "Barcha xabarlar o'qilgan"}
              </Text>
            </View>
          )}
        </LinearGradient>
      ) : null}

      {/* TAB CONTENT */}
      {tab === 0 && (
        <HomeTab
          user={user}
          navigation={navigation}
          onNavigateTab={setTab}
          monitor={monitor}
          refreshGPS={refreshGPS}
          workLogs={workLogs}
          onCheckout={handleCheckout}
          isDayFinished={workTimerDayFinished}
          sessionFinished={!!todaySession?.is_finished}
          finishedAt={finishedAt}
          activeSessionLog={activeLog}
          firstEntryTime={firstEntryTime}
          todaySession={todaySession}
          workTimerStatusLabel={workTimerStatusLabel}
          canViewTeam={canViewTeam}
        />
      )}
      {tab === 2 && <MyReportScreen />}
      {tab === 3 && <StaffMessagesPanel />}
      {tab === 4 ? (
        <View style={s.profileTabWrap}>
          <ProfileScreen />
        </View>
      ) : null}

      <BottomNav tabs={tabs} activeIndex={tab} onTabPress={handleTabPress} />

      {isGpsOff && <GpsOffLockOverlay />}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN STYLES
// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:   { flex:1, backgroundColor: Colors.background },
  profileTabWrap: { flex: 1, minHeight: 0 },
  header: { paddingHorizontal: Spacing.md+4, paddingBottom: Spacing.lg, overflow:'hidden' },
  decor1: { position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:100, backgroundColor:'rgba(202,220,252,0.1)' },
  decor2: { position:'absolute', bottom:-30, left:-30, width:140, height:140, borderRadius:70, backgroundColor:'rgba(2,128,144,0.15)' },

  topRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: Spacing.md },
  topLeft:     { flexDirection:'row', alignItems:'center', flex:1 },
  avatar:      { width:48, height:48, borderRadius:24, backgroundColor:'rgba(255,255,255,0.2)', borderWidth:2, borderColor:'rgba(255,255,255,0.4)', alignItems:'center', justifyContent:'center' },
  avatarText:  { fontSize:16, fontWeight: FontWeight.bold, color: Colors.white },
  greeting:    { fontSize: FontSize.h3-1, fontWeight: FontWeight.semibold, color: Colors.white },
  greetingSub: { fontSize: FontSize.caption, color: Colors.accent, marginTop:2 },
  bellWrap:    { position:'relative', padding:6 },
  bellBadge:   { position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4, backgroundColor: Colors.danger, borderWidth:1.5, borderColor: Colors.primary },

  statsRow: { flexDirection:'row', paddingTop: Spacing.md, marginTop: Spacing.md, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.15)' },
  stat:     { flex:1, alignItems:'center' },
  statV:    { fontSize:20, fontWeight: FontWeight.bold, color: Colors.white },
  statL:    { fontSize: FontSize.xs, color: Colors.accent, marginTop:2 },
  statDiv:  { width:1, backgroundColor:'rgba(255,255,255,0.2)', marginVertical:4 },

  outsidePill:    { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderColor: Colors.danger, borderRadius: Radius.full, paddingVertical:8, paddingHorizontal:20, alignSelf:'center', backgroundColor:'rgba(239,68,68,0.15)' },
  outsidePillTxt: { fontSize:14, fontWeight: FontWeight.medium, color: Colors.danger },
  offWorkPill:    { flexDirection:'row', alignItems:'center', gap:6, borderRadius: Radius.full, paddingVertical:7, paddingHorizontal:16, alignSelf:'center', backgroundColor:'rgba(255,255,255,0.12)', borderWidth:1, borderColor:'rgba(255,255,255,0.2)' },
  offWorkPillTxt: { fontSize:13, fontWeight: FontWeight.medium, color:'rgba(255,255,255,0.85)' },

  subHeaderInfo: { paddingBottom:4, alignItems:'center' },
  subHeaderBig:  { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.white },
  subHeaderSm:   { fontSize: FontSize.caption, color: Colors.accent, marginTop:2 },

  scroll:       { flex:1 },
  scrollPad:    { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  scrollContent:{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 100 },

  card:        { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity: 0.06, shadowRadius: 4, marginBottom: 16 },
  cardDanger:  { borderWidth:1, borderColor: Colors.danger + '60', backgroundColor:'#FFFAFA' },
  cardRow:     { flexDirection:'row', alignItems:'center' },
  cardBody:    { flex:1, marginLeft:12 },
  cardCap:     { fontSize: FontSize.caption, color: Colors.textSecondary },
  cardTitle:   { fontSize: FontSize.h3-1, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginTop:1 },
  cardOk:      { fontSize: FontSize.sm, color: Colors.success, marginTop:2 },
  iconCircle:  { width:48, height:48, borderRadius:24, alignItems:'center', justifyContent:'center' },
  abetCard:    { backgroundColor: Colors.warningTint, borderWidth:1, borderColor:'#FDE68A' },
  teamPromoCard: {
    borderWidth: 1,
    borderColor: 'rgba(2,128,144,0.22)',
    backgroundColor: Colors.secondaryTint,
  },

  timerText:   { fontSize:40, fontWeight: FontWeight.bold, color: Colors.primary, fontVariant:['tabular-nums'], textAlign:'center', marginBottom: Spacing.sm, letterSpacing:2 },
  timerFooter: { flexDirection:'row', justifyContent:'space-between', marginTop: Spacing.xs },

  actionsGrid: { flexDirection:'row', flexWrap:'wrap', gap: Spacing.sm, marginTop:0, marginBottom: 16 },
  actionCard:  { width:'47.5%', minHeight: 110, backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, alignItems:'center', justifyContent:'center', elevation: 2, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4 },
  actionIcon:  { width:56, height:56, borderRadius:28, alignItems:'center', justifyContent:'center', marginBottom: Spacing.sm },
  actionLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign:'center' },

  divider:        { height:1, backgroundColor: Colors.borderLight, marginVertical:2 },

  activityFeedCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityRowMid: { flex: 1, minWidth: 0, marginRight: 8 },
  activityRowTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  activityRowBody: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityRowTime: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  activityEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg + 4,
    gap: 10,
  },
  activityEmptyText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  emptyState:     { alignItems:'center', justifyContent:'center', paddingVertical: Spacing.xl, gap: 6 },
  emptyStateText: { fontSize: FontSize.body, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  emptyStateSub:  { fontSize: FontSize.caption, color: Colors.textMuted, textAlign:'center' },

  activeDotWrap:     { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activeDot:         { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, position: 'absolute' },
  activeDotPulse:    { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.success, position: 'absolute' },
  buildingTimer:     { alignItems: 'center', paddingLeft: 8 },
  buildingTimerText: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.secondary },
  buildingTimerLabel:{ fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  centeredCard: { alignItems:'center' },
  bigRingWrap:  { alignItems:'center', justifyContent:'center', marginVertical: Spacing.md },
  bigRing:      { width:140, height:140, borderRadius:70, borderWidth:8, alignItems:'center', justifyContent:'center' },
  bigRingPct:   { fontSize:36, fontWeight: FontWeight.heavy },
  bigRingLbl:   { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop:2 },
  statsRow3:    { flexDirection:'row', width:'100%', borderTopWidth:1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md },
  stat3:        { flex:1, alignItems:'center' },
  stat3V:       { fontSize:24, fontWeight: FontWeight.bold },
  stat3L:       { fontSize: FontSize.xs, color: Colors.textMuted, marginTop:2 },
  statDiv2:     { width:1, backgroundColor: Colors.borderLight },
  reportRow:    { flexDirection:'row', alignItems:'center', paddingVertical: Spacing.sm },
  reportIconBox:{ width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  reportLbl:    { flex:1, marginLeft:12, fontSize: FontSize.body-1, color: Colors.textSecondary },
  reportVal:    { fontSize: FontSize.body-1, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  barRow:       { flexDirection:'row', alignItems:'center', marginBottom: Spacing.sm },
  barMonth:     { width:58, fontSize: FontSize.sm, color: Colors.textSecondary },
  barTrack:     { flex:1, height:10, backgroundColor: Colors.borderLight, borderRadius: Radius.full, overflow:'hidden' },
  barFill:      { height:10, borderRadius: Radius.full },
  barPct:       { width:42, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign:'right' },
  downloadBtn:  { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor: Colors.secondary, borderRadius: Radius.full, height:52, marginTop: Spacing.md, gap:8, ...Shadow.button },
  downloadBtnTxt:{ color: Colors.white, fontSize: FontSize.body-1, fontWeight: FontWeight.semibold },

  profileCard:       { alignItems:'center', paddingVertical: Spacing.lg },
  profileAvatarWrap: { marginBottom: Spacing.md },
  profileAvatar:     { width:80, height:80, borderRadius:40, alignItems:'center', justifyContent:'center', ...Shadow.modal },
  profileAvatarTxt:  { fontSize:28, fontWeight: FontWeight.heavy, color: Colors.white },
  profileName:       { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profilePos:        { fontSize: FontSize.body-1, color: Colors.textSecondary, marginTop:4 },
  profileBadge:      { backgroundColor: Colors.primaryTint, borderRadius: Radius.full, paddingHorizontal:14, paddingVertical:4, marginTop: Spacing.sm },
  profileBadgeTxt:   { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  profileGpsRow:     { flexDirection:'row', alignItems:'center', gap:6, borderRadius: Radius.full, paddingHorizontal:14, paddingVertical:5, marginTop: Spacing.sm },
  profileGpsTxt:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  profileMeta:       { flexDirection:'row', gap: Spacing.lg, marginTop: Spacing.md },
  profileMetaItem:   { flexDirection:'row', alignItems:'center', gap:4 },
  profileMetaTxt:    { fontSize: FontSize.caption, color: Colors.textSecondary },
  contactRow:        { flexDirection:'row', alignItems:'center' },
  contactIcon:       { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  workStatsRow:      { flexDirection:'row' },
  workStat:          { flex:1, alignItems:'center', paddingVertical: Spacing.sm },
  workStatV:         { fontSize:22, fontWeight: FontWeight.bold },
  workStatL:         { fontSize: FontSize.xs, color: Colors.textMuted, marginTop:2 },
  menuItem:          { flexDirection:'row', alignItems:'center', paddingVertical: Spacing.sm+2 },
  menuIconBox:       { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  menuLbl:           { flex:1, marginLeft:12, fontSize: FontSize.body-1, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  logoutBtn:         { flexDirection:'row', alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor: Colors.danger, borderRadius: Radius.full, height:52, marginTop: Spacing.md, gap:8 },
  logoutBtnTxt:      { color: Colors.danger, fontSize: FontSize.body-1, fontWeight: FontWeight.semibold },
});

// ═══════════════════════════════════════════════════════════
// MODAL STYLES
// ═══════════════════════════════════════════════════════════
const m = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  sheet:   { backgroundColor: Colors.surface, borderTopLeftRadius:28, borderTopRightRadius:28, padding: Spacing.lg, paddingBottom: Spacing.xxl, alignItems:'center', ...Shadow.modal },
  closeBtn:{ position:'absolute', top: Spacing.md, right: Spacing.md, width:32, height:32, borderRadius:16, backgroundColor: Colors.borderLight, alignItems:'center', justifyContent:'center' },
  iconWrap:{ width:72, height:72, borderRadius:36, alignItems:'center', justifyContent:'center', marginTop: Spacing.md, marginBottom: Spacing.md },
  sheetTitle:{ fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign:'center' },
  sheetDesc: { fontSize: FontSize.body-1, color: Colors.textSecondary, textAlign:'center', marginTop:8, marginBottom: Spacing.md, lineHeight:22 },
  comingSoonBadge:{ flexDirection:'row', alignItems:'center', backgroundColor: Colors.warningTint, borderRadius: Radius.full, paddingHorizontal:14, paddingVertical:6, marginBottom: Spacing.lg, gap:5 },
  comingSoonTxt:  { fontSize: FontSize.sm, color:'#92400E', fontWeight: FontWeight.semibold },
  primaryBtn:    { width:'100%', height:52, borderRadius: Radius.full, backgroundColor: Colors.secondary, alignItems:'center', justifyContent:'center', ...Shadow.button },
  primaryBtnTxt: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  btnRow:      { flexDirection:'row', gap: Spacing.sm, width:'100%', marginTop: Spacing.md },
  cancelBtn:   { flex:1, height:52, borderRadius: Radius.full, borderWidth:1.5, borderColor: Colors.border, alignItems:'center', justifyContent:'center' },
  cancelBtnTxt:{ color: Colors.textSecondary, fontSize: FontSize.body-1, fontWeight: FontWeight.semibold },
  dangerBtn:   { flex:1, height:52, borderRadius: Radius.full, backgroundColor: Colors.danger, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:6 },
  dangerBtnTxt:{ color: Colors.white, fontSize: FontSize.body-1, fontWeight: FontWeight.semibold },
  checkoutInfo:{ width:'100%', backgroundColor: Colors.borderLight, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  checkoutRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:4 },
  checkoutLbl: { flex:1, fontSize: FontSize.body-1, color: Colors.textSecondary },
  checkoutVal: { fontSize: FontSize.body-1, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  successState: { alignItems:'center', paddingVertical: Spacing.xl },
  successCircle:{ width:80, height:80, borderRadius:40, backgroundColor: Colors.success, alignItems:'center', justifyContent:'center', marginBottom: Spacing.md, ...Shadow.modal },
  successTitle: { fontSize: FontSize.h1, fontWeight: FontWeight.heavy, color: Colors.textPrimary, marginBottom:8 },
  successSub:   { fontSize: FontSize.body-1, color: Colors.textSecondary, textAlign:'center', lineHeight:22 },
  helpList: { width:'100%', marginBottom: Spacing.lg },
  helpRow:  { flexDirection:'row', alignItems:'center', padding: Spacing.sm, backgroundColor: Colors.borderLight, borderRadius: Radius.sm, marginBottom:6 },
  helpIcon: { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  helpLbl:  { fontSize: FontSize.xs, color: Colors.textSecondary },
  helpVal:  { fontSize: FontSize.body-1, fontWeight: FontWeight.semibold, marginTop:1 },
});

// ═══════════════════════════════════════════════════════════
// WORK TIMER CARD STYLES
// ═══════════════════════════════════════════════════════════
const wt = StyleSheet.create({
  hRow:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: Spacing.sm },
  dot:       { width:8, height:8, borderRadius:4 },
  statusLbl: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  counters: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: Spacing.sm, gap: 8 },
  cBox:     { flex:1, alignItems:'center', paddingVertical:6 },
  cVal:     { fontSize:28, fontWeight: FontWeight.bold, fontVariant:['tabular-nums'], letterSpacing:0.5 },
  cLbl:     { fontSize: FontSize.caption, fontWeight: FontWeight.medium, marginTop:3 },
  cDiv:     { width:1, height:44, backgroundColor: Colors.borderLight, marginHorizontal: 4 },

  barTrack: { height:10, borderRadius: Radius.full, backgroundColor: Colors.borderLight, flexDirection:'row', overflow:'hidden' },
  barTeal:  { height:10, backgroundColor: Colors.secondary },
  barAmber: { height:10, backgroundColor: Colors.warning },
  barFoot:  { flexDirection:'row', justifyContent:'space-between', marginTop:4 },

  timeline:   { backgroundColor: Colors.borderLight, borderRadius: 12, padding: Spacing.sm, marginBottom: Spacing.sm },
  tRow:       { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:5 },
  tRowBorder: { borderTopWidth:1, borderTopColor: Colors.border, marginTop:2, paddingTop:7 },
  tDot:       { width:8, height:8, borderRadius:4 },
  tBuilding:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, minWidth:56 },
  tTime:      { flex:1, fontSize: FontSize.xs, color: Colors.textSecondary },
  tDur:       { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textPrimary, minWidth:42, textAlign:'right' },
  tActive:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.success, minWidth:38, textAlign:'right' },

  sumRow:  { flexDirection:'row', alignItems:'center', borderTopWidth:1, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm },
  sumDiv:  { width:1, height:14, backgroundColor: Colors.borderLight, marginHorizontal:2 },
  sumItem: { flex:1, fontSize: FontSize.xs, color: Colors.textSecondary, textAlign:'center' },
  sumBold: { fontWeight: FontWeight.bold, color: Colors.textPrimary },

  summaryCard:  { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1.5, borderColor: Colors.success + '40', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  summaryTitle: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  summaryRow:   { flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor: Colors.borderLight },
  summaryLabel: { fontSize: FontSize.caption, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  buildingChipsWrap: { flexDirection:'row', flexWrap:'wrap', gap:6 },
  buildingChip:     { backgroundColor: Colors.secondaryTint, borderRadius: Radius.full, paddingHorizontal:10, paddingVertical:3, borderWidth:1, borderColor: Colors.secondary + '30' },
  buildingChipTxt:  { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: FontWeight.semibold, maxWidth: 160 },
});
