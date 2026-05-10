// ═══════════════════════════════════════════════════════════
// BIU Smart App — components/index.js
// EXPO versiyasi:
//   expo-linear-gradient  o'rniga  react-native-linear-gradient
//   react-native-svg      (Expo bilan ishlaydi)
//   lucide-react-native   (Expo bilan ishlaydi)
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── EXPO: expo-linear-gradient ────────────────────────────
import { LinearGradient } from 'expo-linear-gradient';

// ── react-native-svg ──────────────────────────────────────
import Svg, { Circle } from 'react-native-svg';

// ── lucide-react-native ───────────────────────────────────
import {
  Home, MapPin, BarChart2, Bell, User,
  Calendar, QrCode, Settings, LogOut,
  Building2, CheckCircle2, AlertTriangle,
  FileText, Star, ChevronRight, Clock,
  ArrowLeft, Eye, EyeOff, Lock, Phone,
  Users, GraduationCap, Navigation, Check,
  Coffee, Zap, ZapOff, XCircle,
  CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react-native';

import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../theme';

// ─── Export icons for use in screens ─────────────────────
export const Icons = {
  Home, MapPin, BarChart2, Bell, User,
  Calendar, QrCode, Settings, LogOut,
  Building2, CheckCircle2, AlertTriangle,
  FileText, Star, ChevronRight, Clock,
  ArrowLeft, Eye, EyeOff, Lock, Phone,
  Users, GraduationCap, Navigation, Check,
  Coffee, Zap, ZapOff, XCircle,
  CalendarDays, ChevronLeft, ChevronRightIcon,
};

// ═══════════════════════════════════════════════════════════
// GradientView — expo-linear-gradient wrapper
// ═══════════════════════════════════════════════════════════
export const GradientView = ({
  colors = [Colors.primary, Colors.secondary],
  style, children,
  start = { x: 0, y: 0 },
  end   = { x: 1, y: 1 },
}) => (
  <LinearGradient colors={colors} start={start} end={end} style={style}>
    {children}
  </LinearGradient>
);

// ═══════════════════════════════════════════════════════════
// AttendanceRing — react-native-svg bilan haqiqiy SVG ring
// ═══════════════════════════════════════════════════════════
export const AttendanceRing = ({
  percent    = 94,
  size       = 88,
  stroke     = 10,
  color      = Colors.success,
  trackColor = Colors.borderLight,
}) => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: percent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const r             = (size - stroke) / 2;
  const cx            = size / 2;
  const cy            = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset        = circumference - (percent / 100) * circumference;

  const ringColor =
    percent >= 85 ? Colors.success :
    percent >= 75 ? Colors.warning : Colors.danger;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={color || ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <Text style={{ fontSize: size * 0.22, fontWeight: FontWeight.bold, color: color || ringColor }}>
        {percent}%
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// StatusPill
// ═══════════════════════════════════════════════════════════
export const StatusPill = ({ status = 'working', label, time }) => {
  const cfgs = {
    working: { dot: Colors.success, bg: 'rgba(255,255,255,0.18)', border: 'rgba(255,255,255,0.35)', text: Colors.white },
    abet:    { dot: Colors.warning, bg: 'rgba(254,243,199,0.95)', border: '#FDE68A', text: '#92400E' },
    offline: { dot: Colors.textMuted, bg: 'rgba(241,245,249,0.95)', border: Colors.border, text: Colors.textSecondary },
  };
  const cfg    = cfgs[status] || cfgs.working;
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'working') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [status]);

  return (
    <View style={[pillS.pill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Animated.View style={[pillS.dot, { backgroundColor: cfg.dot, transform: [{ scale: dotAnim }] }]} />
      <Text style={[pillS.text, { color: cfg.text }]}>
        {label || (status === 'working' ? `Ish vaqti  •  ${time || '08:25'} dan` : 'Abet vaqti')}
      </Text>
    </View>
  );
};
const pillS = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.full, paddingVertical: 8, paddingHorizontal: 20, alignSelf: 'center' },
  dot:  { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  text: { fontSize: 14, fontWeight: FontWeight.medium },
});

