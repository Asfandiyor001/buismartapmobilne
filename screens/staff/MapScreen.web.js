// Web: react-native-maps is native-only. Same GPS + building list; map is a static placeholder.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  ArrowLeft, Navigation, Users, MapPin,
  Building2, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import {
  BUILDINGS, GPS_RADIUS, getDistance, detectBuilding, formatDist,
} from '../../src/utils/buildings';

function PulseCircle({ color = Colors.secondary }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 2.2, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 0,    useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,   duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0,    useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 28, height: 28, borderRadius: 14,
        backgroundColor: color, opacity, transform: [{ scale }],
      }} />
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, borderWidth: 2.5, borderColor: Colors.white }} />
    </View>
  );
}

function openInMaps(lat, lon) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  Linking.openURL(url);
}

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const subRef = useRef(null);

  const [location,     setLocation]     = useState(null);
  const [permError,    setPermError]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [nearBuilding, setNearBuilding] = useState(null);
  const [distances,    setDistances]    = useState({});

  const processCoords = useCallback(({ latitude, longitude, accuracy }) => {
    setLocation({ latitude, longitude, accuracy });
    const dists = {};
    BUILDINGS.forEach((b) => {
      dists[b.id] = getDistance(latitude, longitude, b.latitude, b.longitude);
    });
    setDistances(dists);
    const { inBuilding } = detectBuilding(latitude, longitude);
    setNearBuilding(inBuilding);
  }, []);

  const startWatching = useCallback(async () => {
    setLoading(true);
    setPermError(false);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermError(true);
      setLoading(false);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      processCoords(loc.coords);

      subRef.current?.remove();
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 10 },
        (l) => processCoords(l.coords),
      );
    } catch {
      setPermError(true);
    }
    setLoading(false);
  }, [processCoords]);

  useEffect(() => {
    startWatching();
    return () => { subRef.current?.remove(); };
  }, []);

  const centerLat = BUILDINGS.reduce((s, b) => s + b.latitude,  0) / BUILDINGS.length;
  const centerLon = BUILDINGS.reduce((s, b) => s + b.longitude, 0) / BUILDINGS.length;

  const statusText = loading
    ? 'GPS aniqlanmoqda...'
    : permError
    ? 'GPS ruxsat berilmadi'
    : nearBuilding
    ? `${nearBuilding.short} da tasdiqlandi ✓`
    : location && Object.keys(distances).length
    ? `Eng yaqin: ${BUILDINGS.reduce((a, b) => (distances[a.id] < distances[b.id] ? a : b), BUILDINGS[0]).short} — ${formatDist(Math.min(...Object.values(distances)))}`
    : 'Joylashuv aniqlanmadi';

  const statusColor = loading
    ? Colors.textMuted
    : permError
    ? Colors.danger
    : nearBuilding
    ? Colors.success
    : Colors.warning;

  return (
    <View style={st.root}>
      <StatusBar style="dark" />

      <View style={[st.mapPlaceholder, { pointerEvents: 'box-none' }]}>
        {location && (
          <PulseCircle color={Colors.secondary} />
        )}
        <Text style={st.mapPlaceholderTitle}>Veb: interaktiv xarita</Text>
        <Text style={st.mapPlaceholderSub}>
          Brauzerda xarita ko‘rinishi dasturda hozircha mavjud emas. Bino qatorini bosib, Google xaritalarida oching.
        </Text>
        {location && (
          <TouchableOpacity
            style={st.openMapBtn}
            onPress={() => openInMaps(location.latitude, location.longitude)}
          >
            <Text style={st.openMapBtnTxt} numberOfLines={1}>Hozirgi joyimni xaritada</Text>
          </TouchableOpacity>
        )}
        {!location && !loading && (
          <Text style={st.mapCoordsHint}>
            {centerLat.toFixed(4)}, {centerLon.toFixed(4)} (BIU atrofi)
          </Text>
        )}
      </View>

      {loading && (
        <View style={st.loadingOverlay}>
          <View style={st.loadingBox}>
            <ActivityIndicator color={Colors.secondary} size="large" />
            <Text style={st.loadingTxt}>GPS aniqlanmoqda...</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[st.backBtn, { top: insets.top + 12 }, Shadow.card]}
        onPress={() => navigation?.goBack()}
      >
        <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={[st.topCard, { top: insets.top + 12 }, Shadow.modal]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Navigation size={13} color={statusColor} strokeWidth={2.5} />
          <Text style={[st.topCaption, { color: statusColor }]}>
            {loading ? 'Joylashuv aniqlanmoqda' : permError ? 'Ruxsat kerak' : 'Hozirgi joylashuvingiz'}
          </Text>
        </View>
        <Text style={st.topTitle} numberOfLines={1}>{statusText}</Text>
        {location && !loading && (
          <Text style={st.topAccuracy}>
            ± {Math.round(location.accuracy || 5)} m aniqlik  •  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[st.refreshBtn, { top: insets.top + 12 }, Shadow.card]}
        onPress={startWatching}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={Colors.secondary} size="small" />
          : <RefreshCw size={18} color={Colors.secondary} strokeWidth={2.5} />
        }
      </TouchableOpacity>

      <View style={[st.bottomCard, { bottom: insets.bottom + 16 }, Shadow.modal]}>
        <View style={st.bottomHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} color={Colors.secondary} strokeWidth={2} />
            <Text style={st.bottomTitle}>BIU Binolari</Text>
          </View>
          {nearBuilding && (
            <View style={st.verifiedBadge}>
              <CheckCircle2 size={12} color={Colors.success} strokeWidth={2.5} />
              <Text style={st.verifiedTxt}>Tasdiqlangan</Text>
            </View>
          )}
        </View>

        {BUILDINGS.map((b) => {
          const dist    = distances[b.id];
          const isNear  = dist !== undefined && dist <= GPS_RADIUS;
          const isClosest = dist !== undefined && Object.values(distances).every(d => d >= dist);
          return (
            <TouchableOpacity
              key={b.id}
              style={[st.buildingRow, isNear && { backgroundColor: b.color + '10', borderColor: b.color }]}
              activeOpacity={0.8}
              onPress={() => { openInMaps(b.latitude, b.longitude); }}
            >
              <View style={[st.buildingDot, { backgroundColor: b.color }]}>
                <Building2 size={14} color={Colors.white} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[st.buildingName, isNear && { color: b.color }]}>{b.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Users size={11} color={Colors.success} strokeWidth={2} />
                    <Text style={st.buildingCount}>{b.staffCount} xodim</Text>
                  </View>
                  {dist !== undefined && (
                    <Text style={[st.buildingDist, { color: isNear ? b.color : Colors.textMuted }]}>
                      {isNear ? '✓ Shu yerda' : formatDist(dist) + ' uzoqda'}
                    </Text>
                  )}
                </View>
              </View>
              {isNear && (
                <CheckCircle2 size={18} color={b.color} strokeWidth={2.5} />
              )}
              {!isNear && isClosest && !loading && location && (
                <View style={[st.closestBadge, { backgroundColor: b.color + '15' }]}>
                  <Text style={[st.closestTxt, { color: b.color }]}>Yaqin</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {permError && (
          <View style={st.errorRow}>
            <AlertTriangle size={16} color={Colors.danger} strokeWidth={2} />
            <Text style={st.errorTxt}>GPS ruxsati kerak. Sozlamalarda yoqing.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8e4dc' },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    zIndex: 0,
  },
  mapPlaceholderTitle: {
    marginTop: Spacing.md,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  mapPlaceholderSub: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    maxWidth: 320,
  },
  openMapBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    ...Shadow.card,
  },
  openMapBtnTxt: { fontSize: FontSize.sm, color: Colors.secondary, fontWeight: FontWeight.semibold },
  mapCoordsHint: { marginTop: 8, fontSize: FontSize.xs, color: Colors.textMuted },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  loadingBox:     { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', gap: 12, ...Shadow.modal },
  loadingTxt:     { fontSize: FontSize.body - 1, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  backBtn:    { position: 'absolute', left: Spacing.md, width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  refreshBtn: { position: 'absolute', right: Spacing.md, width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', zIndex: 5 },

  topCard:    { position: 'absolute', left: Spacing.md + 54, right: Spacing.md + 54, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.sm + 4, zIndex: 5 },
  topCaption: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  topTitle:   { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  topAccuracy:{ fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },

  bottomCard:   { position: 'absolute', left: Spacing.md, right: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, zIndex: 5 },
  bottomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  bottomTitle:  { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  verifiedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successTint, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedTxt:  { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },

  buildingRow:  { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm + 2, borderRadius: Radius.sm, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
  buildingDot:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buildingName: { fontSize: FontSize.body - 1, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  buildingCount:{ fontSize: FontSize.xs, color: Colors.success },
  buildingDist: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  closestBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  closestTxt:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerTint, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  errorTxt: { flex: 1, fontSize: FontSize.sm, color: Colors.danger },
});
