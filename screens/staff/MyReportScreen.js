// ═══════════════════════════════════════════════════════════
// Hisobotim — Personal Analytics Dashboard
// ═══════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Animated,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarCheck,
  Clock,
  UserMinus,
  TrendingUp,
  Coffee,
  Building2,
  Star,
  Wallet,
  Plus,
  Minus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Zap,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { reportAPI } from '../../src/api/report.api';

// ── Constants ─────────────────────────────────────────────
const MONTHS_UZ = [
  'Yanvar','Fevral','Mart','Aprel','May','Iyun',
  'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr',
];

const D = {
  pageBg:     '#F1F5F9',
  cardBg:     '#FFFFFF',
  text1:      '#0F172A',
  text2:      '#475569',
  text3:      '#94A3B8',
  border:     '#E2E8F0',
  green:      '#10B981',
  greenDark:  '#059669',
  greenTint:  '#ECFDF5',
  orange:     '#F59E0B',
  orangeTint: '#FFFBEB',
  red:        '#EF4444',
  redTint:    '#FEF2F2',
  blue:       '#3B82F6',
  blueTint:   '#EFF6FF',
  indigo:     '#6366F1',
  indigoTint: '#EEF2FF',
  purple:     '#8B5CF6',
  gold:       '#D97706',
  goldTint:   '#FEF3C7',
};

const BUILDING_COLORS = [
  { bg: D.blueTint,   text: D.blue   },
  { bg: D.indigoTint, text: D.indigo },
  { bg: D.greenTint,  text: D.green  },
  { bg: D.orangeTint, text: D.orange },
  { bg: '#F5F3FF',    text: D.purple },
];

