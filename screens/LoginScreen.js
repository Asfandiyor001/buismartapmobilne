// ═══════════════════════════════════════════════════════════
// SCREEN 02 — LoginScreen.js
// ═══════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, Lock, Eye, EyeOff, Users, GraduationCap, Fingerprint, ScanFace } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../theme';
import { PrimaryButton } from '../components';
import { useAuthStore } from '../src/store';
import * as LocalAuthentication from 'expo-local-authentication';

export default function LoginScreen({ navigation }) {
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [userType, setUserType] = useState('staff');
  const [phoneErr, setPhoneErr] = useState('');
  const [passErr,  setPassErr]  = useState('');
  const [authErr,  setAuthErr]  = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState(null);

  const { login, isLoading, clearError } = useAuthStore();

  const passRef = useRef(null);
  const shakeX  = useRef(new Animated.Value(0)).current;
  const insets  = useSafeAreaInsets();

  useEffect(() => {
    const checkBiometric = async () => {
      const has = await useAuthStore.getState().checkBiometricAvailable();
      if (has) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBioType(types.includes(2) ? 'face' : 'fingerprint');
      } else {
        setBioType(null);
      }
      setBioAvailable(has);
    };
    checkBiometric();
  }, []);

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();

  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '').replace(/^998/, '');
    let out  = d.length > 0 ? '+998 ' : '';
    if (d.length > 0) out += d.slice(0, 2);
    if (d.length > 2) out += ' ' + d.slice(2, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    setPhone(out.trim());
    setAuthErr('');
    clearError();
  };

  const handleLogin = async () => {
    let ok = true;
    setAuthErr('');
    if (phone.replace(/\D/g, '').length < 12) { setPhoneErr("To'liq raqam kiriting"); ok = false; } else setPhoneErr('');
    if (password.length < 4)                   { setPassErr("Parolni kiriting");       ok = false; } else setPassErr('');
    if (!ok) { shake(); return; }

    try {
      await login(phone, password);
      const user = useAuthStore.getState().user;
      const isStaffHome = user.role === 'staff' || user.role === 'admin';
      const doNav = () => navigation.replace(isStaffHome ? 'StaffHome' : 'StudentHome', { user });
      const bio = await useAuthStore.getState().checkBiometricAvailable();
      if (bio) {
        Alert.alert(
          '🔐 Biometrik kirish',
          "Keyingi safar barmoq izi bilan kirishni xohlaysizmi?",
          [
            {
              text: "Ha, yoqish",
              onPress: async () => {
                await useAuthStore.getState().enableBiometric();
                doNav();
              },
            },
            {
              text: "Yo'q",
              style: 'cancel',
              onPress: async () => {
                await useAuthStore.getState().disableBiometric();
                doNav();
              },
            },
          ],
        );
      } else {
        doNav();
      }
    } catch (e) {
      setAuthErr(e.message || 'Xato yuz berdi');
      shake();
    }
  };

  const handleBiometric = async () => {
    setAuthErr('');
    try {
      const { restoreSession, authenticateWithBiometric } = useAuthStore.getState();
      const res = await restoreSession();
      if (!res?.restored) {
        setAuthErr("Avval tizim paroli bilan kiring");
        shake();
        return;
      }
      if (res.biometricEnabled) {
        const u = await authenticateWithBiometric();
        const isStaff = u?.role === 'staff' || u?.role === 'admin';
        navigation.replace(isStaff ? 'StaffHome' : 'StudentHome', { user: u });
        return;
      }
      const u2 = useAuthStore.getState().user;
      const isStaff2 = u2?.role === 'staff' || u2?.role === 'admin';
      navigation.replace(isStaff2 ? 'StaffHome' : 'StudentHome', { user: u2 });
    } catch (e) {
      setAuthErr(e?.message || 'Xato');
      shake();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <LinearGradient
          colors={['#1E2761', '#1a3a6b', '#028090']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.ring1} />
          <View style={styles.ring2} />
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>BIU</Text>
          </View>
          <Text style={styles.logoAppName}>BIU Smart</Text>
          <Text style={styles.tagline}>Aqlli nazorat tizimi</Text>
        </LinearGradient>

        <View style={styles.formWrap}>
          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <Text style={styles.welcome}>Xush kelibsiz 👋</Text>
            <Text style={styles.subtitle}>Tizimga kirish uchun ma'lumotlarni kiriting</Text>

            {/* User type toggle */}
            <View style={styles.typeToggle}>
              {['staff', 'student'].map((t) => (
                <TouchableOpacity key={t} onPress={() => { setUserType(t); setAuthErr(''); clearError(); }} style={[styles.typeBtn, userType === t && styles.typeBtnActive]}>
                  {t === 'staff'
                    ? <Users size={16} color={userType === t ? Colors.secondary : Colors.textMuted} strokeWidth={2} />
                    : <GraduationCap size={16} color={userType === t ? Colors.secondary : Colors.textMuted} strokeWidth={2} />
                  }
                  <Text style={[styles.typeLabel, userType === t && styles.typeLabelActive]}>
                    {t === 'staff' ? 'Xodim' : 'Talaba'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon raqam</Text>
              <View style={[styles.inputBox, !!phoneErr && styles.inputBoxError]}>
                <Phone size={18} color={phoneErr ? Colors.danger : Colors.secondary} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={formatPhone}
                  placeholder="+998 90 123 45 67"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                  maxLength={17}
                />
              </View>
              {!!phoneErr && <Text style={styles.errText}>⚠ {phoneErr}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parol</Text>
              <View style={[styles.inputBox, !!passErr && styles.inputBoxError]}>
                <Lock size={18} color={passErr ? Colors.danger : Colors.secondary} strokeWidth={2} />
                <TextInput
                  ref={passRef}
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setAuthErr(''); clearError(); }}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textDisabled}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPass ? <Eye size={18} color={Colors.textMuted} strokeWidth={2} /> : <EyeOff size={18} color={Colors.textMuted} strokeWidth={2} />}
                </TouchableOpacity>
              </View>
              {!!passErr && <Text style={styles.errText}>⚠ {passErr}</Text>}
            </View>

            {!!authErr && (
              <View style={styles.authErrBox}>
                <Text style={styles.authErrText}>❌ {authErr}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Parolni unutdingiz?</Text>
            </TouchableOpacity>

            {bioAvailable === true && (
              <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}>
                {bioType === 'face' ? (
                  <ScanFace size={22} color={Colors.secondary} strokeWidth={2} />
                ) : (
                  <Fingerprint size={22} color={Colors.secondary} strokeWidth={2} />
                )}
                <Text style={styles.bioBtnText}>
                  {bioType === 'face' ? 'Yuz bilan kirish' : "Barmoq izi bilan kirish"}
                </Text>
              </TouchableOpacity>
            )}

            <PrimaryButton label="Kirish →" onPress={handleLogin} loading={isLoading} style={{ marginTop: Spacing.sm }} />

            <Text style={styles.helpText}>Muammo bormi? IT bo'limiga murojaat qiling{'\n'}📞 +998 91 821 81 95</Text>
          </Animated.View>
        </View>
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:     { alignItems: 'center', paddingBottom: Spacing.xxl, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  ring1:      { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(202,220,252,0.1)' },
  ring2:      { position: 'absolute', bottom: 0, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(2,128,144,0.2)' },
  logoBox:    { width: 80, height: 80, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.modal, marginBottom: Spacing.sm },
  logoText:   { fontSize: 28, fontWeight: FontWeight.heavy, color: Colors.primary, letterSpacing: 2 },
  logoAppName:{ fontSize: FontSize.h2, fontWeight: FontWeight.heavy, color: Colors.white, letterSpacing: 1, marginBottom: 4 },
  tagline:    { fontSize: FontSize.caption, color: Colors.accent, fontStyle: 'italic' },

  formWrap: { paddingHorizontal: Spacing.md + 4, paddingTop: Spacing.xl },
  welcome:  { fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: Colors.primary, marginBottom: 6 },
  subtitle: { fontSize: FontSize.body - 1, color: Colors.textSecondary, marginBottom: Spacing.lg },

  typeToggle:     { flexDirection: 'row', backgroundColor: Colors.borderLight, borderRadius: Radius.md, padding: 4, marginBottom: Spacing.md },
  typeBtn:        { flex: 1, height: 42, borderRadius: Radius.sm + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeBtnActive:  { backgroundColor: Colors.white, ...Shadow.xs },
  typeLabel:      { fontSize: FontSize.body - 1, color: Colors.textMuted, fontWeight: FontWeight.medium },
  typeLabelActive:{ color: Colors.secondary, fontWeight: FontWeight.semibold },

  hintBox:   { backgroundColor: Colors.secondaryTint, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.secondary + '30', padding: Spacing.sm + 4, marginBottom: Spacing.md },
  hintTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.secondary, marginBottom: 4 },
  hintText:  { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  inputGroup:    { marginBottom: Spacing.md },
  inputLabel:    { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 6 },
  inputBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.sm + 2, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 56, gap: Spacing.sm },
  inputBoxError: { borderColor: Colors.danger, backgroundColor: Colors.dangerTint },
  input:         { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary, paddingVertical: 0 },
  errText:       { fontSize: FontSize.sm, color: Colors.danger, marginTop: 4, marginLeft: 2 },

  authErrBox:  { backgroundColor: Colors.dangerTint, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.danger + '40', padding: Spacing.sm + 2, marginBottom: Spacing.sm },
  authErrText: { fontSize: FontSize.body - 1, color: Colors.danger, textAlign: 'center', fontWeight: FontWeight.medium },

  forgotRow:  { alignSelf: 'flex-end', marginBottom: Spacing.md },
  forgotText: { fontSize: FontSize.caption, color: Colors.secondary, fontWeight: FontWeight.semibold },
  bioBtn:     { height: 52, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.secondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  bioBtnText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: FontWeight.semibold },
  helpText:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 20 },
});
