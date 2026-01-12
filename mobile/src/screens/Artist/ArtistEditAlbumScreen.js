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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import * as ImagePicker from 'expo-image-picker';


import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ArtistEditAlbumScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId, album } = route.params;
  const [loading, setLoading] = useState(false);
  
  // Format initial date to include time if available, or just YYYY-MM-DD HH:mm
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Construct YYYY-MM-DD HH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

  const [formData, setFormData] = useState({
    title: album?.title || '',
    release_date: album?.release_date ? formatDateTime(album.release_date) : '',
    cover_url: album?.cover_url || '',
    is_premium: album?.is_premium === 1,
    price: album?.price ? album.price.toString() : '0',
    description: album?.description || '', // Added description field support just in case
  });

  const [coverFile, setCoverFile] = useState(null);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });


      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCoverFile({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'cover.jpg',
        });
        setFormData(prev => ({ ...prev, cover_url: asset.uri }));
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh bìa');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên album');
      return false;
    }
    if (!formData.release_date) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày phát hành');
      return false;
    }
    // Simple validation for datetime format could be added here
    return true;
  };


  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Ensure date is in ISO format for backend if needed, or send as string
      // Usually backend expects strict format. Let's try to convert back to ISO if user entered YYYY-MM-DD HH:mm
      let submitData = { ...formData };
      
      // Attempt generic parse
      const parsedDate = new Date(formData.release_date);
      if (!isNaN(parsedDate.getTime())) {
          submitData.release_date = parsedDate.toISOString(); 
      }

      if (album) {
        // Update existing album
        await artistService.updateAlbum(artistId, album.album_id, submitData, coverFile ? { cover: coverFile } : null);
        Alert.alert('Thành công', 'Đã cập nhật album', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new album
        await artistService.createAlbum(artistId, submitData, coverFile ? { cover: coverFile } : null);
        Alert.alert('Thành công', 'Đã tạo album mới', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }

    } catch (error) {
      console.error('Error saving album:', error);
      Alert.alert('Lỗi', 'Không thể lưu album: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!album) return;

    Alert.alert(
      'Xóa album',
      `Bạn có chắc muốn xóa album "${album.title}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await artistService.deleteAlbum(artistId, album.album_id);
              Alert.alert('Thành công', 'Đã xóa album', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa album');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
      >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {album ? 'Chỉnh sửa album' : 'Thêm album mới'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Album Cover */}
        <View style={styles.coverSection}>
          <Text style={styles.sectionTitle}>Ảnh bìa album</Text>
          <View style={styles.coverContainer}>
            {formData.cover_url ? (
              <Image source={{ uri: formData.cover_url }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="musical-notes" size={48} color={COLORS.primary} />
                <Text style={styles.coverPlaceholderText}>Chưa có ảnh bìa</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={pickCoverImage}
          >
            <Ionicons name="image" size={20} color={COLORS.white} />
            <Text style={styles.uploadButtonText}>
              {formData.cover_url ? 'Thay đổi ảnh bìa' : 'Chọn ảnh bìa từ máy'}
            </Text>
          </TouchableOpacity>
          {formData.cover_url ? (
            <Text style={styles.fileStatusText}>✓ Đã chọn ảnh bìa</Text>
          ) : null}

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

        {/* Premium Status */}
        <View style={styles.inputSection}>
          <View style={styles.switchContainer}>
            <Text style={styles.sectionTitle}>Album Premium</Text>
            <TouchableOpacity
              style={[styles.switch, formData.is_premium && styles.switchActive]}
              onPress={() => handleInputChange('is_premium', !formData.is_premium)}
            >
              <View style={[styles.switchThumb, formData.is_premium && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Album premium chỉ dành cho người dùng trả phí hoặc mua lẻ.
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
              onChangeText={(value) => handleInputChange('price', value)}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        )}

        {/* Release Date - DATETIME MODIFICATION */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Ngày phát hành (YYYY-MM-DD HH:mm) *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD HH:mm"
            value={formData.release_date}
            onChangeText={(value) => handleInputChange('release_date', value)}
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.helperText}>
            Album sẽ tự động phát hành vào đúng thời gian này.
          </Text>
        </View>

        {/* Action Buttons */}
        </View>
      </ScrollView>
      <View style={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: SIZES.padding, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border }}>
        <View style={[styles.actionsContainer, { marginBottom: 0, marginTop: 16 }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Lưu</Text>
              </>
            )}
          </TouchableOpacity>

          {album && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Ionicons name="trash" size={20} color={COLORS.white} />
              <Text style={styles.deleteButtonText}>Xóa album</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    paddingTop: 10,
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
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: SIZES.padding,
  },
  coverSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 12,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  coverImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 24,
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
  actionsContainer: {
    gap: 12,
    marginTop: 32,
    marginBottom: 32,
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
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: SIZES.borderRadius,
    gap: 8,
    marginTop: 8,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  fileStatusText: {
    color: COLORS.success,
    fontSize: SIZES.sm,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});


export default ArtistEditAlbumScreen;

