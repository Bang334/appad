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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ArtistRevenueScreen = ({ route }) => {
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
        share_type: undefined,
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

  // Render Overview Tab
  const renderOverview = () => {
    if (!stats || !stats.overview) return null;

    const overview = stats.overview;
    const revenueByType = stats.revenue_by_type || [];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="cash" size={24} color={COLORS.primary} />
            <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
            <Text style={styles.summaryValue}>{formatCurrency(overview.total_revenue)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.summaryLabel}>Đã nhận</Text>
            <Text style={styles.summaryValue}>{formatCurrency(overview.paid_revenue)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="time" size={24} color="#FFA726" />
            <Text style={styles.summaryLabel}>Chờ nhận</Text>
            <Text style={styles.summaryValue}>{formatCurrency(overview.unpaid_revenue)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="receipt" size={24} color={COLORS.info} />
            <Text style={styles.summaryLabel}>Giao dịch</Text>
            <Text style={styles.summaryValue}>{overview.total_transactions || 0}</Text>
          </View>
        </View>

        {/* Revenue by Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doanh thu theo loại</Text>
          {revenueByType.map((item, index) => (
            <View key={index} style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <Text style={styles.typeLabel}>
                  {item.share_type === 'direct_purchase' ? 'Mua bài hát' : 
                   item.share_type === 'album_purchase' ? 'Mua album' : 'Premium Stream'}
                </Text>
                <Text style={styles.typeValue}>{formatCurrency(item.total_revenue)}</Text>
              </View>
              <View style={styles.typeDetails}>
                <Text style={styles.typeDetailText}>
                  {item.count} giao dịch • {formatCurrency(item.total_sales)} tổng bán
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Render Top Songs Tab
  const renderTopSongs = () => {
    if (!stats || !stats.top_songs || stats.top_songs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-note-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có bài hát được mua</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={stats.top_songs}
        renderItem={({ item, index }) => (
          <View style={styles.topSongItem}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.songCover} />
            ) : (
              <View style={[styles.songCover, styles.songCoverPlaceholder]}>
                <Ionicons name="musical-note" size={24} color={COLORS.textSecondary} />
              </View>
            )}

            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {item.song_title || 'Unknown'}
              </Text>
              <View style={styles.songStats}>
                <Text style={styles.songStatText}>
                  <Ionicons name="cart" size={14} color={COLORS.primary} /> {item.purchase_count} lượt mua
                </Text>
                <Text style={styles.songStatText}>
                  <Ionicons name="cash" size={14} color="#4CAF50" /> {formatCurrency(item.total_revenue)}
                </Text>
              </View>
            </View>
          </View>
        )}
        keyExtractor={(item, index) => `top-song-${item.song_id || index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  // Render History Tab
  const renderHistory = () => {
    if (revenue.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có lịch sử doanh thu</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={revenue}
        renderItem={renderRevenueItem}
        keyExtractor={(item) => `revenue-${item.sharing_id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  const renderRevenueItem = ({ item }) => {
    const typeInfo = getTypeInfo(item.share_type);

    return (
      <View style={styles.revenueItem}>
        {/* Song Avatar */}
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={styles.songAvatar} />
        ) : (
          <View style={[styles.songAvatar, styles.songAvatarPlaceholder]}>
            <Ionicons name="musical-note" size={24} color={COLORS.textSecondary} />
          </View>
        )}

        <View style={styles.revenueInfo}>
          <View style={styles.revenueHeader}>
            <Text style={styles.revenueType}>{typeInfo.label}</Text>
            {item.is_paid_to_artist === 1 && (
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.paidText}>Đã trả</Text>
              </View>
            )}
            {item.is_paid_to_artist === 0 && (
              <View style={[styles.paidBadge, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="time" size={14} color="#FFA726" />
                <Text style={[styles.paidText, { color: '#FFA726' }]}>Chờ</Text>
              </View>
            )}
          </View>

          <Text style={styles.songTitle} numberOfLines={1}>
            {item.item_title || item.song_title || item.album_title || 'Unknown'}
          </Text>

          {item.username && (
            <Text style={styles.username}>User: {item.username}</Text>
          )}

          <View style={styles.revenueDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tổng:</Text>
              <Text style={styles.detailValue}>{formatCurrency(item.total_amount)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bạn nhận:</Text>
              <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: 'bold' }]}>
                {formatCurrency(item.artist_share)}
              </Text>
            </View>
          </View>

          {item.stream_count > 0 && (
            <Text style={styles.streamCount}>{item.stream_count} lượt nghe</Text>
          )}

          {item.calculation_period && (
            <Text style={styles.period}>Kỳ: {item.calculation_period}</Text>
          )}

          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  const getTypeInfo = (type) => {
    switch (type) {
      case 'direct_purchase':
        return { icon: 'cart', color: '#2196F3', label: 'Mua bài hát' };
      case 'album_purchase':
        return { icon: 'disc', color: '#9C27B0', label: 'Mua album' };
      case 'premium_stream':
        return { icon: 'star', color: '#FFD700', label: 'Premium Stream' };
      default:
        return { icon: 'cash', color: COLORS.primary, label: type };
    }
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Time Filter - Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeFilterContainer}
        contentContainerStyle={styles.timeFilterContent}
      >
        {['7d', '30d', '3m', '1y', 'all'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.timeFilterTab, timeFilter === period && styles.timeFilterTabActive]}
            onPress={() => setTimeFilter(period)}
          >
            <Text style={[styles.timeFilterText, timeFilter === period && styles.timeFilterTextActive]}>
              {period === '7d' ? '7 ngày' : period === '30d' ? '30 ngày' : period === '3m' ? '3 tháng' : period === '1y' ? '1 năm' : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Tổng quan', icon: 'stats-chart' },
          { key: 'topSongs', label: 'Top bài hát', icon: 'musical-note' },
          { key: 'history', label: 'Lịch sử', icon: 'receipt' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? '#FFF' : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'topSongs' && renderTopSongs()}
      {activeTab === 'history' && renderHistory()}

      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.surface,
    maxHeight: 50,
  },
  timeFilterTab: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    marginRight: 8,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeFilterTabActive: {
    backgroundColor: COLORS.primary,
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  timeFilterTextActive: {
    color: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabContent: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  typeCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  typeDetails: {
    flexDirection: 'row',
  },
  typeDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  topSongItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  songCoverPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  songStats: {
    flexDirection: 'row',
    gap: 16,
  },
  songStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  revenueItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  songAvatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  songAvatarPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  revenueType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  revenueDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  streamCount: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 4,
  },
  period: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});

export default ArtistRevenueScreen;
