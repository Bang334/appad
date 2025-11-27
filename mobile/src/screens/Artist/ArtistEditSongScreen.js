import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { songService } from '../../services/songService';
import { useAlert } from '../../context/AlertContext';

const ArtistEditSongScreen = ({ navigation, route }) => {
  const { artistId, song } = route.params;
  const { showError, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [uploadingSong, setUploadingSong] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [showGenreModal, setShowGenreModal] = useState(false);
  
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    title: song?.title || '',
    album_id: song?.album_id || '',
    genre_id: song?.genre_id || '',
    // Thời lượng sẽ được tính tự động từ file nhạc (ẩn khỏi form)
    duration: song?.duration?.toString() || '',
    lyrics: song?.lyrics || '',
    release_date: song?.release_date 
      ? song.release_date.split('T')[0] 
      : getCurrentDate(),
    file_url: song?.file_url || '',
    cover_url: song?.cover_url || '',
    is_premium: song?.is_premium === 1 || song?.is_premium === true || false,
    price: song?.price?.toString() || '0',
  });

  // File objects to upload
  const [songFile, setSongFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [albumsRes, genresRes] = await Promise.all([
        artistService.getMyAlbums(artistId),
        songService.getGenres(),
      ]);
      
      setAlbums(albumsRes.data || []);
      setGenres(genresRes.data || []);
    } catch (error) {
      console.error('Error loading reference data:', error);
      showError('Lỗi', 'Không thể tải dữ liệu tham chiếu');
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
      showError('Lỗi', 'Vui lòng nhập tên bài hát');
      return false;
    }
    if (!formData.file_url && !songFile) {
      showError('Lỗi', 'Vui lòng tải lên file nhạc');
      return false;
    }
    if (formData.is_premium && (!formData.price || parseFloat(formData.price) <= 0)) {
      showError('Lỗi', 'Vui lòng nhập giá hợp lệ cho bài hát premium');
      return false;
    }
    return true;
  };

  // Pick MP3 file
  const pickSongFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSongFile(result.assets[0]);
        setFormData(prev => ({ ...prev, file_url: result.assets[0].name }));
      }
    } catch (error) {
      console.error('Error picking song file:', error);
      showError('Lỗi', 'Không thể chọn file nhạc');
    }
  };

  // Pick cover image
  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverFile(result.assets[0]);
        setFormData(prev => ({ ...prev, cover_url: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      showError('Lỗi', 'Không thể chọn ảnh bìa');
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare data
      const songData = {
        title: formData.title.trim(),
        album_id: formData.album_id && formData.album_id !== '' ? parseInt(formData.album_id) : null,
        genre_id: formData.genre_id && formData.genre_id !== '' ? parseInt(formData.genre_id) : null,
        duration: parseInt(formData.duration) || null,
        lyrics: formData.lyrics.trim() || null,
        release_date: formData.release_date && formData.release_date !== '' ? formData.release_date : null,
        is_premium: formData.is_premium ? 1 : 0,
        price: formData.is_premium ? parseFloat(formData.price) || 0 : 0,
      };

      const files = {};
      if (songFile) files.audio = songFile;
      if (coverFile) files.cover = coverFile;

      if (song) {
        // Update existing song
        await artistService.updateSong(artistId, song.song_id, songData, files);
        showSuccess('Thành công', 'Đã cập nhật bài hát thành công');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        // Create new song
        await artistService.createSong(artistId, songData, files);
        showSuccess('Thành công', 'Đã tạo bài hát mới thành công');
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error) {
      console.error('Save song error:', error);
      showError('Lỗi', error.response?.data?.message || 'Không thể lưu bài hát');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bài hát này? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: confirmDelete
        }
      ]
    );
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await artistService.deleteSong(artistId, song?.song_id);
      showSuccess('Thành công', 'Đã xóa bài hát thành công');
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      console.error('Delete song error:', error);
      showError('Lỗi', error.response?.data?.message || 'Không thể xóa bài hát');
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
          {song ? 'Chỉnh sửa bài hát' : 'Thêm bài hát mới'}
        </Text>
        {song && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        )}
        {!song && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên bài hát *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="Nhập tên bài hát"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Album */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Album</Text>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Text style={[
                  styles.pickerText,
                  !formData.album_id && styles.placeholderText
                ]}>
                  {formData.album_id 
                    ? albums.find(a => a.album_id == formData.album_id)?.title
                    : 'Chọn album (Tùy chọn)'
                  }
                </Text>
              </View>
              {/* Simple dropdown simulation - in real app use a Modal or Picker */}
              <ScrollView horizontal style={styles.chipContainer} showsHorizontalScrollIndicator={false}>
                {albums.map(album => (
                  <TouchableOpacity
                    key={album.album_id}
                    style={[
                      styles.chip,
                      formData.album_id === album.album_id && styles.chipActive
                    ]}
                    onPress={() => handleInputChange('album_id', album.album_id)}
                  >
                    <Text style={[
                      styles.chipText,
                      formData.album_id === album.album_id && styles.chipTextActive
                    ]}>{album.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Genre (Dropdown) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thể loại</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowGenreModal(true)}
            >
              <Text
                style={[
                  styles.pickerText,
                  !formData.genre_id && styles.placeholderText,
                ]}
              >
                {formData.genre_id
                  ? genres.find(g => g.genre_id === formData.genre_id)?.name
                  : 'Chọn thể loại'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Song File Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>File nhạc *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickSongFile}
              disabled={uploadingSong}
            >
              {uploadingSong ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="musical-notes" size={20} color={COLORS.white} />
                  <Text style={styles.uploadButtonText}>
                    {formData.file_url ? 'Thay đổi file nhạc' : 'Chọn file MP3'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {formData.file_url && (
              <Text style={styles.fileStatusText}>
                ✓ {songFile ? songFile.name : 'File hiện tại'}
              </Text>
            )}
          </View>

          {/* Cover Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ảnh bìa</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickCoverImage}
              disabled={uploadingCover}
            >
              {uploadingCover ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="image" size={20} color={COLORS.white} />
                  <Text style={styles.uploadButtonText}>
                    {formData.cover_url ? 'Thay đổi ảnh bìa' : 'Chọn ảnh bìa'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {formData.cover_url && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: formData.cover_url }} style={styles.coverPreview} />
                <Text style={styles.fileStatusText}>✓ Đã chọn ảnh bìa</Text>
              </View>
            )}
          </View>

          {/* Premium Toggle */}
          <View style={styles.inputGroup}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Ionicons name="star" size={20} color={formData.is_premium ? COLORS.warning : COLORS.textSecondary} />
                <Text style={styles.label}>Bài hát Premium</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, formData.is_premium && styles.switchActive]}
                onPress={() => handleInputChange('is_premium', !formData.is_premium)}
              >
                <View style={[styles.switchThumb, formData.is_premium && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Bài hát Premium chỉ dành cho người dùng trả phí hoặc mua lẻ.
            </Text>
          </View>

          {/* Price (only if premium) */}
          {formData.is_premium && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giá (VNĐ) *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(value) => handleInputChange('price', value.replace(/[^0-9]/g, ''))}
                placeholder="Nhập giá (ví dụ: 10000)"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Lyrics */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lời bài hát</Text>
            <TextInput
              style={[styles.input, styles.lyricsInput]}
              value={formData.lyrics}
              onChangeText={(value) => handleInputChange('lyrics', value)}
              placeholder="Nhập lời bài hát..."
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Lưu</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {/* Genre Selection Modal */}
      <Modal
        visible={showGenreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn thể loại</Text>
              <TouchableOpacity onPress={() => setShowGenreModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {genres.map(genre => (
                <TouchableOpacity
                  key={genre.genre_id}
                  style={styles.modalItem}
                  onPress={() => {
                    handleInputChange('genre_id', genre.genre_id);
                    setShowGenreModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{genre.name}</Text>
                  {formData.genre_id === genre.genre_id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {genres.length === 0 && (
                <Text style={styles.emptyText}>Chưa có thể loại nào</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lyricsInput: {
    minHeight: 120,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fileStatusText: {
    fontSize: 12,
    color: COLORS.success,
    marginLeft: 4,
    marginTop: 4,
  },
  previewContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  coverPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switch: {
    width: 50,
    height: 28,
    backgroundColor: COLORS.textMuted,
    borderRadius: 14,
    padding: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  dropdownButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.card,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
  },
  pickerText: {
    color: COLORS.text,
    fontSize: 16,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalList: {
    paddingHorizontal: SIZES.padding,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  modalItemText: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ArtistEditSongScreen;
