// ═══════════════════════════════════════════════════════════
// Xodim — xabarnomalar / bildirishnomalar (faqat o‘z JWT bo‘yicha API)
// ═══════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Info,
  Star,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { useNotificationStore } from '../../src/store';

const MONTHS_UZ = [
  'yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function sameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Guruh sarlavhasi: Bugun, Kecha yoki "28 apr" */
function sectionTitleForDate(d) {
  const now = new Date();
  if (sameCalendarDay(d, now)) return 'Bugun';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameCalendarDay(d, y)) return 'Kecha';
  const yStr = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}${yStr}`;
}

function daySortKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Qator vaqt matni — ISO ko‘rinmasin */
function formatRowTime(createdAt, sectionTitle) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const t = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (sectionTitle === 'Bugun' || sectionTitle === 'Kecha') return t;
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}, ${t}`;
}

function buildSections(notifications) {
  const sorted = [...notifications].sort((a, b) => {
    const ta = new Date(a.createdAt || a.raw?.created_at || 0).getTime();
    const tb = new Date(b.createdAt || b.raw?.created_at || 0).getTime();
    return tb - ta;
  });

  const sections = [];
  let lastKey = null;
  for (const n of sorted) {
    const iso = n.createdAt || n.raw?.created_at;
    const d = new Date(iso);
    const key = daySortKey(iso);
    if (!key || Number.isNaN(d.getTime())) {
      if (!sections.length || lastKey !== '_unknown') {
        lastKey = '_unknown';
        sections.push({ title: 'Boshqa', data: [n], _key: lastKey });
      } else {
        sections[sections.length - 1].data.push(n);
      }
      continue;
    }
    if (key !== lastKey) {
      lastKey = key;
      sections.push({
        title: sectionTitleForDate(d),
        data: [n],
        _key: key,
      });
    } else {
      sections[sections.length - 1].data.push(n);
    }
  }
  return sections;
}

export const TYPE_META = {
  davomat: { Icon: Clock, bg: '#DCFCE7', color: '#166534' },
  ogohlantirish: { Icon: AlertTriangle, bg: '#FEE2E2', color: '#991B1B' },
  tizim: { Icon: Info, bg: '#DBEAFE', color: '#1D4ED8' },
  baho: { Icon: Star, bg: '#EDE9FE', color: '#6D28D9' },
  topshiriq: { Icon: BookOpen, bg: '#EDE9FE', color: '#6D28D9' },
  jadval: { Icon: Calendar, bg: '#FFEDD5', color: '#C2410C' },
};

/** Bosh sahifa «Oxirgi faoliyat» o‘ng ustun: bugun HH:MM, kecha «Kecha», aks holda qisqa sana */
export function formatHomeActivityTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (sameCalendarDay(d, now)) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameCalendarDay(d, y)) return 'Kecha';
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}`;
}

function TypeIcon({ type }) {
  const meta = TYPE_META[type] || TYPE_META.jadval;
  return <meta.Icon size={20} color={meta.color} strokeWidth={2.2} />;
}

function NotificationRow({ item, section, onPress }) {
  const meta = TYPE_META[item.type] || TYPE_META.jadval;
  const unread = item.unread;
  const timeStr = formatRowTime(item.createdAt || item.raw?.created_at, section.title);

  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      activeOpacity={0.82}
      onPress={() => onPress(item.id)}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
        <TypeIcon type={item.type} />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, unread && styles.rowTitleUnread]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {!!item.body && (
          <Text style={styles.rowSubtitle} numberOfLines={3}>
            {item.body}
          </Text>
        )}
        <Text style={styles.rowTime}>{timeStr}</Text>
      </View>
      <View style={styles.rowRight}>
        {unread && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Xodim bosh sahifasidagi «Xabarlar» yorlig‘i uchun kontent.
 */
export function StaffMessagesPanel() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const isRefreshing = useNotificationStore((s) => s.isRefreshing);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const [markAllBusy, setMarkAllBusy] = useState(false);

  const sections = useMemo(() => buildSections(notifications), [notifications]);

  const onRefresh = useCallback(() => {
    fetchNotifications({ silent: true });
  }, [fetchNotifications]);

  const onPressRow = useCallback(
    (id) => {
      const n = notifications.find((x) => x.id === id);
      if (n?.unread) {
        markRead(id);
      }
    },
    [notifications, markRead],
  );

  const onMarkAll = useCallback(async () => {
    if (unreadCount === 0) return;
    setMarkAllBusy(true);
    try {
      await markAllRead();
    } finally {
      setMarkAllBusy(false);
    }
  }, [unreadCount, markAllRead]);

  const renderSectionHeader = useCallback(({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  ), []);

  const renderItem = useCallback(
    ({ item, section }) => (
      <NotificationRow item={item} section={section} onPress={onPressRow} />
    ),
    [onPressRow],
  );

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingTxt}>Xabarlar yuklanmoqda…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarHint}>
          {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan` : "Barchasi o‘qilgan"}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={onMarkAll}
            disabled={markAllBusy}
            activeOpacity={0.85}
          >
            <Check size={15} color={Colors.secondary} strokeWidth={2.5} />
            <Text style={styles.markAllTxt}>Hammasini o‘qidim</Text>
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.secondary]}
            tintColor={Colors.secondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bell size={52} color={Colors.textDisabled} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Xabarlar yo‘q</Text>
            <Text style={styles.emptySub}>
              Davomat, jadval va tizim bildirishnomalari shu yerda ko‘rinadi
            </Text>
          </View>
        }
      />
    </View>
  );
}

export default function MessagesScreen() {
  return <StaffMessagesPanel />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loadingTxt: {
    marginTop: Spacing.md,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  toolbarHint: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryTint,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllTxt: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingBottom: Spacing.xl + 8,
  },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    ...Shadow.card,
  },
  rowUnread: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  rowTitleUnread: {
    fontWeight: FontWeight.bold,
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  rowTime: {
    marginTop: 8,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  rowRight: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingLeft: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  emptySub: {
    marginTop: Spacing.sm,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
