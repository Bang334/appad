import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../config/theme';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

const RegisterArtistScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    artist_name: user?.full_name || user?.username || '',
    artist_bio: '',
    artist_country: '',
    artist_image_url: user?.avatar_url || '',
    // Default values for backend compatibility, hidden from UI as requested
    membership_price: '50000',
    membership_duration_days: '30',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        artist_name: prev.artist_name || user.full_name || user.username || '',
        artist_image_url: prev.artist_image_url || user.avatar_url || '',
      }));
    }
  }, [user]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để tải ảnh nghệ sĩ.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleUploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleUploadImage = async (uri) => {
    setUploadingImage(true);
    try {
      // Reusing userService.uploadAvatar which has the retry logic (3 attempts)
      const response = await userService.uploadAvatar(uri);
      
      // Update form data with the new avatar URL
      if (response && response.data) {
        setFormData(prev => ({
          ...prev,
          artist_image_url: response.data.avatar_url
        }));
        // Update global user state as well to reflect the change immediately
        updateUser(response.data);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Lỗi Upload', 'Không thể tải ảnh lên sau 3 lần thử. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.artist_name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nghệ sĩ');
      return;
    }

    if (!formData.artist_image_url) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ảnh đại diện cho nghệ sĩ');
      return;
    }

    setLoading(true);
    try {
      await userService.registerArtist(formData);
      Alert.alert(
        'Đăng ký thành công',
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
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
             <LinearGradient
                colors={[COLORS.primary, '#1a1a1a']}
                style={[styles.headerGradient, { paddingTop: insets.top }]}
              >
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đăng ký Artist</Text>
                <View style={{ width: 40 }} /> 
             </LinearGradient>
          </View>

          <View style={styles.bodyContainer}>
            {/* Image Picker */}
            <View style={styles.imageSection}>
              <TouchableOpacity onPress={pickImage} style={styles.imageWrapper} disabled={uploadingImage}>
                {formData.artist_image_url ? (
                  <Image source={{ uri: formData.artist_image_url }} style={styles.artistImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="person" size={40} color={COLORS.textSecondary} />
                  </View>
                )}
                
                <View style={styles.cameraIconBadge}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="camera" size={16} color={COLORS.white} />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.imageHint}>Chạm để thay đổi ảnh</Text>
            </View>

            {/* Introduction Card */}
            <View style={styles.infoCard}>
              <Ionicons name="musical-notes" size={32} color={COLORS.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.cardTitle}>Trở thành Nghệ sĩ</Text>
              <Text style={styles.cardContent}>
                Chia sẻ âm nhạc của bạn với thế giới. Quản lý album, theo dõi thống kê và xây dựng cộng đồng người hâm mộ.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên Nghệ Sĩ</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.artist_name}
                    onChangeText={(text) => handleChange('artist_name', text)}
                    placeholder="Nhập nghệ danh..."
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quốc Gia</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="globe-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.artist_country}
                    onChangeText={(text) => handleChange('artist_country', text)}
                    placeholder="Ví dụ: Việt Nam"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Giới Thiệu</Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start', height: 120 }]}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.artist_bio}
                    onChangeText={(text) => handleChange('artist_bio', text)}
                    placeholder="Mô tả ngắn về phong cách âm nhạc/tiểu sử..."
                    placeholderTextColor={COLORS.textSecondary}
                    multiline
                    textAlignVertical="top"
                    numberOfLines={4}
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || uploadingImage}
              style={[styles.submitButtonBox, (loading || uploadingImage) && styles.disabledButton]}
            >
              <LinearGradient
                colors={[COLORS.primary, '#c026d3']} // Purple to Pink gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Gửi Yêu Cầu Đăng Ký</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    height: 180, // Taller header for overlap effect
    marginBottom: -40, // Pull up the content
  },
  headerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    marginTop: 10,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    fontWeight: '700',
    marginTop: 16,
  },
  bodyContainer: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 0,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.background,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
    position: 'relative',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  imageHint: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 8,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardContent: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: 14,
    fontSize: SIZES.md,
  },
  textArea: {
    height: '100%',
    paddingTop: 12, // Align text to top
  },
  submitButtonBox: {
    marginTop: 32,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default RegisterArtistScreen;
