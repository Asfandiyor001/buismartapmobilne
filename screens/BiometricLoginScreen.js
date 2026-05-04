// ═══════════════════════════════════════════════════════════
// BiometricLoginScreen — session saqlangan, biometrik bilan kirish
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fingerprint, CheckCircle2, XCircle } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../theme';
import { useAuthStore } from '../src/store';

const OUTLINE_BTN = {
  minHeight: 50,
  paddingVertical: 14,
  paddingHorizontal: Spacing.lg,
  borderRadius: Radius.full,
  borderWidth: 1.5,
  borderColor: 'rgba(255,255,255,0.85)',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function BiometricLoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const authenticateWithBiometric = useAuthStore((s) => s.authenticateWithBiometric);

  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const retryRef = useRef(null);
  const handleBiometricRef = useRef(null);

  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeX]);

  const goHome = useCallback(
    (u) => {
      const staff = u?.role === 'staff' || u?.role === 'admin';
      navigation.replace(staff ? 'StaffHome' : 'StudentHome', { user: u });
    },
    [navigation]
  );

  const handleBiometric = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError("Brauzerda biometrik qo'llab-quvvatlanmaydi");
      return;
    }
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    try {
      setError(null);
      setSuccess(false);
      setBioLoading(true);
      const u = await authenticateWithBiometric();
      setSuccess(true);
      setTimeout(() => goHome(u), 500);
    } catch (e) {
      setError(e?.message || 'Xato');
      setSuccess(false);
      shake();
      retryRef.current = setTimeout(() => {
        retryRef.current = null;
        handleBiometricRef.current?.();
      }, 2000);
    } finally {
      setBioLoading(false);
    }
  }, [authenticateWithBiometric, goHome, shake]);

  handleBiometricRef.current = handleBiometric;

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const t = setTimeout(() => {
      handleBiometricRef.current?.();
    }, 500);
    return () => {
      clearTimeout(t);
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };
  }, []);

  const onOtherAccount = async () => {
    if (retryRef.current) clearTimeout(retryRef.current);
    await AsyncStorage.multiRemove(['biu_token', 'biu_user', 'biu_biometric_enabled']);
    useAuthStore.setState({
      user: null,
      token: null,
      isBiometricEnabled: false,
      isFirstTime: true,
    });
    navigation.replace('Login');
  };

  return (
    <LinearGradient
      colors={['#1E2761', '#028090']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
    >
      <StatusBar style="light" />

      <View style={styles.center}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>BIU</Text>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {user?.name || 'Foydalanuvchi'}
        </Text>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>
            {isStaff ? 'Xodim' : 'Talaba'}
          </Text>
        </View>

        <View style={{ height: 40 }} />

        <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleBiometric}
            disabled={bioLoading}
            style={styles.iconOuter}
          >
            {success ? (
              <View style={[styles.iconCircle, styles.iconCircleOk]}>
                <CheckCircle2 size={64} color={Colors.white} strokeWidth={2.2} />
              </View>
            ) : error ? (
              <View style={[styles.iconCircle, styles.iconCircleErr]}>
                <XCircle size={64} color={Colors.white} strokeWidth={2.2} />
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.iconCircle,
                  { transform: [{ scale: pulse }] },
                ]}
              >
                {bioLoading ? (
                  <ActivityIndicator size="large" color={Colors.white} />
                ) : (
                  <Fingerprint size={80} color={Colors.white} strokeWidth={2} />
                )}
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {!!error && <Text style={styles.errText}>{error}</Text>}

        <Text style={styles.hint}>Kirish uchun barmoq izingizni bosing</Text>

        <View style={{ height: 24 }} />

        <TouchableOpacity style={OUTLINE_BTN} onPress={onOtherAccount} activeOpacity={0.85}>
          <Text style={styles.outlineTxt}>Boshqa hisob bilan kirish</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.modal,
  },
  logoText: { fontSize: 28, fontWeight: FontWeight.heavy, color: Colors.primary, letterSpacing: 2 },
  name: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  chip: {
    marginTop: 10,
    backgroundColor: 'rgba(2,128,144,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  chipTxt: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  iconOuter: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOk: { backgroundColor: Colors.success, borderColor: 'rgba(255,255,255,0.6)' },
  iconCircleErr: { backgroundColor: Colors.danger, borderColor: 'rgba(255,255,255,0.6)' },
  errText: { marginTop: 12, color: '#FEE2E2', fontSize: FontSize.sm, textAlign: 'center' },
  hint: { marginTop: 8, color: 'rgba(255,255,255,0.95)', fontSize: 14, textAlign: 'center' },
  outlineTxt: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
