/**
 * Hisobotim — oylik davomat va vaqt (GET /api/reports/monthly)
 * Redesigned UI: month tabs, hero section, bar chart, time distribution
 */
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  CheckCircle,
  Clock,
  ChevronLeft,
  Share2,
  TrendingUp,
  TrendingDown,
  Building2,
} from 'lucide-react-native';
import { reportAPI } from '../../src/api/report.api';

// ── Colors ────────────────────────────────────────────────
const C = {
  primary:   '#1E2761',
  secondary: '#028090',
  success:   '#10B981',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  gray:      '#64748B',
  bg:        '#F8FAFC',
  white:     '#FFFFFF',
  slate800:  '#1E293B',
  slate100:  '#F1F5F9',
};

// ── Month names ───────────────────────────────────────────
const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

// ── Data helpers ──────────────────────────────────────────
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePayload(raw) {
  if (raw == null) return null;
  if (raw.summary || Array.isArray(raw.sessions)) {
    const summary = raw.summary || {};
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      summary: {
        presentDays:    Math.round(num(summary.presentDays    ?? summary.present_days, 0)),
        absentDays:     Math.round(num(summary.absentDays     ?? summary.absent_days, 0)),
        vacationDays:   Math.round(num(summary.vacationDays   ?? summary.vacation_days, 0)),
        sickDays:       Math.round(num(summary.sickDays       ?? summary.sick_days, 0)),
        attendancePct:  num(summary.attendancePct  ?? summary.attendance_pct, 0),
        totalHours:     num(summary.totalHours     ?? summary.total_hours, 0),
        overtimeHours:  num(summary.overtimeHours  ?? summary.overtime_hours, 0),
        expectedHours:  num(summary.expectedHours  ?? summary.expected_hours, 0),
        workdaysInMonth: Math.round(num(summary.workdaysInMonth ?? summary.total_work_days ?? summary.workdays_in_month, 0)),
        buildingStats:  summary.buildingStats ?? summary.building_stats ?? {},
        mostUsedBuilding: summary.mostUsedBuilding ?? summary.most_used_building ?? null,
      },
    };
  }
  const row = raw;
  let stats = {};
  try {
    stats = typeof row.building_stats === 'string'
      ? JSON.parse(row.building_stats || '{}')
      : (row.building_stats || {});
  } catch { stats = {}; }
  return {
    sessions: [],
    summary: {
      presentDays:     Math.round(num(row.present_days, 0)),
      absentDays:      Math.round(num(row.absent_days, 0)),
      vacationDays:    Math.round(num(row.vacation_days, 0)),
      sickDays:        Math.round(num(row.sick_days, 0)),
      attendancePct:   num(row.attendance_pct, 0),
      totalHours:      num(row.total_hours, 0),
      overtimeHours:   num(row.overtime_hours, 0),
      expectedHours:   num(row.expected_hours, 0),
      workdaysInMonth: Math.round(num(row.total_work_days, 0)),
      buildingStats:   stats,
      mostUsedBuilding: row.most_used_building ?? null,
    },
  };
}

