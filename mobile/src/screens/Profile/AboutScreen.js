import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AboutScreen = ({ navigation }) => {
  const handleOpenLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết');
    });
  };

  const handleRateApp = () => {
    Alert.alert(
      'Chưa phát hành trên Play Store',
      'Bản hiện tại đang được thử nghiệm bằng Expo Go. Liên kết đánh giá sẽ có sau khi ứng dụng được phát hành.',
      [{ text: 'Đã hiểu' }]
    );
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Music App',
        message: 'Music App - nghe nhạc, tạo playlist và khám phá nghệ sĩ yêu thích.',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
      Alert.alert('Lỗi', 'Không thể mở bảng chia sẻ.');
    }
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
      <View style={styles.header}>
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
          icon="logo-github"
          title="Dự án trên GitHub"
          subtitle="github.com/Bang334/appad"
          onPress={() => handleOpenLink('https://github.com/Bang334/appad')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pháp lý</Text>
        
        <InfoItem
          icon="document-text-outline"
          title="Điều khoản sử dụng"
          subtitle="Đọc điều khoản"
          onPress={() => Alert.alert(
            'Điều khoản sử dụng',
            'Không tải lên hoặc chia sẻ nội dung vi phạm bản quyền. Tài khoản có thể bị hạn chế khi lạm dụng dịch vụ hoặc gây ảnh hưởng đến người dùng khác.'
          )}
        />

        <InfoItem
          icon="shield-checkmark-outline"
          title="Chính sách bảo mật"
          subtitle="Thông tin bảo mật"
          onPress={() => Alert.alert(
            'Chính sách bảo mật',
            'Ứng dụng lưu thông tin tài khoản, lịch sử nghe và dữ liệu giao dịch để cung cấp dịch vụ. Không chia sẻ mật khẩu hoặc mã đăng nhập với người khác.'
          )}
        />

        <InfoItem
          icon="information-circle-outline"
          title="Bản quyền"
          subtitle="© 2026 Music App"
          onPress={() => Alert.alert('Bản quyền', 'Tất cả quyền được bảo lưu')}
          showArrow={false}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Được phát triển bởi đội ngũ Music App
        </Text>
        <Text style={styles.footerText}>
          © 2026 Music App. Tất cả quyền được bảo lưu.
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
    paddingTop: 60,
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
