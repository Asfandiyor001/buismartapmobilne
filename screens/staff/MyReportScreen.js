import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Share2,
  CheckCircle2, Clock, TrendingUp,
  Calendar, Building2,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const MONTHS_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export default function MyReportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/reports/monthly?year=${year}&month=${month}`);
      setData(res.data.data);
    } catch (e) {
      console.log('Report error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrent) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const summary = data?.summary || {};
  const sessions = data?.sessions || [];

  const totalH = parseFloat((summary.totalHours || 0).toFixed(1));
  const regularH = parseFloat((summary.regularHours || 0).toFixed(1));
  const overtimeH = parseFloat((summary.overtimeHours || 0).toFixed(1));
  const expectedH = summary.expectedHours || 208;
  const attendancePct = summary.attendancePct || 0;
  const progressPct = Math.min((totalH / expectedH) * 100, 100);

  const attendanceColor = attendancePct >= 80 ? '#10B981'
    : attendancePct >= 60 ? '#F59E0B'
      : attendancePct >= 40 ? '#F97316'
        : '#EF4444';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
    return `${days[d.getDay()]}, ${d.getDate()}`;
  };

  const getStatusColor = (s) => s === 'done' ? '#10B981' : s === 'active' ? '#028090' : '#94A3B8';
  const getStatusLabel = (s) => s === 'done' ? 'Keldi' : s === 'active' ? 'Aktiv' : 'Kelmadi';

  const maxH = Math.max(...sessions.map(s => (s.total_seconds || 0) / 3600), 8);

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={{
        backgroundColor: '#1E2761',
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
      }}>
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: 'white' }}>Mening hisobotim</Text>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Share2 size={18} color="white" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Month tabs */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {MONTHS.map((m, i) => {
            const isActive = (i + 1) === month;
            const isFuture = year === now.getFullYear() && (i + 1) > now.getMonth() + 1;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => !isFuture && setMonth(i + 1)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? 'white' : 'transparent',
                  opacity: isFuture ? 0.3 : 1,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#1E2761' : 'rgba(255,255,255,0.7)',
                }}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hero: total hours + progress */}
        <View style={{ paddingVertical: 20, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
            {MONTHS_FULL[month - 1].toUpperCase()} — JAMI ISHLANGAN
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 52, fontWeight: '800', color: 'white', lineHeight: 56 }}>
              {loading ? '—' : totalH}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
              soat
            </Text>
            {overtimeH > 0 && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 20,
                paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6,
              }}>
                <TrendingUp size={12} color="#10B981" />
                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>+{overtimeH}s extra</Text>
              </View>
            )}
          </View>
          {/* Progress bar */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${progressPct}%`, backgroundColor: '#028090', borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>0s</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Norma: {expectedH} soat</Text>
            </View>
          </View>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#028090" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              colors={['#028090']}
            />
          }
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 12 }}
        >
          {/* STAT CARDS (2 columns) */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* DAVOMAT */}
            <View style={{
              flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: attendanceColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color={attendanceColor} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }}>DAVOMAT</Text>
              </View>
              <Text style={{ fontSize: 36, fontWeight: '800', color: attendanceColor, lineHeight: 40 }}>
                {attendancePct.toFixed(0)}%
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {summary.presentDays || 0} / {summary.workdaysInMonth || 0} ish kuni
              </Text>
            </View>

            {/* VAQTILIK */}
            <View style={{
              flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C740', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} color="#F59E0B" strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }}>VAQTILIK</Text>
              </View>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#F59E0B', lineHeight: 40 }}>
                {regularH} s
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {overtimeH > 0 ? `+${overtimeH} soat qo'shimcha` : "Qo'shimcha vaqt yo'q"}
              </Text>
            </View>
          </View>

          {/* QUICK STATS ROW (3 items) */}
          <View style={{
            backgroundColor: 'white', borderRadius: 16, padding: 14,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            flexDirection: 'row',
          }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>{summary.presentDays || 0}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Keldi</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#F1F5F9' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#EF4444' }}>{summary.absentDays || 0}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Kelmadi</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#F1F5F9' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#F59E0B' }}>{summary.vacationDays || 0}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Ta'til</Text>
            </View>
          </View>

          {/* BAR CHART */}
          {sessions.length > 0 && (
            <View style={{
              backgroundColor: 'white', borderRadius: 16, padding: 14,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Kunlik ish soatlari</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{MONTHS_FULL[month - 1]} — har bir ustun = 1 kun</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#028090' }} />
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Ish</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Qo'shimcha</Text>
                  </View>
                </View>
              </View>

              {/* Chart bars */}
              <View style={{ height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                {sessions.map((s, idx) => {
                  const h = (s.total_seconds || 0) / 3600;
                  const oh = (s.overtime_seconds || 0) / 3600;
                  const rh = h - oh;
                  const barH = Math.max((h / maxH) * 80, s.status === 'absent' ? 0 : 3);
                  const isToday = s.work_date === now.toISOString().slice(0, 10);
                  return (
                    <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 100 }}>
                      {isToday && h > 0 && (
                        <Text style={{ fontSize: 8, color: '#028090', fontWeight: '700', marginBottom: 2 }}>
                          {h.toFixed(1)}
                        </Text>
                      )}
                      <View style={{ width: '100%', borderRadius: 3, overflow: 'hidden', height: barH }}>
                        <View style={{ flex: rh > 0 ? rh : 1, backgroundColor: s.status === 'absent' ? '#F1F5F9' : '#028090' }} />
                        {oh > 0 && <View style={{ flex: oh, backgroundColor: '#F59E0B' }} />}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* X axis labels */}
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                {sessions.map((s, idx) => {
                  const show = idx === 0 || idx === Math.floor(sessions.length / 2) || idx === sessions.length - 1;
                  return (
                    <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                      {show && (
                        <Text style={{ fontSize: 9, color: '#94A3B8' }}>{formatDate(s.work_date)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* BUILDING STATS */}
          {summary.buildingStats && Object.keys(summary.buildingStats).length > 0 && (
            <View style={{
              backgroundColor: 'white', borderRadius: 16, padding: 14,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Building2 size={16} color="#028090" strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Binolar bo'yicha</Text>
              </View>
              {Object.entries(summary.buildingStats).map(([name, hours], idx) => {
                const colors = ['#028090', '#1E2761', '#7C3AED'];
                const c = colors[idx % colors.length];
                const maxB = Math.max(...Object.values(summary.buildingStats));
                return (
                  <View key={name} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '500', flex: 1 }} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={{ fontSize: 13, color: c, fontWeight: '700' }}>{hours.toFixed(1)}s</Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: '#F1F5F9', borderRadius: 3 }}>
                      <View style={{ height: 5, width: `${(hours / maxB) * 100}%`, backgroundColor: c, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* DAILY SESSIONS LIST */}
          {sessions.length > 0 && (
            <View style={{
              backgroundColor: 'white', borderRadius: 16, padding: 14,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Calendar size={16} color="#028090" strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Kunlik tafsilot</Text>
              </View>
              {sessions.map((s, idx) => {
                const sc = getStatusColor(s.status);
                const h = ((s.total_seconds || 0) / 3600).toFixed(1);
                const oh = ((s.overtime_seconds || 0) / 3600).toFixed(1);
                return (
                  <View key={idx} style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 10,
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: '#F8FAFC',
                  }}>
                    {/* Date */}
                    <View style={{ width: 52 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>
                        {formatDate(s.work_date)}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                        {s.work_date?.slice(5, 10)}
                      </Text>
                    </View>

                    {/* Status dot */}
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: sc, marginHorizontal: 10,
                    }} />

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: sc + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: sc, fontWeight: '600' }}>
                            {getStatusLabel(s.status)}
                          </Text>
                        </View>
                        {parseFloat(oh) > 0 && (
                          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>+{oh}s</Text>
                          </View>
                        )}
                      </View>
                      {s.status !== 'absent' && (
                        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                          {s.first_entry_time?.slice(0, 5)} → {s.last_exit_time?.slice(0, 5)}
                        </Text>
                      )}
                    </View>

                    {/* Hours */}
                    {s.status !== 'absent' && (
                      <Text style={{ fontSize: 16, fontWeight: '800', color: sc }}>
                        {h}s
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty state */}
          {sessions.length === 0 && !loading && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40 }}>📅</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 12 }}>
                Ma'lumot topilmadi
              </Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
                Bu oyda ish ma'lumotlari mavjud emas
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
