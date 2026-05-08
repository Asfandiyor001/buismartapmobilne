import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Platform
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { ArrowLeft, Navigation, MapPin, Building2, CheckCircle2, RefreshCw } from 'lucide-react-native'

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

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [error, setError] = useState(null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nearBuilding, setNearBuilding] = useState(null)
  const [distances, setDistances] = useState({})
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
      setNearBuilding(inBuilding)
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

      try {
        subRef.current?.remove()
      } catch (e) {}

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      })
      if (!mountedRef.current) return
      processCoords(loc.coords)

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 10 },
        (l) => processCoords(l.coords)
      )
    } catch (e) {
      console.warn('MapScreen initMap error:', e.message)
      if (mountedRef.current) {
        setError('GPS xatosi: ' + (e?.message || "Noma'lum xato"))
      }
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

  const statusText = loading
    ? 'GPS aniqlanmoqda...'
    : nearBuilding
      ? `${nearBuilding.short} da tasdiqlandi ✓`
      : BUILDINGS.length && Object.keys(distances).length
        ? (() => {
          const closest = BUILDINGS.reduce((a, b) =>
            (distances[a.id] ?? Infinity) < (distances[b.id] ?? Infinity) ? a : b
          )
          const minDist = Math.min(...BUILDINGS.map(b => distances[b.id] ?? Infinity))
          return `Eng yaqin: ${closest.short} — ${formatDist(minDist)}`
        })()
        : 'Joylashuv aniqlanmadi'

  const statusColor = loading ? '#94A3B8' : nearBuilding ? '#10B981' : '#F59E0B'

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📍</Text>
        <Text style={{ color: '#EF4444', fontSize: 16, marginBottom: 8, textAlign: 'center', paddingHorizontal: 32 }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={initMap}
          style={{ marginTop: 16, backgroundColor: '#028090', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Qayta urinish</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={{ marginTop: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: '#64748B', fontSize: 14 }}>Orqaga</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />

      <View style={{
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={18} color="#1E293B" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Joylashuv</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Navigation size={11} color={statusColor} strokeWidth={2.5} />
              <Text style={{ fontSize: 12, color: statusColor, fontWeight: '500' }} numberOfLines={1}>
                {statusText}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={initMap}
            disabled={loading}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading
              ? <ActivityIndicator size="small" color="#028090" />
              : <RefreshCw size={16} color="#028090" strokeWidth={2.5} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#028090" />
          <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>GPS aniqlanmoqda...</Text>
        </View>
      )}

      {!loading && (
        <View style={{ flex: 1, padding: 16 }}>
          {location && (
            <View style={{
              backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MapPin size={14} color="#028090" strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>Hozirgi joylashuv</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                ± {Math.round(location.accuracy || 5)}m aniqlik
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Building2 size={15} color="#028090" strokeWidth={2} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>BIU Binolari</Text>
            {nearBuilding && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                <CheckCircle2 size={11} color="#10B981" strokeWidth={2.5} />
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }}>Tasdiqlangan</Text>
              </View>
            )}
          </View>

          {BUILDINGS.map(b => {
            const dist = distances[b.id]
            const isNear = dist !== undefined && dist <= GPS_RADIUS
            return (
              <View
                key={b.id}
                style={{
                  backgroundColor: isNear ? b.color + '12' : 'white',
                  borderRadius: 12, padding: 14, marginBottom: 8,
                  borderWidth: 1.5, borderColor: isNear ? b.color : '#E2E8F0',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: b.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color="white" strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isNear ? b.color : '#1E293B' }}>
                      {b.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: isNear ? b.color : '#64748B', marginTop: 2 }}>
                      {isNear
                        ? '✓ Siz shu yerdasiz'
                        : dist !== undefined
                          ? `${formatDist(dist)} uzoqda`
                          : 'Masofa aniqlanmadi'
                      }
                    </Text>
                  </View>
                  {isNear && (
                    <CheckCircle2 size={20} color={b.color} strokeWidth={2.5} />
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
