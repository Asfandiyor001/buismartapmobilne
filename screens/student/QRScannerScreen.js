// ═══════════════════════════════════════════════════════════
// SCREEN 08 — student/QRScannerScreen.js  (Expo versiyasi)
// ═══════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, ZapOff, CheckCircle2, XCircle } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../../theme';
import { PrimaryButton } from '../../components';

const { width, height } = Dimensions.get('window');
const FRAME = 270;
const CORNER = 22;
const THICK = 3;

const ScanFrame = ({ active }) => {
  const lineY  = useRef(new Animated.Value(0)).current;
  const glowOp = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) return;
    Animated.loop(Animated.sequence([
      Animated.timing(lineY,  { toValue:1, duration:2200, useNativeDriver:true }),
      Animated.timing(lineY,  { toValue:0, duration:0,    useNativeDriver:true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowOp, { toValue:1,   duration:700, useNativeDriver:true }),
      Animated.timing(glowOp, { toValue:0.4, duration:700, useNativeDriver:true }),
    ])).start();
  }, [active]);

  const scanY = lineY.interpolate({ inputRange:[0,1], outputRange:[0, FRAME-2] });

  return (
    <View style={{ width:FRAME, height:FRAME, position:'relative' }}>
      {/* Corners */}
      {[[0,0,true,false,true,false],[0,'auto',true,false,false,true],['auto',0,false,true,true,false],['auto','auto',false,true,false,true]].map(([t,b,cH,cHr,cV,cVb], ci) => (
        <View key={ci} style={{ position:'absolute', top:t, bottom:b===0?0:undefined, left:cH?0:undefined, right:cHr?0:undefined, width:CORNER, height:CORNER }}>
          <View style={{ position:'absolute', top:0, left:cHr?'auto':0, right:cHr?0:'auto', width:CORNER, height:THICK, backgroundColor:Colors.white, borderRadius:2 }} />
          <View style={{ position:'absolute', top:cVb?'auto':0, bottom:cVb?0:'auto', left:0, width:THICK, height:CORNER, backgroundColor:Colors.white, borderRadius:2 }} />
        </View>
      ))}
      {active && (
        <Animated.View style={{ position:'absolute', left:4, right:4, height:2.5, backgroundColor:Colors.secondary, borderRadius:2, shadowColor:Colors.secondary, shadowOpacity:0.9, shadowOffset:{width:0,height:0}, shadowRadius:8, elevation:8, transform:[{ translateY:scanY }], opacity:glowOp }} />
      )}
    </View>
  );
};

