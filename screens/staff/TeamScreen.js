// ═══════════════════════════════════════════════════════════
// Jamoa holati — Executive Dashboard (redesigned)
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Animated,
  Linking,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Phone,
  Building2,
  MapPinOff,
  Clock,
  AlertTriangle,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import StaffLogModal from '../../components/StaffLogModal';
import { useTeamStore } from '../../src/store/teamStore';

// ── Design tokens ─────────────────────────────────────────
const D = {
  green:       '#10B981',
  greenTint:   '#ECFDF5',
  greenPulse:  '#34D399',
  orange:      '#F59E0B',
  orangeTint:  '#FFFBEB',
  red:         '#EF4444',
  redTint:     '#FEF2F2',
  gray:        '#94A3B8',
  grayTint:    '#F8FAFC',
  blue:        '#3B82F6',
  blueTint:    '#EFF6FF',
  indigo:      '#6366F1',
  indigoTint:  '#EEF2FF',
  purple:      '#8B5CF6',
  purpleTint:  '#F5F3FF',
  cardBg:      '#FFFFFF',
  pageBg:      '#F1F5F9',
  border:      '#E2E8F0',
  text1:       '#0F172A',
  text2:       '#475569',
  text3:       '#94A3B8',
};

const BUILDING_COLORS = {
  1: { bg: D.blueTint,   text: D.blue,   label: 'Bino 1' },
  2: { bg: D.indigoTint, text: D.indigo, label: 'Bino 2' },
  3: { bg: D.purpleTint, text: D.purple, label: 'Bino 3' },
};
function buildingTag(id) {
  return BUILDING_COLORS[id] ?? { bg: '#F1F5F9', text: '#64748B', label: `Bino ${id ?? '?'}` };
}

// ── Helpers ───────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function formatHHMM(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) return t.slice(0, 5);
  }
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return null;
}

function fmtSec(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return '—';
  const s = Math.max(0, Math.floor(Number(sec)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}s ${m}d`;
  return `${m} daq`;
}

function fmtMin(min) {
  const m = Math.max(0, Math.floor(Number(min) || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return `${h}s ${rem}d`;
  return `${m} daq`;
}

function sinceMs(dateVal) {
  if (!dateVal) return 0;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Date.now() - d.getTime());
}

function fmtSince(dateVal) {
  const ms = sinceMs(dateVal);
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} soat ${m} daq`;
  return `${m} daqiqa`;
}

function getMemberStatus(row) {
  const ws = row.work_status;
  const outside = row.outside_since;
  const reason = (row.checkout_reason ?? row.checkoutReason ?? '').trim();

  if (ws === 'active' && !outside) {
    const entry =
      formatHHMM(row.active_log_entry_time ?? row.activeLogEntryTime) ||
      formatHHMM(row.first_entry_time);
    return {
      key: 'active',
      label: entry ? `Ishda  ·  ${entry} dan` : 'Ishda',
      color: D.green,
      tint: D.greenTint,
      pulse: true,
    };
  }
  if (ws === 'active' && outside) {
    return {
      key: 'away',
      label: `Tashqarida  ·  ${fmtSince(outside)}`,
      color: D.orange,
      tint: D.orangeTint,
      pulse: false,
    };
  }
  if (reason === 'gps_lost') {
    const t = formatHHMM(row.last_exit_time);
    return {
      key: 'gps_lost',
      label: `GPS uzildi${t ? `  ·  ${t}` : ''}`,
      color: D.red,
      tint: D.redTint,
      pulse: false,
    };
  }
  if (reason === 'system_timeout') {
    const t = formatHHMM(row.last_exit_time);
    return {
      key: 'timeout',
      label: `Avto-chiqish${t ? `  ·  ${t}` : ''}`,
      color: D.red,
      tint: D.redTint,
      pulse: false,
    };
  }
  const t = formatHHMM(row.last_exit_time);
  return {
    key: 'offline',
    label: t ? `Ish tugadi  ·  ${t}` : 'Offline',
    color: D.gray,
    tint: D.grayTint,
    pulse: false,
  };
}

// ── Pulsing dot ───────────────────────────────────────────
function PulseDot({ color, active }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.9, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale, opacity]);

  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 14, height: 14,
            borderRadius: 7,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          }}
        />
      )}
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

// ── Productivity progress bar ─────────────────────────────
const WORKDAY_MINUTES = 8 * 60; // 480 min reference

