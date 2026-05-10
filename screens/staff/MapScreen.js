import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import {
  Navigation, MapPin, Building2, CheckCircle2, RefreshCw, ArrowLeft,
  Clock, MoreVertical,
} from 'lucide-react-native'

// ── BUILDINGS setup (same as original) ────────────────────
let BUILDINGS = []
let GPS_RADIUS = 120
let getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3
  const p1 = lat1 * Math.PI / 180
  const p2 = lat2 * Math.PI / 180
  const dp = (lat2 - lat1) * Math.PI / 180
  const dl = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
let detectBuilding = (lat, lon) => {
  for (const b of BUILDINGS) {
    const d = getDistance(lat, lon, b.latitude, b.longitude)
    if (d <= GPS_RADIUS) return { inBuilding: b, distance: d }
  }
  return { inBuilding: null }
}
let formatDist = (d) => d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`

try {
  const utils = require('../../src/utils/buildings')
  if (utils.BUILDINGS?.length) BUILDINGS = utils.BUILDINGS
  if (utils.GPS_RADIUS) GPS_RADIUS = utils.GPS_RADIUS
  if (utils.getDistance) getDistance = utils.getDistance
  if (utils.detectBuilding) detectBuilding = utils.detectBuilding
  if (utils.formatDist) formatDist = utils.formatDist
} catch (e) {
  console.warn('Buildings import failed:', e.message)
}

if (!BUILDINGS.length) {
  BUILDINGS = [
    { id: 1, name: 'Bino 1 — Asosiy bino', short: 'Bino 1', latitude: 39.741066, longitude: 64.427637, color: '#028090', staffCount: 8 },
    { id: 2, name: 'Bino 2 — Laboratoriya', short: 'Bino 2', latitude: 39.740624, longitude: 64.432623, color: '#1E2761', staffCount: 4 },
    { id: 3, name: 'Bino 3 — Kutubxona', short: 'Bino 3', latitude: 39.740200, longitude: 64.434800, color: '#7C3AED', staffCount: 2 },
  ]
}

// ── Helpers ───────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0')
const nowHHMM = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const todayDateStr = () => {
  const d = new Date()
  const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
  return `${d.getDate()} ${months[d.getMonth()]}, ${days[d.getDay()]}`
}
const PALETTE = ['#028090', '#1E2761', '#7C3AED', '#10B981', '#F59E0B']

// ── Main Component ────────────────────────────────────────
export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [error, setError] = useState(null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nearBuilding, setNearBuilding] = useState(null)
  const [distances, setDistances] = useState({})
  const [activeTab, setActiveTab] = useState('GPS')
  const [checkinTime, setCheckinTime] = useState(null)
  const subRef = useRef(null)
  const mountedRef = useRef(true)

  const processCoords = useCallback(({ latitude, longitude, accuracy }) => {
    if (!mountedRef.current) return
    try {
      setLocation({ latitude, longitude, accuracy })
      const dists = {}
      BUILDINGS.forEach(b => {
        dists[b.id] = getDistance(latitude, longitude, b.latitude, b.longitude)
      })
      setDistances(dists)
      const { inBuilding } = detectBuilding(latitude, longitude)
      setNearBuilding(prev => {
        if (inBuilding && !prev) setCheckinTime(nowHHMM())
        return inBuilding
      })
    } catch (e) {
      console.warn('processCoords error:', e.message)
    }
  }, [])

  const initMap = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (!mountedRef.current) return
      if (status !== 'granted') {
        setError('GPS ruxsati berilmagan')
        setLoading(false)
        return
      }
      try { subRef.current?.remove() } catch (e) {}
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (!mountedRef.current) return
      processCoords(loc.coords)
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 10 },
        (l) => processCoords(l.coords)
      )
    } catch (e) {
      console.warn('MapScreen initMap error:', e.message)
      if (mountedRef.current) setError('GPS xatosi: ' + (e?.message || "Noma'lum xato"))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [processCoords])

  useEffect(() => {
    mountedRef.current = true
    initMap()
    return () => {
      mountedRef.current = false
      try { subRef.current?.remove() } catch (e) {}
      subRef.current = null
    }
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    initMap().finally(() => { if (mountedRef.current) setRefreshing(false) })
  }, [initMap])

  const closestBuilding = BUILDINGS.length && Object.keys(distances).length
    ? BUILDINGS.reduce((a, b) => (distances[a.id] ?? Infinity) < (distances[b.id] ?? Infinity) ? a : b)
    : null
  const minDist = closestBuilding ? (distances[closestBuilding.id] ?? null) : null

  const eventCount = nearBuilding ? 1 : 0

  // ── Error state ───────────────────────────────────────
  if (error) {
    return (
      <View style={st.errorWrap}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📍</Text>
        <Text style={st.errorTxt}>{error}</Text>
        <TouchableOpacity onPress={initMap} style={st.retryBtn}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Qayta urinish</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginTop: 12, padding: 12 }}>
          <Text style={{ color: '#64748B', fontSize: 14 }}>Orqaga</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={st.root}>
      <StatusBar style="light" />

      {/* ═══ HEADER ════════════════════════════════════════ */}
      <LinearGradient
        colors={['#1E2761', '#028090']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[st.header, { paddingTop: insets.top + 12 }]}
      >
        {/* Title row */}
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={st.headerBtn}>
            <ArrowLeft size={20} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Joylashuvim</Text>
          <TouchableOpacity onPress={initMap} disabled={loading} style={st.headerBtn}>
            {loading
              ? <ActivityIndicator size="small" color="white" />
              : <RefreshCw size={18} color="white" strokeWidth={2.5} />
            }
          </TouchableOpacity>
        </View>

        {/* Live label */}
        {nearBuilding ? (
          <View style={st.liveLabelRow}>
            <View style={st.liveGreenDot} />
            <Text style={st.liveLabelTxt}>HOZIR SHU YERDA</Text>
          </View>
        ) : null}

        {/* Building status card */}
        <View style={st.buildingCard}>
          <View style={[st.buildingCardIcon, { backgroundColor: nearBuilding ? '#028090' : 'rgba(255,255,255,0.2)' }]}>
            <Building2 size={20} color="white" strokeWidth={2} />
          </View>
          <View style={st.buildingCardMid}>
            <Text style={st.buildingCardName} numberOfLines={1}>
              {nearBuilding?.name ?? (loading ? 'Aniqlanmoqda...' : closestBuilding?.name ?? "Joylashuv noma'lum")}
            </Text>
            <Text style={st.buildingCardSub}>
              {nearBuilding
                ? 'Asosiy zona'
                : minDist != null
                  ? `${formatDist(minDist)} uzoqda`
                  : 'GPS kutilmoqda'}
            </Text>
          </View>
          {nearBuilding ? (
            <View style={st.liveBadge}>
              <View style={st.liveBadgeDot} />
              <Text style={st.liveBadgeTxt}>LIVE</Text>
            </View>
          ) : null}
        </View>

        {/* Tabs */}
        <View style={st.tabs}>
          {['VAQT', 'GPS', 'BATAREYA'].map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={st.tab}>
              <Text style={[st.tabTxt, activeTab === tab && st.tabTxtActive]}>{tab}</Text>
              {activeTab === tab && <View style={st.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ═══ BODY ══════════════════════════════════════════ */}
      {loading && !location ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color="#028090" />
          <Text style={st.loadingTxt}>GPS aniqlanmoqda...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[st.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#028090"
              colors={['#028090']}
            />
          }
        >
          {/* ── Bugungi yo'l ── */}
          <View style={st.sectionCard}>
            <View style={st.sectionHead}>
              <View>
                <Text style={st.sectionTitle}>Bugungi yo'l</Text>
                <Text style={st.sectionDate}>{todayDateStr()}</Text>
              </View>
              <Text style={st.sectionSub}>{eventCount} hodisa</Text>
            </View>

            {nearBuilding ? (
              <View style={st.timelineRow}>
                <Text style={st.timelineTime}>{checkinTime ?? nowHHMM()}</Text>
                <View style={st.timelineCenter}>
                  <View style={[st.timelineIcon, { backgroundColor: '#028090' }]}>
                    <CheckCircle2 size={13} color="white" strokeWidth={2.5} />
                  </View>
                  <View style={st.timelineConnector} />
                </View>
                <View style={st.timelineCard}>
                  <View style={st.timelineCardTop}>
                    <Text style={st.timelineCardTitle} numberOfLines={1}>
                      {nearBuilding.short ?? nearBuilding.name} ga kirildi
                    </Text>
                    <View style={st.nowBadge}>
                      <Text style={st.nowBadgeTxt}>HOZIR</Text>
                    </View>
                  </View>
                  <Text style={st.timelineCardSub}>
                    Asosiy bino • GPS ±{Math.round(location?.accuracy || 5)}m
                  </Text>
                </View>
              </View>
            ) : (
              <View style={st.emptyTimeline}>
                <MapPin size={28} color="#94A3B8" strokeWidth={1.5} />
                <Text style={st.emptyTimelineTxt}>Bugun hali binoga kirilmagan</Text>
              </View>
            )}
          </View>

          {/* ── Binolar bo'yicha vaqt ── */}
          <View style={st.sectionCard}>
            <Text style={st.sectionTitle}>Binolar bo'yicha vaqt</Text>
            <Text style={st.sectionSubtitle}>
              {`Bu hafta • GPS masofasi bo'yicha`}
            </Text>

            {BUILDINGS.map((b, idx) => {
              const dist = distances[b.id]
              const isNear = dist !== undefined && dist <= GPS_RADIUS
              const color = isNear ? '#10B981' : PALETTE[idx % PALETTE.length]
              const pct = dist !== undefined
                ? Math.max(0, 100 - Math.min(100, (dist / 600) * 100))
                : 0

              return (
                <View key={b.id} style={st.buildingRow}>
                  <View style={[st.buildingRowIcon, { backgroundColor: color }]}>
                    <Building2 size={16} color="white" strokeWidth={2} />
                  </View>
                  <View style={st.buildingRowMid}>
                    <View style={st.buildingRowHead}>
                      <Text style={st.buildingRowName} numberOfLines={1}>{b.name}</Text>
                      <Text style={[st.buildingRowDist, { color }]}>
                        {isNear ? '✓ Ichida' : dist !== undefined ? formatDist(dist) : '—'}
                      </Text>
                    </View>
                    <View style={st.buildingTrack}>
                      <View style={[st.buildingFill, { width: `${isNear ? 100 : pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              )
            })}
          </View>

          {/* ── GPS coords ── */}
          {location ? (
            <View style={st.gpsCard}>
              <View style={st.gpsCardRow}>
                <Navigation size={13} color="#028090" strokeWidth={2} />
                <Text style={st.gpsCardTitle}>GPS koordinatalari</Text>
              </View>
              <Text style={st.gpsCoords}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
              <Text style={st.gpsAccuracy}>± {Math.round(location.accuracy || 5)}m aniqlik</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────
const shadow = Platform.OS === 'ios'
  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }
  : { elevation: 3 }

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // Error
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 32 },
  errorTxt: { color: '#EF4444', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#028090', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },

  // Live label
  liveLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveGreenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  liveLabelTxt: { fontSize: 11, fontWeight: '700', color: '#10B981', letterSpacing: 1.2 },

  // Building card in header
  buildingCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  buildingCardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  buildingCardMid: { flex: 1 },
  buildingCardName: { fontSize: 15, fontWeight: '700', color: 'white' },
  buildingCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.22)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#10B981' },

  // Tabs
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 },
  tabTxtActive: { color: 'white' },
  tabUnderline: { position: 'absolute', bottom: 0, width: '50%', height: 2, backgroundColor: '#028090', borderRadius: 2 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { marginTop: 12, color: '#64748B', fontSize: 14 },

  // Scroll
  scrollContent: { padding: 16 },

  // Section card
  sectionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, ...shadow },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  sectionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  sectionDate: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 14, marginTop: 2 },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timelineTime: { fontSize: 12, color: '#64748B', fontVariant: ['tabular-nums'], width: 40, paddingTop: 6 },
  timelineCenter: { alignItems: 'center', paddingTop: 4 },
  timelineIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4, minHeight: 20 },
  timelineCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  timelineCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  timelineCardTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  timelineCardSub: { fontSize: 11, color: '#64748B' },
  nowBadge: { backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  nowBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  emptyTimeline: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyTimelineTxt: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  // Building rows
  buildingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  buildingRowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  buildingRowMid: { flex: 1 },
  buildingRowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  buildingRowName: { fontSize: 13, fontWeight: '600', color: '#1E293B', flex: 1, marginRight: 8 },
  buildingRowDist: { fontSize: 12, fontWeight: '600', flexShrink: 0 },
  buildingTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  buildingFill: { height: 6, borderRadius: 3 },

  // GPS card
  gpsCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, ...shadow },
  gpsCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  gpsCardTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  gpsCoords: { fontSize: 12, color: '#64748B', fontVariant: ['tabular-nums'] },
  gpsAccuracy: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
})
