// ═══════════════════════════════════════════════════════════
// Activity Timeline Modal — Executive Dashboard
// ═══════════════════════════════════════════════════════════
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  X,
  LogIn,
  LogOut,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Clock,
  CheckCircle2,
  Activity,
} from 'lucide-react-native';
import { FontSize, FontWeight, Radius, Shadow } from '../theme';

// ── Design tokens (mirrors TeamScreen) ───────────────────
const D = {
  green:       '#10B981',
  greenTint:   '#ECFDF5',
  greenDark:   '#065F46',
  orange:      '#F59E0B',
  orangeTint:  '#FFFBEB',
  red:         '#EF4444',
  redTint:     '#FFF1F2',
  redLight:    '#FEE2E2',
  gray:        '#94A3B8',
  grayTint:    '#F8FAFC',
  blue:        '#3B82F6',
  blueTint:    '#EFF6FF',
  indigo:      '#6366F1',
  indigoTint:  '#EEF2FF',
  purple:      '#8B5CF6',
  purpleTint:  '#F5F3FF',
  text1:       '#0F172A',
  text2:       '#475569',
  text3:       '#94A3B8',
  border:      '#E2E8F0',
  surface:     '#FFFFFF',
  pageBg:      '#F8FAFC',
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

export function formatModalHHMM(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') {
    const t = v.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) return t.slice(0, 5);
  }
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return '—';
}