function ProductivityBar({ workedMin, gapMin }) {
  const workedRatio = Math.min(1, (workedMin || 0) / WORKDAY_MINUTES);
  const gapRatio    = Math.min(1 - workedRatio, (gapMin || 0) / WORKDAY_MINUTES);
  const pct = Math.round(workedRatio * 100);

  return (
    <View style={pbStyles.wrap}>
      <View style={pbStyles.track}>
        {workedRatio > 0 && (
          <View style={[pbStyles.fill, { width: `${workedRatio * 100}%`, backgroundColor: D.green }]} />
        )}
        {gapRatio > 0 && (
          <View
            style={[
              pbStyles.fill,
              {
                width: `${gapRatio * 100}%`,
                marginLeft: workedRatio > 0 ? 1 : 0,
                backgroundColor: '#FCA5A5',
              },
            ]}
          />
        )}
      </View>
      <Text style={pbStyles.pct}>{pct}%</Text>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  track: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row', overflow: 'hidden',
  },
  fill:  { height: '100%', borderRadius: 3 },
  pct:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: D.text2, minWidth: 28, textAlign: 'right' },
});

// ── Filter tab bar ────────────────────────────────────────
const FILTERS = [
  { key: 'all',   label: 'Hamma' },
  { key: 'in',    label: 'Binoda' },
  { key: 'out',   label: 'Tashqarida' },
  { key: 'late',  label: 'Kechikkanlar' },
];

function FilterBar({ active, onChange }) {
  return (
    <View style={fbStyles.row}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[fbStyles.tab, active === f.key && fbStyles.tabActive]}
          onPress={() => onChange(f.key)}
          activeOpacity={0.7}
        >
          <Text style={[fbStyles.tabTxt, active === f.key && fbStyles.tabTxtActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const fbStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 6,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: D.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabTxt:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: D.text2 },
  tabTxtActive:{ color: '#FFFFFF' },
});

