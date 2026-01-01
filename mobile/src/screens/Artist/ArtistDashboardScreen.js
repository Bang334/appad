import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ArtistDashboardScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId } = route.params;
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await artistService.getDashboard(artistId);
      if (response.success) {
        setDashboard(response.data);
      }
    } catch (error) {
      console.error('Error fetching artist dashboard:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [artistId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('vi-VN') + 'đ';
  };

  if (loading && !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị studio...</Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="cloud-offline-outline" size={60} color={COLORS.textDisabled} />
        </View>
        <Text style={styles.emptyTitle}>Lỗi kết nối</Text>
        <Text style={styles.emptySubtitle}>Không thể tải dữ liệu studio của bạn lúc này.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { wallet, stats, revenue_stats, unpaid, artist } = dashboard;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Wallet Section */}
        <View style={styles.walletSection}>
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletCardHeader}>
              <View style={styles.walletIconContainer}>
                <Ionicons name="wallet-outline" size={24} color="#FFF" />
              </View>
              <Text style={styles.walletCardTitle}>SỐ DƯ KHẢ DỤNG</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ArtistWithdrawals', { artistId })}>
                <Ionicons name="time-outline" size={24} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.mainBalance}>
              {parseFloat(wallet?.balance || 0).toLocaleString('vi-VN')}
              <Text style={styles.currency}> ₫</Text>
            </Text>

            <View style={styles.walletDivider} />

            <View style={styles.walletCardFooter}>
              <View style={styles.walletDetail}>
                <Text style={styles.walletDetailLabel}>Chờ duyệt</Text>
                <Text style={styles.walletDetailValue}>
                  {parseFloat(unpaid?.unpaid_amount || 0).toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.withdrawActionButton}
                onPress={() => navigation.navigate('ArtistWithdraw', { artistId, wallet })}
              >
                <Text style={styles.withdrawActionText}>Rút tiền</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statSquare}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.statSquareInner}
            >
              <View style={[styles.statIconBox, { backgroundColor: COLORS.info + '20' }]}>
                <Ionicons name="musical-notes" size={20} color={COLORS.info} />
              </View>
              <Text style={styles.statSquareValue}>{stats?.total_songs || 0}</Text>
              <Text style={styles.statSquareLabel}>Bài hát</Text>
            </LinearGradient>
          </View>

          <View style={styles.statSquare}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.statSquareInner}
            >
              <View style={[styles.statIconBox, { backgroundColor: COLORS.success + '20' }]}>
                <Ionicons name="cart" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statSquareValue}>{stats?.total_purchases || 0}</Text>
              <Text style={styles.statSquareLabel}>Lượt mua</Text>
            </LinearGradient>
          </View>

          <View style={styles.statSquare}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.statSquareInner}
            >
              <View style={[styles.statIconBox, { backgroundColor: COLORS.warning + '20' }]}>
                <Ionicons name="headset" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.statSquareValue}>
                {stats?.total_listens ? (stats.total_listens > 1000 ? (stats.total_listens / 1000).toFixed(1) + 'K' : stats.total_listens) : 0}
              </Text>
              <Text style={styles.statSquareLabel}>Lượt nghe</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Recent Revenue */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hiệu suất doanh thu</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ArtistRevenue', { artistId })}>
            <Text style={styles.seeAllText}>Chi tiết</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.revenueListCard}>
          {revenue_stats && revenue_stats.length > 0 ? (
            revenue_stats.map((stat, index) => (
              <View key={index} style={[styles.revenueListItem, index === revenue_stats.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.revIcon, { backgroundColor: stat.share_type === 'direct_purchase' ? COLORS.info + '15' : COLORS.secondary + '15' }]}>
                  <Ionicons 
                    name={stat.share_type === 'direct_purchase' ? 'journal' : 'flash'} 
                    size={18} 
                    color={stat.share_type === 'direct_purchase' ? COLORS.info : COLORS.secondary} 
                  />
                </View>
                <View style={styles.revInfo}>
                  <Text style={styles.revTypeLabel}>
                    {stat.share_type === 'direct_purchase' ? 'Mua bài hát' : 
                     stat.share_type === 'album_purchase' ? 'Mua album' : 'Premium Stream'}
                  </Text>
                  <Text style={styles.revCountText}>{stat.count} giao dịch thành công</Text>
                </View>
                <Text style={styles.revAmountText}>
                  +{parseFloat(stat.total_artist_share).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyRecentBox}>
              <Text style={styles.emptyRecentText}>Chưa có dữ liệu doanh thu gần đây</Text>
            </View>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Quản lý Studio</Text>
        </View>

        <View style={styles.actionsGrid}>
          {[
            { id: 'songs', label: 'Bài hát', icon: 'musical-notes', color: '#3B82F6', route: 'ArtistSongs' },
            { id: 'albums', label: 'Album', icon: 'albums', color: '#A855F7', route: 'ArtistAlbums' },
            { id: 'reviews', label: 'Đánh giá', icon: 'star', color: '#FCD34D', route: 'ArtistReviews' },
            { id: 'profile', label: 'Hồ sơ', icon: 'person', color: '#EC4899', route: 'ArtistEditProfile' },
            { id: 'membership', label: 'Hội viên', icon: 'people', color: '#F59E0B', route: 'ArtistMembership' },
            { id: 'bank', label: 'Ngân hàng', icon: 'card', color: '#10B981', route: 'ArtistBankInfo' },
            { id: 'history', label: 'Lịch sử rút', icon: 'receipt', color: '#64748B', route: 'ArtistWithdrawals' },
          ].map((action) => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.actionGridItem}
              onPress={() => navigation.navigate(action.route, { artistId, wallet })}
            >
              <View style={[styles.actionGridIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionGridLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      
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
    paddingBottom: 20,
    borderBottomWidth:1,
    borderBottomColor: COLORS.divider,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.backgroundSecondary,
  },
  artistQuickInfo: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  walletSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  walletCard: {
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.large,
  },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    letterSpacing: 1,
  },
  mainBalance: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 20,
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
  },
  walletDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  walletCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletDetail: {
    flex: 1,
  },
  walletDetailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  walletDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  withdrawActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  withdrawActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statSquare: {
    flex: 1,
    height: 110,
  },
  statSquareInner: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statSquareValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  statSquareLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  revenueListCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  revenueListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  revIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  revInfo: {
    flex: 1,
  },
  revTypeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  revCountText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  revAmountText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  emptyRecentBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyRecentText: {
    color: COLORS.textDisabled,
    fontSize: 13,
  },
  actionsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionGridItem: {
    width: (SCREEN_WIDTH - 65) / 3,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  actionGridIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionGridLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default ArtistDashboardScreen;

