import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../config/theme';
import { userService } from '../../services/userService';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import SuccessModal from '../../components/Common/SuccessModal';
import MiniPlayer from '../../components/Player/MiniPlayer';
import YouTubeBackground from '../../components/Profile/YouTubeBackground';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { showModal, modalData, showSuccess, showError, hideModal } = useSuccessModal();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
  });
  const [videoUrl, setVideoUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        full_name: user.full_name || '',
      });
      if (user.background_video_url) {
        setVideoUrl(user.background_video_url);
        setPreviewUrl(user.background_video_url);
      }
    }
  }, [user]);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError('Lỗi', 'Cần quyền truy cập thư viện ảnh để thay đổi avatar');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const uploadAvatar = async (imageUri) => {
    setUploadingAvatar(true);
    try {
      const response = await userService.uploadAvatar(imageUri);
      updateUser(response.data);
        showSuccess('Thành công', 'Cập nhật ảnh đại diện thành công');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showError('Lỗi', 'Không thể tải ảnh lên');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên người dùng');
      return;
    }

    if (!formData.email.trim()) {
      showError('Lỗi', 'Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      const response = await userService.updateProfile(formData);
      updateUser(response.data);
        showSuccess('Thành công', 'Cập nhật hồ sơ thành công');
      navigation.goBack();
    } catch (error) {
      showError('Lỗi', error.response?.data?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handlePreviewVideo = () => {
    if (!videoUrl.trim()) {
      showError('Lỗi', 'Vui lòng nhập URL video YouTube');
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/).+/;
    if (!youtubeRegex.test(videoUrl.trim())) {
      showError('Lỗi', 'URL YouTube không hợp lệ. Vui lòng nhập URL hợp lệ (ví dụ: https://www.youtube.com/watch?v=VIDEO_ID)');
      return;
    }

    setPreviewUrl(videoUrl.trim());
  };

  const handleSaveVideo = async () => {
    if (!videoUrl.trim()) {
      showError('Lỗi', 'Vui lòng nhập URL video YouTube');
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/).+/;
    if (!youtubeRegex.test(videoUrl.trim())) {
      showError('Lỗi', 'URL YouTube không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const response = await userService.updateBackgroundVideo(videoUrl.trim());
      updateUser(response.data);
      showSuccess('Thành công', 'Đã cập nhật video background');
    } catch (error) {
      console.error('Error updating background video:', error);
      showError('Lỗi', error.response?.data?.message || 'Không thể cập nhật video background');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVideo = () => {
    Alert.alert(
      'Xóa video background',
      'Bạn có chắc chắn muốn xóa video background?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await userService.updateBackgroundVideo('');
              updateUser(response.data);
              setVideoUrl('');
              setPreviewUrl('');
              showSuccess('Thành công', 'Đã xóa video background');
            } catch (error) {
              console.error('Error removing background video:', error);
              showError('Lỗi', 'Không thể xóa video background');
            } finally {
              setLoading(false);
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
        <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user?.avatar_url || 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
          {uploadingAvatar && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.changeAvatarButton}
          onPress={pickImage}
          disabled={uploadingAvatar}
        >
          <Ionicons name="camera" size={20} color={COLORS.primary} />
          <Text style={styles.changeAvatarText}>
            {uploadingAvatar ? 'Đang tải...' : 'Thay đổi ảnh'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên người dùng</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            placeholder="Nhập tên người dùng"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Nhập email"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            value={formData.full_name}
            onChangeText={(text) => setFormData({ ...formData, full_name: text })}
            placeholder="Nhập họ và tên"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={handleChangePassword}
        >
          <Ionicons name="key-outline" size={20} color={COLORS.primary} />
          <Text style={styles.changePasswordText}>Thay đổi mật khẩu</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Video Background Section */}
        <View style={styles.videoBackgroundSection}>
          <Text style={styles.sectionTitle}>Video Background</Text>
          <Text style={styles.sectionSubtitle}>
            Thêm video YouTube làm background cho hồ sơ của bạn
          </Text>

          {/* Preview */}
          <View style={styles.previewContainer}>
            {previewUrl ? (
              <YouTubeBackground videoUrl={previewUrl} isMuted={false} />
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons name="videocam-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyPreviewText}>Chưa có video</Text>
              </View>
            )}
            <View style={styles.previewOverlay}>
              <Text style={styles.previewLabel}>Xem trước</Text>
            </View>
          </View>

          {/* Input */}
          <View style={styles.videoInputContainer}>
            <Ionicons name="link" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.videoInput}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.videoActions}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={handlePreviewVideo}
            >
              <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
              <Text style={styles.previewButtonText}>Xem trước</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveVideoButton, loading && styles.disabledButton]}
              onPress={handleSaveVideo}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  <Text style={styles.saveVideoButtonText}>Lưu video</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {user?.background_video_url && (
            <TouchableOpacity
              style={styles.removeVideoButton}
              onPress={handleRemoveVideo}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.removeVideoButtonText}>Xóa video background</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Success Modal */}
      <SuccessModal
        visible={showModal}
        onClose={hideModal}
        title={modalData.title}
        message={modalData.message}
        icon={modalData.icon}
      />
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  changeAvatarText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '500',
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
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    gap: 12,
  },
  changePasswordText: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  videoBackgroundSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 16,
    lineHeight: 20,
  },
  previewContainer: {
    height: 180,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyPreviewText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
  previewOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewLabel: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  videoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  videoInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  videoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  previewButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  saveVideoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
  },
  saveVideoButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  removeVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'transparent',
  },
  removeVideoButtonText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
});

export default EditProfileScreen;
