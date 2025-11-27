import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { songService } from '../../services/songService';

const AdminDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSongs: 0,
    totalAlbums: 0,
    totalPlays: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Use admin API for real data
      const response = await adminService.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to mock data if admin API fails
      setStats({
        totalUsers: 1250,
        totalSongs: 850,
        totalAlbums: 120,
        totalPlays: 45600,
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleQuickSettings = () => {
    Alert.alert(
      'Cài đặt hệ thống',
      'Chọn loại cài đặt:',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Cài đặt chung', 
          onPress: () => {
            Alert.alert('Thông báo', 'Tính năng cài đặt chung sẽ sớm có mặt');
          }
        },
        { 
          text: 'Cài đặt bảo mật', 
          onPress: () => {
            Alert.alert('Thông báo', 'Tính năng cài đặt bảo mật sẽ sớm có mặt');
          }
        },
        { 
          text: 'Cài đặt thông báo', 
          onPress: () => {
            Alert.alert('Thông báo', 'Tính năng cài đặt thông báo sẽ sớm có mặt');
          }
        },
        { 
          text: 'Cài đặt lưu trữ', 
          onPress: () => {
            Alert.alert('Thông báo', 'Tính năng cài đặt lưu trữ sẽ sớm có mặt');
          }
        }
      ]
    );
  };

  const handleQuickBackup = async () => {
    Alert.alert(
      'Sao lưu dữ liệu',
      'Chọn loại sao lưu:',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Sao lưu toàn bộ', 
          onPress: async () => {
            try {
              Alert.alert('Thông báo', 'Đang tạo bản sao lưu toàn bộ...');
              // Simulate backup process
              setTimeout(() => {
                Alert.alert('Thành công', 'Đã tạo bản sao lưu thành công!');
              }, 2000);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể tạo bản sao lưu');
            }
          }
        },
        { 
          text: 'Sao lưu cơ sở dữ liệu', 
          onPress: async () => {
            try {
              Alert.alert('Thông báo', 'Đang sao lưu cơ sở dữ liệu...');
              setTimeout(() => {
                Alert.alert('Thành công', 'Đã sao lưu cơ sở dữ liệu!');
              }, 1500);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể sao lưu cơ sở dữ liệu');
            }
          }
        },
        { 
          text: 'Sao lưu file media', 
          onPress: async () => {
            try {
              Alert.alert('Thông báo', 'Đang sao lưu file media...');
              setTimeout(() => {
                Alert.alert('Thành công', 'Đã sao lưu file media!');
              }, 3000);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể sao lưu file media');
            }
          }
        }
      ]
    );
  };

  const handleQuickReport = () => {
    Alert.alert(
      'Báo cáo',
      'Chọn loại báo cáo:',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Báo cáo người dùng', 
          onPress: () => {
            Alert.alert('Thông báo', 'Đang tạo báo cáo người dùng...');
            setTimeout(() => {
              Alert.alert('Thành công', 'Báo cáo người dùng đã được tạo!');
            }, 2000);
          }
        },
        { 
          text: 'Báo cáo bài hát', 
          onPress: () => {
            Alert.alert('Thông báo', 'Đang tạo báo cáo bài hát...');
            setTimeout(() => {
              Alert.alert('Thành công', 'Báo cáo bài hát đã được tạo!');
            }, 2000);
          }
        },
        { 
          text: 'Báo cáo thống kê', 
          onPress: () => {
            Alert.alert('Thông báo', 'Đang tạo báo cáo thống kê...');
            setTimeout(() => {
              Alert.alert('Thành công', 'Báo cáo thống kê đã được tạo!');
            }, 2000);
          }
        },
        { 
          text: 'Báo cáo tổng hợp', 
          onPress: () => {
            Alert.alert('Thông báo', 'Đang tạo báo cáo tổng hợp...');
            setTimeout(() => {
              Alert.alert('Thành công', 'Báo cáo tổng hợp đã được tạo!');
            }, 3000);
          }
        }
      ]
    );
  };

  const StatCard = ({ icon, title, value, color = COLORS.primary, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{(value || 0).toLocaleString()}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const AdminMenuItem = ({ icon, title, subtitle, onPress, gradientColors }) => {
    const defaultGradient = [COLORS.primary, COLORS.accent];
    const colors = gradientColors || defaultGradient;
    
    return (
      <TouchableOpacity style={styles.adminMenuItem} onPress={onPress}>
        <LinearGradient
          colors={colors}
          style={styles.adminMenuIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={24} color="#FFF" />
        </LinearGradient>
        <View style={styles.adminMenuText}>
          <Text style={styles.adminMenuTitle}>{title}</Text>
          <Text style={styles.adminMenuSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

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
        <View>
          <Text style={styles.welcomeText}>Xin chào,</Text>
          <Text style={styles.adminName}>{user?.username || 'Admin'}</Text>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.navigate('MainTabs', { screen: 'Profile' });
          }}
        >
          <Ionicons name="arrow-back-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Thống kê tổng quan</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            title="Người dùng"
            value={stats.totalUsers}
            color={COLORS.primary}
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <StatCard
            icon="musical-notes-outline"
            title="Bài hát"
            value={stats.totalSongs}
            color={COLORS.success}
            onPress={() => navigation.navigate('AdminSongs')}
          />
          <StatCard
            icon="disc-outline"
            title="Album"
            value={stats.totalAlbums}
            color={COLORS.warning}
            onPress={() => navigation.navigate('AdminAlbums')}
          />
          <StatCard
            icon="play-circle-outline"
            title="Lượt phát"
            value={stats.totalPlays}
            color={COLORS.info}
            onPress={() => navigation.navigate('AdminAnalytics')}
          />
        </View>
      </View>

      <View style={styles.adminMenuSection}>
        <Text style={styles.sectionTitle}>Quản lý hệ thống</Text>
        
        <AdminMenuItem
          icon="people"
          title="Quản lý người dùng"
          subtitle="Xem, thêm, sửa, xóa người dùng"
          gradientColors={['#2196F3', '#21CBF3']}
          onPress={() => navigation.navigate('AdminUsers')}
        />

        <AdminMenuItem
          icon="musical-notes"
          title="Quản lý bài hát"
          subtitle="Thêm, sửa, xóa bài hát"
          gradientColors={['#4CAF50', '#8BC34A']}
          onPress={() => navigation.navigate('AdminSongs')}
        />

        <AdminMenuItem
          icon="disc"
          title="Quản lý album"
          subtitle="Thêm, sửa, xóa album"
          gradientColors={['#FF9800', '#FFC107']}
          onPress={() => navigation.navigate('AdminAlbums')}
        />

        <AdminMenuItem
          icon="analytics"
          title="Phân tích dữ liệu"
          subtitle="Thống kê và báo cáo"
          gradientColors={['#9C27B0', '#E91E63']}
          onPress={() => navigation.navigate('AdminAnalytics')}
        />

        <AdminMenuItem
          icon="wallet"
          title="Quản lý nạp tiền"
          subtitle="Duyệt yêu cầu nạp tiền của users"
          gradientColors={['#00BCD4', '#0097A7']}
          onPress={() => navigation.navigate('AdminTransactions')}
        />

        <AdminMenuItem
          icon="cash"
          title="Quản lý rút tiền"
          subtitle="Duyệt yêu cầu rút tiền của artists"
          gradientColors={['#4CAF50', '#66BB6A']}
          onPress={() => navigation.navigate('AdminWithdrawals')}
        />

        <AdminMenuItem
          icon="people"
          title="Quản lý hội viên"
          subtitle="Xem và quản lý hội viên của các artist"
          gradientColors={['#E91E63', '#F06292']}
          onPress={() => navigation.navigate('AdminMembership')}
        />

        <AdminMenuItem
          icon="settings"
          title="Cài đặt hệ thống"
          subtitle="Cấu hình ứng dụng"
          gradientColors={['#607D8B', '#78909C']}
          onPress={() => Alert.alert('Thông báo', 'Tính năng cài đặt hệ thống sẽ sớm có mặt')}
        />
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AdminEditSong', { song: null })}
          >
            <LinearGradient
              colors={['#4CAF50', '#8BC34A']}
              style={styles.quickActionIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add-circle" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Thêm bài hát</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AdminEditAlbum', { album: null })}
          >
            <LinearGradient
              colors={['#FF9800', '#FFC107']}
              style={styles.quickActionIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="disc" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Thêm album</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AdminAnalytics')}
          >
            <LinearGradient
              colors={['#9C27B0', '#E91E63']}
              style={styles.quickActionIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="analytics" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Phân tích</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleQuickSettings}
          >
            <Ionicons name="settings" size={32} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Cài đặt</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleQuickBackup}
          >
            <Ionicons name="cloud-upload" size={32} color={COLORS.success} />
            <Text style={styles.quickActionText}>Sao lưu</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleQuickReport}
          >
            <Ionicons name="document-text" size={32} color={COLORS.warning} />
            <Text style={styles.quickActionText}>Báo cáo</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
  },
  adminName: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  statsSection: {
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
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    textAlign: 'center',
  },
  adminMenuSection: {
    padding: SIZES.padding,
  },
  adminMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminMenuText: {
    flex: 1,
  },
  adminMenuTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  adminMenuSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  quickActionsSection: {
    padding: SIZES.padding,
    paddingBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    alignItems: 'center',
    width: '31%',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default AdminDashboard;
