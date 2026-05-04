# BIU Smart App — GPS + WorkTimer Fix

## Maqsad
1. GPS aniqlikni 50m → 100m ga o'zgartir
2. Xodim binoga kirgan vaqtdan timer avtomatik boshlansin
3. Aktiv bino UI da aniq va real-time ko'rinsin

---

## FIX 1 — GPS radius 50m → 100m

`utils/gps.js` faylida:

```js
// XATO
export const GPS_RADIUS = 50; // ❌

// TO'G'RI
export const GPS_RADIUS = 100; // ✅ metr
```

`detectBuilding()` funksiyasida ham tekshir:
```js
export const detectBuilding = (userLat, userLon, buildings) => {
  for (const b of buildings) {
    const dist = getDistance(userLat, userLon, b.lat, b.lon);
    if (dist <= GPS_RADIUS) return b; // 100m ichida
  }
  return null;
};
```

---

## FIX 2 — Xodim binoga kirganida timer shu zahoti boshlansin

### Muammo:
```
Xodim 08:00 da binoga kiradi
Tizim GPS ni 08:15 da tasdiqlaydi
Timer 08:15 dan boshlanadi ← XATO
```

### Yechim — Real kirish vaqtini saqlash:

`MapScreen.js` yoki `BuildingSelectScreen.js` da GPS tasdiqlanganida:

```js
const handleBuildingConfirm = async (building) => {
  // 1. Hozirgi vaqtni aniq ol
  const now = new Date();
  const entryTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // 2. Yangi log yarat
  const newLog = {
    building: building.name,
    entry: entryTime,      // ← GPS tasdiqlangan vaqt, REAL CLOCK
    exit: null,            // ← hali chiqmagan
    lat: building.lat,
    lon: building.lon,
  };

  // 3. AsyncStorage dan bugungi loglarni ol
  const today = new Date().toISOString().slice(0, 10);
  const raw   = await AsyncStorage.getItem(`workday_${today}`);
  const saved = raw ? JSON.parse(raw) : { logs: [], isDayFinished: false };

  // 4. Oldingi aktiv logni yop (bino o'zgartirish)
  const updated = saved.logs.map(log =>
    log.exit === null
      ? { ...log, exit: entryTime }
      : log
  );
  updated.push(newLog);

  // 5. Saqlash
  await AsyncStorage.setItem(`workday_${today}`, JSON.stringify({
    ...saved,
    logs: updated,
  }));

  // 6. StaffHomeScreen ga qaytish + workLogs yangilash
  navigation.navigate('StaffHome', { workLogs: updated });
};
```

### StaffHomeScreen da — workLogs ni navigation params dan olish:

```js
// route.params dan olish
useEffect(() => {
  if (route?.params?.workLogs) {
    setWorkLogs(route.params.workLogs);
  }
}, [route?.params?.workLogs]);
```

---

## FIX 3 — calcWork() da entry vaqtini to'g'ri parse qilish

`StaffHomeScreen.js` yoki `WorkTimerCard` ichida:

```js
// XATO — faqat HH:MM parse qilish, sanani hisobga olmaslik
const [h, m] = log.entry.split(':').map(Number);
const entryDate = new Date();
entryDate.setHours(h, m, 0, 0); // ← kun o'tsa xato beradi

// TO'G'RI — bugungi sanani aniq belgilash
const parseEntryTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

// calcWork ichida:
const calcWork = (logs, workEnd) => {
  const now     = new Date();
  const [wh, wm] = workEnd.split(':').map(Number);
  const workEndDate = new Date();
  workEndDate.setHours(wh, wm, 0, 0);

  let total = 0;
  let hasActive = false;

  for (const log of logs) {
    const entry = parseEntryTime(log.entry);
    const exit  = log.exit ? parseEntryTime(log.exit) : now;
    const elapsed = Math.max(0, (exit - entry) / 1000);
    total += elapsed;
    if (!log.exit) hasActive = true;
  }

  const regular  = Math.min(total, 8 * 3600);
  const isOT     = now > workEndDate && hasActive;
  const overtime = isOT ? Math.max(0, total - 8 * 3600) : 0;

  const status = !hasActive
    ? 'done'
    : isOT
    ? 'overtime'
    : 'active';

  return { total, regular, overtime, hasActive, isOvertime: isOT, status };
};
```

---

## FIX 4 — Aktiv bino UI da aniq ko'rinsin

### StaffHomeScreen — Location card:

