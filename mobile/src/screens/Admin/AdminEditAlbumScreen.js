import React, { useState, useEffect } from 'react';
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
import { adminService } from '../../services/adminService';
import { artistService } from '../../services/artistService';

const AdminEditAlbumScreen = ({ route, navigation }) => {
  const { album } = route.params;
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [formData, setFormData] = useState({
    title: album?.title || '',
    artist_id: album?.artist_id || '',
    release_date: album?.release_date ? new Date(album.release_date).toISOString().split('T')[0] : '',
    cover_url: album?.cover_url || '',
  });

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      const response = await artistService.getAllArtists();
      setArtists(response.data || []);
    } catch (error) {
      console.error('Error loading artists:', error);
    }
  };

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
    if (!formData.artist_id) {
      Alert.alert('Lỗi', 'Vui lòng chọn nghệ sĩ');
      return false;
    }
    if (!formData.release_date) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày phát hành');
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
        await adminService.updateAlbum(album.album_id, formData);
        Alert.alert('Thành công', 'Đã cập nhật album', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new album
        await adminService.createAlbum(formData);
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
              await adminService.deleteAlbum(album.album_id);
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
    <ScrollView style={styles.container}>
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

        {/* Artist Selection */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Nghệ sĩ *</Text>
          <View style={styles.artistSelector}>
            <Text style={styles.artistSelectorText}>
              {formData.artist_id 
                ? artists.find(a => a.artist_id == formData.artist_id)?.name || 'Chọn nghệ sĩ'
                : 'Chọn nghệ sĩ'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </View>
          <ScrollView style={styles.artistList} showsVerticalScrollIndicator={false}>
            {artists.map((artist) => (
              <TouchableOpacity
                key={artist.artist_id}
                style={[
                  styles.artistItem,
                  formData.artist_id == artist.artist_id && styles.artistItemSelected
                ]}
                onPress={() => handleInputChange('artist_id', artist.artist_id)}
              >
                <Text style={[
                  styles.artistItemText,
                  formData.artist_id == artist.artist_id && styles.artistItemTextSelected
                ]}>
                  {artist.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
    </ScrollView>
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
  artistSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  artistSelectorText: {
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  artistList: {
    maxHeight: 200,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  artistItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  artistItemSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  artistItemText: {
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  artistItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
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
});

export default AdminEditAlbumScreen;
