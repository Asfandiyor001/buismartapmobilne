// ═══════════════════════════════════════════════════════════
// Staff / Admin — xavfsiz profil (GET /api/auth/me)
// ═══════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  LogOut,
  ChevronRight,
  Lock,
  Fingerprint,
  Globe,
  Bell,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { userAPI } from '../../src/api/user.api';
import { useAuthStore } from '../../src/store';

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const APP_VERSION = 'v1.0.0';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function sameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatLastLoginValue(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const t = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (sameCalendarDay(d, now)) return `Bugun, ${t}`;
  const mo = MONTHS_SHORT[d.getMonth()];
  const day = d.getDate();
  if (d.getFullYear() === now.getFullYear()) {
    return `${day}-${mo}, ${t}`;
  }
  return `${day}-${mo} ${d.getFullYear()}, ${t}`;
}

function formatJoinedValue(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mo = MONTHS_SHORT[d.getMonth()];
  return `${d.getDate()}-${mo} ${d.getFullYear()}`;
}

function roleTitleCase(role) {
  const r = String(role || '').trim();
  if (!r) return 'User';
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function roleBadgeColors(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') {
    return { bg: 'rgba(255,255,255,0.22)', fg: Colors.white };
  }
  return { bg: 'rgba(255,255,255,0.18)', fg: Colors.white };
}

function resolveAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (!API_ORIGIN) return u;
  return `${API_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`;
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return String(name || '?')
    .slice(0, 2)
    .toUpperCase();
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function MenuRow({
  onPress,
  icon: Icon,
  iconColor,
  iconBg,
  title,
  right,
  showChevron = true,
  isLast = false,
}) {
  const content = (
    <>
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text style={styles.menuTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.menuRight}>
        {right}
        {showChevron ? (
          <ChevronRight size={20} color={Colors.textMuted} strokeWidth={2} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.menuRow, !isLast && styles.menuRowDivider]}
        onPress={onPress}
        activeOpacity={0.65}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.menuRow, !isLast && styles.menuRowDivider]}>{content}</View>;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const mergeUser = useAuthStore((s) => s.mergeUser);
  const logoutStore = useAuthStore((s) => s.logout);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const load = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      if (!silent) {
        setError(null);
        setLoading(true);
      }
      try {
        const data = await userAPI.fetchMyProfile();
        setProfile(data);
        setError(null);
        await mergeUser(data);
      } catch (e) {
        const msg =
          typeof e === 'string'
            ? e
            : e?.message || 'Profil yuklanmadi';
        if (!silent) {
          setError(msg);
          setProfile(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [mergeUser]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleLogout = () => {
    Alert.alert('Tizimdan chiqish', 'Tizimdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          await logoutStore();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const placeholderNav = (label) => () => {
    Alert.alert(label, 'Bu bo‘lim tez orada qo‘shiladi.');
  };

  if (loading && !profile && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingTxt}>Profil yuklanmoqda…</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errTxt}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
          <Text style={styles.retryTxt}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName = profile?.full_name || '—';
  const phone = profile?.phone || '—';
  const active = profile?.is_active === true;
  const avatarUri = resolveAvatarUrl(profile?.avatar_url);
  const initials = initialsFromName(fullName);
  const badge = roleBadgeColors(profile?.role);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollPad}
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
      {/* ── Compact gradient header ─────────────────────────── */}
      <View style={styles.identityBleed}>
        <LinearGradient
          colors={['#1E2761', '#1a3a6b', '#028090']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityGradient}
        >
          <View style={styles.decorBlob1} />
          <View style={styles.decorBlob2} />

          {/* Top row: avatar | name+role+phone | bell */}
          <View style={styles.topRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={placeholderNav('Profil rasmi')}
              style={styles.avatarOuter}
            >
              <View style={styles.avatarRing}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.nameCol}>
              <Text style={styles.nameOnGradient} numberOfLines={1}>{fullName}</Text>
              <View style={styles.rolePhoneRow}>
                <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.roleBadgeTxt, { color: badge.fg }]}>
                    {roleTitleCase(profile?.role)}
                  </Text>
                </View>
                <Text style={styles.phoneSubtitle} numberOfLines={1}>{phone}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.bellBtn} onPress={placeholderNav('Bildirishnomalar')}>
              <Bell size={22} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Stats grid: Holat | Sessiya | A'zo */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>
                {active ? 'Faol' : 'Nofaol'}
              </Text>
              <View style={[styles.statDot, { backgroundColor: active ? Colors.success : Colors.danger }]} />
              <Text style={styles.statLbl}>Holat</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal} numberOfLines={1}>
                {formatLastLoginValue(profile?.last_login)}
              </Text>
              <Text style={styles.statLbl}>Sessiya</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal} numberOfLines={1}>
                {formatJoinedValue(profile?.created_at)}
              </Text>
              <Text style={styles.statLbl}>A'zo</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.identityCurve} />
      </View>

      <View style={styles.sections}>
        <View style={styles.sectionBlock}>
          <SectionTitle>SOZLAMALAR VA XAVFSIZLIK</SectionTitle>
          <View style={styles.groupCard}>
            <MenuRow
              icon={Lock}
              iconColor="#7C3AED"
              iconBg={Colors.purpleTint}
              title="Parolni o'zgartirish"
              onPress={placeholderNav("Parolni o'zgartirish")}
            />
            <MenuRow
              icon={Fingerprint}
              iconColor="#2563EB"
              iconBg={Colors.primaryTint}
              title="Biometrik kirish"
              showChevron={false}
              right={
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: Colors.border, true: 'rgba(2,128,144,0.45)' }}
                  thumbColor={biometricEnabled ? Colors.secondary : Colors.textDisabled}
                />
              }
            />
            <MenuRow
              icon={Globe}
              iconColor={Colors.success}
              iconBg={Colors.successTint}
              title="Ilova tili"
              onPress={placeholderNav('Ilova tili')}
              right={
                <Text style={styles.menuValueMuted} numberOfLines={1}>
                  {"O'zbekcha"}
                </Text>
              }
            />
            <MenuRow
              icon={Bell}
              iconColor={Colors.warning}
              iconBg={Colors.warningTint}
              title="Bildirishnomalar"
              onPress={placeholderNav('Bildirishnomalar')}
              isLast
            />
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <SectionTitle>{'QO\'SHIMCHA'}</SectionTitle>
          <View style={styles.groupCard}>
            <MenuRow
              icon={HelpCircle}
              iconColor={Colors.secondary}
              iconBg={Colors.secondaryTint}
              title="Yordam va qo'llab-quvvatlash"
              onPress={placeholderNav('Yordam')}
            />
            <MenuRow
              icon={Info}
              iconColor={Colors.textSecondary}
              iconBg={Colors.borderLight}
              title="Ilova haqida"
              onPress={placeholderNav('Ilova haqida')}
              right={<Text style={styles.menuValueMuted}>{APP_VERSION}</Text>}
              isLast
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutCard}
          activeOpacity={0.82}
          onPress={handleLogout}
        >
          <LogOut size={22} color={Colors.danger} strokeWidth={2.2} />
          <Text style={styles.logoutCardTxt}>Tizimdan chiqish</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollPad: {
    paddingHorizontal: 16,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  loadingTxt: {
    marginTop: Spacing.md,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  errTxt: {
    fontSize: FontSize.body,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  retryTxt: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },

  // ── Gradient header ───────────────────────────────────
  identityBleed: {
    marginHorizontal: -16,
    marginBottom: Spacing.md,
  },
  identityGradient: {
    paddingTop: 45,
    paddingBottom: Spacing.xl + 8,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  decorBlob1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(202,220,252,0.1)',
  },
  decorBlob2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(2,128,144,0.15)',
  },
  identityCurve: {
    height: 20,
    marginTop: -20,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  // ── Top row: avatar | name+role+phone | bell ──────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarOuter: {
    marginRight: 14,
  },
  avatarRing: {
    borderRadius: 36,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.borderLight,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  nameOnGradient: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    lineHeight: 24,
  },
  rolePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  roleBadgeTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  phoneSubtitle: {
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: FontWeight.medium,
  },
  bellBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 8,
  },

  // ── Stats grid ────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  statVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statLbl: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },

  // ── Section list ──────────────────────────────────────
  sections: {
    gap: 24,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  menuRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: Spacing.sm,
  },
  menuValueMuted: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    maxWidth: 120,
  },

  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.dangerTint,
    paddingVertical: Spacing.md + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    ...Shadow.xs,
  },
  logoutCardTxt: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
  },
});