```js
// workLogs dan aktiv binoni top
const activeLog = workLogs.find(log => log.exit === null);
const activeBuildingName = activeLog?.building ?? 'Nomalum';
const activeEntryTime    = activeLog?.entry    ?? '--:--';
```

### Location card UI:

```js
<Card style={s.card} onPress={() => navigation.navigate('Map')}>
  <View style={s.cardRow}>

    {/* Pulsing green dot */}
    <View style={s.activeDotWrap}>
      <Animated.View style={[s.activeDotPulse, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
      <View style={s.activeDot} />
    </View>

    <View style={s.cardBody}>
      <Text style={s.cardCap}>Hozirgi joylashuv</Text>
      <Text style={s.cardTitle}>{activeBuildingName}</Text>
      <Text style={s.cardOk}>
        Kirdi: {activeEntryTime}  •  GPS tasdiqlangan ✓
      </Text>
    </View>

    {/* Live timer - shu binoda qancha vaqt */}
    <View style={s.buildingTimer}>
      <Text style={s.buildingTimerText}>{buildingElapsed}</Text>
      <Text style={s.buildingTimerLabel}>bu binoda</Text>
    </View>

  </View>
</Card>
```

### Binodagi vaqtni hisoblash:

```js
// Faqat aktiv log uchun elapsed
const [buildingElapsed, setBuildingElapsed] = useState('00:00');

useEffect(() => {
  if (!activeLog) return;
  const t = setInterval(() => {
    const [h, m] = activeLog.entry.split(':').map(Number);
    const entry  = new Date();
    entry.setHours(h, m, 0, 0);
    const secs   = Math.max(0, (new Date() - entry) / 1000);
    const bh     = Math.floor(secs / 3600);
    const bm     = Math.floor((secs % 3600) / 60);
    setBuildingElapsed(bh > 0 ? `${bh}s ${bm}d` : `${bm}d`);
  }, 1000);
  return () => clearInterval(t);
}, [activeLog?.entry]);
```

### Pulsing dot animatsiyasi:

```js
const pulseAnim    = useRef(new Animated.Value(1)).current;
const pulseOpacity = useRef(new Animated.Value(0.6)).current;

useEffect(() => {
  if (!activeLog) return;
  Animated.loop(
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pulseAnim,    { toValue: 1.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim,    { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0,   duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
      ]),
    ])
  ).start();
}, [activeLog]);
```

### Yangi stilllar:

```js
activeDotWrap: {
  width: 48, height: 48,
  alignItems: 'center', justifyContent: 'center',
  marginRight: 12,
},
activeDot: {
  width: 14, height: 14, borderRadius: 7,
  backgroundColor: Colors.success,
  position: 'absolute',
},
activeDotPulse: {
  width: 30, height: 30, borderRadius: 15,
  backgroundColor: Colors.success,
  position: 'absolute',
},
buildingTimer: {
  alignItems: 'center',
  paddingLeft: 8,
},
buildingTimerText: {
  fontSize: FontSize.body,
  fontWeight: FontWeight.bold,
  color: Colors.secondary,
},
buildingTimerLabel: {
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  marginTop: 2,
},
```

---

## Tekshirish (Testing checklist)

- [ ] GPS radius 100m ga o'zgartildi (`utils/gps.js`)
- [ ] Xodim binoga kirganida `entry = hozirgi real vaqt`
- [ ] Timer shu zahoti boshlanadi (kechikishmaydi)
- [ ] Location card da aktiv bino nomi ko'rinadi
- [ ] Location card da `"Kirdi: 08:30"` ko'rinadi
- [ ] Location card da `"3s 20d bu binoda"` live sanaydi
- [ ] Pulsing green dot animatsiyasi ishlaydi
- [ ] Bino o'zgartirsa — oldingi log yopiladi, yangi boshlanadi
- [ ] `calcWork()` to'g'ri elapsed hisoblaydi
- [ ] Overtime faqat `16:30` dan keyin boshlanadi

---

## MUHIM — O'zgartirma

```
❌ WorkTimerCard UI stillari (wt.* styles)
❌ Navigation stack tuzilmasi
❌ LoginScreen va boshqa screenlar
❌ users.json / data fayllar
✅ utils/gps.js → GPS_RADIUS = 100
✅ BuildingSelectScreen.js → handleBuildingConfirm()
✅ StaffHomeScreen.js → location card + activeLog logic
✅ calcWork() → parseEntryTime to'g'ri
```