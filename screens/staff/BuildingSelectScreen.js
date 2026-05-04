// ═══════════════════════════════════════════════════════════
// SCREEN 04 — staff/BuildingSelectScreen.js
// Real GPS + Bino masofasi tekshiruvi (utils/gps.js)
// ═══════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  Building2, MapPin, Users, CheckCircle2,
  AlertTriangle, Navigation, X, RefreshCw,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { PrimaryButton } from '../../components';
import { useWorkStore } from '../../src/store';
import {
  BUILDINGS as BASE_BUILDINGS, GPS_RADIUS, getDistance, formatDist,
} from '../../src/utils/buildings';

// Binolarga UI ranglari qo'shish
const BG_COLORS = [
  { bg: Colors.secondaryTint, bg2: '#CCFBF1' },
  { bg: Colors.purpleTint,    bg2: '#DDD6FE' },
  { bg: '#FEF3C7',            bg2: '#FDE68A' },
  { bg: '#D1FAE5',            bg2: '#A7F3D0' },
];
const STAFF_COUNTS = ['47 xodim hozir', '23 xodim hozir', '15 xodim hozir', '8 xodim hozir'];

const BUILDINGS = BASE_BUILDINGS.map((b, i) => ({
  ...b,
  count: STAFF_COUNTS[i] || `${b.staffCount} xodim hozir`,
  bg:    BG_COLORS[i]?.bg   || Colors.secondaryTint,
  bg2:   BG_COLORS[i]?.bg2  || '#CCFBF1',
}));

// ── GPS Pulse animatsiyasi ───────────────────────────────
function GPSPulse({ status }) {
  // status: 'scanning' | 'verified' | 'error' | 'far'
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const anim = useRef(null);

  useEffect(() => {
    if (status !== 'scanning') {
      anim.current?.stop();
      rings.forEach(r => r.setValue(0));
      return;
    }
    rings.forEach((r, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 380),
          Animated.timing(r, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(r, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      );
      loop.start();
    });
  }, [status]);

  const dotColor =
    status === 'verified' ? Colors.success :
    status === 'error'    ? Colors.danger  :
    status === 'far'      ? Colors.warning :
    Colors.secondary;

  return (
    <View style={gps.wrap}>
      {status === 'scanning' && rings.map((r, i) => (
        <Animated.View key={i} style={[gps.ring, {
          backgroundColor: Colors.secondary,
          opacity:   r.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.7, 0.3, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.8] }) }],
        }]} />
      ))}
      <View style={[gps.center, { backgroundColor: dotColor }]}>
        {status === 'scanning' && <ActivityIndicator color={Colors.white} size="small" />}
        {status === 'verified' && <CheckCircle2 size={20} color={Colors.white} strokeWidth={2.5} />}
        {status === 'error'    && <AlertTriangle size={20} color={Colors.white} strokeWidth={2.5} />}
        {status === 'far'      && <Navigation size={20} color={Colors.white} strokeWidth={2.5} />}
        {status === 'idle'     && <MapPin size={20} color={Colors.white} strokeWidth={2.5} />}
      </View>
    </View>
  );
}