// ═══════════════════════════════════════════════════════════
// SectionHeader
// ═══════════════════════════════════════════════════════════
export const SectionHeader = ({ title, actionLabel, onAction }) => (
  <View style={shS.row}>
    <Text style={shS.title}>{title}</Text>
    {actionLabel && (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={shS.action}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);
const shS = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, marginTop: Spacing.lg },
  title:  { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  action: { fontSize: FontSize.caption, color: Colors.secondary, fontWeight: FontWeight.semibold },
});

// ═══════════════════════════════════════════════════════════
// Card
// ═══════════════════════════════════════════════════════════
export const Card = ({ children, style, onPress, bg }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const Wrap  = onPress ? TouchableOpacity : View;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Wrap
        onPress={onPress}
        onPressIn={() => onPress && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => onPress && Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        activeOpacity={1}
        style={[cardS.card, bg && { backgroundColor: bg }, style]}
      >
        {children}
      </Wrap>
    </Animated.View>
  );
};
const cardS = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card },
});

// ═══════════════════════════════════════════════════════════
// PrimaryButton
// ═══════════════════════════════════════════════════════════
export const PrimaryButton = ({ label, onPress, disabled, loading, color = Colors.secondary, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[!disabled && Shadow.button, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[btnS.btn, { backgroundColor: color }, disabled && btnS.disabled, style]}
      >
        {loading
          ? <ActivityIndicator color={Colors.white} size="small" />
          : <Text style={btnS.text}>{label}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
};
const btnS = StyleSheet.create({
  btn:      { height: 56, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  disabled: { opacity: 0.45 },
  text:     { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});

// ═══════════════════════════════════════════════════════════
// OutlineButton
// ═══════════════════════════════════════════════════════════
export const OutlineButton = ({ label, onPress, color = Colors.secondary }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[obS.btn, { borderColor: color }]}>
    <Text style={[obS.text, { color }]}>{label}</Text>
  </TouchableOpacity>
);
const obS = StyleSheet.create({
  btn:  { borderWidth: 1.5, borderRadius: Radius.full, paddingVertical: 13, paddingHorizontal: Spacing.xl + 8, alignItems: 'center', alignSelf: 'center' },
  text: { fontSize: FontSize.body - 1, fontWeight: FontWeight.semibold },
});

// ═══════════════════════════════════════════════════════════
// ProgressBar
// ═══════════════════════════════════════════════════════════
export const ProgressBar = ({ progress = 0.9, color = Colors.secondary, height = 8 }) => {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: Math.min(progress * 100, 100), duration: 800, useNativeDriver: false }).start();
  }, [progress]);
  return (
    <View style={[pbS.track, { height }]}>
      <Animated.View style={[pbS.fill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: color, height }]} />
    </View>
  );
};
const pbS = StyleSheet.create({
  track: { backgroundColor: Colors.borderLight, borderRadius: Radius.full, overflow: 'hidden', flex: 1 },
  fill:  { borderRadius: Radius.full },
});