function fmtH(h) {
  const x = num(h, 0);
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function errMessage(e) {
  if (e == null) return 'Hisobot yuklanmadi';
  if (typeof e === 'string') return e;
  if (typeof e.message === 'string' && e.message) return e.message;
  return 'Hisobot yuklanmadi';
}

const getStatusColor = (status) => {
  switch (status) {
    case 'done':     return C.success;
    case 'active':   return C.secondary;
    case 'absent':   return C.danger;
    case 'sick':     return C.warning;
    case 'vacation': return '#3B82F6';
    default:         return C.gray;
  }
};

// ── Bar Chart (pure View, no libs) ───────────────────────
function DailyBarChart({ sessions, monthName }) {
  const maxBarHeight = 80;
  const maxSec = 10 * 3600; // 10 hours cap

  const today = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;

  const bars = useMemo(() => {
    if (!sessions.length) return [];
    return sessions.map(s => {
      const sec = num(s.total_seconds, 0);
      const otSec = num(s.overtime_seconds, 0);
      const regSec = Math.max(0, sec - otSec);
      const dateStr = String(s.work_date ?? '').slice(0, 10);
      const day = dateStr ? new Date(`${dateStr}T12:00:00`).getDate() : null;
      const isToday = day === today;
      const h = Math.min(sec / maxSec, 1) * maxBarHeight;
      const regH = Math.min(regSec / maxSec, 1) * maxBarHeight;
      const otH = h - regH;
      return { day, isToday, h: Math.max(h, 2), regH: Math.max(regH, 1), otH, sec, status: s.status };
    });
  }, [sessions, today]);

  if (!bars.length) return null;

  const xLabels = [1, 7, 14, 21, 28];
  const barW = Math.max(6, Math.min(10, Math.floor(300 / bars.length)));

  return (
    <View style={ch.wrap}>
      <View style={ch.titleRow}>
        <Text style={ch.title}>Kunlik ish soatlari</Text>
        <View style={ch.legend}>
          <View style={[ch.legendDot, { backgroundColor: C.secondary }]} />
          <Text style={ch.legendTxt}>Ish</Text>
          <View style={[ch.legendDot, { backgroundColor: C.warning }]} />
          <Text style={ch.legendTxt}>Qo'shimcha</Text>
        </View>
      </View>
      <Text style={ch.subtitle}>{monthName} — har bir ustun = 1 kun</Text>

      {/* Chart */}
      <View style={ch.chartArea}>
        {/* Y axis hints */}
        <View style={ch.yAxis}>
          {['8s', '4s', '0s'].map(l => (
            <Text key={l} style={ch.yLabel}>{l}</Text>
          ))}
        </View>
        {/* Bars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={ch.barsWrap}>
            <View style={[ch.barsRow, { height: maxBarHeight }]}>
              {bars.map((b, i) => (
                <View key={i} style={[ch.barCol, { width: barW + 4 }]}>
                  {b.isToday && b.sec > 0 ? (
                    <Text style={ch.barValueLabel}>{fmtH(b.sec / 3600)}s</Text>
                  ) : null}
                  <View style={[ch.bar, { height: b.h, width: barW, backgroundColor: b.status === 'absent' ? '#FEE2E2' : C.secondary }]}>
                    {b.otH > 1 ? (
                      <View style={[ch.barOt, { height: b.otH, width: barW }]} />
                    ) : null}
                  </View>
                  {b.isToday ? <View style={ch.todayDot} /> : null}
                </View>
              ))}
            </View>
            {/* X axis */}
            <View style={[ch.xAxis, { paddingLeft: 2 }]}>
              {bars.map((b, i) => (
                <View key={i} style={{ width: barW + 4, alignItems: 'center' }}>
                  {xLabels.includes(b.day) || b.isToday ? (
                    <Text style={[ch.xLabel, b.isToday && { color: C.secondary, fontWeight: '700' }]}>
                      {b.day}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ── Time Distribution (donut-like with Views) ─────────────
function TimeDistribution({ totalHours, overtimeHours }) {
  const regularHours = Math.max(0, totalHours - overtimeHours);
  const total = totalHours || 1;
  const regPct = Math.round((regularHours / total) * 100);
  const otPct = Math.round((overtimeHours / total) * 100);
  const regWidth = `${Math.max(regPct, 2)}%`;
  const otWidth = `${Math.max(otPct, 2)}%`;

  return (
    <View style={td.wrap}>
      <Text style={td.title}>Vaqt taqsimoti</Text>
      {/* Simple stacked bar acting as "distribution" */}
      <View style={td.barWrap}>
        <View style={[td.barSeg, { flex: regPct || 1, backgroundColor: C.secondary }]} />
        {overtimeHours > 0 ? (
          <View style={[td.barSeg, { flex: otPct || 0, backgroundColor: C.warning }]} />
        ) : null}
      </View>
      {/* Legend */}
      <View style={td.legend}>
        <View style={td.legendRow}>
          <View style={[td.legendSquare, { backgroundColor: C.secondary }]} />
          <Text style={td.legendName}>Ish</Text>
          <Text style={td.legendHours}>{fmtH(regularHours)} soat</Text>
          <Text style={td.legendPct}>{regPct}%</Text>
        </View>
        {overtimeHours > 0 ? (
          <View style={td.legendRow}>
            <View style={[td.legendSquare, { backgroundColor: C.warning }]} />
            <Text style={td.legendName}>Qo'shimcha</Text>
            <Text style={td.legendHours}>{fmtH(overtimeHours)} soat</Text>
            <Text style={td.legendPct}>{otPct}%</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────
export default function MyReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const showBack = route.name === 'Report';
  const monthScrollRef = useRef(null);

  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data,  setData]  = useState(null);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchReport = useCallback(async (silent) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await reportAPI.fetchMonthlyReport(year, month);
      if (!mounted.current) return;
      setData(normalizePayload(res));
    } catch (e) {
      if (!mounted.current) return;
      setError(errMessage(e));
      setData(null);
    } finally {
      if (!mounted.current) return;
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => { fetchReport(false); }, [fetchReport]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchReport(true); }, [fetchReport]);

  const selectMonth = (m) => {
    const isCurrentMonth = year === now.getFullYear() && m === now.getMonth() + 1;
    const isFuture = year === now.getFullYear() && m > now.getMonth() + 1;
    if (isFuture) return;
    setMonth(m);
  };

  const summary  = data?.summary || {};
  const sessions = data?.sessions || [];
  const attendancePct   = num(summary.attendancePct, 0);
  const attendanceColor = attendancePct >= 80 ? C.success : attendancePct >= 60 ? C.warning : C.danger;
  const totalHours    = num(summary.totalHours, 0);
  const overtimeHours = num(summary.overtimeHours, 0);
  const expectedHours = num(summary.expectedHours, 0) || 200;

  const buildingEntries = Object.entries(summary.buildingStats || {}).sort((a, b) => b[1] - a[1]);
  const maxBuildingHours = buildingEntries.length > 0
    ? Math.max(...buildingEntries.map(([, h]) => num(h, 0)))
    : 0;

  const progressPct = expectedHours > 0 ? Math.min((totalHours / expectedHours) * 100, 100) : 0;

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={C.secondary} />
        <Text style={styles.loadingTxt}>Yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ═══ HEADER (navy, hero section) ═══════════════════ */}
      <View style={[styles.headerBlock, { paddingTop: insets.top + 12 }]}>
        {/* Title row */}
        <View style={styles.titleRow}>
          {showBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
              <ChevronLeft size={24} color={C.white} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <Text style={styles.headerTitle}>Mening hisobotim</Text>
          <View style={styles.headerIconBtn}>
            <Share2 size={20} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          </View>
        </View>

        {/* Month tabs horizontal scroll */}
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthTabsContent}
          style={styles.monthTabsScroll}
        >
          {MONTH_SHORT.map((short, i) => {
            const m = i + 1;
            const isActive = m === month;
            const isFuture = year === now.getFullYear() && m > now.getMonth() + 1;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => selectMonth(m)}
                disabled={isFuture}
                style={[styles.monthTab, isActive && styles.monthTabActive, isFuture && { opacity: 0.35 }]}
              >
                <Text style={[styles.monthTabTxt, isActive && styles.monthTabTxtActive]}>{short}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hero section */}
        {data?.summary ? (
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>{MONTH_NAMES[month - 1].toUpperCase()} — JAMI ISHLANGAN</Text>
            <Text style={styles.heroHours}>{fmtH(totalHours)} soat</Text>

            {/* Progress bar */}
            <View style={styles.heroProgress}>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} />
              </View>
              <View style={styles.heroProgressLabels}>
                <Text style={styles.heroProgressLbl}>0s</Text>
                <Text style={styles.heroProgressLbl}>Norma: {Math.round(expectedHours)} soat</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* ═══ SCROLL BODY ══════════════════════════════════ */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.secondary]} tintColor={C.secondary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 32 }]}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTxt}>{error}</Text>
            <TouchableOpacity onPress={() => { setLoading(true); fetchReport(false); }} hitSlop={8}>
              <Text style={styles.retryLink}>Qayta</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!data?.summary && !error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Ma'lumot yo'q</Text>
            <Text style={styles.emptySub}>{MONTH_NAMES[month - 1]} {year} uchun hisobot hali mavjud emas.</Text>
          </View>
        ) : data?.summary ? (
          <>
            {/* ── 2 stat cards ── */}
            <View style={styles.row2}>
              {/* DAVOMAT */}
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
                    <CheckCircle size={20} color={C.success} strokeWidth={2} />
                  </View>
                  <Text style={styles.statTag}>DAVOMAT</Text>
                </View>
                <Text style={[styles.statBig, { color: attendanceColor }]}>
                  {attendancePct.toFixed(0)}%
                </Text>
                <Text style={styles.statHint}>
                  {summary.presentDays ?? 0} / {summary.workdaysInMonth ?? 0} ish kuni
                </Text>
              </View>

              {/* VAQTILIK */}
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                    <Clock size={20} color={C.warning} strokeWidth={2} />
                  </View>
                  <Text style={styles.statTag}>VAQTILIK</Text>
                </View>
                <Text style={[styles.statBig, { color: C.warning }]}>
                  {fmtH(totalHours)} s
                </Text>
                <Text style={styles.statHint}>
                  {overtimeHours > 0 ? `+${fmtH(overtimeHours)} soat qo'shimcha` : 'Qo`shimcha vaqt yo`q'}
                </Text>
              </View>
            </View>

            {/* ── Daily Bar Chart ── */}
            {sessions.length > 0 ? (
              <View style={styles.panel}>
                <DailyBarChart sessions={sessions} monthName={MONTH_NAMES[month - 1]} />
              </View>
            ) : null}

            {/* ── Time Distribution ── */}
            {totalHours > 0 ? (
              <View style={styles.panel}>
                <TimeDistribution totalHours={totalHours} overtimeHours={overtimeHours} />
              </View>
            ) : null}

            {/* ── Attendance progress ── */}
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle}>Davomat ko'rsatkichi</Text>
                <Text style={[styles.panelPct, { color: attendanceColor }]}>
                  {attendancePct.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(attendancePct, 100)}%`, backgroundColor: attendanceColor }]} />
              </View>
              <View style={styles.progressFoot}>
                <Text style={styles.muted12}>{summary.presentDays ?? 0} kun keldi</Text>
                <Text style={styles.muted12}>{summary.workdaysInMonth ?? 0} ish kuni</Text>
              </View>
            </View>

            {/* ── Building stats ── */}
            {buildingEntries.length > 0 ? (
              <View style={[styles.panel, { marginBottom: 0 }]}>
                <View style={styles.panelTitleRow}>
                  <Building2 size={16} color={C.secondary} strokeWidth={2} />
                  <Text style={styles.panelTitle}>Bino statistikasi</Text>
                </View>
                {buildingEntries.map(([name, hours], idx) => {
                  const palette = [C.secondary, C.primary, '#7C3AED'];
                  const color = palette[idx % palette.length];
                  const h = num(hours, 0);
                  const pct = maxBuildingHours > 0 ? (h / maxBuildingHours) * 100 : 0;
                  return (
                    <View key={name} style={styles.buildingRow}>
                      <View style={styles.buildingHead}>
                        <Text style={styles.buildingName} numberOfLines={1}>
                          {name.replace(/^Bino\s+/i, 'B. ')}
                        </Text>
                        <Text style={[styles.buildingHrs, { color }]}>{h.toFixed(1)} soat</Text>
                      </View>
                      <View style={styles.buildingTrack}>
                        <View style={[styles.buildingFill, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })}
                {summary.mostUsedBuilding ? (
                  <View style={styles.mostUsed}>
                    <TrendingUp size={14} color={C.secondary} />
                    <Text style={styles.mostUsedTxt}>Ko'p ishlagan: {summary.mostUsedBuilding}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Chart styles ──────────────────────────────────────────
const ch = StyleSheet.create({
  wrap: {},
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  subtitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 11, color: '#64748B' },
  chartArea: { flexDirection: 'row', gap: 6 },
  yAxis: { justifyContent: 'space-between', paddingBottom: 20, paddingTop: 4 },
  yLabel: { fontSize: 10, color: '#94A3B8', textAlign: 'right' },
  barsWrap: {},
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 0, paddingTop: 16 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  bar: { borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  barOt: { backgroundColor: '#F59E0B', borderRadius: 3, position: 'absolute', bottom: 0 },
  barValueLabel: { fontSize: 9, color: '#028090', fontWeight: '700', position: 'absolute', top: 0, textAlign: 'center' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#028090', marginTop: 2 },
  xAxis: { flexDirection: 'row', marginTop: 4 },
  xLabel: { fontSize: 9, color: '#94A3B8', textAlign: 'center' },
});

// ── Time distribution styles ──────────────────────────────
const td = StyleSheet.create({
  wrap: {},
  title: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  barWrap: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 14 },
  barSeg: { borderRadius: 0 },
  legend: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendSquare: { width: 12, height: 12, borderRadius: 3 },
  legendName: { flex: 1, fontSize: 13, color: '#1E293B' },
  legendHours: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  legendPct: { fontSize: 12, color: '#64748B', width: 36, textAlign: 'right' },
});

// ── Main styles ───────────────────────────────────────────
const shadow = Platform.OS === 'ios'
  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }
  : { elevation: 3 };

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  loadingWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingTxt: { marginTop: 12, color: C.gray, fontSize: 14 },

  // Header block (navy bg)
  headerBlock: { backgroundColor: C.primary },
  titleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  headerSpacer:  { width: 40 },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: C.white },

  // Month tabs
  monthTabsScroll:   { paddingHorizontal: 16, marginBottom: 4 },
  monthTabsContent:  { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  monthTab:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  monthTabActive:    { backgroundColor: C.white, borderColor: C.white },
  monthTabTxt:       { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  monthTabTxtActive: { color: C.primary, fontWeight: '700' },

  // Hero
  heroSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
  heroLabel:   { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 4 },
  heroHours:   { fontSize: 52, fontWeight: '800', color: C.white, letterSpacing: -1, marginBottom: 12 },
  heroProgress: {},
  heroProgressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  heroProgressFill:  { height: 8, backgroundColor: C.secondary, borderRadius: 4 },
  heroProgressLabels:{ flexDirection: 'row', justifyContent: 'space-between' },
  heroProgressLbl:   { fontSize: 11, color: 'rgba(255,255,255,0.55)' },

  // Scroll body
  scrollPad: { padding: 16 },

  // Error
  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  errorTxt:    { color: C.danger, fontSize: 14, flex: 1 },
  retryLink:   { color: C.secondary, fontWeight: '600', fontSize: 14 },

  // Empty
  emptyCard:  { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, backgroundColor: C.white, borderRadius: 16, ...shadow },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.slate800, marginTop: 12 },
  emptySub:   { fontSize: 14, color: C.gray, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // 2-column row
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  // Stat card
  statCard:    { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 16, ...shadow },
  statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statIconBg:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statTag:     { fontSize: 10, color: C.gray, fontWeight: '700', letterSpacing: 0.5 },
  statBig:     { fontSize: 30, fontWeight: '800', color: C.slate800, marginBottom: 2 },
  statHint:    { fontSize: 12, color: C.gray },

  // Panel
  panel:        { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, ...shadow },
  panelHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelTitle:   { fontSize: 15, fontWeight: '700', color: C.slate800 },
  panelPct:     { fontSize: 15, fontWeight: '700' },

  progressTrack:  { height: 10, backgroundColor: C.slate100, borderRadius: 5, overflow: 'hidden' },
  progressFill:   { height: 10, borderRadius: 5 },
  progressFoot:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  muted12:        { fontSize: 12, color: C.gray },

  // Building stats
  buildingRow:  { marginBottom: 12 },
  buildingHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  buildingName: { fontSize: 13, color: C.slate800, fontWeight: '500', flex: 1, marginRight: 8 },
  buildingHrs:  { fontSize: 13, fontWeight: '600' },
  buildingTrack:{ height: 6, backgroundColor: C.slate100, borderRadius: 3, overflow: 'hidden' },
  buildingFill: { height: 6, borderRadius: 3 },
  mostUsed:     { marginTop: 8, backgroundColor: '#F0FDFA', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mostUsedTxt:  { fontSize: 12, color: C.secondary, fontWeight: '600', flex: 1 },
});