const gps = StyleSheet.create({
  wrap:   { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ring:   { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
  center: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...Shadow.card },
});

// ═══════════════════════════════════════════════════════════
export default function BuildingSelectScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(600)).current;
  const checkInStore = useWorkStore((s) => s.checkIn);

  const [selected,   setSelected]   = useState(null);
  const [gpsStatus,  setGpsStatus]  = useState('idle');
  // idle | scanning | verified | far | error
  const [userCoords, setUserCoords] = useState(null);
  const [distances,  setDistances]  = useState({});
  const [accuracy,   setAccuracy]   = useState(null);
  const [autoDetected, setAutoDetected] = useState(null); // bino ID, agar yaqin bo'lsa

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0, tension: 55, friction: 11, useNativeDriver: true,
    }).start();
    requestGPS();
  }, []);

  const requestGPS = async () => {
    setGpsStatus('scanning');
    setUserCoords(null);
    setDistances({});
    setAccuracy(null);
    setAutoDetected(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setGpsStatus('error');
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude, accuracy: acc } = loc.coords;
      setUserCoords({ latitude, longitude });
      setAccuracy(Math.round(acc || 5));

      // Har bir binoga masofani hisoblash
      const dists = {};
      let nearId = null;
      let minDist = Infinity;
      BUILDINGS.forEach((b) => {
        const d = getDistance(latitude, longitude, b.latitude, b.longitude);
        dists[b.id] = d;
        if (d < minDist) { minDist = d; nearId = b.id; }
      });
      setDistances(dists);

      if (minDist <= GPS_RADIUS) {
        // Foydalanuvchi binoda — avtomatik tanlash
        setAutoDetected(nearId);
        setSelected(nearId);
        setGpsStatus('verified');
      } else {
        setGpsStatus('far');
      }
    } catch {
      setGpsStatus('error');
    }
  };

  // ── Tasdiqlash ────────────────────────────────────────
  const canConfirm = selected !== null &&
    (gpsStatus === 'verified' || gpsStatus === 'far');

  const handleConfirm = async () => {
    if (!canConfirm) return;

    const building = BUILDINGS.find((b) => b.id === selected);
    if (!building) return;

    let lat = userCoords?.latitude;
    let lon = userCoords?.longitude;
    if (lat == null || lon == null) {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      } catch {
        Alert.alert('', 'Joylashuvni olishda xatolik');
        return;
      }
    }

    try {
      await checkInStore(selected, lat, lon);
      navigation.navigate('StaffHome');
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato';
      Alert.alert('', msg);
    }
  };

  // ── GPS status matni ──────────────────────────────────
  const gpsStatusText = () => {
    if (gpsStatus === 'scanning') return 'GPS joylashuvingiz aniqlanmoqda...';
    if (gpsStatus === 'error')    return 'GPS ruxsati berilmadi. Sozlamalarda yoqing.';
    if (gpsStatus === 'verified') {
      const b = BUILDINGS.find(b => b.id === autoDetected);
      return `${b?.short || 'Bino'} da joylashuvingiz tasdiqlandi ✓`;
    }
    if (gpsStatus === 'far') {
      const nearest = BUILDINGS.reduce((a, b) => (distances[a.id] < distances[b.id] ? a : b), BUILDINGS[0]);
      return `Eng yaqin bino: ${nearest.short} — ${formatDist(distances[nearest.id])}`;
    }
    return 'GPS tayyor';
  };

  const gpsStatusColor = () => {
    if (gpsStatus === 'scanning') return Colors.textSecondary;
    if (gpsStatus === 'error')    return Colors.danger;
    if (gpsStatus === 'verified') return Colors.success;
    if (gpsStatus === 'far')      return Colors.warning;
    return Colors.textSecondary;
  };

  // ── Button matni ──────────────────────────────────────
  const btnLabel = () => {
    if (gpsStatus === 'scanning') return 'GPS aniqlanmoqda...';
    if (gpsStatus === 'error')    return 'GPS xato — Qayta urinish';
    if (!selected)                return 'Binoni tanlang';
    const b = BUILDINGS.find(b => b.id === selected);
    return `${b?.short || 'Bino'} ni tasdiqlash  →`;
  };

  const handleBtnPress = () => {
    if (gpsStatus === 'error') { requestGPS(); return; }
    handleConfirm();
  };

  return (
    <View style={bld.backdrop}>
      <StatusBar style="dark" />
      <TouchableOpacity style={bld.dismiss} onPress={() => navigation?.goBack()} activeOpacity={1} />

      <Animated.View style={[bld.sheet, { transform: [{ translateY: slideY }], paddingBottom: insets.bottom + 20 }]}>
        <View style={bld.handle} />

        {/* Header */}
        <View style={bld.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={bld.title}>Qaysi binoda ishlaysiz?</Text>
            <Text style={bld.subtitle}>GPS orqali joylashuvingiz tekshiriladi</Text>
          </View>
          <TouchableOpacity style={bld.closeBtn} onPress={() => navigation?.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={Colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: Spacing.md }}>

          {/* Bino ro'yxati */}
          {BUILDINGS.map((b) => {
            const sel     = selected === b.id;
            const dist    = distances[b.id];
            const isNear  = dist !== undefined && dist <= GPS_RADIUS;
            const isAuto  = autoDetected === b.id;

            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => setSelected(b.id)}
                activeOpacity={0.88}
                style={[bld.bCard, sel && { borderColor: b.color, borderWidth: 2, backgroundColor: b.bg }]}
              >
                <View style={[bld.bIcon, { backgroundColor: sel ? b.bg2 : b.bg }]}>
                  <Building2 size={22} color={b.color} strokeWidth={2} />
                </View>

                <View style={bld.bBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[bld.bName, sel && { color: b.color }]}>{b.name}</Text>
                    {isAuto && (
                      <View style={[bld.autoBadge, { backgroundColor: b.color }]}>
                        <Text style={bld.autoBadgeTxt}>GPS</Text>
                      </View>
                    )}
                  </View>

                  <Text style={bld.bDesc}>{b.desc}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Users size={11} color={Colors.success} strokeWidth={2} />
                      <Text style={bld.bCount}>{b.count}</Text>
                    </View>

                    {dist !== undefined && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Navigation size={11}
                          color={isNear ? b.color : Colors.textMuted}
                          strokeWidth={2}
                        />
                        <Text style={[bld.bDist, { color: isNear ? b.color : Colors.textMuted }]}>
                          {isNear ? `Shu yerda (${formatDist(dist)})` : formatDist(dist) + ' uzoqda'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[bld.radio, sel && { borderColor: b.color, backgroundColor: b.color }]}>
                  {sel && <View style={bld.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* GPS bo'limi */}
          <View style={bld.gpsSection}>
            <GPSPulse status={gpsStatus} />

            <View style={{ flex: 1 }}>
              <Text style={[bld.gpsLabel, { color: gpsStatusColor() }]}>
                {gpsStatusText()}
              </Text>
              {accuracy !== null && gpsStatus !== 'error' && (
                <Text style={bld.gpsAccuracy}>± {accuracy} metr aniqlik</Text>
              )}
              {userCoords && (
                <Text style={bld.gpsCoords}>
                  {userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)}
                </Text>
              )}
            </View>

            {/* Qayta aniqlash */}
            {(gpsStatus === 'far' || gpsStatus === 'error' || gpsStatus === 'verified') && (
              <TouchableOpacity style={bld.retryBtn} onPress={requestGPS} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <RefreshCw size={16} color={Colors.secondary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* Uzoq bo'lsa ogohlantirish */}
          {gpsStatus === 'far' && selected && (
            <View style={bld.warningBox}>
              <AlertTriangle size={16} color={Colors.warning} strokeWidth={2} />
              <Text style={bld.warningTxt}>
                Siz tanlangan binoga {formatDist(distances[selected])} uzoqdasiz. Baribir tasdiqlashingiz mumkin.
              </Text>
            </View>
          )}

          <PrimaryButton
            label={btnLabel()}
            onPress={handleBtnPress}
            disabled={gpsStatus === 'scanning'}
            loading={gpsStatus === 'scanning'}
            style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const bld = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  dismiss:    { flex: 1 },
  sheet:      {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.md + 4, paddingTop: Spacing.sm,
    maxHeight: '90%',
    ...Shadow.modal,
  },
  handle:     { width: 40, height: 4, borderRadius: Radius.full, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  title:      { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:   { fontSize: FontSize.body - 1, color: Colors.textSecondary, marginTop: 3 },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },

  bCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.sm },
  bIcon:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bBody:      { flex: 1, marginLeft: 12 },
  bName:      { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  bDesc:      { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 1 },
  bCount:     { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },
  bDist:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  autoBadge:  { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  autoBadgeTxt:{ fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold },

  radio:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.white },

  gpsSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: Spacing.xs, gap: Spacing.md },
  gpsLabel:   { fontSize: FontSize.body - 1, fontWeight: FontWeight.medium, lineHeight: 20 },
  gpsAccuracy:{ fontSize: FontSize.xs, color: Colors.success, marginTop: 3 },
  gpsCoords:  { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  retryBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.secondaryTint, alignItems: 'center', justifyContent: 'center' },

  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warningTint, borderRadius: Radius.sm, padding: Spacing.sm + 2, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#FDE68A' },
  warningTxt: { flex: 1, fontSize: FontSize.sm, color: '#92400E', lineHeight: 18 },
});
