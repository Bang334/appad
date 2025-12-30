import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AboutScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const handleOpenLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết');
    });
  };

  const handleRateApp = () => {
    Alert.alert(
      'Đánh giá ứng dụng',
      'Bạn có muốn đánh giá ứng dụng trên cửa hàng không?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Có', onPress: () => handleOpenLink('https://play.google.com/store') },
      ]
    );
  };

  const handleShareApp = () => {
    Alert.alert(
      'Chia sẻ ứng dụng',
      'Chia sẻ ứng dụng với bạn bè',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chia sẻ', onPress: () => {
          // Implement share functionality
          Alert.alert('Thành công', 'Đã chia sẻ ứng dụng');
        }},
      ]
    );
  };

  const InfoItem = ({ icon, title, subtitle, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.infoItem} onPress={onPress}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>{title}</Text>
          {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Giới thiệu</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.appInfo}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="musical-notes" size={40} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.appName}>Music App</Text>
        <Text style={styles.appVersion}>Phiên bản 1.0.0</Text>
        <Text style={styles.appDescription}>
          Ứng dụng nghe nhạc trực tuyến với hàng triệu bài hát và playlist chất lượng cao.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hành động</Text>
        
        <InfoItem
          icon="star-outline"
          title="Đánh giá ứng dụng"
          subtitle="Đánh giá và nhận xét"
          onPress={handleRateApp}
        />

        <InfoItem
          icon="share-outline"
          title="Chia sẻ ứng dụng"
          subtitle="Giới thiệu với bạn bè"
          onPress={handleShareApp}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liên hệ</Text>
        
        <InfoItem
          icon="mail-outline"
          title="Email hỗ trợ"
          subtitle="support@musicapp.com"
          onPress={() => handleOpenLink('mailto:support@musicapp.com')}
        />

        <InfoItem
          icon="globe-outline"
          title="Website"
          subtitle="www.musicapp.com"
          onPress={() => handleOpenLink('https://www.musicapp.com')}
        />

        <InfoItem
          icon="logo-facebook"
          title="Facebook"
          subtitle="Music App Official"
          onPress={() => handleOpenLink('https://facebook.com/musicapp')}
        />

        <InfoItem
          icon="logo-twitter"
          title="Twitter"
          subtitle="@musicapp"
          onPress={() => handleOpenLink('https://twitter.com/musicapp')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pháp lý</Text>
        
        <InfoItem
          icon="document-text-outline"
          title="Điều khoản sử dụng"
          subtitle="Đọc điều khoản"
          onPress={() => Alert.alert('Điều khoản', 'Điều khoản sử dụng sẽ được hiển thị ở đây')}
        />

        <InfoItem
          icon="shield-checkmark-outline"
          title="Chính sách bảo mật"
          subtitle="Thông tin bảo mật"
          onPress={() => Alert.alert('Bảo mật', 'Chính sách bảo mật sẽ được hiển thị ở đây')}
        />

        <InfoItem
          icon="information-circle-outline"
          title="Bản quyền"
          subtitle="© 2024 Music App"
          onPress={() => Alert.alert('Bản quyền', 'Tất cả quyền được bảo lưu')}
          showArrow={false}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Được phát triển với ❤️ bởi đội ngũ Music App
        </Text>
        <Text style={styles.footerText}>
          © 2024 Music App. Tất cả quyền được bảo lưu.
        </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  placeholder: {
    width: 40,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: SIZES.padding,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  appName: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appVersion: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginBottom: 16,
  },
  appDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: SIZES.padding,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  footer: {
    padding: SIZES.padding * 2,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default AboutScreen;