// ═══════════════════════════════════════════════════════════
// FilterChip
// ═══════════════════════════════════════════════════════════
export const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[fcS.chip, active && fcS.active]}>
    <Text style={[fcS.text, active && fcS.activeText]}>{label}</Text>
  </TouchableOpacity>
);
const fcS = StyleSheet.create({
  chip:       { paddingVertical: 7, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  active:     { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  text:       { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  activeText: { color: Colors.white, fontWeight: FontWeight.semibold },
});

// ═══════════════════════════════════════════════════════════
// DayChip
// ═══════════════════════════════════════════════════════════
export const DayChip = ({ day, date, active, today, hasClasses, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[dcS.chip, today && dcS.today, active && !today && dcS.active]}>
    <Text style={[dcS.day,  (today || active) && dcS.light]}>{day}</Text>
    <Text style={[dcS.date, (today || active) && dcS.light]}>{date}</Text>
    {hasClasses && <View style={[dcS.dot, (today || active) && { backgroundColor: Colors.white }]} />}
  </TouchableOpacity>
);
const dcS = StyleSheet.create({
  chip:  { width: 46, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  today: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  active:{ backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  day:   { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  date:  { fontSize: FontSize.h3 - 2, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  light: { color: Colors.white },
  dot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.secondary, marginTop: 3 },
});

// ═══════════════════════════════════════════════════════════
// ActivityItem
// ═══════════════════════════════════════════════════════════
export const ActivityItem = ({ dot = 'green', text, time }) => {
  const dots = { green: Colors.success, amber: Colors.warning, blue: Colors.secondary, red: Colors.danger };
  return (
    <View style={aiS.row}>
      <View style={[aiS.dot, { backgroundColor: dots[dot] || Colors.success }]} />
      <Text style={aiS.text} numberOfLines={1}>{text}</Text>
      <Text style={aiS.time}>{time}</Text>
    </View>
  );
};
const aiS = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  dot:  { width: 8, height: 8, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  text: { flex: 1, fontSize: FontSize.body - 1, color: Colors.textPrimary },
  time: { fontSize: FontSize.sm, color: Colors.textMuted },
});

// ═══════════════════════════════════════════════════════════
// StatusChip
// ═══════════════════════════════════════════════════════════
export const StatusChip = ({ status }) => {
  const cfgs = {
    done:    { label: "O'tildi ✓",  bg: Colors.successTint, color: Colors.success },
    pending: { label: 'Kutilmoqda', bg: Colors.borderLight,  color: Colors.textMuted },
    missed:  { label: "Kelmagan ✗", bg: Colors.dangerTint,   color: Colors.danger },
    next:    { label: 'Keyingi →',  bg: Colors.primaryTint,  color: Colors.primary },
  };
  const cfg = cfgs[status] || cfgs.pending;
  return (
    <View style={[scS.chip, { backgroundColor: cfg.bg }]}>
      <Text style={[scS.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const scS = StyleSheet.create({
  chip: { borderRadius: Radius.full, paddingVertical: 4, paddingHorizontal: 10 },
  text: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});

// ═══════════════════════════════════════════════════════════
// BottomNav  — SafeArea aware
// ═══════════════════════════════════════════════════════════
const NAV_ICONS = { 'Bosh sahifa': Home, 'Joylashuv': MapPin, 'Hisobot': BarChart2, 'Xabarlar': Bell, 'Profil': User, 'Jadval': Calendar, 'QR': QrCode };

export const BottomNav = ({ tabs, activeIndex, onTabPress }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[bnS.nav, Shadow.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab, i) => {
        const active   = i === activeIndex;
        const IconComp = NAV_ICONS[tab.label] || Home;
        return (
          <TouchableOpacity key={i} style={bnS.tab} onPress={() => onTabPress(i)} activeOpacity={0.7}>
            {active && <View style={bnS.indicator} />}
            <IconComp size={22} color={active ? Colors.secondary : Colors.textMuted} strokeWidth={active ? 2.2 : 1.8} />
            <Text style={[bnS.label, active && bnS.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
const bnS = StyleSheet.create({
  nav:         { flexDirection: 'row', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8 },
  tab:         { flex: 1, alignItems: 'center', justifyContent: 'flex-start', position: 'relative', paddingTop: 4 },
  indicator:   { position: 'absolute', top: -1, width: 28, height: 3, backgroundColor: Colors.secondary, borderRadius: Radius.full },
  label:       { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium, marginTop: 3 },
  labelActive: { color: Colors.secondary, fontWeight: FontWeight.semibold },
});