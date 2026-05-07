// ═══════════════════════════════════════════════════════════
// SCREEN 01 — SplashScreen.js  (Expo versiyasi)
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing } from '../theme';
import { useAuthStore } from '../src/store';
import { startSilentTracking } from '../src/utils/location';

const { width, height } = Dimensions.get('window');
const useNativeDriver = Platform.OS !== 'web';

export default function SplashScreen({ navigation }) {
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver }),
    ]).start();

    const pulseDot = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 350, useNativeDriver }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver }),
        ])
      ).start();

    pulseDot(dot1, 0);
    pulseDot(dot2, 220);
    pulseDot(dot3, 440);

    const timer = setTimeout(async () => {
      const { restoreSession } = useAuthStore.getState();
      const result = await restoreSession();
      if (result.restored) {
        if (result.biometricEnabled && Platform.OS !== 'web') {
          navigation.replace('BiometricLogin');
          return;
        }
        const user = useAuthStore.getState().user;
        if (user?.role === 'staff') startSilentTracking();
        const isStaffHome = user?.role === 'staff' || user?.role === 'admin';
        navigation.replace(isStaffHome ? 'StaffHome' : 'StudentHome', { user });
      } else {
        navigation.replace('Login');
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#1E2761', '#0D4F6B', '#028090']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.root}
    >
      <StatusBar style="light" />

      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.glowRing}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetters}>BIU</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
          <Text style={styles.appName}>BIU Smart</Text>
          <Text style={styles.tagline}>Buxoro Innovatsiyalar Universiteti</Text>
          <Text style={styles.taglineSub}>Aqlli nazorat tizimi</Text>
        </Animated.View>
      </View>

      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: d, transform: [{ scale: d.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] }) }] }]} />
        ))}
      </View>

      <Text style={styles.version}>v1.0.0  •  2026</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blob1: { position: 'absolute', top: -80, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(202,220,252,0.08)' },
  blob2: { position: 'absolute', top: height * 0.3, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(2,128,144,0.2)' },
  blob3: { position: 'absolute', bottom: -60, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(30,39,97,0.4)' },

  center:      { alignItems: 'center', gap: Spacing.lg },
  logoWrap:    { marginBottom: 4 },
  glowRing:    { width: 120, height: 120, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', padding: 8 },
  logoBox:     { flex: 1, borderRadius: 26, width: '100%', backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  logoLetters: { fontSize: 32, fontWeight: FontWeight.heavy, color: Colors.primary, letterSpacing: 3 },

  appName:    { fontSize: FontSize.h1 + 6, fontWeight: FontWeight.heavy, color: Colors.white, letterSpacing: 1.5, marginBottom: 4 },
  tagline:    { fontSize: FontSize.body - 1, color: 'rgba(202,220,252,0.9)', textAlign: 'center', letterSpacing: 0.3 },
  taglineSub: { fontSize: FontSize.sm, color: 'rgba(202,220,252,0.6)', fontStyle: 'italic', marginTop: 2 },

  dotsRow: { position: 'absolute', bottom: 80, flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  version: { position: 'absolute', bottom: 40, fontSize: FontSize.sm, color: 'rgba(202,220,252,0.5)' },
});