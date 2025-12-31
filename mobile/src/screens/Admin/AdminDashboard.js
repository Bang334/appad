import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AdminDashboard = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSongs: 0,
    totalAlbums: 0,
    totalPlays: 0,
    newUsersThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const response = await adminService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Lỗi', 'Không thể tải thống kê hệ thống');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleQuickSettings = () => {
    Alert.alert('Cài đặt hệ thống', 'Tính năng này đang được phát triển');
  };

  const handleQuickBackup = () => {
    Alert.alert('Sao lưu', 'Tính năng sao lưu đang được chuẩn bị');
  };

  const StatPanel = ({ icon, title, value, color, onPress }) => (
    <TouchableOpacity 
      style={styles.statPanel} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statPanelValue}>{(value || 0).toLocaleString()}</Text>
        <Text style={styles.statPanelLabel}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const MenuCard = ({ icon, title, subtitle, onPress, colors }) => (
    <TouchableOpacity 
      style={styles.menuCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={colors || ['#4f46e5', '#3730a3']}
        style={styles.menuCardIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color="#FFF" />
      </LinearGradient>
      <View style={styles.menuCardInfo}>
        <Text style={styles.menuCardTitle}>{title}</Text>
        <Text style={styles.menuCardSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textDisabled} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang khởi tạo quyền quản trị...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <LinearGradient
        colors={[COLORS.backgroundSecondary, COLORS.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
            style={styles.headerIconButton}
          >
            <Ionicons name="person-circle-outline" size={32} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Control</Text>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleQuickSettings}>
            <Ionicons name="settings-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeBox}>
          <View>
            <Text style={styles.welcomeSub}>Hệ thống vận hành tốt,</Text>
            <Text style={styles.adminName}>{user?.username || 'Administrator'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        </View>

        {/* Highlight Stats */}
        <View style={styles.highlightStats}>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>{stats.totalPlays.toLocaleString()}</Text>
            <Text style={styles.highlightLabel}>Lượt nghe</Text>
          </View>
          <View style={styles.highlightDivider} />
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>+{stats.newUsersThisMonth}</Text>
            <Text style={styles.highlightLabel}>User mới (tháng)</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.scrollPadding, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Statistics Grid */}
        <Text style={styles.sectionLabel}>THỐNG KÊ CHI TIẾT</Text>
        <View style={styles.statsGrid}>
          <StatPanel
            icon="people"
            title="Người dùng"
            value={stats.totalUsers}
            color="#3B82F6"
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <StatPanel
            icon="musical-notes"
            title="Bài hát"
            value={stats.totalSongs}
            color="#10B981"
            onPress={() => navigation.navigate('AdminSongs')}
          />
          <StatPanel
            icon="disc"
            title="Album"
            value={stats.totalAlbums}
            color="#F59E0B"
            onPress={() => navigation.navigate('AdminAlbums')}
          />
          <StatPanel
            icon="bar-chart"
            title="Phân tích"
            value={stats.totalPlays}
            color="#8B5CF6"
            onPress={() => navigation.navigate('AdminAnalytics')}
          />
        </View>

        {/* Content Management */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>QUẢN LÝ NỘI DUNG</Text>
        <View style={styles.menuGroup}>
          <MenuCard
            icon="people-outline"
            title="Người dùng"
            subtitle="Ban/Unban, phân quyền tài khoản"
            colors={['#3B82F6', '#2563EB']}
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <MenuCard
            icon="musical-note-outline"
            title="Kho bài hát"
            subtitle="Kiểm duyệt và chỉnh sửa"
            colors={['#10B981', '#059669']}
            onPress={() => navigation.navigate('AdminSongs')}
          />
          <MenuCard
            icon="albums-outline"
            title="Bộ sưu tập Album"
            subtitle="Quản lý danh sách album"
            colors={['#F59E0B', '#D97706']}
            onPress={() => navigation.navigate('AdminAlbums')}
          />
          <MenuCard
            icon="chatbubbles-outline"
            title="Quản lý Đánh giá"
            subtitle="Xem và kiểm soát đánh giá của artist"
            colors={['#EC4899', '#BE185D']}
            onPress={() => navigation.navigate('AdminReviewsMain')}
          />
        </View>

        {/* Financial Management */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>TÀI CHÍNH & GIAO DỊCH</Text>
        <View style={styles.menuGroup}>
          <MenuCard
            icon="wallet-outline"
            title="Duyệt nạp tiền"
            subtitle="Yêu cầu nạp từ người dùng"
            colors={['#06B6D4', '#0891B2']}
            onPress={() => navigation.navigate('AdminTransactions')}
          />
          <MenuCard
            icon="cash-outline"
            title="Duyệt rút tiền"
            subtitle="Yêu cầu rút từ nghệ sĩ"
            colors={['#8B5CF6', '#7C3AED']}
            onPress={() => navigation.navigate('AdminWithdrawals')}
          />
          <MenuCard
            icon="star-outline"
            title="Gói hội viên"
            subtitle="Thống kê đăng ký thành viên"
            colors={['#EC4899', '#DB2777']}
            onPress={() => navigation.navigate('AdminMembership')}
          />
          <MenuCard
            icon="gift-outline"
            title="Phát lương Premium"
            subtitle="Chia sẻ doanh thu & xem lịch sử"
            colors={['#8B5CF6', '#D946EF']}
            onPress={() => navigation.navigate('AdminPremiumPayout')}
          />
        </View>

        {/* System & Tools */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>HỆ THỐNG</Text>
        <View style={styles.toolsRow}>
          <TouchableOpacity style={styles.toolItem} onPress={handleQuickBackup}>
            <View style={[styles.toolIcon, { backgroundColor: '#64748B20' }]}>
              <Ionicons name="cloud-upload-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.toolLabel}>Sao lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} onPress={() => Alert.alert('Thông báo', 'Đang tạo báo cáo tổng hợp...')}>
            <View style={[styles.toolIcon, { backgroundColor: '#F43F5E20' }]}>
              <Ionicons name="document-text-outline" size={24} color="#F43F5E" />
            </View>
            <Text style={styles.toolLabel}>Báo cáo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolItem} onPress={handleQuickSettings}>
            <View style={[styles.toolIcon, { backgroundColor: '#47556920' }]}>
              <Ionicons name="construct-outline" size={24} color="#475569" />
            </View>
            <Text style={styles.toolLabel}>Bảo trì</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOWS.medium,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  welcomeSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  adminName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  highlightStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  highlightItem: {
    flex: 1,
    alignItems: 'center',
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  highlightLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    fontWeight: 'bold',
  },
  highlightDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
  },
  scrollPadding: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 16,
    paddingLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statPanel: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statPanelValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statPanelLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  menuGroup: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  menuCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuCardInfo: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  menuCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  toolItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 8,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
});

export default AdminDashboard;