// ── Helpers ───────────────────────────────────────────────
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtMoney(value) {
  const v = Math.round(num(value, 0));
  try {
    return v.toLocaleString('uz-UZ');
  } catch {
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

function fmtHours(h) {
  const x = num(h, 0);
  const rounded = Math.round(x * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function fmtPct(pct) {
  const p = num(pct, 0);
  const r = Math.round(p * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
}

function pctColor(pct) {
  if (pct >= 90) return D.green;
  if (pct >= 75) return D.orange;
  return D.red;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function dayOfWeek(year, month, day) {
  return new Date(year, month - 1, day).getDay(); // 0=Sun
}

// ── Skeleton block ────────────────────────────────────────
function Skeleton({ width, height, style }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: D.border, opacity: anim },
        style,
      ]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={[skStyles.card, { marginBottom: 12 }]}>
      <Skeleton width="60%" height={18} style={{ marginBottom: 10 }} />
      <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="75%" height={12} />
    </View>
  );
}
const skStyles = StyleSheet.create({
  card: {
    backgroundColor: D.cardBg, borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, borderColor: D.border,
  },
});

// ── Section label ─────────────────────────────────────────
function SectionLabel({ icon: Icon, color, label }) {
  return (
    <View style={slStyles.row}>
      <View style={[slStyles.iconWrap, { backgroundColor: color + '22' }]}>
        <Icon size={14} color={color} strokeWidth={2.2} />
      </View>
      <Text style={slStyles.txt}>{label}</Text>
    </View>
  );
}
const slStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  iconWrap:{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txt:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: D.text2,
             textTransform: 'uppercase', letterSpacing: 0.7 },
});

// ── Thin progress bar ─────────────────────────────────────
function ProgressBar({ ratio, color, height = 6, bg = D.border }) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: bg, overflow: 'hidden' }}>
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// ── Month selector ────────────────────────────────────────
function MonthSelector({ year, month, onChange }) {
  const ref = useRef(null);
  const currentIdx = month - 1;

  useEffect(() => {
    ref.current?.scrollToIndex({ index: currentIdx, animated: true, viewPosition: 0.5 });
  }, [currentIdx]);

  return (
    <View style={msStyles.wrap}>
      <TouchableOpacity
        onPress={() => {
          const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
          onChange(prev.year, prev.month);
        }}
        hitSlop={8} style={msStyles.arrow}
      >
        <ChevronLeft size={18} color={D.text2} strokeWidth={2} />
      </TouchableOpacity>

      <FlatList
        ref={ref}
        data={MONTHS_UZ}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: 72, offset: 72 * i, index: i })}
        renderItem={({ item, index }) => {
          const active = index === currentIdx;
          return (
            <TouchableOpacity
              style={[msStyles.monthBtn, active && msStyles.monthBtnActive]}
              onPress={() => onChange(year, index + 1)}
              activeOpacity={0.75}
            >
              <Text style={[msStyles.monthTxt, active && msStyles.monthTxtActive]}>
                {item}
              </Text>
              {active && <Text style={msStyles.yearTag}>{year}</Text>}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        style={{ flex: 1 }}
      />

      <TouchableOpacity
        onPress={() => {
          const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
          onChange(next.year, next.month);
        }}
        hitSlop={8} style={msStyles.arrow}
      >
        <ChevronRight size={18} color={D.text2} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}
const msStyles = StyleSheet.create({
  wrap:         { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  arrow:        { padding: 4 },
  monthBtn:     { width: 68, paddingVertical: 8, paddingHorizontal: 4, borderRadius: Radius.lg,
    alignItems: 'center', marginHorizontal: 2 },
  monthBtnActive:{ backgroundColor: Colors.primary },
  monthTxt:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: D.text2 },
  monthTxtActive:{ color: '#FFFFFF', fontWeight: FontWeight.bold },
  yearTag:      { fontSize: 9, color: '#FFFFFF99', marginTop: 1 },
});

// ── Performance ring ──────────────────────────────────────
function PerformanceRing({ pct, totalHours, expectedHours }) {
  const color = pctColor(pct);
  const glowColor = color + '22';

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F8FAFC']}
      style={prStyles.card}
    >
      <View style={prStyles.inner}>
        {/* Ring */}
        <View style={[prStyles.ringWrap, { shadowColor: color }]}>
          <View style={[prStyles.ring, { borderColor: color }]}>
            <View style={[prStyles.glow, { backgroundColor: glowColor }]} />
            <Text style={[prStyles.pct, { color }]}>{fmtPct(pct)}</Text>
            <Text style={prStyles.ringLbl}>Samaradorlik</Text>
          </View>
        </View>

        {/* Right column */}
        <View style={prStyles.rightCol}>
          <Text style={prStyles.balanceTitle}>Vaqt balansi</Text>

          <View style={prStyles.balanceRow}>
            <View style={[prStyles.dot, { backgroundColor: D.green }]} />
            <View>
              <Text style={prStyles.balVal}>{fmtHours(totalHours)} soat</Text>
              <Text style={prStyles.balLbl}>Ishlangan</Text>
            </View>
          </View>

          <View style={prStyles.balanceDivider} />

          <View style={prStyles.balanceRow}>
            <View style={[prStyles.dot, { backgroundColor: D.border }]} />
            <View>
              <Text style={prStyles.balVal}>{fmtHours(expectedHours)} soat</Text>
              <Text style={prStyles.balLbl}>Kutilgan</Text>
            </View>
          </View>

          <View style={prStyles.balanceDivider} />

          <ProgressBar
            ratio={expectedHours > 0 ? totalHours / expectedHours : 0}
            color={color}
            height={6}
          />
          <Text style={[prStyles.balFill, { color }]}>
            {expectedHours > 0 ? Math.round((totalHours / expectedHours) * 100) : 0}% bajarildi
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
const prStyles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: D.border, ...Shadow.card },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringWrap: {
    shadowOpacity: 0.25, shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ring: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
  },
  pct:     { fontSize: 30, fontWeight: FontWeight.heavy, letterSpacing: -1 },
  ringLbl: { fontSize: FontSize.xs, color: D.text3, fontWeight: FontWeight.medium, marginTop: 2 },

  rightCol:     { flex: 1, gap: 6 },
  balanceTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: D.text2, marginBottom: 4 },
  balanceRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  balVal:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: D.text1 },
  balLbl:       { fontSize: FontSize.xs, color: D.text3 },
  balanceDivider:{ height: 1, backgroundColor: D.border, marginVertical: 2 },
  balFill:      { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 4 },
});

