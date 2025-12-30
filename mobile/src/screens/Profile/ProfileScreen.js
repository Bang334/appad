import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import api from '../../config/api';

const { width } = Dimensions.get('window');

// MenuItem Component (Refined)
const MenuItem = ({ icon, title, onPress, danger, gradientColors, description }) => {
  const getGradientColors = () => {
    if (gradientColors) return gradientColors;
    if (danger) return ['#EF4444', '#B91C1C'];
    
    const colorMap = {
      'person-outline': ['#3B82F6', '#2563EB'],
      'settings-outline': ['#8B5CF6', '#7C3AED'],
      'help-circle-outline': ['#F59E0B', '#D97706'],
      'information-circle-outline': ['#06B6D4', '#0891B2'],
      'wallet': ['#10B981', '#059669'],
      'star': ['#F59E0B', '#D97706'],
      'musical-notes-outline': ['#EC4899', '#DB2777'],
      'bar-chart-outline': ['#8B5CF6', '#EC4899'],
      'shield-outline': ['#EF4444', '#DC2626'],
      'log-out-outline': ['#6B7280', '#4B5563'],
    };
    
    return colorMap[icon] || [COLORS.primary, COLORS.secondary];
  };
  
  const colors = getGradientColors();
  
  return (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={colors}
        style={styles.menuIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={22} color="#FFF" />
      </LinearGradient>
      <View style={styles.menuContent}>
        <Text style={[styles.menuText, danger && styles.dangerText]}>{title}</Text>
        {description && <Text style={styles.menuDescription}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { stopPlayer } = usePlayer();
  const [stats, setStats] = React.useState({ following: 0, followers: 0, playlists: 0 });
  const [loading, setLoading] = React.useState(true);

  const loadStats = React.useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const response = await api.get(`/users/profile/${user.user_id}/stats`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading profile stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          onPress: async () => {
            await stopPlayer();
            await logout();
          }, 
          style: 'destructive' 
        },
      ]
    );
  };

  const userRoleDisplay = useMemo(() => {
    if (user?.role === 'admin') return { label: 'ADMIN', color: '#EF4444' };
    if (user?.role === 'artist') return { label: 'ARTIST', color: '#8B5CF6' };
    return { label: 'USER', color: '#3B82F6' };
  }, [user?.role]);

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1A1A1A', '#050505']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.1)', 'transparent']}
            style={styles.headerGradient}
          />


          
          <View style={styles.profileMain}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.avatarBorder}
              >
                <Image
                  source={{ uri: user?.avatar_url || 'https://via.placeholder.com/150' }}
                  style={styles.avatar}
                />
              </LinearGradient>
              {user?.is_premium == 1 && (
                <View style={styles.premiumCrown}>
                  <Ionicons name="star" size={14} color="#FFF" />
                </View>
              )}
            </View>

            <View style={styles.userNameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{user?.full_name || user?.username}</Text>
                <View style={[styles.roleBadge, { backgroundColor: userRoleDisplay.color + '22', borderColor: userRoleDisplay.color + '44' }]}>
                  <Text style={[styles.roleText, { color: userRoleDisplay.color }]}>{userRoleDisplay.label}</Text>
                </View>
              </View>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.following}</Text>
              <Text style={styles.statLabel}>Theo dõi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.playlists}</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {/* Section: Account */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cá nhân</Text>
          </View>
          <View style={styles.glassCard}>
            <MenuItem
              icon="person-outline"
              title="Chỉnh sửa hồ sơ"
              description="Thông tin cá nhân & hình đại diện"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="settings-outline"
              title="Cài đặt"
              description="Bảo mật, thông báo & ứng dụng"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>

          {/* Section: Wallet & Premium */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tài chính & Ưu đãi</Text>
          </View>
          <View style={styles.glassCard}>
            <MenuItem
              icon="wallet"
              title="Ví của tôi"
              description="Quản lý số dư & giao dịch"
              onPress={() => navigation.navigate('Wallet')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="star"
              title="Gói Premium"
              description={user?.is_premium == 1 ? 'Bạn đang sử dụng Premium' : 'Nâng cấp trải nghiệm âm nhạc'}
              onPress={() => navigation.navigate('Premium')}
            />
          </View>

          {/* Section: Creator/Admin */}
          {(user?.role === 'artist' || user?.role === 'admin' || user?.role === 'user') && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bảng điều khiển</Text>
            </View>
          )}
          <View style={styles.glassCard}>
            {user?.role === 'user' && !user?.is_pending_artist && (
              <MenuItem
                icon="musical-notes-outline"
                title="Đăng ký làm Artist"
                description="Bắt đầu chia sẻ âm nhạc của bạn"
                onPress={() => navigation.navigate('RegisterArtist')}
              />
            )}
            
            {user?.role === 'artist' && (
              <MenuItem
                icon="bar-chart-outline"
                title="Artist Dashboard"
                description="Thống kê doanh thu & bài hát"
                onPress={() => navigation.navigate('ArtistDashboard', { artistId: user.artist_id })}
              />
            )}
            
            {user?.role === 'admin' && (
              <MenuItem
                icon="shield-outline"
                title="Quản trị hệ thống"
                description="Quản lý người dùng, nhạc & giao dịch"
                onPress={() => navigation.navigate('AdminDashboard')}
              />
            )}

            <View style={styles.menuDivider} />
            <MenuItem
              icon="help-circle-outline"
              title="Trợ giúp & Hỗ trợ"
              onPress={() => navigation.navigate('Help')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="information-circle-outline"
              title="Giới thiệu"
              onPress={() => navigation.navigate('About')}
            />
          </View>

          {/* Logout Section */}
          <View style={[styles.glassCard, { marginTop: 16, marginBottom: 40 }]}>
            <MenuItem
              icon="log-out-outline"
              title="Đăng xuất"
              danger
              onPress={handleLogout}
            />
          </View>

          <Text style={styles.versionText}>Music App Version 1.2.0 • Made with ❤️</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ff',
    
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerCard: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 55,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#050505',
  },
  premiumCrown: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F59E0B',
    padding: 6,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#050505',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  userNameSection: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  username: {
    color: '#FFF',
    fontSize: SIZES.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    marginTop: 4,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuText: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  menuDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default React.memo(ProfileScreen);
