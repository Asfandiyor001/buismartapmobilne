// ═══════════════════════════════════════════════════════════
// SCREEN 10 — student/NotificationsScreen.js  (Expo versiyasi)
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, FileText, Calendar, Star, AlertTriangle, Bell, Check } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { FilterChip, BottomNav } from '../../components';
import { useNotificationStore } from '../../src/store';

const FILTERS = ['Hammasi','Davomat','Topshiriq','Jadval','Baho'];
const META = {
  davomat:       { Icon:CheckCircle2, bg:'#DCFCE7', color:'#166634' },
  topshiriq:     { Icon:FileText,     bg:'#FEF3C7', color:'#92400E' },
  jadval:        { Icon:Calendar,     bg:'#DBEAFE', color:'#1E40AF' },
  baho:          { Icon:Star,         bg:'#EDE9FE', color:'#5B21B6' },
  ogohlantirish: { Icon:AlertTriangle,bg:'#FEE2E2', color:'#991B1B' },
};

function NotifItem({ n, onPress }) {
  const meta = META[n.type] || META.jadval;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[s.item, n.unread && s.itemUnread]}>
      {n.unread && <View style={s.unreadDot} />}
      <View style={[s.iconWrap, { backgroundColor:meta.bg }]}>
        <meta.Icon size={18} color={meta.color} strokeWidth={2} />
      </View>
      <View style={s.body}>
        <Text style={s.itemTitle} numberOfLines={1}>{n.title}</Text>
        <Text style={s.itemBody} numberOfLines={2}>{n.body}</Text>
      </View>
      <Text style={s.time}>{n.time}</Text>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [filter, setFilter] = useState('Hammasi');
  const [tab, setTab]       = useState(3);
  const insets = useSafeAreaInsets();

  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter(n => {
    if (filter === 'Hammasi') return true;
    const map = { Davomat:'davomat', Topshiriq:'topshiriq', Jadval:'jadval', Baho:'baho' };
    return n.type === map[filter];
  });

  const markReadOne = (id) => {
    markRead(id);
  };

  const markAll = () => {
    markAllRead();
  };

  const newN = filtered.filter(n => n.unread);
  const oldN = filtered.filter(n => !n.unread);
  const tabs = [{ label:'Bosh sahifa' },{ label:'Jadval' },{ label:'QR' },{ label:'Xabarlar' },{ label:'Profil' }];

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={[s.header, { paddingTop:insets.top+8 }]}>
        <View style={s.titleRow}>
          <View>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <Bell size={20} color={Colors.primary} strokeWidth={2} />
              <Text style={s.title}>  Xabarnomalar</Text>
            </View>
            {unreadCount > 0 && <Text style={s.unreadLabel}>{unreadCount} ta yangi xabar</Text>}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAll}>
              <Check size={14} color={Colors.secondary} strokeWidth={2.5} />
              <Text style={s.markAllTxt}> Hammasini o'qidim</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map(f => (
            <FilterChip key={f} label={f==='Hammasi'&&unreadCount>0?`Hammasi (${unreadCount})`:f} active={filter===f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {newN.length > 0 && (<>
          <Text style={s.groupLabel}>YANGI</Text>
          {newN.map((n, i) => <NotifItem key={`new-${n.id}-${i}`} n={n} onPress={() => markReadOne(n.id)} />)}
        </>)}
        {oldN.length > 0 && (<>
          <Text style={s.groupLabel}>AVVALGI</Text>
          {oldN.map((n, i) => <NotifItem key={`old-${n.id}-${i}`} n={n} onPress={() => markReadOne(n.id)} />)}
        </>)}
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Bell size={52} color={Colors.textDisabled} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>Xabarnoma yo'q</Text>
            <Text style={s.emptySub}>Bu toifada yangi xabarlar yo'q</Text>
          </View>
        )}
        <View style={{ height:Spacing.xl }} />
      </ScrollView>

      <BottomNav tabs={tabs} activeIndex={tab} onTabPress={(i) => {
        setTab(i);
        if (i===0) navigation?.navigate('StudentHome');
        if (i===1) navigation?.navigate('Schedule');
        if (i===2) navigation?.navigate('QRScanner');
      }} />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex:1, backgroundColor:Colors.background },
  header:     { backgroundColor:Colors.surface, borderBottomWidth:1, borderBottomColor:Colors.borderLight, ...Shadow.xs },
  titleRow:   { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', paddingHorizontal:Spacing.md, marginBottom:Spacing.sm },
  title:      { fontSize:FontSize.h2, fontWeight:FontWeight.bold, color:Colors.primary },
  unreadLabel:{ fontSize:FontSize.caption, color:Colors.secondary, marginTop:2, marginLeft:28 },
  markAllBtn: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.secondaryTint, borderRadius:Radius.sm, paddingVertical:6, paddingHorizontal:10, marginTop:4 },
  markAllTxt: { fontSize:FontSize.sm, color:Colors.secondary, fontWeight:FontWeight.semibold },
  filterRow:  { paddingHorizontal:Spacing.md, paddingBottom:Spacing.sm, gap:8 },
  scroll:     { flex:1 },
  groupLabel: { fontSize:FontSize.xs, fontWeight:FontWeight.bold, color:Colors.textMuted, letterSpacing:1.2, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm, backgroundColor:Colors.background },
  item:       { flexDirection:'row', alignItems:'flex-start', backgroundColor:Colors.surface, padding:Spacing.md, borderBottomWidth:1, borderBottomColor:Colors.borderLight, position:'relative' },
  itemUnread: { backgroundColor:'#F0FDFA' },
  unreadDot:  { position:'absolute', left:6, top:'50%', marginTop:-3, width:6, height:6, borderRadius:3, backgroundColor:Colors.secondary },
  iconWrap:   { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center', marginRight:12, flexShrink:0 },
  body:       { flex:1, paddingRight:Spacing.sm },
  itemTitle:  { fontSize:FontSize.body-1, fontWeight:FontWeight.semibold, color:Colors.textPrimary, marginBottom:2 },
  itemBody:   { fontSize:FontSize.caption, color:Colors.textSecondary, lineHeight:18 },
  time:       { fontSize:FontSize.xs, color:Colors.textMuted, marginTop:2, flexShrink:0 },
  empty:      { alignItems:'center', paddingTop:80 },
  emptyTitle: { fontSize:FontSize.h3, fontWeight:FontWeight.semibold, color:Colors.textPrimary, marginTop:Spacing.md, marginBottom:Spacing.sm },
  emptySub:   { fontSize:FontSize.body-1, color:Colors.textSecondary, textAlign:'center' },
});
