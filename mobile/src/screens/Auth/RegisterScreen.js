import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../config/theme';
import SuccessModal from '../../components/Common/SuccessModal';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerAsArtist, setRegisterAsArtist] = useState(false);
  const [artistBio, setArtistBio] = useState('');
  const [artistCountry, setArtistCountry] = useState('');
  const [artistImageUrl, setArtistImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

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

  const handleRegister = async () => {
    // Validation
    if (!username || !username.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên đăng nhập', 'alert-circle');
      return;
    }

    if (username.length < 3 || username.length > 50) {
      showAlert('Lỗi', 'Tên đăng nhập phải từ 3-50 ký tự', 'alert-circle');
      return;
    }

    if (!email || !email.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập email', 'alert-circle');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Lỗi', 'Email không hợp lệ', 'alert-circle');
      return;
    }

    if (!password || password.length < 6) {
      showAlert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự', 'alert-circle');
      return;
    }

    setLoading(true);
    try {
      const result = await register(
        username.trim(),
        email.trim().toLowerCase(),
        password,
        fullName?.trim() || '',
        registerAsArtist,
        registerAsArtist ? artistBio.trim() : '',
        registerAsArtist ? artistCountry.trim() : '',
        registerAsArtist ? artistImageUrl.trim() : '',
      );
      setLoading(false);

      if (result.success) {
        showAlert('Thành công', 'Đăng ký tài khoản thành công!', 'checkmark-circle', () => navigation.navigate('Login'));
      } else {
        showAlert('Đăng ký thất bại', result.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'alert-circle');
      }
    } catch (error) {
      setLoading(false);
      console.error('Register error:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.', 'alert-circle');
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.gradient.start, COLORS.gradient.end]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Đăng ký</Text>
            <Text style={styles.subtitle}>Tạo tài khoản mới</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Tên đăng nhập *"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />

            <TextInput
              style={styles.input}
              placeholder="Mật khẩu *"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Đăng ký làm nghệ sĩ */}
            <TouchableOpacity
              style={styles.artistToggle}
              onPress={() => setRegisterAsArtist(!registerAsArtist)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  registerAsArtist && styles.checkboxChecked,
                ]}
              >
                {registerAsArtist && <Text style={styles.checkboxIcon}>✓</Text>}
              </View>
              <View style={styles.artistTextContainer}>
                <Text style={styles.artistTitle}>Đăng ký làm nghệ sĩ</Text>
                <Text style={styles.artistSubtitle}>
                  Tài khoản sẽ được chuyển cho admin duyệt trước khi hoạt động.
                </Text>
              </View>
            </TouchableOpacity>

            {registerAsArtist && (
              <View style={styles.artistExtraFields}>
                <TextInput
                  style={styles.input}
                  placeholder="Quốc gia (VD: Việt Nam)"
                  placeholderTextColor={COLORS.textMuted}
                  value={artistCountry}
                  onChangeText={setArtistCountry}
                />
                <TextInput
                  style={[styles.input, styles.artistBioInput]}
                  placeholder="Giới thiệu / tiểu sử (bio) của nghệ sĩ"
                  placeholderTextColor={COLORS.textMuted}
                  value={artistBio}
                  onChangeText={setArtistBio}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ảnh đại diện (URL hình ảnh, có thể thêm sau)"
                  placeholderTextColor={COLORS.textMuted}
                  value={artistImageUrl}
                  onChangeText={setArtistImageUrl}
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SIZES.padding * 2,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.white,
    opacity: 0.9,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.white,
  },
  registerButton: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    alignItems: 'center',
    marginTop: 16,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: COLORS.white,
    fontSize: SIZES.base,
  },
  loginLink: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: 'bold',
  },
  artistToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.white,
  },
  checkboxIcon: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  artistTextContainer: {
    flex: 1,
  },
  artistTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  artistSubtitle: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    opacity: 0.9,
    marginTop: 2,
  },
  artistExtraFields: {
    gap: 12,
    marginTop: 4,
  },
  artistBioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default RegisterScreen;

