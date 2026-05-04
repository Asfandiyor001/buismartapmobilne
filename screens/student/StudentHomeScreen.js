// ═══════════════════════════════════════════════════════════
// SCREEN 07 — student/StudentHomeScreen.js  (Expo versiyasi)
// ═══════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, Clock, AlertTriangle, CheckCircle2, LogOut, User, GraduationCap, School, Mail, Phone, ChevronRight,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { AttendanceRing, SectionHeader, ProgressBar, StatusChip, Card, BottomNav } from '../../components';
import { useAuthStore } from '../../src/store';

const CLASSES = [
  { id:1, subject:'Fizika',         time:'08:00–09:30', room:'210-xona', status:'done',    color:'#3B82F6' },
  { id:2, subject:'Matematika',     time:'10:00–11:30', room:'305-xona', status:'next',    color:'#10B981' },
  { id:3, subject:'Ingliz tili',    time:'12:00–13:30', room:'112-xona', status:'pending', color:'#F59E0B' },
  { id:4, subject:'Veb dasturlash', time:'14:00–15:30', room:'Lab-2',    status:'missed',  color:'#EF4444' },
];

const ATTEND = [
  { name:'Matematika',     pct:96 }, { name:'Fizika',         pct:90 },
  { name:'Ingliz tili',    pct:100}, { name:'Veb dasturlash', pct:74 },
  { name:'Algoritmlar',    pct:88 },
];

const ASSIGNMENTS = [
  { urgent:true,  title:"Ma'lumotlar tuzilmasi — Lab 5", subject:'Algoritmlar',    teacher:'Tursunov F.', deadline:'Bugun 23:59' },
  { urgent:false, title:'Veb-sayt loyiha — Bosqich 2',  subject:'Veb dasturlash', teacher:'Xasanov S.',  deadline:'30 Aprel', status:'Kutilmoqda' },
  { urgent:false, title:'Fizika test ishi — B2 variant', subject:'Fizika',         teacher:'Mirzayev K.',deadline:'28 Aprel', status:'Topshirildi' },
];

const GRADES = [
  { sub:'Matematika',  mid:85, fin:78, tot:83 },
  { sub:'Fizika',      mid:72, fin:80, tot:76 },
  { sub:'Ingliz tili', mid:90, fin:88, tot:89 },
  { sub:'Algoritmlar', mid:78, fin:82, tot:80 },
];

const ac = (p) => p >= 85 ? Colors.success : p >= 75 ? Colors.warning : Colors.danger;

