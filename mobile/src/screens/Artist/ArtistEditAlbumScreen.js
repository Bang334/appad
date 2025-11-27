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
import MiniPlayer from '../../components/Player/MiniPlayer';

const ArtistEditAlbumScreen = ({ route, navigation }) => {
  const { artistId, album } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: album?.title || '',
    artist_id: artistId,
    release_date: album?.release_date ? new Date(album.release_date).toISOString().split('T')[0] : '',
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

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên album');
      return false;
    }
    if (!formData.release_date) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày phát hành');
      return false;
    }
    if (formData.is_premium && (!formData.price || parseFloat(formData.price) < 0)) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (album) {
        // Update existing album
        await artistService.updateAlbum(artistId, album.album_id, formData);
        Alert.alert('Thành công', 'Đã cập nhật album', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new album
        await artistService.createAlbum(artistId, formData);
        Alert.alert('Thành công', 'Đã tạo album mới', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving album:', error);
      Alert.alert('Lỗi', 'Không thể lưu album');
    } finally {
      setLoading(false);
    }
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
            <TextInput
              style={styles.input}
              placeholder="URL ảnh bìa album"
              value={formData.cover_url}
              onChangeText={(value) => handleInputChange('cover_url', value)}
              placeholderTextColor={COLORS.textSecondary}
            />
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

          {/* Release Date */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Ngày phát hành *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.release_date}
              onChangeText={(value) => handleInputChange('release_date', value)}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

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
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
});

export default ArtistEditAlbumScreen;
