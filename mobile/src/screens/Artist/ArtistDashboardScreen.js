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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';

const ArtistDashboardScreen = ({ route, navigation }) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Không tìm thấy thông tin artist</Text>
      </View>
    );
  }

  const { wallet, stats, revenue_stats, unpaid } = dashboard;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Wallet Card */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.walletCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.walletHeader}>
          <Ionicons name="wallet" size={32} color="#FFD700" />
          <Text style={styles.walletTitle}>Ví Artist</Text>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
          <Text style={styles.balanceAmount}>
            {parseFloat(wallet?.balance || 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>

        <View style={styles.walletStats}>
          <View style={styles.walletStatItem}>
            <Text style={styles.walletStatLabel}>Tổng kiếm được</Text>
            <Text style={styles.walletStatValue}>
              {parseFloat(wallet?.total_earned || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletStatItem}>
            <Text style={styles.walletStatLabel}>Đã rút</Text>
            <Text style={styles.walletStatValue}>
              {parseFloat(wallet?.total_withdrawn || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        {unpaid?.unpaid_amount > 0 && (
          <View style={styles.unpaidNotice}>
            <Ionicons name="time" size={16} color="#FFA726" />
            <Text style={styles.unpaidText}>
              Chờ thanh toán: {parseFloat(unpaid.unpaid_amount).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => navigation.navigate('ArtistWithdraw', { artistId, wallet })}
        >
          <Ionicons name="cash" size={20} color="#FFF" />
          <Text style={styles.withdrawButtonText}>Rút tiền</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Card */}
      <LinearGradient
        colors={['#f093fb', '#f5576c']}
        style={styles.statsCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.sectionTitle, { color: '#FFF' }]}>Thống kê</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
              <Ionicons name="musical-notes" size={24} color="#FFF" />
            </View>
            <Text style={[styles.statValue, { color: '#FFF' }]}>{stats?.total_songs || 0}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Bài hát</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
              <Ionicons name="cart" size={24} color="#FFF" />
            </View>
            <Text style={[styles.statValue, { color: '#FFF' }]}>{stats?.total_purchases || 0}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Lượt mua</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
              <Ionicons name="headset" size={24} color="#FFF" />
            </View>
            <Text style={[styles.statValue, { color: '#FFF' }]}>
              {stats?.total_listens ? (stats.total_listens / 1000).toFixed(1) + 'K' : 0}
            </Text>
            <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Lượt nghe</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Revenue Stats */}
      {revenue_stats && revenue_stats.length > 0 && (
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Text style={styles.sectionTitle}>Doanh thu</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ArtistRevenue', { artistId })}
            >
              <Text style={styles.viewAllText}>Chi tiết →</Text>
            </TouchableOpacity>
          </View>

          {revenue_stats.map((stat, index) => (
            <View key={index} style={styles.revenueItem}>
              <View style={styles.revenueInfo}>
                <Ionicons
                  name={stat.share_type === 'direct_purchase' ? 'cart' : 'star'}
                  size={20}
                  color={COLORS.primary}
                />
                <View style={styles.revenueTexts}>
                  <Text style={styles.revenueType}>
                    {stat.share_type === 'direct_purchase' ? 'Mua trực tiếp' : 'Premium Stream'}
                  </Text>
                  <Text style={styles.revenueCount}>{stat.count} giao dịch</Text>
                </View>
              </View>
              <Text style={styles.revenueAmount}>
                {parseFloat(stat.total_artist_share).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistEditProfile', { artistId })}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="person-circle" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Chỉnh sửa hồ sơ</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistSongs', { artistId })}
        >
          <LinearGradient
            colors={['#2196F3', '#21CBF3']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="musical-notes" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Quản lý bài hát</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistAlbums', { artistId })}
        >
          <LinearGradient
            colors={['#9C27B0', '#E91E63']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="albums" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Quản lý album</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistRevenue', { artistId })}
        >
          <LinearGradient
            colors={['#4CAF50', '#8BC34A']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="bar-chart" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Xem doanh thu chi tiết</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistWithdrawals', { artistId })}
        >
          <LinearGradient
            colors={['#FF9800', '#FFC107']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="receipt" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Lịch sử rút tiền</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistBankInfo', { artistId, wallet })}
        >
          <LinearGradient
            colors={['#00BCD4', '#0097A7']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="card" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Thông tin ngân hàng</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ArtistMembership', { artistId })}
        >
          <LinearGradient
            colors={['#E91E63', '#F06292']}
            style={styles.actionIconContainer}
          >
            <Ionicons name="people" size={24} color="#FFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Quản lý hội viên</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  walletCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  balanceSection: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  walletStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  walletStatItem: {
    flex: 1,
  },
  walletDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  walletStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  walletStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  unpaidNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  unpaidText: {
    fontSize: 13,
    color: '#FFD54F',
    marginLeft: 8,
    fontWeight: '600',
  },
  withdrawButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  revenueCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  revenueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  revenueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  revenueTexts: {
    marginLeft: 12,
  },
  revenueType: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  revenueCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  actionsCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
  },
});

export default ArtistDashboardScreen;

