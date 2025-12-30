import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { historyService } from '../../services/historyService';
import SuccessModal from '../../components/Common/SuccessModal';
import { settingsDatabase } from '../../config/settingsDb';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    notifications: true,
    autoPlay: false,
    highQuality: true,
    downloadOnWifi: true,
    darkMode: true,
  });

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await settingsDatabase.getAllSettings();
    if (Object.keys(savedSettings).length > 0) {
      setSettings(prev => ({ ...prev, ...savedSettings }));
    }
  };

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    icon: 'checkmark-circle',
    onClose: null
  });

  const showAlert = (title, message, icon = 'checkmark-circle', callback = null) => {
    setAlertConfig({
      title,
      message,
      icon,
      onClose: callback
    });
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertConfig.onClose) {
      alertConfig.onClose();
    }
  };

  const handleSettingChange = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await settingsDatabase.updateSetting(key, value);
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={COLORS.textSecondary} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  const handleClearCache = () => {
    Alert.alert(
      'Xóa bộ nhớ đệm',
      'Bạn có chắc chắn muốn xóa bộ nhớ đệm? Điều này có thể ảnh hưởng đến hiệu suất ứng dụng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            // Implement cache clearing logic
            showAlert('Thành công', 'Đã xóa bộ nhớ đệm', 'checkmark-circle');
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử nghe nhạc?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await historyService.clearHistory();
              showAlert('Thành công', 'Đã xóa lịch sử nghe nhạc', 'checkmark-circle');
            } catch (error) {
              console.error('Clear history error:', error);
              showAlert('Lỗi', 'Không thể xóa lịch sử. Vui lòng thử lại.', 'alert-circle');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
      >
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cài đặt</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phát nhạc</Text>
        
        <SettingItem
          icon="notifications-outline"
          title="Thông báo"
          subtitle="Nhận thông báo về bài hát mới"
          rightComponent={
            <Switch
              value={settings.notifications}
              onValueChange={(value) => handleSettingChange('notifications', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.notifications ? COLORS.white : COLORS.textMuted}
            />
          }
        />

        <SettingItem
          icon="musical-notes-outline"
          title="Chất lượng cao"
          subtitle="Phát nhạc ở chất lượng cao nhất"
          rightComponent={
            <Switch
              value={settings.highQuality}
              onValueChange={(value) => handleSettingChange('highQuality', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.highQuality ? COLORS.white : COLORS.textMuted}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tải xuống</Text>
        
        <SettingItem
          icon="wifi-outline"
          title="Chỉ tải khi có WiFi"
          subtitle="Tiết kiệm dữ liệu di động"
          rightComponent={
            <Switch
              value={settings.downloadOnWifi}
              onValueChange={(value) => handleSettingChange('downloadOnWifi', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.downloadOnWifi ? COLORS.white : COLORS.textMuted}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giao diện</Text>
        
        <SettingItem
          icon="moon-outline"
          title="Chế độ tối"
          subtitle="Giao diện tối"
          rightComponent={
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => handleSettingChange('darkMode', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.darkMode ? COLORS.white : COLORS.textMuted}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lưu trữ</Text>
        
        <SettingItem
          icon="trash-outline"
          title="Xóa bộ nhớ đệm"
          subtitle="Giải phóng dung lượng"
          onPress={handleClearCache}
          rightComponent={<Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />}
        />

        <SettingItem
          icon="time-outline"
          title="Xóa lịch sử nghe"
          subtitle="Xóa toàn bộ lịch sử"
          onPress={handleClearHistory}
          rightComponent={<Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Khác</Text>
        
        <SettingItem
          icon="help-circle-outline"
          title="Trợ giúp"
          subtitle="Câu hỏi thường gặp"
          onPress={() => navigation.navigate('Help')}
          rightComponent={<Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />}
        />

        <SettingItem
          icon="information-circle-outline"
          title="Giới thiệu"
          subtitle="Thông tin ứng dụng"
          onPress={() => navigation.navigate('About')}
          rightComponent={<Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />}
        />
      </View>
      </ScrollView>
      
      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />
      
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
});

export default SettingsScreen;
