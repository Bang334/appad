import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ArtistRevenueScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId } = route.params;
  const [activeTab, setActiveTab] = useState('overview'); // overview, topSongs, history
  const [timeFilter, setTimeFilter] = useState('30d'); // 7d, 30d, 3m, 1y, all
  const [revenue, setRevenue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const statsResponse = await artistService.getRevenueStats(artistId, {
        period: timeFilter,
      });
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Fetch history
      const historyResponse = await artistService.getRevenueHistory(artistId, {
        limit: 100,
      });
      if (historyResponse.success) {
        setRevenue(historyResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [artistId, timeFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('vi-VN') + 'đ';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTypeInfo = (type) => {
    switch (type) {
      case 'direct_purchase':
        return { icon: 'journal', color: COLORS.info, label: 'Mua bài hát', bg: COLORS.info + '20' };
      case 'album_purchase':
        return { icon: 'disc', color: COLORS.secondary, label: 'Mua album', bg: COLORS.secondary + '20' };
      case 'premium_stream':
        return { icon: 'flash', color: COLORS.warning, label: 'Premium', bg: COLORS.warning + '20' };
      case 'artist_membership':
        return { icon: 'people', color: COLORS.primary, label: 'Đăng ký hội viên', bg: COLORS.primary + '20' };
      default:
        return { icon: 'wallet', color: COLORS.primary, label: 'Khác', bg: COLORS.primary + '20' };
    }
  };

  // Render Overview Tab
  const renderOverview = () => {
    if (!stats || !stats.overview) return null;

    const overview = stats.overview;
    const revenueByType = stats.revenue_by_type || [];

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.overviewContent}
      >
        {/* Main Revenue Card */}
        <LinearGradient
          colors={COLORS.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainRevenueCard}
        >
          <View style={styles.mainRevenueHeader}>
            <Text style={styles.mainRevenueLabel}>TỔNG THU NHẬP ƯỚC TÍNH</Text>
            <TouchableOpacity style={styles.infoIcon}>
              <Ionicons name="information-circle-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.mainRevenueValue}>
            {formatCurrency(overview.total_revenue).replace('đ', '')}
            <Text style={styles.mainCurrencySymbol}>₫</Text>
          </Text>
          <View style={styles.mainRevenueFooter}>
            <View style={styles.footerStat}>
              <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.footerStatText}>+12.5% so với kỳ trước</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Secondary Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statLabel}>Đã nhận</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {formatCurrency(overview.paid_revenue)}
            </Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statLabel}>Chờ duyệt</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {formatCurrency(overview.unpaid_revenue)}
            </Text>
          </View>
        </View>

        {/* Revenue by Type Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phân tích nguồn thu</Text>
        </View>
        
        {revenueByType.length > 0 ? (
          revenueByType.map((item, index) => {
            const typeInfo = getTypeInfo(item.share_type);
            return (
              <View key={index} style={styles.analysisCard}>
                <View style={[styles.analysisIconContainer, { backgroundColor: typeInfo.bg }]}>
                  <Ionicons name={typeInfo.icon} size={22} color={typeInfo.color} />
                </View>
                <View style={styles.analysisInfo}>
                  <Text style={styles.analysisLabel}>{typeInfo.label}</Text>
                  <Text style={styles.analysisSublabel}>{item.count} giao dịch thành công</Text>
                </View>
                <View style={styles.analysisValueContainer}>
                  <Text style={styles.analysisValue}>{formatCurrency(item.total_revenue)}</Text>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          backgroundColor: typeInfo.color,
                          width: `${Math.min((item.total_revenue / (overview.total_revenue || 1)) * 100, 100)}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Chưa có dữ liệu phân tích trong giai đoạn này</Text>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // Render Top Songs Tab
  const renderTopSongs = () => {
    if (!stats || !stats.top_songs || stats.top_songs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={[COLORS.surface, COLORS.surfaceLight]}
            style={styles.emptyIconCircle}
          >
            <Ionicons name="musical-notes-outline" size={50} color={COLORS.textDisabled} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Chưa có doanh thu bài hát</Text>
          <Text style={styles.emptySubtitle}>Các bài hát có lượt mua hoặc lượt nghe cao nhất sẽ xuất hiện ở đây.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={stats.top_songs}
        renderItem={({ item, index }) => (
          <View style={styles.topSongCard}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rankNumber, index < 3 && styles.topRankNumber]}>
                {index + 1}
              </Text>
              {index < 3 && (
                <View style={[styles.rankIndictor, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]} />
              )}
            </View>
            
            <View style={styles.songCoverContainer}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.songCover} />
              ) : (
                <View style={[styles.songCover, styles.songCoverPlaceholder]}>
                  <Ionicons name="musical-note" size={24} color={COLORS.textDisabled} />
                </View>
              )}
            </View>

            <View style={styles.songMainInfo}>
              <Text style={styles.songTitleText} numberOfLines={1}>
                {item.song_title || 'Bài hát không tên'}
              </Text>
              <Text style={styles.songSubtitleText}>
                {item.purchase_count} lượt mua • {item.stream_count || 0} streams
              </Text>
            </View>

            <View style={styles.songRevenueContainer}>
              <Text style={styles.songRevenueValue}>
                {formatCurrency(item.total_revenue)}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={(item, index) => `top-song-${item.song_id || index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    );
  };

  // Render History Tab
  const renderHistory = () => {
    if (revenue.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={50} color={COLORS.textDisabled} />
          </View>
          <Text style={styles.emptyTitle}>Lịch sử trống</Text>
          <Text style={styles.emptySubtitle}>Bạn chưa có giao dịch doanh thu nào được ghi nhận.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={revenue}
        renderItem={renderRevenueItem}
        keyExtractor={(item) => `revenue-${item.sharing_id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    );
  };

  const renderRevenueItem = ({ item }) => {
    const typeInfo = getTypeInfo(item.share_type);
    const isPaid = item.is_paid_to_artist === 1;

    return (
      <TouchableOpacity style={styles.historyItem}>
        <View style={styles.historyHeader}>
          <View style={[styles.historyIcon, { backgroundColor: typeInfo.bg }]}>
            <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
          </View>
          <View style={styles.historyTypeInfo}>
            <Text style={styles.historyTypeText}>{typeInfo.label}</Text>
            <Text style={styles.historyDateText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPaid ? COLORS.success + '15' : COLORS.warning + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: isPaid ? COLORS.success : COLORS.warning }]} />
            <Text style={[styles.statusText, { color: isPaid ? COLORS.success : COLORS.warning }]}>
              {isPaid ? 'Đã thanh toán' : 'Đang treo'}
            </Text>
          </View>
        </View>

        <View style={styles.historyDivider} />

        <View style={styles.historyContent}>
          <View style={styles.historyItemImage}>
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.historyThumb} />
            ) : (
              <View style={[styles.historyThumb, styles.songCoverPlaceholder]}>
                <Ionicons name="musical-note" size={20} color={COLORS.textDisabled} />
              </View>
            )}
          </View>
          <View style={styles.historyItemDetails}>
            <Text style={styles.historyItemTitle} numberOfLines={1}>
              {item.share_type === 'artist_membership' ? 'Hội viên Artist' : (item.item_title || item.song_title || item.album_title || 'Tác phẩm')}
            </Text>
            {item.username && (
              <Text style={styles.historyItemUser}>Từ: {item.username}</Text>
            )}
          </View>
          <View style={styles.historyAmountContainer}>
            <Text style={styles.historyAmountLabel}>Bạn nhận</Text>
            <Text style={styles.historyAmountValue}>
              +{formatCurrency(item.artist_share)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={[styles.header, { paddingTop: 10 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {[
            { id: '7d', label: '7 ngày' },
            { id: '30d', label: '30 ngày' },
            { id: '3m', label: '3 tháng' },
            { id: '1y', label: '1 năm' },
            { id: 'all', label: 'Tất cả' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, timeFilter === item.id && styles.filterChipActive]}
              onPress={() => setTimeFilter(item.id)}
            >
              <Text style={[styles.filterChipText, timeFilter === item.id && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Tab Switcher */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Tổng quan', icon: 'stats-chart' },
          { key: 'topSongs', label: 'Top tác phẩm', icon: 'medal' },
          { key: 'history', label: 'Lịch sử giao dịch', icon: 'list' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={tab.icon}
                size={22}
                color={activeTab === tab.key ? COLORS.primary : COLORS.textDisabled}
              />
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </View>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {loading && !refreshing ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải dữ liệu tài chính...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'topSongs' && renderTopSongs()}
            {activeTab === 'history' && renderHistory()}
          </>
        )}
      </View>

      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  settingButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  filterScroll: {
    maxHeight: 40,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
  },
  tabIndicator: {
    width: 15,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 4,
    position: 'absolute',
    bottom: -8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDisabled,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  contentContainer: {
    flex: 1,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: 16,
  },
  mainRevenueCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    ...SHADOWS.large,
  },
  mainRevenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mainRevenueLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  mainRevenueValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginVertical: 4,
  },
  mainCurrencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 4,
  },
  mainRevenueFooter: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  analysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  analysisIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  analysisInfo: {
    flex: 1,
  },
  analysisLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  analysisSublabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  analysisValueContainer: {
    alignItems: 'flex-end',
    width: 120,
  },
  analysisValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  topSongCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textDisabled,
  },
  topRankNumber: {
    color: COLORS.primary,
  },
  rankIndictor: {
    width: 12,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  songCoverContainer: {
    marginRight: 12,
  },
  songCover: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  songCoverPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songMainInfo: {
    flex: 1,
  },
  songTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  songSubtitleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  songRevenueContainer: {
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  songRevenueValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  historyItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyTypeInfo: {
    flex: 1,
  },
  historyTypeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  historyDateText: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 14,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  historyThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  historyItemDetails: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  historyItemUser: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  historyAmountContainer: {
    alignItems: 'flex-end',
  },
  historyAmountLabel: {
    fontSize: 10,
    color: COLORS.textDisabled,
    marginBottom: 2,
  },
  historyAmountValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.textDisabled,
  },
  emptyCardText: {
    color: COLORS.textDisabled,
    fontSize: 14,
  },
});

export default ArtistRevenueScreen;
