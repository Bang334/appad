import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

const RegisterArtistScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    artist_name: user?.full_name || user?.username || '',
    artist_bio: '',
    artist_country: '',
    artist_image_url: user?.avatar_url || '',
    membership_price: '50000',
    membership_duration_days: '30',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.artist_name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nghệ sĩ');
      return;
    }

    setLoading(true);
    try {
      await userService.registerArtist(formData);
      Alert.alert(
        'Thành công',
        'Yêu cầu đăng ký nghệ sĩ của bạn đã được gửi. Vui lòng chờ admin duyệt.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Register artist error:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Đăng ký làm Artist</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Ionicons name="musical-notes" size={40} color={COLORS.primary} />
          <Text style={styles.infoTitle}>Trở thành Nghệ sĩ</Text>
          <Text style={styles.infoText}>
            Đăng tải nhạc của bạn, quản lý album và theo dõi thống kê người nghe.
            Yêu cầu của bạn sẽ được admin xem xét.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên nghệ sĩ *</Text>
            <TextInput
              style={styles.input}
              value={formData.artist_name}
              onChangeText={(text) => handleChange('artist_name', text)}
              placeholder="Nhập tên nghệ sĩ"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quốc gia</Text>
            <TextInput
              style={styles.input}
              value={formData.artist_country}
              onChangeText={(text) => handleChange('artist_country', text)}
              placeholder="Nhập quốc gia"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giới thiệu (Bio)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.artist_bio}
              onChangeText={(text) => handleChange('artist_bio', text)}
              placeholder="Giới thiệu về bản thân..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Link ảnh đại diện (URL)</Text>
            <TextInput
              style={styles.input}
              value={formData.artist_image_url}
              onChangeText={(text) => handleChange('artist_image_url', text)}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={styles.helperText}>Để trống để sử dụng ảnh đại diện hiện tại</Text>
          </View>

          <View style={styles.membershipRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Giá hội viên (VNĐ)</Text>
              <TextInput
                style={styles.input}
                value={formData.membership_price}
                onChangeText={(text) => handleChange('membership_price', text.replace(/[^0-9]/g, ''))}
                placeholder="50000"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Số ngày hiệu lực</Text>
              <TextInput
                style={styles.input}
                value={formData.membership_duration_days}
                onChangeText={(text) => handleChange('membership_duration_days', text.replace(/[^0-9]/g, ''))}
                placeholder="30"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
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
  content: {
    padding: SIZES.padding,
  },
  infoBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: SIZES.borderRadius,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  membershipRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    color: COLORS.text,
    fontSize: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default RegisterArtistScreen;
