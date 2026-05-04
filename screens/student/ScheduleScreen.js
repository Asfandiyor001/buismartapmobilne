// ═══════════════════════════════════════════════════════════
// SCREEN 09 — student/ScheduleScreen.js  (Expo versiyasi)
// ═══════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { DayChip, BottomNav } from '../../components';

const DAYS = [
  { day:'Du', date:22, hasClasses:true  },
  { day:'Se', date:23, hasClasses:true  },
  { day:'Ch', date:24, hasClasses:false },
  { day:'Pa', date:25, hasClasses:true, today:true },
  { day:'Ju', date:26, hasClasses:true  },
  { day:'Sh', date:27, hasClasses:false },
  { day:'Ya', date:28, hasClasses:false },
];

const SCHEDULE = {
  25: [
    { time:'08:00', dur:90, subject:'Fizika',         room:'210-xona', teacher:'Mirzayev K.', color:'#3B82F6' },
    { time:'10:00', dur:90, subject:'Matematika',     room:'305-xona', teacher:'Karimov A.',  color:'#10B981' },
    { time:'13:00', lunch:true },
    { time:'14:00', dur:90, subject:'Algoritmlar',    room:'Lab-1',    teacher:'Tursunov F.', color:'#8B5CF6' },
    { time:'16:00', dur:90, subject:'Veb dasturlash', room:'Lab-2',    teacher:'Xasanov S.',  color:'#EF4444' },
  ],
  22: [
    { time:'08:00', dur:90, subject:'Fizika',         room:'210-xona', teacher:'Mirzayev K.', color:'#3B82F6' },
    { time:'10:00', dur:90, subject:'Matematika',     room:'305-xona', teacher:'Karimov A.',  color:'#10B981' },
    { time:'12:00', dur:90, subject:'Ingliz tili',    room:'112-xona', teacher:'Rahimova N.', color:'#F59E0B' },
  ],
};
const SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

