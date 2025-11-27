import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import YouTubeBackground from '../../components/Profile/YouTubeBackground';

// Simple Header Background
const HeaderBackground = () => {
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark || COLORS.primary]}
      style={styles.headerBackground}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { stopPlayer, isPlaying } = usePlayer();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          onPress: async () => {
            // Stop player first
            await stopPlayer();
            // Then logout (which will clear cache)
            await logout();
          }, 
          style: 'destructive' 
        },
      ]
    );
  };

  const MenuItem = ({ icon, title, onPress, danger, gradientColors }) => {
    // Default gradient colors for different menu items
    const getGradientColors = () => {
      if (gradientColors) return gradientColors;
      if (danger) return ['#EF5350', '#E57373'];
      
      // Different colors for different menu items
      const colorMap = {
        'person-outline': ['#2196F3', '#21CBF3'],
        'settings-outline': ['#9C27B0', '#BA68C8'],
        'help-circle-outline': ['#FF9800', '#FFB74D'],
        'information-circle-outline': ['#00BCD4', '#4DD0E1'],
        'wallet': ['#4CAF50', '#66BB6A'],
        'star': ['#FFD700', '#FFE082'],
        'musical-notes-outline': ['#E91E63', '#F06292'],
        'bar-chart-outline': ['#9C27B0', '#E91E63'],
        'shield-outline': ['#F44336', '#EF5350'],
      };
      
      return colorMap[icon] || [COLORS.primary, COLORS.accent];
    };
    
    const colors = getGradientColors();
    
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <LinearGradient
          colors={colors}
          style={styles.menuIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name={icon}
            size={24}
            color="#FFF"
          />
        </LinearGradient>
        <Text style={[styles.menuText, danger && styles.dangerText]}>{title}</Text>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {/* YouTube Background or Gradient */}
          {user?.background_video_url ? (
            <YouTubeBackground 
              videoUrl={user.background_video_url} 
              isMuted={isPlaying}
            />
          ) : (
            <HeaderBackground />
          )}

          <Image
            source={{
              uri: user?.avatar_url || 'https://via.placeholder.com/100',
            }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.menu}>
          <MenuItem
            icon="person-outline"
            title="Chỉnh sửa hồ sơ"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="settings-outline"
            title="Cài đặt"
            onPress={() => navigation.navigate('Settings')}
          />
          <MenuItem
            icon="help-circle-outline"
            title="Trợ giúp & Hỗ trợ"
            onPress={() => navigation.navigate('Help')}
          />
          <MenuItem
            icon="information-circle-outline"
            title="Giới thiệu"
            onPress={() => navigation.navigate('About')}
          />
          <MenuItem
            icon="wallet"
            title="Ví của tôi"
            onPress={() => navigation.navigate('Wallet')}
          />
          <MenuItem
            icon="star"
            title="Premium"
            onPress={() => navigation.navigate('Premium')}
          />

          {/* Register as Artist - Only show for regular users who are not pending */}
          {user?.role === 'user' && !user?.is_pending_artist && (
            <MenuItem
              icon="musical-notes-outline"
              title="Đăng ký làm Artist"
              onPress={() => navigation.navigate('RegisterArtist')}
            />
          )}
          
          {/* Artist Dashboard - Only show for artist users */}
          {user?.role === 'artist' && (
            <MenuItem
              icon="bar-chart-outline"
              title="Artist Dashboard"
              onPress={() => navigation.navigate('ArtistDashboard', { artistId: user.artist_id })}
            />
          )}
          
          {/* Admin Dashboard - Only show for admin users */}
          {user?.role === 'admin' && (
            <MenuItem
              icon="shield-outline"
              title="Quản trị viên"
              onPress={() => navigation.navigate('AdminDashboard')}
            />
          )}
          
          <MenuItem
            icon="log-out-outline"
            title="Đăng xuất"
            onPress={handleLogout}
            danger
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Music App v1.0.0</Text>
        </View>
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
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  username: {
    color: '#ffffff',
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  email: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: SIZES.base,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Padding để không bị đè bởi tab bar
  },
  menu: {
    marginTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    gap: 16,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  dangerText: {
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
});

export default ProfileScreen;
