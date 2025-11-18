import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../config/theme';

const { width, height } = Dimensions.get('window');

// Sun Component
const Sun = ({ animatedValue }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Mặt trời: 15% (bình minh) → 42% (giữa trời) → 73% (hoàng hôn)
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.15, 0.22, 0.7, 0.73, 1],
    outputRange: [0, 0.3, 1, 1, 0, 0],
  });

  // Quỹ đạo ngang: từ trái sang phải toàn bộ màn hình
  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.15, 0.22, 0.42, 0.58, 0.7, 0.73, 1],
    outputRange: [-80, -50, 0, width * 0.35, width * 0.65, width * 0.9, width + 50, width + 80],
  });

  // Đường cong parabol: xuất phát thấp, lên cao giữa trời, xuống thấp
  const translateY = animatedValue.interpolate({
    inputRange: [0, 0.15, 0.22, 0.42, 0.58, 0.7, 0.73, 1],
    outputRange: [140, 110, 80, 30, 35, 90, 140, 160],
  });

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.sun,
        {
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <View style={styles.sunCore} />
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.sunRay,
              {
                transform: [{ rotate: `${i * 30}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

// Moon Component
const Moon = ({ animatedValue }) => {
  // Mặt trăng xuất hiện suốt đêm: 0-15% (lặn dần) và 85-100% (mọc dần)
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.08, 0.15, 0.22, 0.73, 0.85, 0.93, 1],
    outputRange: [1, 0.9, 0.3, 0, 0, 0.3, 0.9, 1],
  });

  // Quỹ đạo ngang: bay liên tục từ cuối đêm cũ → sang đầu đêm mới
  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.08, 0.15, 0.22, 0.85, 0.93, 1],
    outputRange: [width * 0.4, width * 0.7, width + 50, width + 80, -80, -30, width * 0.4],
  });

  // Đường cong parabol: lặn dần rồi mọc dần
  const translateY = animatedValue.interpolate({
    inputRange: [0, 0.08, 0.15, 0.22, 0.85, 0.93, 1],
    outputRange: [35, 70, 120, 150, 150, 100, 35],
  });

  return (
    <Animated.View
      style={[
        styles.moon,
        {
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <View style={styles.moonCore} />
      <View style={styles.moonCrater1} />
      <View style={styles.moonCrater2} />
      <View style={styles.moonCrater3} />
    </Animated.View>
  );
};

// Cloud Component
const Cloud = ({ delay, duration, startY, scale = 1, direction = 'right' }) => {
  const position = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      position.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(position, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, []);

  // Tính toán vị trí dựa theo hướng bay
  const startX = direction === 'right' ? -150 : width + 150;
  const endX = direction === 'right' ? width + 150 : -150;

  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });

  // Fade in/out ở rìa màn hình
  const opacity = position.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.7, 0.7, 0],
  });

  return (
    <Animated.View
      style={[
        styles.cloud,
        {
          top: startY,
          opacity,
          transform: [{ translateX }, { scale }],
        },
      ]}
    >
      <View style={[styles.cloudPart, styles.cloudPart1]} />
      <View style={[styles.cloudPart, styles.cloudPart2]} />
      <View style={[styles.cloudPart, styles.cloudPart3]} />
    </Animated.View>
  );
};

// Star Component for night sky
const Star = ({ left, top, size, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left,
          top,
          width: size,
          height: size,
          opacity,
        },
      ]}
    />
  );
};

// Day Night Cycle Background
const DayNightBackground = () => {
  const cycleValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      cycleValue.setValue(0);
      Animated.timing(cycleValue, {
        toValue: 1,
        duration: 40000, // 40 seconds for full cycle - very smooth transitions
        useNativeDriver: false,
        easing: (t) => t, // Linear easing for consistent speed
      }).start(() => animate());
    };

    animate();
  }, []);

  const starsOpacity = cycleValue.interpolate({
    inputRange: [0, 0.15, 0.22, 0.73, 0.85, 1],
    outputRange: [1, 0.8, 0, 0, 0.8, 1],
  });

  // Đêm tối (0-15%, 85-100%) với fade mượt
  const nightOpacity = cycleValue.interpolate({
    inputRange: [0, 0.12, 0.15, 0.22, 0.73, 0.82, 0.85, 1],
    outputRange: [1, 1, 0.8, 0, 0, 0.8, 1, 1],
  });

  // Bình minh (15-42%) - vàng cam nhẹ khi mặt trời xuất hiện
  const dawnOpacity = cycleValue.interpolate({
    inputRange: [0, 0.12, 0.15, 0.22, 0.35, 0.42, 0.48, 1],
    outputRange: [0, 0, 0.3, 1, 1, 0.5, 0, 0],
  });

  // Ban ngày (35-65%) - sáng nhất khi mặt trời ở giữa trời
  const dayOpacity = cycleValue.interpolate({
    inputRange: [0, 0.35, 0.42, 0.58, 0.65, 0.70, 1],
    outputRange: [0, 0, 0.5, 1, 0.5, 0, 0],
  });

  // Hoàng hôn (58-82%) - cam vàng khi mặt trời lặn
  const sunsetOpacity = cycleValue.interpolate({
    inputRange: [0, 0.58, 0.65, 0.73, 0.82, 0.85, 1],
    outputRange: [0, 0, 0.5, 1, 0.5, 0.2, 0],
  });

  return (
    <>
      {/* Layer 1: Đêm tối */}
      <Animated.View style={[styles.headerBackground, { opacity: nightOpacity }]}>
        <LinearGradient
          colors={['#0a0e27', '#1a1a2e', '#2c3e50']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Layer 2: Bình minh - vàng nhẹ khi mặt trời xuất hiện */}
      <Animated.View style={[styles.headerBackground, { opacity: dawnOpacity }]}>
        <LinearGradient
          colors={['#FFB347', '#FFE5B4', '#FFF8DC']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Layer 3: Ban ngày - xanh sáng nhất khi mặt trời ở giữa */}
      <Animated.View style={[styles.headerBackground, { opacity: dayOpacity }]}>
        <LinearGradient
          colors={['#4A90E2', '#87CEEB', '#B0E0E6']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Layer 4: Hoàng hôn - cam vàng khi mặt trời lặn */}
      <Animated.View style={[styles.headerBackground, { opacity: sunsetOpacity }]}>
        <LinearGradient
          colors={['#FF8C42', '#FFD700', '#FFE4B5']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
      
      {/* Stars - only visible at night */}
      <Animated.View style={{ opacity: starsOpacity }}>
        {[...Array(30)].map((_, i) => (
          <Star
            key={i}
            left={Math.random() * width}
            top={Math.random() * 200}
            size={Math.random() * 2.5 + 1}
            delay={Math.random() * 2000}
          />
        ))}
      </Animated.View>
      
      <Sun animatedValue={cycleValue} />
      <Moon animatedValue={cycleValue} />
      
      {/* Clouds with different sizes and directions */}
      <Cloud delay={0} duration={15000} startY={40} scale={0.8} direction="right" />
      <Cloud delay={3000} duration={18000} startY={80} scale={1.2} direction="left" />
      <Cloud delay={6000} duration={16000} startY={120} scale={0.9} direction="right" />
      <Cloud delay={9000} duration={17000} startY={60} scale={1.1} direction="left" />
      <Cloud delay={12000} duration={19000} startY={100} scale={0.85} direction="right" />
      <Cloud delay={7000} duration={20000} startY={140} scale={1.0} direction="left" />
      <Cloud delay={4000} duration={17000} startY={50} scale={0.95} direction="right" />
      <Cloud delay={10000} duration={19000} startY={110} scale={0.88} direction="left" />
    </>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const MenuItem = ({ icon, title, onPress, danger }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons
        name={icon}
        size={24}
        color={danger ? COLORS.error : COLORS.textSecondary}
      />
      <Text style={[styles.menuText, danger && styles.dangerText]}>{title}</Text>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DayNightBackground />

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
  // Sun styles
  sun: {
    position: 'absolute',
    top: 50,
    left: 0,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  sunRay: {
    position: 'absolute',
    width: 4,
    height: 20,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    top: -25,
  },
  // Moon styles
  moon: {
    position: 'absolute',
    top: 50,
    left: 0,
    width: 50,
    height: 50,
  },
  moonCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    shadowColor: '#F0F0F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  moonCrater1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
    top: 15,
    left: 18,
  },
  moonCrater2: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0D0D0',
    top: 25,
    left: 30,
  },
  moonCrater3: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D0D0D0',
    top: 30,
    left: 15,
  },
  // Cloud styles
  cloud: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cloudPart: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
  },
  cloudPart1: {
    width: 40,
    height: 25,
    marginRight: -15,
  },
  cloudPart2: {
    width: 50,
    height: 35,
    marginRight: -15,
    zIndex: 2,
  },
  cloudPart3: {
    width: 40,
    height: 25,
  },
  // Star styles
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
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
  menu: {
    marginTop: 24,
    paddingBottom: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    gap: 16,
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
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
});

export default ProfileScreen;