function StudentLogoutModal({ visible, onClose, onConfirm }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={pm.overlay} onPress={onClose}>
        <Pressable style={pm.sheet} onPress={() => {}}>
          <View style={[pm.iconWrap, { backgroundColor: Colors.dangerTint }]}>
            <LogOut size={32} color={Colors.danger} strokeWidth={2} />
          </View>
          <Text style={pm.sheetTitle}>Tizimdan chiqish</Text>
          <Text style={pm.sheetDesc}>{`Tizimdan chiqmoqchimisiz?\nBarcha ma'lumotlar saqlanadi.`}</Text>
          <View style={pm.btnRow}>
            <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
              <Text style={pm.cancelBtnTxt}>Bekor qilish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pm.dangerBtn} onPress={onConfirm}>
              <LogOut size={16} color={Colors.white} strokeWidth={2} />
              <Text style={pm.dangerBtnTxt}>Chiqish</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function StudentHomeScreen({ navigation, route }) {
  const authUser = useAuthStore((s) => s.user);
  const user = route?.params?.user || authUser || null;
  const [tab, setTab] = useState(0);
  const [logoutModal, setLogoutModal] = useState(false);
  const insets = useSafeAreaInsets();

  const tabs = [
    { label:'Bosh sahifa' }, { label:'Jadval' },
    { label:'QR' }, { label:'Xabarlar' }, { label:'Profil' },
  ];

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* TEAL GRADIENT HEADER */}
      <LinearGradient
        colors={['#028090','#0369a1','#1E2761']}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.decor1} />
        <View style={s.decor2} />

        <View style={s.topRow}>
          <View style={s.topLeft}>
            <View style={[s.avatar, { backgroundColor:'#E74C3C' }]}>
              <Text style={s.avatarTxt}>{user ? user.initials : 'KR'}</Text>
            </View>
            <View style={{ marginLeft:12 }}>
              <Text style={s.greeting}>Salom, {user ? user.name.split(' ')[1] || user.name : 'Kamola'}! 👋</Text>
              <Text style={s.greetingSub}>Guruh: {user ? user.group : 'IT-22-1'}  •  {user ? user.course + '-kurs' : '3-kurs'}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.bellWrap} onPress={() => navigation?.navigate('Notifications')}>
            <Bell size={22} color={Colors.white} strokeWidth={2} />
            <View style={s.bellBadge} />
          </TouchableOpacity>
        </View>

        <View style={s.pill}>
          <View style={[s.pillDot, { backgroundColor:Colors.success }]} />
          <Text style={s.pillTxt}>Bugungi dars: 3 ta  •  Davomat: {user ? user.attendance : 94}%</Text>
        </View>

        <View style={s.statsRow}>
          {[
            { v:'94%', l:'Davomat' }, { v:'3/4', l:'Bugun' }, { v:'3.8', l:'GPA' },
          ].map((st, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={s.statDiv} />}
              <View style={s.stat}>
                <Text style={s.statV}>{st.v}</Text>
                <Text style={s.statL}>{st.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {tab === 4 ? (
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollPad, s.profileScrollPad, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.profHero}>
          <LinearGradient
            colors={['rgba(2,128,144,0.12)','rgba(3,105,161,0.08)']}
            style={s.profHeroGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={[s.profAvatarLg, { backgroundColor: '#E74C3C' }]}>
            <Text style={s.profAvatarLgTxt}>{user?.initials || 'KR'}</Text>
          </View>
          <Text style={s.profName}>{user?.name || 'Kamola Rasulova'}</Text>
          <Text style={s.profSub}>Talaba  •  BIU Smart</Text>
        </View>

        <Card style={s.profCard}>
          {[
            { icon: School,  label: 'Guruh',  value: user?.group || 'IT-22-1',    color: '#028090' },
            { icon: GraduationCap, label: 'Kurs', value: `${user?.course ?? 3}-kurs`, color: '#0369a1' },
            { icon: User, label: 'Davomat', value: `${user?.attendance ?? 94}%`, color: '#10B981' },
          ].map((row, i) => (
            <View
              key={row.label}
              style={[s.profRow, i > 0 && s.profRowBorder]}
            >
              <View style={[s.profRowIcon, { backgroundColor: row.color + '18' }]}>
                <row.icon size={18} color={row.color} strokeWidth={2.2} />
              </View>
              <View style={s.profRowBody}>
                <Text style={s.profRowLbl}>{row.label}</Text>
                <Text style={s.profRowVal}>{row.value}</Text>
              </View>
              <ChevronRight size={18} color={Colors.textDisabled} strokeWidth={2} />
            </View>
          ))}
        </Card>

        {(user?.email || user?.phone || user?.phone_work) && (
          <Card style={s.profCard}>
            {user?.email ? (
              <View style={s.profRow}>
                <View style={[s.profRowIcon, { backgroundColor: Colors.borderLight }]}>
                  <Mail size={18} color={Colors.textSecondary} strokeWidth={2} />
                </View>
                <View style={s.profRowBody}>
                  <Text style={s.profRowLbl}>Email</Text>
                  <Text style={s.profRowVal} numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
            ) : null}
            {(user?.phone || user?.phone_work) && (
              <View style={[s.profRow, user?.email && s.profRowBorder]}>
                <View style={[s.profRowIcon, { backgroundColor: Colors.borderLight }]}>
                  <Phone size={18} color={Colors.textSecondary} strokeWidth={2} />
                </View>
                <View style={s.profRowBody}>
                  <Text style={s.profRowLbl}>Telefon</Text>
                  <Text style={s.profRowVal}>{user.phone || user.phone_work}</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        <TouchableOpacity
          style={s.stLogoutBtn}
          activeOpacity={0.88}
          onPress={() => setLogoutModal(true)}
        >
          <LogOut size={20} color={Colors.danger} strokeWidth={2.2} />
          <Text style={s.stLogoutBtnTxt}>Tizimdan chiqish</Text>
        </TouchableOpacity>
      </ScrollView>
      ) : (
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false}>

        {/* Today's classes */}
        <SectionHeader title="Bugungi darslar" actionLabel="Hammasi" />

        {/* Next class */}
        <View style={s.nextCard}>
          <View style={s.nextBorder} />
          <View style={s.nextBody}>
            <View style={s.nextBadge}><Text style={s.nextBadgeTxt}>⚡ Keyingi dars</Text></View>
            <Text style={s.nextSubject}>Matematika</Text>
            <Text style={s.nextDetail}>10:00 — 11:30  •  305-xona</Text>
            <View style={s.nextTeacher}>
              <View style={s.teachAv}><Text style={s.teachAvTxt}>KA</Text></View>
              <Text style={s.teachName}>Karimov A.</Text>
            </View>
          </View>
          <View style={s.cdownChip}>
            <Clock size={12} color={Colors.white} strokeWidth={2.5} />
            <Text style={s.cdownTxt}>{'\n'}32{'\n'}daqiqa</Text>
          </View>
        </View>

        {CLASSES.filter(c => c.status !== 'next').map((c) => (
          <View key={c.id} style={s.classRow}>
            <View style={[s.classDot, { backgroundColor:c.color }]} />
            <View style={s.classBody}>
              <Text style={s.classSubject}>{c.subject}</Text>
              <Text style={s.classDetail}>{c.time}  •  {c.room}</Text>
            </View>
            <StatusChip status={c.status} />
          </View>
        ))}

        {/* Attendance */}
        <SectionHeader title="Davomat holati" actionLabel="Batafsil" />
        <Card style={s.card}>
          <Text style={s.cardTitle2}>Bu semestr davomati</Text>
          <View style={s.attendRow}>
            <AttendanceRing percent={94} size={90} stroke={10} color={Colors.success} />
            <View style={{ marginLeft:Spacing.md }}>
              <Text style={s.attendStat}>46 / 49 dars</Text>
              <Text style={s.attendSub}>3 dars o'tkazildi</Text>
              <Text style={s.attendSub}>Semestr: 2024/25</Text>
            </View>
          </View>
          {ATTEND.map((at, i) => (
            <View key={i} style={s.subRow}>
              <Text style={s.subName} numberOfLines={1}>{at.name}</Text>
              <View style={{ flex:1, marginHorizontal:Spacing.sm }}>
                <ProgressBar progress={at.pct/100} color={ac(at.pct)} height={6} />
              </View>
              <Text style={[s.subPct, { color:ac(at.pct) }]}>{at.pct}%</Text>
            </View>
          ))}
          <View style={s.warnStrip}>
            <AlertTriangle size={13} color={Colors.warning} strokeWidth={2.5} />
            <Text style={s.warnTxt}> Veb dasturlash: chegara pastida (74% {'<'} 80%)</Text>
          </View>
        </Card>

        {/* Assignments */}
        <SectionHeader title="Topshiriqlar" actionLabel="Ko'proq" />
        {ASSIGNMENTS.map((a, i) => (
          <View key={i} style={[s.assignCard, a.urgent ? { backgroundColor:Colors.dangerTint, borderLeftColor:Colors.danger } : { backgroundColor:Colors.surface, borderLeftColor:Colors.border }]}>
            {a.urgent && <View style={s.urgentBadge}><Text style={s.urgentTxt}>🔴 Muddati bugun!</Text></View>}
            <Text style={s.assignTitle}>{a.title}</Text>
            <Text style={s.assignSub}>{a.subject}  •  {a.teacher}</Text>
            <View style={s.assignFooter}>
              <Text style={[s.assignDL, a.urgent && { color:Colors.danger }]}>🕐 {a.deadline}</Text>
              {a.urgent
                ? <TouchableOpacity style={s.submitBtn}><Text style={s.submitTxt}>Topshirish →</Text></TouchableOpacity>
                : <View style={[s.sChip, { backgroundColor: a.status === 'Topshirildi' ? Colors.successTint : Colors.warningTint }]}>
                    <Text style={[s.sChipTxt, { color: a.status === 'Topshirildi' ? Colors.success : Colors.warning }]}>
                      {a.status === 'Topshirildi' ? '✓ Topshirildi' : '⏳ ' + a.status}
                    </Text>
                  </View>
              }
            </View>
          </View>
        ))}

        {/* Grades */}
        <SectionHeader title="Baholar" actionLabel="Barchasi" />
        <View style={s.gradesCard}>
          <LinearGradient colors={['#1E2761','#028090']} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={s.gradesHeader}>
            {['Fan','Oraliq','Yakuniy','Jami'].map((h, i) => (
              <Text key={i} style={[s.gradeH, i === 0 && { flex:2, textAlign:'left' }]}>{h}</Text>
            ))}
          </LinearGradient>
          {GRADES.map((g, i) => (
            <View key={i} style={[s.gradeRow, i%2===0 && { backgroundColor:Colors.background }]}>
              <Text style={[s.gradeCell, { flex:2, textAlign:'left', fontWeight:FontWeight.medium, color:Colors.textPrimary }]} numberOfLines={1}>{g.sub}</Text>
              <Text style={s.gradeCell}>{g.mid}</Text>
              <Text style={s.gradeCell}>{g.fin}</Text>
              <Text style={[s.gradeCell, { color:Colors.secondary, fontWeight:FontWeight.bold }]}>{g.tot}</Text>
            </View>
          ))}
          <View style={s.gpaRow}>
            <Text style={[s.gradeCell, { flex:2, textAlign:'left', fontWeight:FontWeight.bold, color:Colors.textPrimary }]}>GPA</Text>
            <Text style={s.gradeCell} /><Text style={s.gradeCell} />
            <Text style={[s.gradeCell, { color:Colors.secondary, fontWeight:FontWeight.bold, fontSize:FontSize.body }]}>3.8</Text>
          </View>
        </View>

        <View style={{ height:Spacing.xl }} />
      </ScrollView>
      )}

      <StudentLogoutModal
        visible={logoutModal}
        onClose={() => setLogoutModal(false)}
        onConfirm={async () => {
          setLogoutModal(false);
          await useAuthStore.getState().logout();
          navigation?.reset({ index: 0, routes: [{ name: 'Login' }] });
        }}
      />

      <BottomNav tabs={tabs} activeIndex={tab} onTabPress={(i) => {
        setTab(i);
        if (i===1) navigation?.navigate('Schedule');
        if (i===2) navigation?.navigate('QRScanner');
        if (i===3) navigation?.navigate('Notifications');
      }} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex:1, backgroundColor:Colors.background },
  header: { paddingHorizontal:Spacing.md+4, paddingBottom:Spacing.lg, overflow:'hidden' },
  decor1: { position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:100, backgroundColor:'rgba(255,255,255,0.07)' },
  decor2: { position:'absolute', bottom:-20, left:-30, width:140, height:140, borderRadius:70, backgroundColor:'rgba(30,39,97,0.2)' },

  topRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.md },
  topLeft:     { flexDirection:'row', alignItems:'center', flex:1 },
  avatar:      { width:48, height:48, borderRadius:24, borderWidth:2, borderColor:'rgba(255,255,255,0.4)', alignItems:'center', justifyContent:'center' },
  avatarTxt:   { fontSize:16, fontWeight:FontWeight.bold, color:Colors.white },
  greeting:    { fontSize:FontSize.h3-1, fontWeight:FontWeight.semibold, color:Colors.white },
  greetingSub: { fontSize:FontSize.caption, color:Colors.accent, marginTop:2 },
  bellWrap:    { position:'relative', padding:6 },
  bellBadge:   { position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4, backgroundColor:Colors.danger, borderWidth:1.5, borderColor:Colors.secondary },

  pill:    { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.15)', borderWidth:1, borderColor:'rgba(255,255,255,0.3)', borderRadius:Radius.full, paddingVertical:8, paddingHorizontal:18, alignSelf:'center', marginBottom:Spacing.md },
  pillDot: { width:8, height:8, borderRadius:4, marginRight:8 },
  pillTxt: { fontSize:13, fontWeight:FontWeight.medium, color:Colors.white },

  statsRow: { flexDirection:'row', paddingTop:Spacing.md, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.15)' },
  stat:     { flex:1, alignItems:'center' },
  statV:    { fontSize:20, fontWeight:FontWeight.bold, color:Colors.white },
  statL:    { fontSize:FontSize.xs, color:Colors.accent, marginTop:2 },
  statDiv:  { width:1, backgroundColor:'rgba(255,255,255,0.2)', marginVertical:4 },

  scroll:    { flex:1 },
  scrollPad: { paddingHorizontal:Spacing.md },

  nextCard:     { backgroundColor:Colors.primary, borderRadius:Radius.lg, flexDirection:'row', overflow:'hidden', ...Shadow.card, marginBottom:Spacing.sm },
  nextBorder:   { width:4, backgroundColor:Colors.secondary },
  nextBody:     { flex:1, padding:Spacing.md },
  nextBadge:    { backgroundColor:'rgba(202,220,252,0.2)', borderRadius:Radius.full, paddingVertical:4, paddingHorizontal:10, alignSelf:'flex-start', marginBottom:6 },
  nextBadgeTxt: { fontSize:FontSize.xs, color:Colors.accent, fontWeight:FontWeight.semibold },
  nextSubject:  { fontSize:FontSize.h3, fontWeight:FontWeight.bold, color:Colors.white },
  nextDetail:   { fontSize:FontSize.caption, color:Colors.accent, marginTop:2 },
  nextTeacher:  { flexDirection:'row', alignItems:'center', marginTop:Spacing.sm },
  teachAv:      { width:28, height:28, borderRadius:14, backgroundColor:Colors.secondary, alignItems:'center', justifyContent:'center', marginRight:6 },
  teachAvTxt:   { fontSize:9, fontWeight:FontWeight.bold, color:Colors.white },
  teachName:    { fontSize:FontSize.caption, color:Colors.white },
  cdownChip:    { backgroundColor:Colors.secondary, margin:Spacing.md, borderRadius:Radius.md, paddingHorizontal:Spacing.sm, alignItems:'center', justifyContent:'center', minWidth:56 },
  cdownTxt:     { fontSize:18, fontWeight:FontWeight.bold, color:Colors.white, textAlign:'center', lineHeight:20 },

  classRow:    { flexDirection:'row', alignItems:'center', backgroundColor:Colors.surface, borderRadius:Radius.md, padding:Spacing.md, marginBottom:Spacing.xs, ...Shadow.card },
  classDot:    { width:6, height:6, borderRadius:3, marginRight:12 },
  classBody:   { flex:1 },
  classSubject:{ fontSize:FontSize.body-1, fontWeight:FontWeight.semibold, color:Colors.textPrimary },
  classDetail: { fontSize:FontSize.caption, color:Colors.textSecondary, marginTop:2 },

  card:       { backgroundColor:Colors.surface, borderRadius:Radius.md, padding:Spacing.md, ...Shadow.card },
  cardTitle2: { fontSize:FontSize.body, fontWeight:FontWeight.semibold, color:Colors.textPrimary, marginBottom:Spacing.md },
  attendRow:  { flexDirection:'row', alignItems:'center', marginBottom:Spacing.md },
  attendStat: { fontSize:FontSize.body, fontWeight:FontWeight.bold, color:Colors.textPrimary },
  attendSub:  { fontSize:FontSize.caption, color:Colors.textSecondary, marginTop:2 },
  subRow:     { flexDirection:'row', alignItems:'center', marginBottom:8 },
  subName:    { fontSize:FontSize.caption, color:Colors.textPrimary, width:92 },
  subPct:     { fontSize:FontSize.caption, fontWeight:FontWeight.semibold, width:36, textAlign:'right' },
  warnStrip:  { flexDirection:'row', alignItems:'center', backgroundColor:Colors.warningTint, borderRadius:Radius.sm, padding:Spacing.sm, marginTop:Spacing.sm, borderLeftWidth:3, borderLeftColor:Colors.warning },
  warnTxt:    { fontSize:FontSize.sm, color:'#B45309' },

  assignCard:   { borderRadius:Radius.md, padding:Spacing.md, marginBottom:Spacing.sm, ...Shadow.card, borderLeftWidth:4 },
  urgentBadge:  { backgroundColor:Colors.danger, borderRadius:Radius.full, paddingVertical:3, paddingHorizontal:10, alignSelf:'flex-start', marginBottom:6 },
  urgentTxt:    { fontSize:FontSize.xs, color:Colors.white, fontWeight:FontWeight.bold },
  assignTitle:  { fontSize:FontSize.body-1, fontWeight:FontWeight.semibold, color:Colors.textPrimary },
  assignSub:    { fontSize:FontSize.caption, color:Colors.textSecondary, marginTop:2 },
  assignFooter: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:Spacing.sm },
  assignDL:     { fontSize:FontSize.caption, color:Colors.textSecondary },
  submitBtn:    { backgroundColor:Colors.danger, borderRadius:Radius.full, paddingVertical:6, paddingHorizontal:Spacing.md },
  submitTxt:    { fontSize:FontSize.sm, color:Colors.white, fontWeight:FontWeight.semibold },
  sChip:        { borderRadius:Radius.full, paddingVertical:4, paddingHorizontal:10 },
  sChipTxt:     { fontSize:FontSize.xs, fontWeight:FontWeight.semibold },

  gradesCard:   { backgroundColor:Colors.surface, borderRadius:Radius.md, overflow:'hidden', ...Shadow.card },
  gradesHeader: { flexDirection:'row', paddingVertical:11, paddingHorizontal:Spacing.md },
  gradeH:       { flex:1, fontSize:FontSize.sm, color:Colors.white, fontWeight:FontWeight.semibold, textAlign:'center' },
  gradeRow:     { flexDirection:'row', paddingVertical:10, paddingHorizontal:Spacing.md },
  gradeCell:    { flex:1, fontSize:FontSize.caption, color:Colors.textSecondary, textAlign:'center' },
  gpaRow:       { flexDirection:'row', paddingVertical:11, paddingHorizontal:Spacing.md, borderTopWidth:1, borderTopColor:Colors.border, backgroundColor:Colors.secondaryTint },

  profileScrollPad: { paddingTop: Spacing.sm },
  profHero:        { alignItems: 'center', marginBottom: Spacing.lg, paddingVertical: Spacing.lg, marginTop: 4, position: 'relative', borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface, ...Shadow.card },
  profHeroGrad:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.lg },
  profAvatarLg:    { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, zIndex: 1, ...Shadow.card },
  profAvatarLgTxt: { fontSize: 30, fontWeight: FontWeight.bold, color: Colors.white },
  profName:        { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', zIndex: 1, paddingHorizontal: Spacing.md },
  profSub:         { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 4, zIndex: 1 },
  profCard:        { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.sm, ...Shadow.card },
  profRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  profRowBorder:   { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  profRowIcon:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  profRowBody:     { flex: 1, marginLeft: 12, marginRight: 8 },
  profRowLbl:      { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  profRowVal:      { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginTop: 2 },
  stLogoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.danger, backgroundColor: Colors.white, minHeight: 52, borderRadius: Radius.full, marginTop: Spacing.md, gap: 8, ...Shadow.card },
  stLogoutBtnTxt:  { color: Colors.danger, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});

const pm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', ...Shadow.modal },
  iconWrap:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, marginBottom: Spacing.md },
  sheetTitle: { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  sheetDesc:  { fontSize: FontSize.body - 1, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: Spacing.md, lineHeight: 22 },
  btnRow:     { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.md },
  cancelBtn:  { flex: 1, height: 52, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelBtnTxt: { color: Colors.textSecondary, fontSize: FontSize.body - 1, fontWeight: FontWeight.semibold },
  dangerBtn:  { flex: 1, height: 52, borderRadius: Radius.full, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  dangerBtnTxt: { color: Colors.white, fontSize: FontSize.body - 1, fontWeight: FontWeight.semibold },
});