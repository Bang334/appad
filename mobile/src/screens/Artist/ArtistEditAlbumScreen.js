import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useAlert } from '../../context/AlertContext';

const ArtistEditAlbumScreen = ({ route, navigation }) => {
  const { artistId, album } = route.params;
  const { showError, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState(null); // { uri, type, name }
  
  const [formData, setFormData] = useState({
    title: album?.title || '',
    artist_id: artistId,
    release_date: album?.release_date ? new Date(album.release_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    cover_url: album?.cover_url || '',
    is_premium: album?.is_premium === 1,
    price: album?.price ? album.price.toString() : '0',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Selected album cover:', result.assets[0]);
        setCoverFile({
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'image/jpeg',
          name: result.assets[0].fileName || 'album_cover.jpg',
        });
        setFormData(prev => ({ ...prev, cover_url: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      showError('Lỗi', 'Không thể chọn ảnh bìa');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên album');
      return false;
    }
    if (!formData.release_date) {
      showError('Lỗi', 'Vui lòng chọn ngày phát hành');
      return false;
    }
    if (formData.is_premium && (!formData.price || parseFloat(formData.price) < 0)) {
      showError('Lỗi', 'Vui lòng nhập giá hợp lệ');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const files = coverFile ? { cover: coverFile } : null;

      if (album) {
        // Update existing album
        await artistService.updateAlbum(artistId, album.album_id, formData, files);
        showSuccess('Thành công', 'Đã cập nhật album');
        setTimeout(() => navigation.goBack(), 1000);
      } else {
        // Create new album
        await artistService.createAlbum(artistId, formData, files);
        showSuccess('Thành công', 'Đã tạo album mới');
        setTimeout(() => navigation.goBack(), 1000);
      }
    } catch (error) {
      console.error('Error saving album:', error);
      showError('Lỗi', error.response?.data?.message || 'Không thể lưu album');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {album ? 'Chỉnh sửa album' : 'Thêm album mới'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Album Cover */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Ảnh bìa</Text>
            <View style={styles.coverContainer}>
              <TouchableOpacity onPress={pickCoverImage} style={styles.coverWrapper}>
                {formData.cover_url ? (
                  <Image source={{ uri: formData.cover_url }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="musical-notes" size={48} color={COLORS.primary} />
                    <Text style={styles.coverPlaceholderText}>Chạm để chọn ảnh</Text>
                  </View>
                )}
                <View style={styles.editIconBadge}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Album Title */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Tên album *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên album"
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Release Date */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Ngày phát hành (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.release_date}
              onChangeText={(value) => handleInputChange('release_date', value)}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Premium Status */}
          <View style={[styles.inputSection, styles.premiumSection]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Ionicons name="star" size={20} color={formData.is_premium ? COLORS.warning : COLORS.textSecondary} />
                <Text style={styles.sectionTitleWithoutMargin}>Album Premium</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, formData.is_premium && styles.switchActive]}
                onPress={() => handleInputChange('is_premium', !formData.is_premium)}
              >
                <View style={[styles.switchThumb, formData.is_premium && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Album premium chỉ dành cho người dùng gói Premium hoặc phải mua lẻ.
            </Text>
          </View>

          {/* Price */}
          {formData.is_premium && (
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>Giá bán (VNĐ)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.price}
                onChangeText={(value) => handleInputChange('price', value.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: SIZES.padding,
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTitleWithoutMargin: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  coverContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  coverWrapper: {
    position: 'relative',
  },
  coverImage: {
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  coverPlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  premiumSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: SIZES.borderRadius,
    gap: 8,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ArtistEditAlbumScreen;