// ── Stat grid cards ───────────────────────────────────────
function StatGrid({ presentDays, totalWorkDays, overtimeHours, absentDays, sickDays, vacationDays }) {
  const items = [
    {
      icon: CalendarCheck, color: D.green, bg: D.greenTint,
      label: 'Kelgan kunlar',
      val: `${presentDays} / ${totalWorkDays}`,
    },
    {
      icon: Zap, color: D.gold, bg: D.goldTint,
      label: 'Qo\'shimcha vaqt',
      val: `${fmtHours(overtimeHours)} soat`,
    },
    {
      icon: UserMinus, color: D.red, bg: D.redTint,
      label: 'Kelmagan',
      val: `${absentDays} kun`,
    },
    {
      icon: Coffee, color: D.orange, bg: D.orangeTint,
      label: 'Kasallik / ta\'til',
      val: `${sickDays + vacationDays} kun`,
    },
  ];
  return (
    <View style={sgStyles.grid}>
      {items.map((it) => (
        <View key={it.label} style={sgStyles.card}>
          <View style={[sgStyles.iconWrap, { backgroundColor: it.bg }]}>
            <it.icon size={20} color={it.color} strokeWidth={2.2} />
          </View>
          <Text style={sgStyles.val}>{it.val}</Text>
          <Text style={sgStyles.lbl} numberOfLines={2}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
const sgStyles = StyleSheet.create({
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  card:    { flexGrow: 1, flexBasis: '45%', backgroundColor: D.cardBg,
    borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: D.border,
    alignItems: 'flex-start', ...Shadow.xs },
  iconWrap:{ width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  val:     { fontSize: FontSize.h3, fontWeight: FontWeight.heavy, color: D.text1 },
  lbl:     { fontSize: FontSize.xs, color: D.text3, marginTop: 2, lineHeight: 16 },
});

// ── Time balance card ─────────────────────────────────────
function TimeBalanceCard({ regularHours, expectedHours, overtimeHours, breakHours }) {
  const regRatio = expectedHours > 0 ? Math.min(1, regularHours / expectedHours) : 0;
  const otPct    = Math.round((overtimeHours / Math.max(1, expectedHours)) * 100);

  return (
    <LinearGradient colors={['#FAFAFA', '#FFFFFF']} style={tbStyles.card}>
      <SectionLabel icon={Clock} color={Colors.secondary} label="Vaqt tahlili" />

      <View style={tbStyles.row}>
        <View style={{ flex: 1 }}>
          <View style={tbStyles.labelRow}>
            <Text style={tbStyles.rowLabel}>Muntazam soatlar</Text>
            <Text style={[tbStyles.rowVal, { color: D.green }]}>{fmtHours(regularHours)} / {fmtHours(expectedHours)} soat</Text>
          </View>
          <ProgressBar ratio={regRatio} color={D.green} height={7} />
        </View>
      </View>

      <View style={tbStyles.divider} />

      <View style={tbStyles.chipRow}>
        <View style={[tbStyles.chip, { backgroundColor: D.goldTint, borderColor: '#FDE68A' }]}>
          <Zap size={13} color={D.gold} strokeWidth={2.2} />
          <Text style={[tbStyles.chipTxt, { color: D.gold }]}>
            +{fmtHours(overtimeHours)} soat qo'shimcha
          </Text>
          {otPct > 0 && (
            <View style={tbStyles.otBadge}>
              <Text style={tbStyles.otBadgeTxt}>+{otPct}%</Text>
            </View>
          )}
        </View>

        <View style={[tbStyles.chip, { backgroundColor: D.orangeTint, borderColor: '#FDE68A' }]}>
          <Coffee size={13} color={D.orange} strokeWidth={2.2} />
          <Text style={[tbStyles.chipTxt, { color: D.orange }]}>
            {fmtHours(breakHours)} soat tanaffus
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
const tbStyles = StyleSheet.create({
  card:     { borderRadius: Radius.xl, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: D.border, ...Shadow.xs },
  row:      { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { fontSize: FontSize.sm, color: D.text2 },
  rowVal:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  divider:  { height: 1, backgroundColor: D.border, marginVertical: 12 },
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  chipTxt:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  otBadge:  { paddingHorizontal: 5, paddingVertical: 1, borderRadius: Radius.xs,
    backgroundColor: D.gold + '33' },
  otBadgeTxt:{ fontSize: 9, fontWeight: FontWeight.heavy, color: D.gold },
});

// ── Location insights ─────────────────────────────────────
function LocationCard({ buildingStats, mostUsedBuilding }) {
  if (!buildingStats || Object.keys(buildingStats).length === 0) return null;

  const entries = Object.entries(buildingStats).sort((a, b) => b[1] - a[1]);
  const maxHours = entries[0]?.[1] || 1;

  return (
    <View style={lcStyles.card}>
      <SectionLabel icon={MapPin} color={D.indigo} label="Joylashuv tahlili" />

      {entries.map(([name, hours], idx) => {
        const isMost = name === mostUsedBuilding;
        const color = BUILDING_COLORS[idx % BUILDING_COLORS.length];
        const ratio = hours / maxHours;

        return (
          <View key={name} style={lcStyles.row}>
            <View style={lcStyles.nameWrap}>
              <View style={[lcStyles.buildingBadge, { backgroundColor: color.bg }]}>
                <Building2 size={10} color={color.text} strokeWidth={2.5} />
                <Text style={[lcStyles.buildingName, { color: color.text }]}>{name}</Text>
              </View>
              {isMost && (
                <View style={lcStyles.starBadge}>
                  <Star size={10} color={D.gold} strokeWidth={2.5} fill={D.gold} />
                  <Text style={lcStyles.starTxt}>Ko'p ishlagan</Text>
                </View>
              )}
            </View>

            <View style={lcStyles.barWrap}>
              <ProgressBar ratio={ratio} color={color.text} height={7} bg={color.bg} />
            </View>

            <Text style={[lcStyles.hours, { color: color.text }]}>{fmtHours(hours)}s</Text>
          </View>
        );
      })}
    </View>
  );
}
const lcStyles = StyleSheet.create({
  card:        { backgroundColor: D.cardBg, borderRadius: Radius.xl, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: D.border, ...Shadow.xs },
  row:         { marginBottom: 12 },
  nameWrap:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  buildingBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  buildingName:{ fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  starBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full,
    backgroundColor: D.goldTint, borderWidth: 1, borderColor: '#FDE68A' },
  starTxt:     { fontSize: 9, fontWeight: FontWeight.bold, color: D.gold },
  barWrap:     { flex: 1, marginBottom: 2 },
  hours:       { fontSize: FontSize.xs, fontWeight: FontWeight.bold,
    minWidth: 28, textAlign: 'right', marginTop: -18 },
});

// ── Finance card ──────────────────────────────────────────
function FinanceCard({ rewards, fines }) {
  const r = num(rewards, 0);
  const f = num(fines, 0);
  const net = r - f;
  const netPositive = net >= 0;

  return (
    <LinearGradient
      colors={netPositive ? ['#ECFDF5', '#FFFFFF'] : ['#FEF2F2', '#FFFFFF']}
      style={fcStyles.card}
    >
      <SectionLabel icon={Wallet} color={netPositive ? D.green : D.red} label="Moliyaviy hisobot" />

      {/* Net */}
      <View style={fcStyles.netRow}>
        <Text style={fcStyles.netLabel}>Sof miqdor</Text>
        <Text style={[fcStyles.netAmount, { color: netPositive ? D.green : D.red }]}>
          {netPositive ? '+' : ''}{fmtMoney(net)} so'm
        </Text>
      </View>

      <View style={fcStyles.divider} />

      {/* Rewards line */}
      <View style={fcStyles.lineRow}>
        <View style={fcStyles.lineLeft}>
          <View style={[fcStyles.lineIcon, { backgroundColor: D.greenTint }]}>
            <Plus size={14} color={D.green} strokeWidth={2.5} />
          </View>
          <Text style={fcStyles.lineTxt}>Mukofotlar</Text>
        </View>
        <Text style={[fcStyles.lineVal, { color: D.green }]}>+{fmtMoney(r)} so'm</Text>
      </View>

      {/* Fines line */}
      <View style={fcStyles.lineRow}>
        <View style={fcStyles.lineLeft}>
          <View style={[fcStyles.lineIcon, { backgroundColor: D.redTint }]}>
            <Minus size={14} color={D.red} strokeWidth={2.5} />
          </View>
          <Text style={fcStyles.lineTxt}>Jarimalar</Text>
        </View>
        <Text style={[fcStyles.lineVal, { color: D.red }]}>-{fmtMoney(f)} so'm</Text>
      </View>

      {/* Visual ratio bar */}
      {(r + f) > 0 && (
        <View style={fcStyles.ratioBg}>
          <View style={[fcStyles.ratioFill, { width: `${Math.round((r / (r + f)) * 100)}%` }]} />
          <View style={[fcStyles.ratioFill2, { width: `${Math.round((f / (r + f)) * 100)}%` }]} />
        </View>
      )}
    </LinearGradient>
  );
}
const fcStyles = StyleSheet.create({
  card:     { borderRadius: Radius.xl, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: D.border, ...Shadow.card },
  netRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  netLabel: { fontSize: FontSize.sm, color: D.text2, fontWeight: FontWeight.medium },
  netAmount:{ fontSize: FontSize.h2, fontWeight: FontWeight.heavy, letterSpacing: -0.5 },
  divider:  { height: 1, backgroundColor: D.border, marginBottom: 12 },
  lineRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lineLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lineTxt:  { fontSize: FontSize.body, fontWeight: FontWeight.medium, color: D.text1 },
  lineVal:  { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  ratioBg:  { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
    backgroundColor: D.border, marginTop: 6 },
  ratioFill: { height: 6, backgroundColor: D.green },
  ratioFill2:{ height: 6, backgroundColor: D.red },
});

// ── Attendance calendar ───────────────────────────────────
function CalendarGrid({ year, month, presentDays, absentDays, sickDays, vacationDays, sessions }) {
  const total = daysInMonth(year, month);
  const firstDow = dayOfWeek(year, month, 1); // 0=Sun

  // Build a day → status map from sessions if available
  const dayStatus = {};
  if (Array.isArray(sessions)) {
    for (const s of sessions) {
      const d = new Date(s.work_date ?? s.workDate ?? '');
      if (!Number.isNaN(d.getTime())) {
        dayStatus[d.getDate()] = s.status;
      }
    }
  }

  // Pad start (Mon-based: Mon=0)
  const startPad = firstDow === 0 ? 6 : firstDow - 1;
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const DOW = ['Du','Se','Ch','Pa','Ju','Sh','Ya'];

  function dotColor(day) {
    if (!day) return null;
    const dow = dayOfWeek(year, month, day);
    if (dow === 0 || dow === 6) return D.border; // weekend
    const st = dayStatus[day];
    if (st === 'sick')     return D.orange;
    if (st === 'vacation') return D.blue;
    if (st === 'done' || st === 'active') return D.green;
    if (st === 'absent') return D.red;
    return D.border;
  }

  return (
    <View style={cgStyles.card}>
      <SectionLabel icon={CalendarCheck} color={D.blue} label="Davomat taqvimi" />

      {/* Legend */}
      <View style={cgStyles.legend}>
        {[
          { color: D.green,  label: 'Keldi' },
          { color: D.red,    label: 'Kelmadi' },
          { color: D.orange, label: 'Kasal' },
          { color: D.blue,   label: "Ta'til" },
        ].map((l) => (
          <View key={l.label} style={cgStyles.legendItem}>
            <View style={[cgStyles.legendDot, { backgroundColor: l.color }]} />
            <Text style={cgStyles.legendTxt}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Day headers */}
      <View style={cgStyles.row}>
        {DOW.map((d) => (
          <Text key={d} style={cgStyles.dowTxt}>{d}</Text>
        ))}
      </View>

      {/* Days */}
      <View style={cgStyles.grid}>
        {cells.map((day, idx) => {
          const color = dotColor(day);
          const isToday = day === new Date().getDate() &&
            month === new Date().getMonth() + 1 &&
            year === new Date().getFullYear();
          return (
            <View key={idx} style={cgStyles.cell}>
              {day ? (
                <>
                  <View style={[
                    cgStyles.dayCircle,
                    isToday && cgStyles.todayCircle,
                  ]}>
                    <Text style={[cgStyles.dayNum, isToday && cgStyles.todayNum]}>{day}</Text>
                  </View>
                  <View style={[cgStyles.dot, { backgroundColor: color }]} />
                </>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Summary tally */}
      <View style={cgStyles.tally}>
        <View style={cgStyles.tallyItem}>
          <Text style={[cgStyles.tallyNum, { color: D.green }]}>{presentDays}</Text>
          <Text style={cgStyles.tallyLbl}>Keldi</Text>
        </View>
        <View style={cgStyles.tallyItem}>
          <Text style={[cgStyles.tallyNum, { color: D.red }]}>{absentDays}</Text>
          <Text style={cgStyles.tallyLbl}>Kelmadi</Text>
        </View>
        <View style={cgStyles.tallyItem}>
          <Text style={[cgStyles.tallyNum, { color: D.orange }]}>{sickDays}</Text>
          <Text style={cgStyles.tallyLbl}>Kasal</Text>
        </View>
        <View style={cgStyles.tallyItem}>
          <Text style={[cgStyles.tallyNum, { color: D.blue }]}>{vacationDays}</Text>
          <Text style={cgStyles.tallyLbl}>Ta'til</Text>
        </View>
      </View>
    </View>
  );
}
const cgStyles = StyleSheet.create({
  card:       { backgroundColor: D.cardBg, borderRadius: Radius.xl, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: D.border, ...Shadow.xs },
  legend:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 4 },
  legendTxt:  { fontSize: FontSize.xs, color: D.text3 },
  row:        { flexDirection: 'row', marginBottom: 4 },
  dowTxt:     { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: FontWeight.bold,
    color: D.text3, textTransform: 'uppercase' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle:  { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  todayCircle:{ backgroundColor: Colors.primary },
  dayNum:     { fontSize: FontSize.xs, color: D.text2, fontWeight: FontWeight.medium },
  todayNum:   { color: '#FFFFFF', fontWeight: FontWeight.bold },
  dot:        { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  tally:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: D.border, marginTop: 10, paddingTop: 10, gap: 4 },
  tallyItem:  { flex: 1, alignItems: 'center' },
  tallyNum:   { fontSize: FontSize.h3, fontWeight: FontWeight.heavy },
  tallyLbl:   { fontSize: FontSize.xs, color: D.text3, marginTop: 1 },
});

// ── Main screen ───────────────────────────────────────────
export default function MyReportScreen() {
  const now = new Date();
  const [selYear, setSelYear]   = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  const load = useCallback(async (year, month, opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      setError(null);
      setLoading(true);
    }
    try {
      const data = await reportAPI.fetchMonthlyReport(year, month);
      setReport(data);
      setError(null);
    } catch (e) {
      // Fallback to legacy endpoint for current month
      try {
        const fallback = await reportAPI.fetchMyReport();
        setReport(fallback);
        setError(null);
      } catch {
        if (!silent) {
          setError(e?.message || 'Yuklashda xatolik');
          setReport(null);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selYear, selMonth);
    }, [load, selYear, selMonth])
  );

  function onMonthChange(y, m) {
    setSelYear(y);
    setSelMonth(m);
    load(y, m);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(selYear, selMonth, { silent: true }); }
    finally { setRefreshing(false); }
  }, [load, selYear, selMonth]);

  // ── Error state ────────────────────────────────────────
  if (error && !loading) {
    return (
      <View style={scStyles.centered}>
        <AlertCircle size={36} color={Colors.danger} strokeWidth={1.5} />
        <Text style={scStyles.errTxt}>{error}</Text>
        <TouchableOpacity style={scStyles.retryBtn} onPress={() => load(selYear, selMonth)} activeOpacity={0.85}>
          <Text style={scStyles.retryTxt}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Extract data ───────────────────────────────────────
  const summary  = report?.summary ?? report;
  const sessions = report?.sessions ?? [];

  const year         = selYear;
  const month        = selMonth;
  const attendancePct = num(summary?.attendancePct ?? summary?.attendance_pct, 0);
  const totalHours    = num(summary?.totalHours     ?? summary?.total_hours,    0);
  const regularHours  = num(summary?.regularHours   ?? summary?.regular_hours,  0);
  const overtimeHours = num(summary?.overtimeHours  ?? summary?.overtime_hours, 0);
  const expectedHours = num(summary?.expectedHours  ?? summary?.expected_hours, 0);
  const breakHours    = num(summary?.breakHours     ?? summary?.break_hours,    0);
  const presentDays   = Math.round(num(summary?.presentDays   ?? summary?.present_days,   0));
  const absentDays    = Math.round(num(summary?.absentDays    ?? summary?.absent_days,    0));
  const sickDays      = Math.round(num(summary?.sickDays      ?? summary?.sick_days,      0));
  const vacationDays  = Math.round(num(summary?.vacationDays  ?? summary?.vacation_days,  0));
  const totalWorkDays = Math.round(num(summary?.workdaysInMonth ?? summary?.total_work_days, 0));
  const totalRewards  = num(report?.total_rewards, 0);
  const totalFines    = num(report?.total_fines,   0);
  const buildingStats = summary?.buildingStats ?? summary?.building_stats ?? {};
  const mostUsedBuilding = summary?.mostUsedBuilding ?? summary?.most_used_building ?? null;

  return (
    <ScrollView
      style={scStyles.scroll}
      contentContainerStyle={scStyles.pad}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.secondary]}
          tintColor={Colors.secondary}
        />
      }
    >
      {/* ── Page title */}
      <View style={scStyles.pageHead}>
        <Text style={scStyles.pageTitle}>Hisobotim</Text>
        <Text style={scStyles.pageSub}>Shaxsiy analitika va statistika</Text>
      </View>

      {/* ── Month selector */}
      <MonthSelector year={year} month={month} onChange={onMonthChange} />

      {/* ── Skeleton or content */}
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : !summary ? (
        <View style={scStyles.emptyWrap}>
          <CalendarCheck size={40} color={D.text3} strokeWidth={1.5} />
          <Text style={scStyles.emptyTitle}>Hisobot topilmadi</Text>
          <Text style={scStyles.emptySub}>
            {MONTHS_UZ[month - 1]} {year} uchun ma'lumot hali mavjud emas.
          </Text>
        </View>
      ) : (
        <>
          {/* Hero ring */}
          <PerformanceRing
            pct={attendancePct}
            totalHours={totalHours}
            expectedHours={expectedHours}
          />

          {/* Stat grid */}
          <StatGrid
            presentDays={presentDays}
            totalWorkDays={totalWorkDays}
            overtimeHours={overtimeHours}
            absentDays={absentDays}
            sickDays={sickDays}
            vacationDays={vacationDays}
          />

          {/* Time balance */}
          <TimeBalanceCard
            regularHours={regularHours}
            expectedHours={expectedHours}
            overtimeHours={overtimeHours}
            breakHours={breakHours}
          />

          {/* Location insights */}
          <LocationCard
            buildingStats={buildingStats}
            mostUsedBuilding={mostUsedBuilding}
          />

          {/* Finance */}
          <FinanceCard rewards={totalRewards} fines={totalFines} />

          {/* Calendar */}
          <CalendarGrid
            year={year}
            month={month}
            presentDays={presentDays}
            absentDays={absentDays}
            sickDays={sickDays}
            vacationDays={vacationDays}
            sessions={sessions}
          />
        </>
      )}

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const scStyles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: D.pageBg },
  pad:        { paddingHorizontal: 14, paddingTop: 10, paddingBottom: Spacing.xl },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg, backgroundColor: D.pageBg },
  errTxt:     { fontSize: FontSize.body, color: Colors.danger, textAlign: 'center',
    marginVertical: Spacing.md },
  retryBtn:   { backgroundColor: Colors.secondary, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: Radius.full },
  retryTxt:   { color: '#FFFFFF', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  pageHead:   { marginBottom: 16 },
  pageTitle:  { fontSize: FontSize.h2, fontWeight: FontWeight.heavy, color: D.text1, letterSpacing: -0.4 },
  pageSub:    { fontSize: FontSize.sm, color: D.text3, marginTop: 2 },
  emptyWrap:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, color: D.text2 },
  emptySub:   { fontSize: FontSize.sm, color: D.text3, textAlign: 'center', lineHeight: 20 },
});