export default function ScheduleScreen({ navigation }) {
  const [activeDay, setActiveDay] = useState(25);
  const [tab, setTab]   = useState(1);
  const insets  = useSafeAreaInsets();
  const classes = SCHEDULE[activeDay] || [];
  const tabs    = [{ label:'Bosh sahifa' }, { label:'Jadval' }, { label:'QR' }, { label:'Xabarlar' }, { label:'Profil' }];

  return (
    <View style={sc.root}>
      <StatusBar style="dark" />
      <View style={[sc.header, { paddingTop:insets.top+8 }]}>
        <View style={sc.titleRow}>
          <CalendarDays size={22} color={Colors.primary} strokeWidth={2} />
          <Text style={sc.title}>  Dars Jadvali</Text>
        </View>
        <View style={sc.weekRow}>
          <TouchableOpacity style={sc.navBtn}><ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2.5} /></TouchableOpacity>
          <Text style={sc.weekLabel}>22–28 Aprel, 2024</Text>
          <TouchableOpacity style={sc.navBtn}><ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2.5} /></TouchableOpacity>
          <TouchableOpacity style={sc.todayBtn}><Text style={sc.todayTxt}>Bugun</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sc.dayRow}>
          {DAYS.map(d => (
            <DayChip key={d.date} day={d.day} date={String(d.date)} today={d.today} active={activeDay===d.date} hasClasses={d.hasClasses} onPress={() => setActiveDay(d.date)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={sc.scroll} contentContainerStyle={sc.scrollPad} showsVerticalScrollIndicator={false}>
        {classes.length === 0 ? (
          <View style={sc.empty}>
            <Text style={{ fontSize:52, marginBottom:Spacing.md }}>📅</Text>
            <Text style={sc.emptyTitle}>Bugun dars yo'q</Text>
            <Text style={sc.emptySub}>Dam oling yoki mustaqil tayyorgarlik ko'ring</Text>
          </View>
        ) : (
          SLOTS.map((time, i) => {
            const cls   = classes.find(c => c.time === time);
            const lunch = cls?.lunch;
            const curr  = time === '10:00';
            return (
              <View key={i}>
                <View style={sc.timeRow}>
                  <View style={sc.timeCol}>
                    <Text style={[sc.timeTxt, curr && { color:Colors.secondary, fontWeight:FontWeight.bold }]}>{time}</Text>
                    {curr && <View style={sc.currLine} />}
                  </View>
                  {lunch ? (
                    <View style={sc.lunchCard}><Text style={sc.lunchTxt}>☕  Tushlik tanaffus  13:00–14:00</Text></View>
                  ) : cls ? (
                    <View style={[sc.classCard, { borderLeftColor:cls.color, backgroundColor:cls.color+'12' }]}>
                      <Text style={[sc.classSubject, { color:cls.color }]} numberOfLines={1}>{cls.subject}</Text>
                      <Text style={sc.classDetail}>{cls.room}  •  {cls.teacher}</Text>
                      <View style={[sc.durBadge, { backgroundColor:cls.color+'20', borderColor:cls.color+'40' }]}>
                        <Text style={[sc.durTxt, { color:cls.color }]}>{cls.dur} daqiqa</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={sc.emptySlot}><Text style={sc.emptySlotTxt}>Bo'sh vaqt</Text></View>
                  )}
                </View>
                <View style={sc.divider} />
              </View>
            );
          })
        )}
        <View style={{ height:Spacing.xl }} />
      </ScrollView>

      <BottomNav tabs={tabs} activeIndex={tab} onTabPress={(i) => {
        setTab(i);
        if (i===0) navigation?.navigate('StudentHome');
        if (i===2) navigation?.navigate('QRScanner');
        if (i===3) navigation?.navigate('Notifications');
      }} />
    </View>
  );
}

const sc = StyleSheet.create({
  root:          { flex:1, backgroundColor:Colors.background },
  header:        { backgroundColor:Colors.surface, borderBottomWidth:1, borderBottomColor:Colors.borderLight, ...Shadow.xs },
  titleRow:      { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md, marginBottom:Spacing.sm },
  title:         { fontSize:FontSize.h2, fontWeight:FontWeight.bold, color:Colors.primary },
  weekRow:       { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md, marginBottom:Spacing.sm },
  navBtn:        { width:32, height:32, borderRadius:16, backgroundColor:Colors.borderLight, alignItems:'center', justifyContent:'center' },
  weekLabel:     { flex:1, textAlign:'center', fontSize:FontSize.body-1, fontWeight:FontWeight.medium, color:Colors.textPrimary },
  todayBtn:      { backgroundColor:Colors.secondary, borderRadius:Radius.full, paddingHorizontal:12, paddingVertical:5, marginLeft:Spacing.sm },
  todayTxt:      { fontSize:FontSize.sm, color:Colors.white, fontWeight:FontWeight.semibold },
  dayRow:        { paddingHorizontal:Spacing.md, paddingBottom:Spacing.sm, gap:8 },
  scroll:        { flex:1 },
  scrollPad:     { padding:Spacing.md },
  timeRow:       { flexDirection:'row', alignItems:'flex-start', minHeight:72 },
  timeCol:       { width:52, alignItems:'flex-end', paddingRight:Spacing.sm, paddingTop:4 },
  timeTxt:       { fontSize:FontSize.xs, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  currLine:      { position:'absolute', right:-1, top:10, bottom:0, width:2, backgroundColor:Colors.secondary, borderRadius:1 },
  lunchCard:     { flex:1, backgroundColor:Colors.borderLight, borderRadius:Radius.md, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm, justifyContent:'center', marginBottom:Spacing.xs },
  lunchTxt:      { fontSize:FontSize.sm, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  classCard:     { flex:1, borderLeftWidth:4, borderRadius:Radius.md, padding:Spacing.sm, marginBottom:Spacing.xs },
  classSubject:  { fontSize:FontSize.body, fontWeight:FontWeight.bold, marginBottom:2 },
  classDetail:   { fontSize:FontSize.sm, color:Colors.textSecondary, marginBottom:Spacing.xs },
  durBadge:      { alignSelf:'flex-start', borderWidth:1, borderRadius:Radius.full, paddingHorizontal:8, paddingVertical:2 },
  durTxt:        { fontSize:FontSize.xs, fontWeight:FontWeight.semibold },
  emptySlot:     { flex:1, justifyContent:'center', paddingLeft:Spacing.sm, marginBottom:Spacing.xs },
  emptySlotTxt:  { fontSize:FontSize.sm, color:Colors.borderLight },
  divider:       { height:1, backgroundColor:Colors.borderLight, marginLeft:52 },
  empty:         { flex:1, alignItems:'center', justifyContent:'center', paddingTop:80 },
  emptyTitle:    { fontSize:FontSize.h3, fontWeight:FontWeight.bold, color:Colors.textPrimary, marginBottom:Spacing.xs },
  emptySub:      { fontSize:FontSize.body, color:Colors.textSecondary, textAlign:'center' },
});