// ── Team member card ──────────────────────────────────────
function TeamMemberCard({ item, onOpenIntervals }) {
  const st = getMemberStatus(item);
  const totalMin = Math.max(0, Math.floor(Number(item.total_work_minutes ?? item.totalWorkMinutes) || 0));
  // Derive gap minutes from break_seconds if available, else estimate
  const breakMin = item.break_seconds != null
    ? Math.floor(Number(item.break_seconds) / 60)
    : 0;
  const gpsLostCount = Number(item.gps_lost_count ?? item.gpsLostCount) || 0;
  const productivityPct = WORKDAY_MINUTES > 0 ? Math.min(100, Math.round((totalMin / WORKDAY_MINUTES) * 100)) : 0;

  const activeBuildingId = item.active_building_id ?? item.activeBuildingId;
  const btag = activeBuildingId ? buildingTag(activeBuildingId) : null;

  const phone = item.phone_number ?? item.phoneNumber ?? item.phone;

  function callEmployee() {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s/g, '')}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <TouchableOpacity
      style={[
        cStyles.card,
        st.key === 'active'  && cStyles.cardActive,
        st.key === 'gps_lost'&& cStyles.cardAlert,
      ]}
      activeOpacity={0.76}
      onPress={() => onOpenIntervals?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.full_name}, tafsilotlar`}
    >
      {/* ─── Left accent stripe */}
      <View style={[cStyles.stripe, { backgroundColor: st.color }]} />

      <View style={cStyles.body}>
        {/* Row 1: Name + pulse + phone */}
        <View style={cStyles.topRow}>
          <View style={cStyles.nameWrap}>
            <PulseDot color={st.color} active={st.pulse} />
            <Text style={cStyles.name} numberOfLines={1}>{item.full_name}</Text>
          </View>
          <View style={cStyles.topRight}>
            {btag && (
              <View style={[cStyles.buildingBadge, { backgroundColor: btag.bg }]}>
                <Building2 size={9} color={btag.text} strokeWidth={2.5} />
                <Text style={[cStyles.buildingBadgeTxt, { color: btag.text }]}>{btag.label}</Text>
              </View>
            )}
            {phone ? (
              <TouchableOpacity
                style={cStyles.phoneBtn}
                onPress={callEmployee}
                hitSlop={10}
                accessibilityLabel="Qo'ng'iroq qilish"
              >
                <Phone size={14} color={Colors.secondary} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Row 2: Position / dept */}
        <Text style={cStyles.meta} numberOfLines={1}>
          {[item.position, item.department].filter(Boolean).join(' · ')}
        </Text>

        {/* Row 3: Status badge */}
        <View style={[cStyles.statusBadge, { backgroundColor: st.tint }]}>
          {st.key === 'away' ? (
            <MapPinOff size={11} color={D.orange} strokeWidth={2.5} />
          ) : st.key === 'active' ? (
            <Wifi size={11} color={D.green} strokeWidth={2.5} />
          ) : (
            <WifiOff size={11} color={st.color} strokeWidth={2.5} />
          )}
          <Text style={[cStyles.statusTxt, { color: st.color }]}>{st.label}</Text>
        </View>

        {/* Row 4: Work time + productivity % */}
        <View style={cStyles.statsRow}>
          <View style={cStyles.statChip}>
            <Clock size={11} color={D.text3} strokeWidth={2} />
            <Text style={cStyles.statVal}>{fmtMin(totalMin)}</Text>
            <Text style={cStyles.statLabel}>ishlandi</Text>
          </View>
          <View style={cStyles.statDivider} />
          <View style={cStyles.statChip}>
            <Text style={[cStyles.statVal, { color: productivityPct >= 80 ? D.green : productivityPct >= 50 ? D.orange : D.red }]}>
              {productivityPct}%
            </Text>
            <Text style={cStyles.statLabel}>samaradorlik</Text>
          </View>
          {gpsLostCount >= 1 && (
            <>
              <View style={cStyles.statDivider} />
              <View style={cStyles.statChip}>
                <AlertTriangle size={11} color={D.orange} strokeWidth={2.5} />
                <Text style={[cStyles.statVal, { color: D.orange }]}>{gpsLostCount}x</Text>
                <Text style={cStyles.statLabel}>GPS</Text>
              </View>
            </>
          )}
        </View>

        {/* Row 5: Productivity bar */}
        <ProductivityBar workedMin={totalMin} gapMin={breakMin} />

        {/* Row 6: Tap hint + chevron */}
        <View style={cStyles.bottomRow}>
          <Text style={cStyles.tapHint}>Faoliyat tarixini ko'rish</Text>
          <ChevronRight size={14} color={D.text3} strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: D.cardBg,
    borderRadius: Radius.lg,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.border,
    ...Shadow.card,
  },
  cardActive: {
    borderColor: '#A7F3D0',
    shadowColor: D.green,
    shadowOpacity: 0.12,
  },
  cardAlert: {
    borderColor: '#FECACA',
    shadowColor: D.red,
    shadowOpacity: 0.18,
  },
  stripe: { width: 4, borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: Radius.lg },
  body:   { flex: 1, padding: 14, paddingLeft: 12 },

  topRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameWrap:{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  name:    { fontSize: 15, fontWeight: FontWeight.semibold, color: D.text1, flexShrink: 1 },

  topRight:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  buildingBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  buildingBadgeTxt:{ fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  phoneBtn:{ width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.secondaryTint,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#CCFBF1' },

  meta: { fontSize: FontSize.xs, color: D.text3, marginTop: 3 },

  statusBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusTxt:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  statsRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6, flexWrap: 'wrap' },
  statChip:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statVal:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: D.text1 },
  statLabel:  { fontSize: FontSize.xs, color: D.text3 },
  statDivider:{ width: 1, height: 12, backgroundColor: D.border, marginHorizontal: 2 },

  bottomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  tapHint:    { fontSize: FontSize.xs, color: D.text3, fontStyle: 'italic' },
});

// ── Sorting + filtering ───────────────────────────────────
function statusRank(row) {
  const ws = row.work_status;
  const outside = row.outside_since;
  const reason = (row.checkout_reason ?? row.checkoutReason ?? '').trim();
  if (ws === 'active' && !outside) return 0;   // in building first
  if (ws === 'active' && outside)  return 1;   // away second
  if (reason === 'gps_lost')       return 2;
  if (reason === 'system_timeout') return 3;
  return 4;                                     // offline last
}

function applyFilter(team, filter) {
  switch (filter) {
    case 'in':
      return team.filter((r) => r.work_status === 'active' && !r.outside_since);
    case 'out':
      return team.filter((r) => r.work_status === 'active' && r.outside_since);
    case 'late': {
      const LATE_MIN = 30;
      return team.filter((r) => {
        const totalMin = Number(r.total_work_minutes ?? r.totalWorkMinutes) || 0;
        return totalMin < LATE_MIN;
      });
    }
    default:
      return team;
  }
}

function sortTeam(team) {
  return [...team].sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b);
    if (rankDiff !== 0) return rankDiff;
    // within same rank: more work time on top
    const aMin = Number(a.total_work_minutes ?? a.totalWorkMinutes) || 0;
    const bMin = Number(b.total_work_minutes ?? b.totalWorkMinutes) || 0;
    return bMin - aMin;
  });
}

// ── Header summary strip ──────────────────────────────────
function HeaderStrip({ team }) {
  const inBuilding = team.filter((r) => r.work_status === 'active' && !r.outside_since).length;
  const outside    = team.filter((r) => r.work_status === 'active' && r.outside_since).length;
  const offline    = team.filter((r) => r.work_status !== 'active').length;

  return (
    <View style={hsStyles.wrap}>
      <View style={[hsStyles.chip, { backgroundColor: D.greenTint }]}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: D.green }} />
        <Text style={[hsStyles.chipTxt, { color: D.green }]}>{inBuilding} binoda</Text>
      </View>
      <View style={[hsStyles.chip, { backgroundColor: D.orangeTint }]}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: D.orange }} />
        <Text style={[hsStyles.chipTxt, { color: D.orange }]}>{outside} tashqarida</Text>
      </View>
      <View style={[hsStyles.chip, { backgroundColor: D.grayTint, borderColor: D.border }]}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: D.gray }} />
        <Text style={[hsStyles.chipTxt, { color: D.gray }]}>{offline} offline</Text>
      </View>
    </View>
  );
}

const hsStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'transparent' },
  chipTxt: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});

// ── Main screen ───────────────────────────────────────────
export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const { team, isLoading, error, fetchTeamStatus } = useTeamStore();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [intervalMember, setIntervalMember] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await fetchTeamStatus(); }
      finally { if (!cancelled) setHasLoadedOnce(true); }
    })();
    return () => { cancelled = true; };
  }, [fetchTeamStatus]);

  const onRefresh = useCallback(async () => {
    try { await fetchTeamStatus(); } catch {}
  }, [fetchTeamStatus]);

  const displayTeam = sortTeam(applyFilter(team, filter));

  const listEmpty = !isLoading && displayTeam.length === 0 ? (
    <View style={scStyles.empty}>
      <Users size={40} color={D.text3} strokeWidth={1.5} />
      <Text style={scStyles.emptyTitle}>Hodimlar topilmadi</Text>
      <Text style={scStyles.emptySub}>
        {filter !== 'all' ? 'Bu filtr bo\'yicha hech kim yo\'q.' : 'Bo\'lim boshlig\'i yoki administrator uchun ro\'yxat shu yerda ko\'rinadi.'}
      </Text>
    </View>
  ) : null;

  const ListHeader = (
    <View style={scStyles.headerBlock}>
      <Text style={scStyles.headerTitle}>Jamoa holati</Text>
      <Text style={scStyles.headerSub}>Bugungi ish · real vaqt monitoringi</Text>
      {team.length > 0 && <HeaderStrip team={team} />}
      <FilterBar active={filter} onChange={setFilter} />
    </View>
  );

  return (
    <View style={[scStyles.root, { paddingTop: Platform.OS === 'ios' ? 8 : insets.top }]}>
      <StatusBar style="dark" />

      {error ? (
        <View style={scStyles.errorBanner}>
          <AlertTriangle size={14} color={Colors.danger} strokeWidth={2} />
          <Text style={scStyles.errorTxt}>{error}</Text>
        </View>
      ) : null}

      <StaffLogModal
        member={intervalMember}
        visible={intervalMember != null}
        onClose={() => setIntervalMember(null)}
      />

      <FlatList
        data={displayTeam}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TeamMemberCard item={item} onOpenIntervals={setIntervalMember} />
        )}
        contentContainerStyle={[
          scStyles.listContent,
          displayTeam.length === 0 && scStyles.listEmptyGrow,
        ]}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isLoading && hasLoadedOnce)}
            onRefresh={onRefresh}
            colors={[Colors.secondary]}
            tintColor={Colors.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const scStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.pageBg },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.md, marginBottom: 8,
    padding: Spacing.sm, borderRadius: Radius.sm,
    backgroundColor: Colors.dangerTint,
  },
  errorTxt: { flex: 1, fontSize: FontSize.caption, color: Colors.danger },
  listContent: { paddingHorizontal: 14, paddingBottom: Spacing.xl },
  listEmptyGrow: { flexGrow: 1 },
  headerBlock: { marginBottom: 4, marginTop: Spacing.sm },
  headerTitle: { fontSize: FontSize.h2, fontWeight: FontWeight.heavy, color: D.text1, letterSpacing: -0.3 },
  headerSub:   { fontSize: FontSize.sm, color: D.text2, marginTop: 2, marginBottom: Spacing.md },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, minHeight: 280,
  },
  emptyTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.semibold, color: D.text2, marginTop: Spacing.md },
  emptySub:   { fontSize: FontSize.sm, color: D.text3, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
});
