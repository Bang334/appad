import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { userService } from '../../services/userService';

import SuccessModal from '../../components/Common/SuccessModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChangePasswordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

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

  const handleSave = async () => {
    if (!formData.currentPassword.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại', 'alert-circle');
      return;
    }

    if (!formData.newPassword.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập mật khẩu mới', 'alert-circle');
      return;
    }

    if (formData.newPassword.length < 6) {
      showAlert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự', 'alert-circle');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showAlert('Lỗi', 'Mật khẩu xác nhận không khớp', 'alert-circle');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });
      showAlert('Thành công', 'Đổi mật khẩu thành công', 'checkmark-circle', () => navigation.goBack());
    } catch (error) {
      showAlert('Lỗi', error.response?.data?.message || 'Không thể đổi mật khẩu', 'alert-circle');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

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
        <Text style={styles.title}>Đổi mật khẩu</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu hiện tại</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.currentPassword}
              onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPasswords.current}
            />
            <TouchableOpacity
              onPress={() => togglePasswordVisibility('current')}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPasswords.current ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu mới</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.newPassword}
              onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPasswords.new}
            />
            <TouchableOpacity
              onPress={() => togglePasswordVisibility('new')}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPasswords.new ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPasswords.confirm}
            />
            <TouchableOpacity
              onPress={() => togglePasswordVisibility('confirm')}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPasswords.confirm ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Mật khẩu phải có ít nhất 6 ký tự và bao gồm chữ cái và số
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Đổi mật khẩu</Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
      
      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />
      
      
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
  form: {
    padding: SIZES.padding,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;

