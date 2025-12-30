import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AdminAnalyticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [songAnalytics, setSongAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, userRes, songRes] = await Promise.all([
        adminService.getAnalytics(selectedPeriod),
        adminService.getUserAnalytics(),
        adminService.getSongAnalytics(),
      ]);
      
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (userRes.success) setUserAnalytics(userRes.data);
      if (songRes.success) setSongAnalytics(songRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const StatBox = ({ icon, title, value, sub, color }) => (
    <View style={styles.statBox}>
      <View style={[styles.boxIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.boxValue}>{value}</Text>
      <Text style={styles.boxTitle}>{title}</Text>
      <Text style={[styles.boxSub, { color: color }]}>{sub}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PHÂN TÍCH HỆ THỐNG</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodTabs}>
          {[
            { id: '7d', label: '7 Ngày' },
            { id: '30d', label: '30 Ngày' },
            { id: '90d', label: '3 Tháng' },
            { id: '1y', label: '1 Năm' }
          ].map(p => (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.periodBtn, selectedPeriod === p.id && styles.activePeriod]}
              onPress={() => setSelectedPeriod(p.id)}
            >
              <Text style={[styles.periodText, selectedPeriod === p.id && styles.activePeriodText]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
        ) : (
          <View style={styles.innerContent}>
            {/* Quick Overview */}
            <Text style={styles.sectionLabel}>TỔNG QUAN HIỆU SUẤT</Text>
            <View style={styles.statsGrid}>
              <StatBox 
                icon="people" 
                title="Người dùng" 
                value={(analytics?.totalUsers || 0).toLocaleString()} 
                sub={`+${analytics?.newUsers || 0} mới`}
                color="#3B82F6" 
              />
              <StatBox 
                icon="musical-notes" 
                title="Bài hát" 
                value={(analytics?.totalSongs || 0).toLocaleString()} 
                sub={`+${analytics?.newSongs || 0} mới`}
                color="#10B981" 
              />
              <StatBox 
                icon="play-circle" 
                title="Lượt nghe" 
                value={(analytics?.totalPlays || 0).toLocaleString()} 
                sub={`${(analytics?.dailyPlays || 0).toLocaleString()}/ngày`}
                color="#8B5CF6" 
              />
              <StatBox 
                icon="disc" 
                title="Album" 
                value={(analytics?.totalAlbums || 0).toLocaleString()} 
                sub={`+${analytics?.newAlbums || 0} mới`}
                color="#F59E0B" 
              />
            </View>

            {/* User Statistics */}
            <Text style={[styles.sectionLabel, { marginTop: 32 }]}>CHI TIẾT NGƯỜI DÙNG</Text>
            <View style={styles.userCard}>
              <View style={styles.userStatsRow}>
                <View style={styles.userStatItem}>
                  <Text style={[styles.uStatVal, { color: COLORS.success }]}>{userAnalytics?.activeUsers || 0}</Text>
                  <Text style={styles.uStatLab}>Hoạt động</Text>
                </View>
                <View style={styles.uStatDivider} />
                <View style={styles.userStatItem}>
                  <Text style={[styles.uStatVal, { color: COLORS.error }]}>{userAnalytics?.inactiveUsers || 0}</Text>
                  <Text style={styles.uStatLab}>Ngoại tuyến</Text>
                </View>
                <View style={styles.uStatDivider} />
                <View style={styles.userStatItem}>
                  <Text style={[styles.uStatVal, { color: COLORS.warning }]}>{userAnalytics?.premiumUsers || 0}</Text>
                  <Text style={styles.uStatLab}>Premium</Text>
                </View>
              </View>
            </View>

            {/* Top Content */}
            <Text style={[styles.sectionLabel, { marginTop: 32 }]}>XẾP HẠNG NỘI DUNG</Text>
            {songAnalytics?.mostPlayed?.map((song, idx) => (
              <View key={idx} style={styles.topSongItem}>
                <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? COLORS.primary + '20' : COLORS.surface }]}>
                  <Text style={[styles.rankText, { color: idx < 3 ? COLORS.primary : COLORS.textDisabled }]}>{idx + 1}</Text>
                </View>
                <View style={styles.songMeta}>
                  <Text style={styles.songName} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.songArt} numberOfLines={1}>{song.artist_name}</Text>
                </View>
                <View style={styles.songPlays}>
                  <Ionicons name="play" size={12} color={COLORS.textDisabled} />
                  <Text style={styles.playVal}>{(song.plays || 0).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1.2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  periodTabs: { paddingHorizontal: 16, gap: 10 },
  periodBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.surface },
  activePeriod: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  periodText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: 'bold' },
  activePeriodText: { color: COLORS.primary },
  content: { flex: 1 },
  innerContent: { padding: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { width: (SCREEN_WIDTH - 60) / 2, backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.divider },
  boxIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  boxValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  boxTitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  boxSub: { fontSize: 11, fontWeight: 'bold' },
  userCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.divider },
  userStatsRow: { flexDirection: 'row', alignItems: 'center' },
  userStatItem: { flex: 1, alignItems: 'center' },
  uStatVal: { fontSize: 18, fontWeight: 'bold' },
  uStatLab: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  uStatDivider: { width: 1, height: 30, backgroundColor: COLORS.divider },
  topSongItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.divider },
  rankBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 14, fontWeight: '900' },
  songMeta: { flex: 1, paddingHorizontal: 12 },
  songName: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  songArt: { fontSize: 12, color: COLORS.textSecondary },
  songPlays: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  playVal: { fontSize: 12, color: COLORS.textDisabled, fontWeight: 'bold' },
});

export default AdminAnalyticsScreen;
