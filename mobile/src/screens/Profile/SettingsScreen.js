import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '../../config/theme';
import MiniPlayer from '../../components/Player/MiniPlayer';
import SuccessModal from '../../components/Common/SuccessModal';
import { historyService } from '../../services/historyService';

const SETTINGS_STORAGE_KEY = 'app_settings';
const DEFAULT_SETTINGS = {
  autoPlay: true,
};
const PLAYBACK_CACHE_KEYS = [
  'isPlayingAlbum',
  'currentAlbumId',
  'isPlayingPlaylist',
  'currentPlaylistId',
];

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    icon: 'checkmark-circle',
    onClose: null
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

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
    const previousSettings = settings;
    const nextSettings = { ...previousSettings, [key]: value };
    setSettings(nextSettings);

    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
      setSettings(previousSettings);
      showAlert('Không thể lưu', 'Vui lòng thử lại.', 'alert-circle');
    }
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
      'Đặt lại phiên phát nhạc',
      'Thao tác này xóa album hoặc playlist đang ghi nhớ, nhưng không đăng xuất tài khoản.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(PLAYBACK_CACHE_KEYS);
              showAlert('Thành công', 'Đã xóa dữ liệu phát nhạc tạm thời.', 'checkmark-circle');
            } catch (error) {
              console.error('Error clearing playback cache:', error);
              showAlert('Không thể xóa', 'Vui lòng thử lại.', 'alert-circle');
            }
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
              const response = await historyService.clearHistory();
              if (!response?.success) {
                throw new Error(response?.message || 'Clear history failed');
              }
              showAlert('Thành công', 'Đã xóa lịch sử nghe nhạc.', 'checkmark-circle');
            } catch (error) {
              console.error('Error clearing listening history:', error);
              showAlert('Không thể xóa', 'Vui lòng kiểm tra kết nối và thử lại.', 'alert-circle');
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
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.header}>
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
          icon="play-circle-outline"
          title="Tự động phát"
          subtitle="Tự động phát bài tiếp theo"
          rightComponent={
            <Switch
              value={settings.autoPlay}
              onValueChange={(value) => handleSettingChange('autoPlay', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.autoPlay ? COLORS.white : COLORS.textMuted}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lưu trữ</Text>
        
        <SettingItem
          icon="trash-outline"
          title="Đặt lại phiên phát nhạc"
          subtitle="Xóa trạng thái album và playlist đang ghi nhớ"
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