function fmtSec(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return null;
  const s = Math.max(0, Math.floor(Number(sec)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}s ${m}d`;
  return `${m} daq`;
}

/** Convert TIME or TIMESTAMP → minutes-since-midnight for gap maths */
function toMinutes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const t = v.trim();
    // "HH:MM" or "HH:MM:SS"
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
  }
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
  return null;
}

const GAP_THRESHOLD_MIN = 30; // minutes

// ── Building badge ────────────────────────────────────────
function BuildingBadge({ buildingId, buildingName }) {
  const tag = buildingTag(buildingId);
  const label = buildingName || tag.label;
  return (
    <View style={[bbStyles.badge, { backgroundColor: tag.bg }]}>
      <Building2 size={9} color={tag.text} strokeWidth={2.5} />
      <Text style={[bbStyles.txt, { color: tag.text }]}>{label}</Text>
    </View>
  );
}
const bbStyles = StyleSheet.create({
  badge:{ flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  txt:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});

// ── Gap alert block ───────────────────────────────────────
function GapAlert({ fromTime, toTime, gapMin }) {
  const label = `${Math.floor(gapMin / 60) > 0 ? `${Math.floor(gapMin / 60)}s ` : ''}${gapMin % 60}d nofaol`;
  return (
    <View style={gaStyles.row}>
      <View style={gaStyles.line} />
      <View style={gaStyles.box}>
        <AlertTriangle size={13} color={D.red} strokeWidth={2.5} />
        <Text style={gaStyles.txt}>
          {fromTime} → {toTime} · <Text style={gaStyles.bold}>{label}</Text>
        </Text>
      </View>
      <View style={gaStyles.line} />
    </View>
  );
}
const gaStyles = StyleSheet.create({
  row:  { alignItems: 'center', marginVertical: 4, paddingHorizontal: 4 },
  line: { width: 2, height: 12, backgroundColor: '#FECACA', borderRadius: 1 },
  box:  { flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: D.redLight, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 10, paddingVertical: 6, width: '100%' },
  txt:  { flex: 1, fontSize: FontSize.xs, color: '#991B1B', lineHeight: 16 },
  bold: { fontWeight: FontWeight.semibold },
});

// ── Timeline event node ───────────────────────────────────
function TimelineNode({ icon: Icon, iconColor, iconBg, isLast }) {
  return (
    <View style={tnStyles.col}>
      <View style={[tnStyles.iconWrap, { backgroundColor: iconBg, borderColor: iconColor + '33' }]}>
        <Icon size={14} color={iconColor} strokeWidth={2.2} />
      </View>
      {!isLast && <View style={tnStyles.connector} />}
    </View>
  );
}
const tnStyles = StyleSheet.create({
  col:       { alignItems: 'center', width: 32 },
  iconWrap:  { width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, zIndex: 1 },
  connector: { width: 2, flex: 1, minHeight: 20, backgroundColor: D.border, marginTop: 2 },
});

// ── Single log entry in timeline ─────────────────────────
function LogEntry({ log, prevLog, isFirst, isLast }) {
  const entry  = formatModalHHMM(log.entry_time  ?? log.entryTime);
  const exit   = log.exit_time != null ? formatModalHHMM(log.exit_time ?? log.exitTime) : null;
  const dur    = fmtSec(log.duration_seconds ?? log.durationSeconds);
  const bId    = log.building_id ?? log.buildingId;
  const bName  = log.building_name ?? log.buildingName;
  const isOpen = log.is_active ?? log.isActive;

  // Determine event type relative to previous log
  const prevBId = prevLog ? (prevLog.building_id ?? prevLog.buildingId) : null;
  const isSwitch = prevLog && prevBId != null && bId != null && prevBId !== bId;

  // Icon for entry event
  const EntryIcon  = isSwitch ? ArrowLeftRight : LogIn;
  const entryColor = isSwitch ? D.indigo : D.green;
  const entryBg    = isSwitch ? D.indigoTint : D.greenTint;

  // Gap between prevLog exit and this entry
  let gapAlert = null;
  if (prevLog) {
    const prevExitMin = toMinutes(prevLog.exit_time ?? prevLog.exitTime);
    const thisEntryMin = toMinutes(log.entry_time ?? log.entryTime);
    if (prevExitMin != null && thisEntryMin != null) {
      const gap = thisEntryMin - prevExitMin;
      if (gap >= GAP_THRESHOLD_MIN) {
        gapAlert = {
          fromTime: formatModalHHMM(prevLog.exit_time ?? prevLog.exitTime),
          toTime:   formatModalHHMM(log.entry_time ?? log.entryTime),
          gapMin:   gap,
        };
      }
    }
  }

  return (
    <>
      {gapAlert && (
        <GapAlert
          fromTime={gapAlert.fromTime}
          toTime={gapAlert.toTime}
          gapMin={gapAlert.gapMin}
        />
      )}
      <View style={leStyles.row}>
        {/* Timeline node + connector */}
        <TimelineNode
          icon={EntryIcon}
          iconColor={entryColor}
          iconBg={entryBg}
          isLast={false}
        />

        {/* Content card */}
        <View style={leStyles.card}>
          {/* Header: time + building badge */}
          <View style={leStyles.cardHead}>
            <Text style={leStyles.time}>{entry}</Text>
            {bId && <BuildingBadge buildingId={bId} buildingName={bName} />}
            {isSwitch && (
              <View style={leStyles.switchPill}>
                <Text style={leStyles.switchTxt}>SWITCH</Text>
              </View>
            )}
          </View>

          {/* Exit row */}
          <View style={leStyles.exitRow}>
            <LogOut size={11} color={isOpen ? D.orange : D.gray} strokeWidth={2} />
            <Text style={[leStyles.exitTxt, isOpen && { color: D.orange }]}>
              {isOpen ? 'Ochiq (hali chiqmagan)' : exit ?? '—'}
            </Text>
            {dur && !isOpen && (
              <View style={leStyles.durChip}>
                <Clock size={9} color={D.text3} strokeWidth={2} />
                <Text style={leStyles.durTxt}>{dur}</Text>
              </View>
            )}
          </View>

          {/* Checkout reason */}
          {log.checkout_reason && !isOpen && (
            <Text style={leStyles.reason}>
              Sabab: {log.checkout_reason}
            </Text>
          )}
        </View>
      </View>

      {/* Final exit node */}
      {isLast && !isOpen && exit && (
        <View style={[leStyles.row, { marginTop: -2 }]}>
          <TimelineNode
            icon={CheckCircle2}
            iconColor={D.green}
            iconBg={D.greenTint}
            isLast
          />
          <View style={leStyles.finalCard}>
            <Text style={leStyles.finalTxt}>Ish kuni yakunlandi · {exit}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const leStyles = StyleSheet.create({
  row:     { flexDirection: 'row', gap: 10, marginBottom: 2, alignItems: 'flex-start' },
  card:    {
    flex: 1, backgroundColor: D.surface, borderRadius: Radius.md,
    padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: D.border,
    ...Shadow.xs,
  },
  cardHead:{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time:    { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: D.text1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  switchPill:{
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs,
    backgroundColor: D.indigoTint, borderWidth: 1, borderColor: '#C7D2FE',
  },
  switchTxt:{ fontSize: 9, fontWeight: FontWeight.heavy, color: D.indigo, letterSpacing: 0.5 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  exitTxt: { fontSize: FontSize.sm, color: D.text2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  durChip: { flexDirection: 'row', alignItems: 'center', gap: 3,
    marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: D.grayTint, borderRadius: Radius.xs },
  durTxt:  { fontSize: FontSize.xs, color: D.text3 },
  reason:  { fontSize: FontSize.xs, color: D.text3, marginTop: 4, fontStyle: 'italic' },

  finalCard:{ flex: 1, paddingVertical: 8, paddingLeft: 2 },
  finalTxt: { fontSize: FontSize.xs, color: D.green, fontWeight: FontWeight.semibold },
});

// ── Summary strip ─────────────────────────────────────────
function SessionSummary({ member }) {
  const totalMin = Math.max(0, Math.floor(Number(member?.total_work_minutes ?? member?.totalWorkMinutes) || 0));
  const breakSec = Number(member?.break_seconds) || 0;
  const totalSec = Number(member?.total_seconds) || (totalMin * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const fmt = h > 0 ? `${h}s ${m}d` : `${m} daq`;
  const pct = Math.min(100, Math.round((totalSec / (8 * 3600)) * 100));

  return (
    <View style={ssStyles.wrap}>
      <View style={ssStyles.stat}>
        <Activity size={14} color={D.green} strokeWidth={2} />
        <View>
          <Text style={ssStyles.val}>{fmt}</Text>
          <Text style={ssStyles.lbl}>jami ish</Text>
        </View>
      </View>
      <View style={ssStyles.divider} />
      <View style={ssStyles.stat}>
        <Clock size={14} color={D.orange} strokeWidth={2} />
        <View>
          <Text style={ssStyles.val}>{fmtSec(breakSec) ?? '—'}</Text>
          <Text style={ssStyles.lbl}>tanaffus</Text>
        </View>
      </View>
      <View style={ssStyles.divider} />
      <View style={ssStyles.stat}>
        <View>
          <Text style={[ssStyles.val, { color: pct >= 80 ? D.green : pct >= 50 ? D.orange : D.red }]}>
            {pct}%
          </Text>
          <Text style={ssStyles.lbl}>samaradorlik</Text>
        </View>
      </View>
    </View>
  );
}
const ssStyles = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.pageBg, borderRadius: Radius.md, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: D.border },
  stat:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { width: 1, height: 28, backgroundColor: D.border, marginHorizontal: 4 },
  val:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: D.text1 },
  lbl:     { fontSize: FontSize.xs, color: D.text3 },
});

// ── Main modal ────────────────────────────────────────────
export default function StaffLogModal({ member, visible, onClose }) {
  const intervals = Array.isArray(member?.work_log_intervals)
    ? member.work_log_intervals
    : Array.isArray(member?.workLogIntervals)
      ? member.workLogIntervals
      : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={mStyles.backdrop} onPress={onClose}>
        <Pressable style={mStyles.sheet} onPress={(e) => e.stopPropagation()}>

          {/* Handle bar */}
          <View style={mStyles.handle} />

          {/* Header */}
          <View style={mStyles.header}>
            <View style={mStyles.headerLeft}>
              <Text style={mStyles.title} numberOfLines={1}>
                {member?.full_name || 'Faoliyat'}
              </Text>
              <Text style={mStyles.subtitle}>
                Bugungi ish tarixi
              </Text>
            </View>
            <TouchableOpacity
              style={mStyles.closeBtn}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Yopish"
            >
              <X size={18} color={D.text2} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Session summary */}
          {member && <SessionSummary member={member} />}

          {/* Timeline */}
          <ScrollView
            style={mStyles.scroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {intervals.length === 0 ? (
              <View style={mStyles.emptyWrap}>
                <Activity size={32} color={D.text3} strokeWidth={1.5} />
                <Text style={mStyles.emptyTxt}>{"Bugungi work_logs yo'q"}</Text>
              </View>
            ) : (
              intervals.map((log, idx) => (
                <LogEntry
                  key={String(log.id ?? idx)}
                  log={log}
                  prevLog={idx > 0 ? intervals[idx - 1] : null}
                  isFirst={idx === 0}
                  isLast={idx === intervals.length - 1}
                />
              ))
            )}
            <View style={{ height: 16 }} />
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.50)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '88%',
    ...Shadow.modal,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: D.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: 14,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: FontSize.h3, fontWeight: FontWeight.heavy, color: D.text1 },
  subtitle: { fontSize: FontSize.xs, color: D.text3, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: D.pageBg, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { maxHeight: 480 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt:  { fontSize: FontSize.sm, color: D.text3 },
});