const ResultSheet = ({ type, onClose }) => {
  const slideY  = useRef(new Animated.Value(400)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const insets  = useSafeAreaInsets();
  const ok      = type === 'success';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue:0, tension:55, friction:10, useNativeDriver:true }),
      Animated.sequence([
        Animated.timing(flashOp, { toValue:0.6, duration:120, useNativeDriver:true }),
        Animated.timing(flashOp, { toValue:0,   duration:400, useNativeDriver:true }),
      ]),
    ]).start();
  }, []);

  return (
    <>
      <Animated.View pointerEvents="none" style={[rs.flash, { backgroundColor: ok ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)', opacity:flashOp }]} />
      <Animated.View style={[rs.sheet, { transform:[{ translateY:slideY }], paddingBottom:insets.bottom+16 }]}>
        <View style={rs.handle} />
        <View style={[rs.iconCircle, { backgroundColor: ok ? Colors.successTint : Colors.dangerTint }]}>
          {ok ? <CheckCircle2 size={48} color={Colors.success} strokeWidth={1.5} /> : <XCircle size={48} color={Colors.danger} strokeWidth={1.5} />}
        </View>
        <Text style={[rs.title, !ok && { color:Colors.danger }]}>
          {ok ? '✅ Davomat qabul qilindi!' : '❌ Davomat qabul qilinmadi'}
        </Text>
        {ok ? (
          <>
            <Text style={rs.detail}>Matematika — 10:00</Text>
            <View style={rs.confirmedRow}>
              <View style={rs.confirmedDot} />
              <Text style={rs.confirmedTxt}>Tasdiqlandi: 09:58  •  ±4m GPS</Text>
            </View>
          </>
        ) : (
          <View style={rs.errorCard}>
            <Text style={rs.errorTxt}>⚠ Siz auditoriyada emassiz (GPS tasdiqlanmadi)</Text>
          </View>
        )}
        <PrimaryButton label="Yopish" onPress={onClose} color={ok ? Colors.success : Colors.danger} style={{ width:'100%', marginTop:Spacing.lg }} />
      </Animated.View>
    </>
  );
};

const rs = StyleSheet.create({
  flash:        { position:'absolute', top:0, left:0, right:0, bottom:0 },
  sheet:        { position:'absolute', bottom:0, left:0, right:0, backgroundColor:Colors.white, borderTopLeftRadius:Radius.xxl, borderTopRightRadius:Radius.xxl, padding:Spacing.xl, alignItems:'center', ...Shadow.modal },
  handle:       { width:40, height:4, borderRadius:Radius.full, backgroundColor:Colors.border, marginBottom:Spacing.lg },
  iconCircle:   { width:88, height:88, borderRadius:44, alignItems:'center', justifyContent:'center', marginBottom:Spacing.md },
  title:        { fontSize:FontSize.h2-2, fontWeight:FontWeight.bold, color:Colors.textPrimary, marginBottom:Spacing.sm, textAlign:'center' },
  detail:       { fontSize:FontSize.body, color:Colors.textSecondary },
  confirmedRow: { flexDirection:'row', alignItems:'center', marginTop:6 },
  confirmedDot: { width:8, height:8, borderRadius:4, backgroundColor:Colors.success, marginRight:6 },
  confirmedTxt: { fontSize:FontSize.caption, color:Colors.success, fontWeight:FontWeight.medium },
  errorCard:    { backgroundColor:Colors.dangerTint, borderRadius:Radius.md, padding:Spacing.md, width:'100%' },
  errorTxt:     { fontSize:FontSize.body-1, color:Colors.danger, textAlign:'center', lineHeight:22 },
});

export default function QRScannerScreen({ navigation }) {
  const [scanState, setScanState] = useState('scanning');
  const [flashOn,   setFlashOn]   = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const t = setTimeout(() => setScanState('success'), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={qr.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F172A','#1A2744','#0D4F6B']} style={StyleSheet.absoluteFill} />
      {[...Array(14)].map((_,i) => <View key={i} style={[qr.noise, { top:`${i*7.5}%` }]} />)}

      {/* Dark overlays */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <View style={{ height:(height-FRAME)/2-20, backgroundColor:'rgba(0,0,0,0.62)' }} />
        <View style={{ flexDirection:'row', height:FRAME }}>
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.62)' }} />
          <View style={{ width:FRAME }} />
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.62)' }} />
        </View>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.62)' }} />
      </View>

      {/* Frame */}
      <View pointerEvents="none" style={{ position:'absolute', top:(height-FRAME)/2-20, left:(width-FRAME)/2 }}>
        <ScanFrame active={scanState === 'scanning'} />
      </View>

      {/* Top bar */}
      <View style={[qr.topBar, { paddingTop:insets.top+12 }]}>
        <TouchableOpacity style={qr.iconBtn} onPress={() => navigation?.goBack()}>
          <ArrowLeft size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={qr.headerTitle}>QR Davomat</Text>
        <TouchableOpacity style={[qr.iconBtn, flashOn && qr.flashBtnOn]} onPress={() => setFlashOn(!flashOn)}>
          {flashOn ? <Zap size={18} color="#FCD34D" strokeWidth={2.5} /> : <ZapOff size={18} color={Colors.white} strokeWidth={2} />}
        </TouchableOpacity>
      </View>

      {scanState === 'scanning' && (
        <View style={qr.statusBar}>
          <View style={qr.statusDot} />
          <Text style={qr.statusTxt}>QR kodni skaner qilish maydoniga olib keling</Text>
        </View>
      )}

      {scanState !== 'scanning' && (
        <ResultSheet type={scanState} onClose={() => { setScanState('scanning'); navigation?.goBack(); }} />
      )}
    </View>
  );
}

const qr = StyleSheet.create({
  root:       { flex:1, backgroundColor:Colors.black },
  noise:      { position:'absolute', left:0, right:0, height:1, backgroundColor:Colors.white, opacity:0.03 },
  topBar:     { position:'absolute', left:0, right:0, flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md },
  iconBtn:    { width:42, height:42, borderRadius:21, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center' },
  flashBtnOn: { backgroundColor:'rgba(252,211,77,0.25)', borderWidth:1, borderColor:'#FCD34D' },
  headerTitle:{ flex:1, textAlign:'center', fontSize:FontSize.h3, fontWeight:FontWeight.semibold, color:Colors.white },
  statusBar:  { position:'absolute', bottom:height*0.2, left:Spacing.xl, right:Spacing.xl, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  statusDot:  { width:8, height:8, borderRadius:4, backgroundColor:Colors.secondary },
  statusTxt:  { fontSize:FontSize.body-1, color:'rgba(255,255,255,0.8)', textAlign:'center' },
});