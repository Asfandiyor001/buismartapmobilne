// ═══════════════════════════════════════════════════════════
// SCREEN 05 — staff/MapScreen.js
// Real GPS (watchPositionAsync) + react-native-maps
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  ArrowLeft, Navigation, Users, MapPin,
  Building2, CheckCircle2, RefreshCw,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import {
  BUILDINGS, GPS_RADIUS, getDistance, detectBuilding, formatDist,
} from '../../src/utils/buildings';

// ── Pulsing dot component ────────────────────────────────
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

// ═══════════════════════════════════════════════════════════
export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const subRef = useRef(null);

  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearBuilding, setNearBuilding] = useState(null);
  const [distances, setDistances] = useState({});

  // ── Joylashuvni qayta ishlash ────────────────────────
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

  const initMap = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('GPS ruxsati berilmagan');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      subRef.current?.remove();

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      processCoords(loc.coords);
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.005,
      }, 800);

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 10 },
        (l) => processCoords(l.coords),
      );
    } catch (e) {
      setError('Xarita yuklanmadi: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }, [processCoords]);

  useEffect(() => {
    initMap();
    return () => {
      try {
        subRef.current?.remove();
      } catch {
        /* */
      }
      subRef.current = null;
    };
  }, [initMap]);

  // ── Barcha binolar orasidagi markaz ────────────────────
  const centerLat = BUILDINGS.reduce((s, b) => s + b.latitude, 0) / BUILDINGS.length;
  const centerLon = BUILDINGS.reduce((s, b) => s + b.longitude, 0) / BUILDINGS.length;

  const initialRegion = {
    latitude: centerLat,
    longitude: centerLon,
    latitudeDelta: 0.005,
    longitudeDelta: 0.007,
  };

  // ── Status matnlari ────────────────────────────────────
  const statusText = loading
    ? 'GPS aniqlanmoqda...'
    : nearBuilding
      ? `${nearBuilding.short} da tasdiqlandi ✓`
      : location && Object.keys(distances).length
        ? `Eng yaqin: ${BUILDINGS.reduce((a, b) => (distances[a.id] < distances[b.id] ? a : b), BUILDINGS[0]).short} — ${formatDist(Math.min(...Object.values(distances)))}`
        : 'Joylashuv aniqlanmadi';

  const statusColor = loading
    ? Colors.textMuted
    : nearBuilding
      ? Colors.success
      : Colors.warning;

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#64748B', fontSize: 14 }}>{error}</Text>
      </View>
    );
  }

  const renderScreen = () => {
    try {
      return (
        <View style={st.root}>
          <StatusBar style="dark" />

          {/* MAP */}
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            initialRegion={initialRegion}
            showsUserLocation={!!location}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            mapType="standard"
          >
            {/* Binolar markerlari */}
            {BUILDINGS.map((b) => (
              <React.Fragment key={b.id}>
                <Circle
                  center={{ latitude: b.latitude, longitude: b.longitude }}
                  radius={GPS_RADIUS}
                  fillColor={b.color + '22'}
                  strokeColor={b.color + '88'}
                  strokeWidth={1.5}
                />
                <Marker
                  coordinate={{ latitude: b.latitude, longitude: b.longitude }}
                  title={b.name}
                  description={b.desc}
                >
                  <View style={[st.markerWrap, { borderColor: b.color }]}>
                    <View style={[st.markerInner, { backgroundColor: b.color }]}>
                      <Building2 size={16} color={Colors.white} strokeWidth={2.5} />
                    </View>
                    <View style={[st.markerTail, { borderTopColor: b.color }]} />
                  </View>
                </Marker>
              </React.Fragment>
            ))}
          </MapView>

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
                {loading ? 'Joylashuv aniqlanmoqda' : 'Hozirgi joylashuvingiz'}
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
            onPress={initMap}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.secondary} size="small" />
              : <RefreshCw size={18} color={Colors.secondary} strokeWidth={2.5} />}
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
              const dist = distances[b.id];
              const isNear = dist !== undefined && dist <= GPS_RADIUS;
              const isClosest = dist !== undefined && Object.values(distances).every((d) => d >= dist);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[st.buildingRow, isNear && { backgroundColor: b.color + '10', borderColor: b.color }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    mapRef.current?.animateToRegion({
                      latitude: b.latitude,
                      longitude: b.longitude,
                      latitudeDelta: 0.002,
                      longitudeDelta: 0.002,
                    }, 600);
                  }}
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
                          {isNear ? '✓ Shu yerda' : `${formatDist(dist)} uzoqda`}
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
          </View>
        </View>
      );
    } catch (e) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#64748B', fontSize: 14 }}>
            Xarita yuklanmadi: {e?.message || String(e)}
          </Text>
        </View>
      );
    }
  };

  return renderScreen();
}

const st = StyleSheet.create({
  root: { flex: 1 },

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

  markerWrap:  { alignItems: 'center' },
  markerInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.white, ...Shadow.card },
  markerTail:  { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
});
