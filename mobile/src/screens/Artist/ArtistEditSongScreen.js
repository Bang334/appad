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
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { songService } from '../../services/songService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';

const ArtistEditSongScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { artistId, song } = route.params;
  const { showError, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [uploadingSong, setUploadingSong] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCover, setNewAlbumCover] = useState(null); // { uri, type, name }
  const [newAlbumReleaseDate, setNewAlbumReleaseDate] = useState('');
  const [newAlbumIsPremium, setNewAlbumIsPremium] = useState(false);
  const [newAlbumPrice, setNewAlbumPrice] = useState('0');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  
  // Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

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
    duration: song?.duration?.toString() || '',
    lyrics: song?.lyrics || '',
    release_date: song?.release_date 
      ? song.release_date.replace('T', ' ').slice(0, 16) 
      : getCurrentDate() + ' 00:00',
    file_url: song?.file_url || '',
    cover_url: song?.cover_url || '',
    is_premium: song?.is_premium === 1 || song?.is_premium === true || false,
    price: song?.price?.toString() || '0',
    status: song?.status !== undefined ? song.status : 1, // 1=active, 0=hidden
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

  // Date/Time Picker Handlers
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      if (Platform.OS === 'android') {
        setTempDate(selectedDate);
        setShowTimePicker(true);
      } else {
        // iOS
        const dateString = formatDateTime(selectedDate);
        handleInputChange('release_date', dateString);
        setTempDate(selectedDate);
      }
    } else if (Platform.OS === 'ios' && event.type === 'dismissed') {
       setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const dateString = formatDateTime(selectedDate);
      handleInputChange('release_date', dateString);
      setTempDate(selectedDate);
    }
  };

  const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const openDatePicker = () => {
    let currentDate = new Date();
    if (formData.release_date) {
      const datePart = formData.release_date.replace(' ', 'T');
      const parsed = new Date(datePart);
      if (!isNaN(parsed.getTime())) currentDate = parsed;
    }
    setTempDate(currentDate);
    setShowDatePicker(true);
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
      console.log('Starting file picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSongFile(asset);
        setFormData(prev => ({ ...prev, file_url: asset.name }));
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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });


      if (!result.canceled && result.assets[0]) {
        setCoverFile({
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'image/jpeg',
          name: result.assets[0].fileName || 'cover.jpg',
        });
        setFormData(prev => ({ ...prev, cover_url: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      showError('Lỗi', 'Không thể chọn ảnh bìa');
    }
  };

  const pickNewAlbumCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });


      if (!result.canceled && result.assets[0]) {
        setNewAlbumCover({
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'image/jpeg',
          name: result.assets[0].fileName || 'album_cover.jpg',
        });
      }
    } catch (error) {
      console.error('Error picking new album cover:', error);
      showError('Lỗi', 'Không thể chọn ảnh bìa album');
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const songData = {
        title: formData.title.trim(),
        album_id: formData.album_id && formData.album_id !== '' ? parseInt(formData.album_id) : null,
        genre_id: formData.genre_id && formData.genre_id !== '' ? parseInt(formData.genre_id) : null,
        duration: parseInt(formData.duration) || null,
        lyrics: formData.lyrics.trim() || null,
        release_date: formData.release_date && formData.release_date !== '' ? formData.release_date : null,
        is_premium: formData.is_premium ? 1 : 0,
        price: formData.is_premium ? parseFloat(formData.price) || 0 : 0,
        status: formData.status ? 1 : 0,
      };

      const files = {};
      if (songFile) files.audio = songFile;
      if (coverFile) files.cover = coverFile;

      if (song) {
        await artistService.updateSong(artistId, song.song_id, songData, files);
        showSuccess('Thành công', 'Đã cập nhật bài hát thành công');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
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
        { text: 'Xóa', style: 'destructive', onPress: confirmDelete }
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
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

      <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Album</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowAlbumModal(true)}
            >
              {formData.album_id ? (
                <View style={styles.selectedAlbumPreview}>
                  {albums.find(a => a.album_id == formData.album_id)?.cover_url ? (
                    <Image 
                      source={{ uri: albums.find(a => a.album_id == formData.album_id)?.cover_url }}
                      style={styles.albumThumbnail}
                    />
                  ) : (
                    <View style={styles.albumThumbnailPlaceholder}>
                      <Ionicons name="disc" size={16} color={COLORS.textSecondary} />
                    </View>
                  )}
                  <Text style={styles.pickerText}>
                    {albums.find(a => a.album_id == formData.album_id)?.title}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.pickerText, styles.placeholderText]}>
                  Chọn album (Tùy chọn)
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thể loại</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowGenreModal(true)}
            >
              <Text style={[styles.pickerText, !formData.genre_id && styles.placeholderText]}>
                {formData.genre_id
                  ? genres.find(g => g.genre_id === formData.genre_id)?.name
                  : 'Chọn thể loại'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

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

          {/* Release Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày phát hành</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={openDatePicker}
            >
              <Text style={styles.datePickerText}>
                {formData.release_date || 'Chọn ngày giờ'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <Text style={styles.helperText}>
              Nếu đặt ngày trong tương lai, bài hát sẽ tự động chuyển sang trạng thái "Hiển thị" khi đến thời gian này.
            </Text>

            {/* DateTimePicker for Android (Two steps) */}
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            {/* DateTimePicker for iOS */}
            {Platform.OS === 'ios' && showDatePicker && (
               <DateTimePicker
                 value={tempDate || new Date()}
                 mode="datetime"
                 display="default"
                 onChange={handleDateChange}
                 style={{ width: '100%', marginTop: 10 }}
               />
            )}
          </View>

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

          <View style={styles.inputGroup}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Ionicons 
                  name={formData.status ? "eye" : "eye-off"} 
                  size={20} 
                  color={formData.status ? COLORS.success : COLORS.error} 
                />
                <Text style={styles.label}>Hiển thị bài hát</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, formData.status && styles.switchActive]}
                onPress={() => handleInputChange('status', formData.status ? 0 : 1)}
              >
                <View style={[styles.switchThumb, formData.status && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {formData.status 
                ? 'Bài hát đang hiển thị với người dùng.' 
                : 'Bài hát đang ẩn, người dùng không thể tìm thấy.'}
            </Text>
          </View>

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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 16) }]}>
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
      
      <Modal
        visible={showAlbumModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAlbumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn album</Text>
              <TouchableOpacity onPress={() => setShowAlbumModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.albumModalItem, !formData.album_id && styles.albumModalItemActive]}
                onPress={() => {
                  handleInputChange('album_id', '');
                  setShowAlbumModal(false);
                }}
              >
                <View style={styles.albumThumbnailPlaceholderLarge}>
                  <Ionicons name="musical-notes" size={24} color={COLORS.textSecondary} />
                </View>
                <View style={styles.albumModalItemInfo}>
                  <Text style={styles.albumModalItemTitle}>Không thuộc album</Text>
                  <Text style={styles.albumModalItemSubtitle}>Bài hát đơn lẻ (Single)</Text>
                </View>
                {!formData.album_id && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createAlbumButton}
                onPress={() => {
                  setShowAlbumModal(false);
                  setShowCreateAlbumModal(true);
                }}
              >
                <View style={styles.createAlbumIconContainer}>
                  <Ionicons name="add" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.albumModalItemInfo}>
                  <Text style={[styles.albumModalItemTitle, { color: COLORS.primary }]}>Tạo album mới</Text>
                  <Text style={styles.albumModalItemSubtitle}>Thêm album mới cho bài hát này</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              {albums.map(album => (
                <TouchableOpacity
                  key={album.album_id}
                  style={[styles.albumModalItem, formData.album_id == album.album_id && styles.albumModalItemActive]}
                  onPress={() => {
                    handleInputChange('album_id', album.album_id);
                    setShowAlbumModal(false);
                  }}
                >
                  {album.cover_url ? (
                    <Image source={{ uri: album.cover_url }} style={styles.albumModalThumbnail} />
                  ) : (
                    <View style={styles.albumThumbnailPlaceholderLarge}>
                      <Ionicons name="disc" size={24} color={COLORS.textSecondary} />
                    </View>
                  )}
                  <View style={styles.albumModalItemInfo}>
                    <Text style={styles.albumModalItemTitle} numberOfLines={1}>{album.title}</Text>
                    <Text style={styles.albumModalItemSubtitle}>
                      {album.song_count || 0} bài hát • {album.release_year || 'Chưa phát hành'}
                    </Text>
                  </View>
                  {formData.album_id == album.album_id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {albums.length === 0 && (
                <View style={styles.emptyAlbumContainer}>
                  <Ionicons name="disc-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>Chưa có album nào</Text>
                  <Text style={styles.emptySubtext}>Tạo album mới để nhóm các bài hát</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreateAlbumModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateAlbumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo album mới</Text>
              <TouchableOpacity onPress={() => setShowCreateAlbumModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.createAlbumForm}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={pickNewAlbumCover}>
                  {newAlbumCover ? (
                    <Image source={{ uri: newAlbumCover.uri }} style={styles.newAlbumCoverPreview} />
                  ) : (
                    <View style={styles.newAlbumCoverPlaceholder}>
                      <Ionicons name="image-outline" size={30} color={COLORS.textSecondary} />
                      <Text style={styles.newAlbumCoverPlaceholderText}>Chọn ảnh bìa</Text>
                    </View>
                  )}
                  <View style={styles.editIconBadge}>
                    <Ionicons name="camera" size={12} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Tên album *</Text>
              <TextInput
                style={styles.input}
                value={newAlbumTitle}
                onChangeText={setNewAlbumTitle}
                placeholder="Nhập tên album"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.label}>Ngày phát hành (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newAlbumReleaseDate}
                onChangeText={setNewAlbumReleaseDate}
                placeholder={getCurrentDate()}
                placeholderTextColor={COLORS.textSecondary}
              />

              <View style={[styles.switchContainer, { marginTop: 12, paddingVertical: 0, borderBottomWidth: 0 }]}>
                <View style={styles.switchLabelContainer}>
                  <Ionicons name="star" size={20} color={newAlbumIsPremium ? COLORS.warning : COLORS.textSecondary} />
                  <Text style={styles.label}>Album Premium</Text>
                </View>
                <TouchableOpacity
                  style={[styles.switch, newAlbumIsPremium && styles.switchActive]}
                  onPress={() => setNewAlbumIsPremium(!newAlbumIsPremium)}
                >
                  <View style={[styles.switchThumb, newAlbumIsPremium && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {newAlbumIsPremium && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Giá Album (VNĐ) *</Text>
                  <TextInput
                    style={styles.input}
                    value={newAlbumPrice}
                    onChangeText={(v) => setNewAlbumPrice(v.replace(/[^0-9]/g, ''))}
                    placeholder="Nhập giá album"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.createAlbumSubmitButton, (!newAlbumTitle.trim() || creatingAlbum) && styles.buttonDisabled]}
                disabled={!newAlbumTitle.trim() || creatingAlbum}
                onPress={async () => {
                  if (!newAlbumTitle.trim()) return;
                  if (newAlbumIsPremium && (!newAlbumPrice || parseInt(newAlbumPrice) <= 0)) {
                    showError('Lỗi', 'Vui lòng nhập giá hợp lệ');
                    return;
                  }

                  setCreatingAlbum(true);
                  try {
                    const albumData = { 
                      title: newAlbumTitle.trim(),
                      release_date: newAlbumReleaseDate || getCurrentDate(),
                      is_premium: newAlbumIsPremium ? 1 : 0,
                      price: newAlbumIsPremium ? parseInt(newAlbumPrice) : 0
                    };
                    const files = newAlbumCover ? { cover: newAlbumCover } : null;
                    
                    const result = await artistService.createAlbum(artistId, albumData, files);
                    
                    if (result?.album_id || result?.data?.album_id) {
                      const newAlbumId = result.album_id || result.data.album_id;
                      const albumsRes = await artistService.getMyAlbums(artistId);
                      setAlbums(albumsRes.data || []);
                      handleInputChange('album_id', newAlbumId);
                      showSuccess('Thành công', 'Đã tạo album mới');
                      setNewAlbumTitle('');
                      setNewAlbumCover(null);
                      setShowCreateAlbumModal(false);
                    }
                  } catch (error) {
                    console.error('Create album error:', error);
                    showError('Lỗi', error.response?.data?.message || 'Không thể tạo album');
                  } finally {
                    setCreatingAlbum(false);
                  }
                }}
              >
                {creatingAlbum ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.createAlbumSubmitText}>Tạo album</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  datePickerButton: {
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
  datePickerText: {
    color: COLORS.text,
    fontSize: 16,
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
  selectedAlbumPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  albumThumbnail: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 10,
  },
  albumThumbnailPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  albumThumbnailPlaceholderLarge: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  albumModalItemActive: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  albumModalThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  albumModalItemInfo: {
    flex: 1,
  },
  albumModalItemTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  albumModalItemSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  createAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
    backgroundColor: COLORS.primary + '08',
    borderRadius: 8,
    marginVertical: 8,
  },
  createAlbumIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  emptyAlbumContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  createAlbumForm: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 8,
  },
  createAlbumSubmitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    marginTop: 16,
  },
  createAlbumSubmitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  newAlbumCoverPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  newAlbumCoverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  newAlbumCoverPlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
});

export default ArtistEditSongScreen;
