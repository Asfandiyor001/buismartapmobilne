/**
 * Hisobotim — oylik davomat va vaqt (GET /api/reports/monthly)
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Award,
  AlertCircle,
  TrendingUp,
} from 'lucide-react-native';
import { reportAPI } from '../../src/api/report.api';

const C = {
  primary: '#1E2761',
  secondary: '#028090',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#64748B',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  slate800: '#1E293B',
  slate100: '#F1F5F9',
};

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

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
        presentDays: Math.round(num(summary.presentDays ?? summary.present_days, 0)),
        absentDays: Math.round(num(summary.absentDays ?? summary.absent_days, 0)),
        vacationDays: Math.round(num(summary.vacationDays ?? summary.vacation_days, 0)),
        sickDays: Math.round(num(summary.sickDays ?? summary.sick_days, 0)),
        attendancePct: num(summary.attendancePct ?? summary.attendance_pct, 0),
        totalHours: num(summary.totalHours ?? summary.total_hours, 0),
        overtimeHours: num(summary.overtimeHours ?? summary.overtime_hours, 0),
        expectedHours: num(summary.expectedHours ?? summary.expected_hours, 0),
        workdaysInMonth: Math.round(
          num(summary.workdaysInMonth ?? summary.total_work_days ?? summary.workdays_in_month, 0),
        ),
        buildingStats: summary.buildingStats ?? summary.building_stats ?? {},
        mostUsedBuilding: summary.mostUsedBuilding ?? summary.most_used_building ?? null,
      },
    };
  }

  const row = raw;
  let stats = {};
  if (typeof row.building_stats === 'string') {
    try {
      stats = JSON.parse(row.building_stats || '{}');
    } catch {
      stats = {};
    }
  } else if (row.building_stats && typeof row.building_stats === 'object') {
    stats = row.building_stats;
  }

  return {
    sessions: [],
    summary: {
      presentDays: Math.round(num(row.present_days, 0)),
      absentDays: Math.round(num(row.absent_days, 0)),
      vacationDays: Math.round(num(row.vacation_days, 0)),
      sickDays: Math.round(num(row.sick_days, 0)),
      attendancePct: num(row.attendance_pct, 0),
      totalHours: num(row.total_hours, 0),
      overtimeHours: num(row.overtime_hours, 0),
      expectedHours: num(row.expected_hours, 0),
      workdaysInMonth: Math.round(num(row.total_work_days, 0)),
      buildingStats: stats,
      mostUsedBuilding: row.most_used_building ?? null,
    },
  };
}

function formatTime(timeStr) {
  if (!timeStr) return '--:--';
  const s = String(timeStr);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function formatDate(dateStr, monthNames) {
  if (!dateStr) return '';
  const iso = String(dateStr).slice(0, 10);
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const days = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  const mIdx = date.getMonth();
  const label = monthNames[mIdx] ? monthNames[mIdx].slice(0, 3) : '';
  return `${days[date.getDay()]}, ${date.getDate()}-${label}`;
}

function fmtHoursShort(h) {
  const x = num(h, 0);
  const rounded = Math.round(x * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function errMessage(e) {
  if (e == null) return 'Hisobot yuklanmadi';
  if (typeof e === 'string') return e;
  if (typeof e.message === 'string' && e.message) return e.message;
  return 'Hisobot yuklanmadi';
}

export default function MyReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const showBack = route.name === 'Report';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchReport = useCallback(async (silent) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const res = await reportAPI.fetchMonthlyReport(year, month);
      if (!mounted.current) return;
      setData(normalizePayload(res));
    } catch (e) {
      if (!mounted.current) return;
      setError(errMessage(e));
      setData(null);
      console.warn('Report error:', e);
    } finally {
      if (!mounted.current) return;
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchReport(false);
  }, [fetchReport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReport(true);
  }, [fetchReport]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const summary = data?.summary || {};
  const sessions = data?.sessions || [];
  const attendancePct = num(summary.attendancePct, 0);
  const attendanceColor =
    attendancePct >= 80 ? C.success : attendancePct >= 60 ? C.warning : C.danger;

  const buildingEntries = Object.entries(summary.buildingStats || {}).sort((a, b) => b[1] - a[1]);
  const maxBuildingHours =
    buildingEntries.length > 0 ? Math.max(...buildingEntries.map(([, h]) => num(h, 0))) : 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'done':
        return C.success;
      case 'active':
        return C.secondary;
      case 'absent':
        return C.danger;
      case 'sick':
        return C.warning;
      case 'vacation':
        return '#3B82F6';
      default:
        return C.gray;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'done':
        return 'Keldi';
      case 'active':
        return 'Aktiv';
      case 'absent':
        return 'Kelmadi';
      case 'sick':
        return 'Kasal';
      case 'vacation':
        return 'Ta\'til';
      default:
        return status ? String(status) : '—';
    }
  };

  const atCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const nextDisabled = atCurrentMonth;

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

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={styles.headerIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Orqaga"
            >
              <ChevronLeft size={24} color={C.white} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <Text style={styles.headerTitle}>Hisobotim</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn} accessibilityRole="button">
            <ChevronLeft size={18} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>

          <TouchableOpacity
            onPress={nextMonth}
            disabled={nextDisabled}
            style={[
              styles.monthNavBtn,
              nextDisabled && { backgroundColor: 'rgba(255,255,255,0.06)' },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: nextDisabled }}
          >
            <ChevronRight
              size={18}
              color={nextDisabled ? 'rgba(255,255,255,0.3)' : C.white}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.secondary]}
            tintColor={C.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 32 }]}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color={C.danger} />
            <Text style={styles.errorTxt} selectable>
              {error}
            </Text>
            <TouchableOpacity onPress={() => { setLoading(true); fetchReport(false); }} hitSlop={8}>
              <Text style={styles.retryLink}>Qayta</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!data?.summary && !error ? (
          <View style={styles.emptyCard}>
            <Calendar size={40} color={C.gray} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Ma&apos;lumot yo&apos;q</Text>
            <Text style={styles.emptySub}>
              {MONTH_NAMES[month - 1]} {year} uchun hisobot hali mavjud emas.
            </Text>
          </View>
        ) : data?.summary ? (
          <>
            <View style={styles.row2}>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
                    <CheckCircle size={18} color={C.success} strokeWidth={2} />
                  </View>
                  <Text style={styles.statTag}>Keldi</Text>
                </View>
                <Text style={[styles.statVal, { color: C.success }]}>{summary.presentDays || 0}</Text>
                <Text style={styles.statHint}>
                  {summary.workdaysInMonth || 0} ish kunidan
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBg, { backgroundColor: '#FEE2E2' }]}>
                    <XCircle size={18} color={C.danger} strokeWidth={2} />
                  </View>
                  <Text style={styles.statTag}>Kelmadi</Text>
                </View>
                <Text style={[styles.statVal, { color: C.danger }]}>{summary.absentDays || 0}</Text>
                <Text style={styles.statHint}>
                  {summary.vacationDays || 0} ta&apos;til, {summary.sickDays || 0} kasal
                </Text>
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBg, { backgroundColor: '#E0F2FE' }]}>
                    <Clock size={18} color={C.secondary} strokeWidth={2} />
                  </View>
                  <Text style={styles.statTag}>Soat</Text>
                </View>
                <Text style={[styles.statVal, { color: C.secondary, fontSize: 26 }]}>
                  {fmtHoursShort(summary.totalHours)} soat
                </Text>
                <Text style={styles.statHint}>
                  +{fmtHoursShort(summary.overtimeHours)} soat qo&apos;shimcha
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                    <Award size={18} color={C.warning} strokeWidth={2} />
                  </View>
                  <Text style={styles.statTag}>Davomat</Text>
                </View>
                <Text style={[styles.statVal, { color: attendanceColor }]}>
                  {attendancePct.toFixed(0)}%
                </Text>
                <Text style={styles.statHint}>
                  {fmtHoursShort(summary.expectedHours)} soat kutilgan
                </Text>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle}>Davomat ko&apos;rsatkichi</Text>
                <Text style={[styles.panelPct, { color: attendanceColor }]}>
                  {attendancePct.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(attendancePct, 100)}%`,
                      backgroundColor: attendanceColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressFoot}>
                <Text style={styles.muted12}>{summary.presentDays || 0} kun keldi</Text>
                <Text style={styles.muted12}>{summary.workdaysInMonth || 0} ish kuni</Text>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelTitleRow}>
                <Calendar size={18} color={C.secondary} strokeWidth={2} />
                <Text style={styles.panelTitle}>Kunlik ma&apos;lumotlar</Text>
              </View>

              {sessions.length === 0 ? (
                <View style={styles.sessionsEmpty}>
                  <Text style={styles.muted14}>Bu oyda sessiyalar topilmadi</Text>
                </View>
              ) : (
                sessions.map((session, idx) => {
                  const status = session.status;
                  const statusColor = getStatusColor(status);
                  const totalSec = num(session.total_seconds, 0);
                  const totalHours = (totalSec / 3600).toFixed(1);
                  const otSec = num(session.overtime_seconds, 0);
                  const overtimeH = (otSec / 3600).toFixed(1);
                  const hasOvertime = otSec > 0;
                  const workDate =
                    session.work_date != null
                      ? String(session.work_date).slice(0, 10)
                      : '';

                  return (
                    <View
                      key={`${workDate}-${idx}`}
                      style={[
                        styles.sessionRow,
                        idx < sessions.length - 1 && styles.sessionRowBorder,
                      ]}
                    >
                      <View style={styles.sessionMain}>
                        <View style={styles.sessionTop}>
                          <View style={[styles.dot, { backgroundColor: statusColor }]} />
                          <Text style={styles.sessionDate}>
                            {formatDate(workDate, MONTH_NAMES)}
                          </Text>
                          <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
                            <Text style={[styles.badgeTxt, { color: statusColor }]}>
                              {getStatusLabel(status)}
                            </Text>
                          </View>
                          {hasOvertime ? (
                            <View style={styles.otBadge}>
                              <Text style={styles.otBadgeTxt}>+{overtimeH} soat</Text>
                            </View>
                          ) : null}
                        </View>

                        {status !== 'absent' && status !== 'vacation' && status !== 'sick' ? (
                          <View style={styles.sessionMeta}>
                            <Clock size={12} color={C.gray} />
                            <Text style={styles.metaTxt}>
                              {formatTime(session.first_entry_time)} →{' '}
                              {formatTime(session.last_exit_time)}
                            </Text>
                            {num(session.buildings_visited, 0) > 0 ? (
                              <>
                                <Building2 size={12} color={C.gray} style={{ marginLeft: 8 }} />
                                <Text style={styles.metaTxt}>
                                  {session.buildings_visited} bino
                                </Text>
                              </>
                            ) : null}
                          </View>
                        ) : null}
                      </View>

                      {status !== 'absent' && status !== 'vacation' && status !== 'sick' ? (
                        <View style={styles.sessionHours}>
                          <Text style={[styles.hoursVal, { color: statusColor }]}>
                            {totalHours} soat
                          </Text>
                          <Text style={styles.hoursLbl}>ishlangan</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>

            {buildingEntries.length > 0 ? (
              <View style={[styles.panel, { marginBottom: 0 }]}>
                <View style={styles.panelTitleRow}>
                  <Building2 size={18} color={C.secondary} strokeWidth={2} />
                  <Text style={styles.panelTitle}>Bino statistikasi</Text>
                </View>

                {buildingEntries.map(([name, hours], idx) => {
                  const palette = [C.secondary, C.primary, '#7C3AED'];
                  const color = palette[idx % palette.length];
                  const h = num(hours, 0);
                  const pct = maxBuildingHours > 0 ? (h / maxBuildingHours) * 100 : 0;
                  const shortName = name.replace(/^Bino\s+/i, 'B. ');

                  return (
                    <View key={name} style={styles.buildingRow}>
                      <View style={styles.buildingHead}>
                        <Text style={styles.buildingName} numberOfLines={1}>
                          {shortName}
                        </Text>
                        <Text style={[styles.buildingHrs, { color }]}>{h.toFixed(1)} soat</Text>
                      </View>
                      <View style={styles.buildingTrack}>
                        <View
                          style={[
                            styles.buildingFill,
                            { width: `${pct}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}

                {summary.mostUsedBuilding ? (
                  <View style={styles.mostUsed}>
                    <TrendingUp size={14} color={C.secondary} />
                    <Text style={styles.mostUsedTxt}>
                      Ko&apos;p ishlagan: {summary.mostUsedBuilding}
                    </Text>
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

const shadow =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }
    : { elevation: 3 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingTxt: { marginTop: 12, color: C.gray, fontSize: 14 },
  header: {
    backgroundColor: C.primary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...shadow,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.white },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: C.white,
    minWidth: 160,
    textAlign: 'center',
  },
  scrollPad: { padding: 16 },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  errorTxt: { color: C.danger, fontSize: 14, flex: 1 },
  retryLink: { color: C.secondary, fontWeight: '600', fontSize: 14 },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    ...shadow,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTag: { fontSize: 11, color: C.gray, fontWeight: '500' },
  statVal: { fontSize: 32, fontWeight: '800', color: C.slate800 },
  statHint: { fontSize: 12, color: C.gray, marginTop: 2 },
  panel: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...shadow,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  panelTitle: { fontSize: 15, fontWeight: '700', color: C.slate800 },
  panelPct: { fontSize: 15, fontWeight: '700' },
  progressTrack: {
    height: 10,
    backgroundColor: C.slate100,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  progressFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  muted12: { fontSize: 12, color: C.gray },
  muted14: { fontSize: 14, color: C.gray, textAlign: 'center' },
  sessionsEmpty: { paddingVertical: 24, alignItems: 'center' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sessionRowBorder: { borderBottomWidth: 1, borderBottomColor: C.slate100 },
  sessionMain: { flex: 1, paddingRight: 8 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sessionDate: { fontSize: 14, fontWeight: '600', color: C.slate800 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  otBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  otBadgeTxt: { fontSize: 10, color: C.warning, fontWeight: '600' },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 16, flexWrap: 'wrap' },
  metaTxt: { fontSize: 12, color: C.gray },
  sessionHours: { alignItems: 'flex-end' },
  hoursVal: { fontSize: 18, fontWeight: '800' },
  hoursLbl: { fontSize: 11, color: '#94A3B8' },
  buildingRow: { marginBottom: 12 },
  buildingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  buildingName: { fontSize: 13, color: C.slate800, fontWeight: '500', flex: 1, marginRight: 8 },
  buildingHrs: { fontSize: 13, fontWeight: '600' },
  buildingTrack: { height: 6, backgroundColor: C.slate100, borderRadius: 3, overflow: 'hidden' },
  buildingFill: { height: 6, borderRadius: 3 },
  mostUsed: {
    marginTop: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mostUsedTxt: { fontSize: 12, color: C.secondary, fontWeight: '600', flex: 1 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: C.white,
    borderRadius: 16,
    ...shadow,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.slate800,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: C.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
