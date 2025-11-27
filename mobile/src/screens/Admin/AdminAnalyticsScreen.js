import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminAnalyticsScreen = ({ navigation }) => {
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
      
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
      if (userRes.success) {
        setUserAnalytics(userRes.data);
      }
      if (songRes.success) {
        setSongAnalytics(songRes.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert(
        'Lỗi tải dữ liệu', 
        'Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.',
        [
          { text: 'Thử lại', onPress: () => loadAnalytics() },
          { text: 'Hủy', style: 'cancel' }
        ]
      );
      
      // Set empty data instead of mock data
      setAnalytics({
        totalUsers: 0,
        newUsers: 0,
        totalSongs: 0,
        newSongs: 0,
        totalPlays: 0,
        dailyPlays: 0,
        totalAlbums: 0,
        newAlbums: 0,
      });
      setUserAnalytics({
        activeUsers: 0,
        inactiveUsers: 0,
        premiumUsers: 0,
        regularUsers: 0,
      });
      setSongAnalytics({
        mostPlayed: [],
        topGenres: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const StatCard = ({ icon, title, value, subtitle, color = COLORS.primary }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PeriodButton = ({ period, label, isSelected }) => (
    <TouchableOpacity
      style={[styles.periodButton, isSelected && styles.periodButtonSelected]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text style={[styles.periodButtonText, isSelected && styles.periodButtonTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Phân tích dữ liệu</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.periodSelector}>
        <PeriodButton period="7d" label="7 ngày" isSelected={selectedPeriod === '7d'} />
        <PeriodButton period="30d" label="30 ngày" isSelected={selectedPeriod === '30d'} />
        <PeriodButton period="90d" label="90 ngày" isSelected={selectedPeriod === '90d'} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tổng quan</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="people-outline"
                title="Người dùng"
                value={(analytics?.totalUsers || 0).toLocaleString()}
                subtitle={`+${analytics?.newUsers || 0} mới`}
                color={COLORS.primary}
              />
              <StatCard
                icon="musical-notes-outline"
                title="Bài hát"
                value={(analytics?.totalSongs || 0).toLocaleString()}
                subtitle={`+${analytics?.newSongs || 0} mới`}
                color={COLORS.success}
              />
              <StatCard
                icon="play-circle-outline"
                title="Lượt phát"
                value={(analytics?.totalPlays || 0).toLocaleString()}
                subtitle={`${analytics?.dailyPlays || 0}/ngày`}
                color={COLORS.info}
              />
              <StatCard
                icon="disc-outline"
                title="Album"
                value={(analytics?.totalAlbums || 0).toLocaleString()}
                subtitle={`+${analytics?.newAlbums || 0} mới`}
                color={COLORS.warning}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Người dùng</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="person-outline"
                title="Đang hoạt động"
                value={userAnalytics?.activeUsers?.toLocaleString() || '0'}
                color={COLORS.success}
              />
              <StatCard
                icon="person-remove-outline"
                title="Không hoạt động"
                value={userAnalytics?.inactiveUsers?.toLocaleString() || '0'}
                color={COLORS.error}
              />
              <StatCard
                icon="star-outline"
                title="Premium"
                value={userAnalytics?.premiumUsers?.toLocaleString() || '0'}
                color={COLORS.warning}
              />
              <StatCard
                icon="people-outline"
                title="Thường"
                value={userAnalytics?.regularUsers?.toLocaleString() || '0'}
                color={COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bài hát phổ biến</Text>
            {songAnalytics?.mostPlayed?.length > 0 ? (
              songAnalytics.mostPlayed.map((song, index) => (
                <View key={index} style={styles.popularSongItem}>
                  <View style={styles.songRank}>
                    <Text style={styles.songRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>{song.title}</Text>
                    <Text style={styles.songArtist}>{song.artist_name}</Text>
                  </View>
                  <Text style={styles.songPlays}>{song.plays?.toLocaleString() || '0'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu bài hát</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thể loại phổ biến</Text>
            {songAnalytics?.topGenres?.length > 0 ? (
              songAnalytics.topGenres.map((genre, index) => (
                <View key={index} style={styles.genreItem}>
                  <View style={styles.genreInfo}>
                    <Text style={styles.genreName}>{genre.name}</Text>
                    <Text style={styles.genreCount}>{genre.count} bài hát</Text>
                  </View>
                  <View style={styles.genreBarContainer}>
                    <View style={styles.genreBar}>
                      <View 
                        style={[
                          styles.genreBarFill, 
                          { width: `${genre.percentage}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.genrePercentage}>{genre.percentage}%</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="library-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu thể loại</Text>
              </View>
            )}
          </View>
        </>
      )}
      </ScrollView>
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for MiniPlayer
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  periodButtonTextSelected: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
  },
  section: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  statSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    textAlign: 'center',
  },
  popularSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  songRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  songRankText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: 'bold',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songPlays: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  genreItem: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  genreName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  genreCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  genreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  genreBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  genrePercentage: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AdminAnalyticsScreen;
