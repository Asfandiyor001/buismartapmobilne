// ═══════════════════════════════════════════════════════════
// SCREEN 06 — staff/AbetScreen.js  (Expo versiyasi)
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Coffee } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { OutlineButton } from '../../components';

const pad = (n) => String(n).padStart(2, '0');

export default function AbetScreen({ navigation }) {
  const [secs, setSecs] = useState(45 * 60 + 22);
  const bounce = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    Animated.loop(
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1.08, tension: 150, friction: 5, useNativeDriver: true }),
        Animated.spring(bounce, { toValue: 1,    tension: 150, friction: 5, useNativeDriver: true }),
        Animated.delay(1500),
      ])
    ).start();
    return () => clearInterval(timer);
  }, []);

  const display = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  const progress = Math.min(secs / 3600, 1);

  return (
    <View style={[ab.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      <TouchableOpacity style={ab.backBtn} onPress={() => navigation?.goBack()}>
        <ArrowLeft size={20} color="#92400E" strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={ab.blob1} />
      <View style={ab.blob2} />

      <View style={ab.content}>
        <Animated.View style={[ab.iconWrap, { transform: [{ scale: bounce }] }]}>
          <Coffee size={48} color={Colors.warning} strokeWidth={1.5} />
        </Animated.View>

        <Text style={ab.title}>Abet vaqti ☕</Text>
        <Text style={ab.timeRange}>13:00 — 14:00</Text>

        <View style={ab.countdownCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={ab.countdownLabel}> Qaytishga qolgan vaqt</Text>
          </View>
          <Text style={ab.countdown}>{display}</Text>
          <View style={ab.progressTrack}>
            <View style={[ab.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={ab.timeLabels}>
            <Text style={ab.timeLbl}>13:00</Text>
            <Text style={ab.timeLbl}>14:00</Text>
          </View>
        </View>

        <View style={ab.infoCard}>
          <Clock size={16} color={Colors.warning} strokeWidth={2} />
          <Text style={ab.infoText}>
            {' '}Siz hozir abetdasiz. Tizim bu vaqtni{'\n'}
            avtomatik belgiladi. 14:00 da ish davom etadi.
          </Text>
        </View>

        <OutlineButton label="Ertaroq qaytdim →" onPress={() => navigation?.goBack()} color={Colors.secondary} />
      </View>
    </View>
  );
}

const ab = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.warningTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  backBtn:  { position: 'absolute', top: 60, left: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.amberTint, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },
  blob1:    { position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(245,158,11,0.12)' },
  blob2:    { position: 'absolute', bottom: -60, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(245,158,11,0.08)' },
  content:  { width: '100%', paddingHorizontal: Spacing.xl, alignItems: 'center' },
  iconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.amberTint, borderWidth: 2, borderColor: '#FDE68A', alignItems: 'center', justifyContent: 'center', ...Shadow.card, marginBottom: Spacing.lg },

  title:     { fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: '#92400E', marginBottom: 6 },
  timeRange: { fontSize: FontSize.h3, color: '#B45309', fontWeight: FontWeight.semibold, marginBottom: Spacing.xl },

  countdownCard:  { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadow.card, marginBottom: Spacing.md },
  countdownLabel: { fontSize: FontSize.caption, color: Colors.textSecondary },
  countdown:      { fontSize: 52, fontWeight: FontWeight.bold, color: Colors.primary, fontVariant: ['tabular-nums'], letterSpacing: 3, marginBottom: Spacing.md },
  progressTrack:  { width: '100%', height: 6, backgroundColor: Colors.borderLight, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill:   { height: 6, backgroundColor: Colors.warning, borderRadius: Radius.full },
  timeLabels:     { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  timeLbl:        { fontSize: FontSize.sm, color: Colors.textMuted },

  infoCard: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', ...Shadow.xs, marginBottom: Spacing.lg, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  infoText: { fontSize: FontSize.body - 1, color: Colors.textSecondary, lineHeight: 22, flex: 1 },
});