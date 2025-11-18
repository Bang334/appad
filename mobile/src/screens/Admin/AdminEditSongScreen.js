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
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { songService } from '../../services/songService';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import SuccessModal from '../../components/Common/SuccessModal';

const AdminEditSongScreen = ({ navigation, route }) => {
  const { song } = route.params;
  const { showModal, modalData, showSuccess, showError, hideModal } = useSuccessModal();
  const [loading, setLoading] = useState(false);
  const [uploadingSong, setUploadingSong] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [filteredAlbums, setFilteredAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  
  // Modal states
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showCreateArtistModal, setShowCreateArtistModal] = useState(false);
  const [showCreateGenreModal, setShowCreateGenreModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newGenreName, setNewGenreName] = useState('');
  
  // New artist form data
  const [newArtistData, setNewArtistData] = useState({
    name: '',
    bio: '',
    image_url: '',
    country: ''
  });

  // New genre form data
  const [newGenreData, setNewGenreData] = useState({
    name: '',
    description: ''
  });
  
  const [formData, setFormData] = useState({
    title: song?.title || '',
    artist_id: song?.artist_id || '',
    album_id: song?.album_id || '',
    genre_id: song?.genre_id || '',
    duration: song?.duration?.toString() || '',
    lyrics: song?.lyrics || '',
    release_date: song?.release_date ? song.release_date.split('T')[0] : '',
    file_url: song?.file_url || '',
    cover_url: song?.cover_url || '',
  });

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    // Filter albums when artist changes
    if (formData.artist_id) {
      const filtered = albums.filter(album => album.artist_id == formData.artist_id);
      setFilteredAlbums(filtered);
      // Reset album if current album doesn't belong to selected artist
      if (formData.album_id && !filtered.find(album => album.album_id == formData.album_id)) {
        setFormData(prev => ({ ...prev, album_id: '' }));
      }
    } else {
      setFilteredAlbums(albums);
    }
  }, [formData.artist_id, albums]);

  const loadReferenceData = async () => {
    try {
      const [artistsRes, albumsRes, genresRes] = await Promise.all([
        songService.getArtists(),
        songService.getAlbums(),
        songService.getGenres(),
      ]);
      
      setArtists(artistsRes.data || []);
      setAlbums(albumsRes.data || []);
      setFilteredAlbums(albumsRes.data || []);
      setGenres(genresRes.data || []);
    } catch (error) {
      console.error('Error loading reference data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu tham chiếu');
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
    if (!formData.duration || isNaN(formData.duration)) {
      showError('Lỗi', 'Vui lòng nhập thời lượng hợp lệ (giây)');
      return false;
    }
    if (!formData.file_url.trim()) {
      showError('Lỗi', 'Vui lòng tải lên file nhạc');
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
        await uploadSongFile(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking song file:', error);
      showError('Lỗi', 'Không thể chọn file nhạc');
    }
  };

  // Upload song file
  const uploadSongFile = async (fileUri) => {
    setUploadingSong(true);
    try {
      const response = await adminService.uploadSong(fileUri);
      setFormData(prev => ({ ...prev, file_url: response.data.file_url }));
      showSuccess('Thành công', 'Tải lên file nhạc thành công');
    } catch (error) {
      console.error('Error uploading song:', error);
      showError('Lỗi', 'Không thể tải lên file nhạc');
    } finally {
      setUploadingSong(false);
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
        await uploadCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      showError('Lỗi', 'Không thể chọn ảnh bìa');
    }
  };

  // Upload cover image
  const uploadCoverImage = async (imageUri) => {
    setUploadingCover(true);
    try {
      const response = await adminService.uploadCover(imageUri);
      setFormData(prev => ({ ...prev, cover_url: response.data.file_url }));
      showSuccess('Thành công', 'Tải lên ảnh bìa thành công');
    } catch (error) {
      console.error('Error uploading cover:', error);
      showError('Lỗi', 'Không thể tải lên ảnh bìa');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare data with proper null handling
      const songData = {
        title: formData.title.trim(),
        artist_id: formData.artist_id && formData.artist_id !== '' ? parseInt(formData.artist_id) : null,
        album_id: formData.album_id && formData.album_id !== '' ? parseInt(formData.album_id) : null,
        genre_id: formData.genre_id && formData.genre_id !== '' ? parseInt(formData.genre_id) : null,
        duration: parseInt(formData.duration) || null,
        lyrics: formData.lyrics.trim() || null,
        release_date: formData.release_date && formData.release_date !== '' ? formData.release_date : null,
        file_url: formData.file_url.trim(),
        cover_url: formData.cover_url.trim() || null,
      };

      if (song) {
        // Update existing song
        await adminService.updateSong(song.song_id, songData);
        showSuccess('Thành công', 'Đã cập nhật bài hát thành công');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        // Create new song
        await adminService.createSong(songData);
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
      await adminService.deleteSong(song?.song_id);
      Alert.alert('Thành công', 'Đã xóa bài hát thành công', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Delete song error:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa bài hát');
    } finally {
      setLoading(false);
    }
  };

  // Pick image for artist
  const pickArtistImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setNewArtistData(prev => ({ ...prev, image_url: imageUri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'artist-image.jpg',
      });
      formData.append('upload_preset', 'music_app'); // Replace with your upload preset
      formData.append('folder', 'artists');

      const response = await fetch('https://api.cloudinary.com/v1_1/dnd4apm6t/image/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Create new artist with full form
  const createArtistWithForm = async () => {
    if (!newArtistData.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nghệ sĩ');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (newArtistData.image_url) {
        imageUrl = await uploadImageToCloudinary(newArtistData.image_url);
      }

      const response = await adminService.createArtist({
        name: newArtistData.name.trim(),
        bio: newArtistData.bio.trim() || null,
        image_url: imageUrl,
        country: newArtistData.country.trim() || null
      });

      // Reload artists
      await loadReferenceData();
      
      // Set the new artist as selected
      setFormData(prev => ({ ...prev, artist_id: response.data.artist_id }));
      
      // Reset form
      setNewArtistData({
        name: '',
        bio: '',
        image_url: '',
        country: ''
      });
      setShowCreateArtistModal(false);
      Alert.alert('Thành công', 'Đã tạo nghệ sĩ mới');
    } catch (error) {
      console.error('Create artist error:', error);
      Alert.alert('Lỗi', 'Không thể tạo nghệ sĩ mới');
    } finally {
      setLoading(false);
    }
  };

  // Create new album
  const createAlbum = async () => {
    if (!newAlbumTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên album');
      return;
    }

    if (!formData.artist_id) {
      Alert.alert('Lỗi', 'Vui lòng chọn nghệ sĩ trước');
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.createAlbum({
        title: newAlbumTitle.trim(),
        artist_id: formData.artist_id,
        release_date: null,
        cover_url: null
      });

      // Reload albums
      await loadReferenceData();
      
      // Set the new album as selected
      setFormData(prev => ({ ...prev, album_id: response.data.album_id }));
      
      setNewAlbumTitle('');
      setShowAlbumModal(false);
      Alert.alert('Thành công', 'Đã tạo album mới');
    } catch (error) {
      console.error('Create album error:', error);
      Alert.alert('Lỗi', 'Không thể tạo album mới');
    } finally {
      setLoading(false);
    }
  };

  // Create new genre with full form
  const createGenreWithForm = async () => {
    if (!newGenreData.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thể loại');
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.createGenre({
        name: newGenreData.name.trim(),
        description: newGenreData.description.trim() || null
      });

      // Reload genres
      await loadReferenceData();
      
      // Set the new genre as selected
      setFormData(prev => ({ ...prev, genre_id: response.data.genre_id }));
      
      // Reset form
      setNewGenreData({
        name: '',
        description: ''
      });
      setShowCreateGenreModal(false);
      Alert.alert('Thành công', 'Đã tạo thể loại mới');
    } catch (error) {
      console.error('Create genre error:', error);
      Alert.alert('Lỗi', 'Không thể tạo thể loại mới');
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

          {/* Artist */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nghệ sĩ</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowArtistModal(true)}
              >
                <Text style={[
                  styles.pickerText,
                  !formData.artist_id && styles.placeholderText
                ]}>
                  {formData.artist_id 
                    ? artists.find(a => a.artist_id == formData.artist_id)?.name 
                    : 'Chọn nghệ sĩ'
                  }
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateArtistModal(true)}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Album */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Album</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  !formData.artist_id && styles.pickerButtonDisabled
                ]}
                onPress={() => formData.artist_id && setShowAlbumModal(true)}
                disabled={!formData.artist_id}
              >
                <Text style={[
                  styles.pickerText,
                  (!formData.album_id || !formData.artist_id) && styles.placeholderText
                ]}>
                  {!formData.artist_id 
                    ? 'Chọn nghệ sĩ trước'
                    : formData.album_id 
                      ? filteredAlbums.find(a => a.album_id == formData.album_id)?.title
                      : 'Chọn album'
                  }
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  !formData.artist_id && styles.addButtonDisabled
                ]}
                onPress={() => formData.artist_id && setShowAlbumModal(true)}
                disabled={!formData.artist_id}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Genre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thể loại</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowGenreModal(true)}
              >
                <Text style={[
                  styles.pickerText,
                  !formData.genre_id && styles.placeholderText
                ]}>
                  {formData.genre_id 
                    ? genres.find(g => g.genre_id == formData.genre_id)?.name 
                    : 'Chọn thể loại'
                  }
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateGenreModal(true)}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thời lượng (giây) *</Text>
            <TextInput
              style={styles.input}
              value={formData.duration}
              onChangeText={(value) => handleInputChange('duration', value)}
              placeholder="Ví dụ: 240"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textSecondary}
            />
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
              <Text style={styles.fileStatusText}>✓ Đã tải lên file nhạc</Text>
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
              <Text style={styles.fileStatusText}>✓ Đã tải lên ảnh bìa</Text>
            )}
          </View>

          {/* Release Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày phát hành</Text>
            <TextInput
              style={styles.input}
              value={formData.release_date}
              onChangeText={(value) => handleInputChange('release_date', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

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
              <Ionicons name="checkmark-outline" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>
                {song ? 'Cập nhật' : 'Tạo bài hát'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Artist Selection Modal */}
      <Modal
        visible={showArtistModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowArtistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nghệ sĩ</Text>
              <TouchableOpacity onPress={() => setShowArtistModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>


            <FlatList
              data={artists}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    handleInputChange('artist_id', item.artist_id);
                    setShowArtistModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {formData.artist_id == item.artist_id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.artist_id.toString()}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Album Selection Modal */}
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

            {/* Create New Album */}
            <View style={styles.createNewSection}>
              <Text style={styles.createNewLabel}>Tạo album mới:</Text>
              <View style={styles.createNewRow}>
                <TextInput
                  style={styles.createNewInput}
                  placeholder="Tên album"
                  value={newAlbumTitle}
                  onChangeText={setNewAlbumTitle}
                  placeholderTextColor={COLORS.textSecondary}
                />
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={createAlbum}
                  disabled={loading}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={filteredAlbums}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    handleInputChange('album_id', item.album_id);
                    setShowAlbumModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.title}</Text>
                  {formData.album_id == item.album_id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.album_id.toString()}
              style={styles.modalList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {!formData.artist_id ? 'Chọn nghệ sĩ trước' : 'Không có album nào'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

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


            <FlatList
              data={genres}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    handleInputChange('genre_id', item.genre_id);
                    setShowGenreModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {formData.genre_id == item.genre_id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.genre_id.toString()}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Create New Artist Modal */}
      <Modal
        visible={showCreateArtistModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateArtistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm nghệ sĩ mới</Text>
              <TouchableOpacity onPress={() => setShowCreateArtistModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createModalBody} showsVerticalScrollIndicator={false}>
              {/* Artist Image */}
              <View style={styles.imageSection}>
                <Text style={styles.label}>Ảnh nghệ sĩ</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={pickArtistImage}
                >
                  {newArtistData.image_url ? (
                    <Image
                      source={{ uri: newArtistData.image_url }}
                      style={styles.selectedImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={40} color={COLORS.textSecondary} />
                      <Text style={styles.imagePlaceholderText}>Chọn ảnh</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Artist Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên nghệ sĩ *</Text>
                <TextInput
                  style={styles.input}
                  value={newArtistData.name}
                  onChangeText={(value) => setNewArtistData(prev => ({ ...prev, name: value }))}
                  placeholder="Nhập tên nghệ sĩ"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              {/* Bio */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tiểu sử</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={newArtistData.bio}
                  onChangeText={(value) => setNewArtistData(prev => ({ ...prev, bio: value }))}
                  placeholder="Nhập tiểu sử nghệ sĩ..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              {/* Country */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quốc gia</Text>
                <TextInput
                  style={styles.input}
                  value={newArtistData.country}
                  onChangeText={(value) => setNewArtistData(prev => ({ ...prev, country: value }))}
                  placeholder="Nhập quốc gia"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.createModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowCreateArtistModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={createArtistWithForm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.createButtonText}>Tạo nghệ sĩ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create New Genre Modal */}
      <Modal
        visible={showCreateGenreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateGenreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm thể loại mới</Text>
              <TouchableOpacity onPress={() => setShowCreateGenreModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createModalBody} showsVerticalScrollIndicator={false}>
              {/* Genre Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên thể loại *</Text>
                <TextInput
                  style={styles.input}
                  value={newGenreData.name}
                  onChangeText={(value) => setNewGenreData(prev => ({ ...prev, name: value }))}
                  placeholder="Nhập tên thể loại"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={newGenreData.description}
                  onChangeText={(value) => setNewGenreData(prev => ({ ...prev, description: value }))}
                  placeholder="Nhập mô tả thể loại..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.createModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowCreateGenreModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={createGenreWithForm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.createButtonText}>Tạo thể loại</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        visible={showModal}
        onClose={hideModal}
        title={modalData.title}
        message={modalData.message}
        icon={modalData.icon}
      />
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
    paddingBottom: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  form: {
    paddingVertical: SIZES.padding,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lyricsInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonDisabled: {
    backgroundColor: COLORS.card,
    opacity: 0.6,
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.card,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  createNewSection: {
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  createNewLabel: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 8,
  },
  createNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createNewInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createNewButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    paddingHorizontal: SIZES.padding,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    flex: 1,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
    padding: SIZES.padding * 2,
  },
  // Create Artist Modal Styles
  createModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  createModalBody: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
  },
  createModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    gap: 12,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 8,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  placeholder: {
    width: 24,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    fontWeight: '500',
  },
});

export default AdminEditSongScreen;
