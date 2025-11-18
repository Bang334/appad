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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../config/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Đăng nhập thất bại', result.message);
    }
  };

  return (
    <LinearGradient
      colors={COLORS.gradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>🎵</Text>
          <Text style={styles.title}>Music App</Text>
          <Text style={styles.subtitle}>Khám phá thế giới âm nhạc</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ffffff', '#f0f0f0']}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>
                {loading ? '⏳ Đang đăng nhập...' : '🚀 Đăng nhập'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Đăng ký ngay ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SIZES.padding * 2,
  },
  header: {
    marginBottom: 50,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.white,
    opacity: 0.95,
    fontWeight: '300',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: SIZES.borderRadius + 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    padding: SIZES.padding + 2,
    fontSize: SIZES.md,
    color: COLORS.white,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: SIZES.borderRadius + 4,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: SIZES.padding + 2,
    paddingHorizontal: SIZES.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md + 1,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    opacity: 0.9,
  },
  registerLink: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});

export default LoginScreen;

