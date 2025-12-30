import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { songService } from '../../services/songService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminEditSongScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { song, initialAlbumId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [uploadingSong, setUploadingSong] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);

  // Find initial artist if we have an initial album
  const getInitialArtistId = () => {
    if (song?.artist_id) return song.artist_id;
    if (initialAlbumId && albums.length > 0) {
        const targetAlbum = albums.find(a => a.album_id === initialAlbumId);
        return targetAlbum?.artist_id || '';
    }
    return '';
  };

  const [formData, setFormData] = useState({
    title: song?.title || '',
    artist_id: song?.artist_id || '',
    album_id: song?.album_id || initialAlbumId || '',
    genre_id: song?.genre_id || '',
    duration: song?.duration?.toString() || '',
    lyrics: song?.lyrics || '',
    release_date: song?.release_date ? song.release_date.split('T')[0] : new Date().toISOString().split('T')[0],
    file_url: song?.file_url || '',
    cover_url: song?.cover_url || '',
    is_premium: song?.is_premium === 1 || song?.is_premium === true,
    price: song?.price?.toString() || '0',
  });

  // Effect to update artist_id once albums are loaded if initialAlbumId is present
  useEffect(() => {
    if (!song && initialAlbumId && albums.length > 0) {
        const targetAlbum = albums.find(a => a.album_id === initialAlbumId);
        if (targetAlbum?.artist_id) {
            setFormData(prev => ({ ...prev, artist_id: targetAlbum.artist_id }));
        }
    }
  }, [albums, initialAlbumId, song]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [artistsRes, albumsRes, genresRes] = await Promise.all([
        songService.getArtists(),
        songService.getAlbums(),
        songService.getGenres(),
      ]);
      setArtists(artistsRes.data || []);
      setAlbums(albumsRes.data || []);
      setGenres(genresRes.data || []);
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async () => {
    if (!formData.title.trim() || !formData.file_url) {
      return Alert.alert('Lỗi', 'Tiêu đề và file nhạc là bắt buộc');
    }
    setLoading(true);
    try {
      const data = {
        ...formData,
        is_premium: formData.is_premium ? 1 : 0,
        price: parseFloat(formData.price) || 0
      };
      if (song) {
        await adminService.updateSong(song.song_id, data);
        Alert.alert('Thành công', 'Đã cập nhật bài hát');
      } else {
        await adminService.createSong(data);
        Alert.alert('Thành công', 'Đã tạo bài hát mới');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu bài hát');
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async (type) => {
    if (type === 'audio') {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!res.canceled) {
        setUploadingSong(true);
        try {
          const up = await adminService.uploadSong(res.assets[0].uri);
          const info = up?.data?.data || up?.data || up;
          setFormData({ ...formData, file_url: info.url, duration: Math.round(info.duration || 0).toString() });
        } finally { setUploadingSong(false); }
      }
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1] });
      if (!res.canceled) {
        setUploadingCover(true);
        try {
          const up = await adminService.uploadCover(res.assets[0].uri);
          setFormData({ ...formData, cover_url: up.data.file_url });
        } finally { setUploadingCover(false); }
      }
    }
  };

  const SelectorField = ({ label, value, onPress, icon }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selector} onPress={onPress}>
        <Ionicons name={icon} size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
        <Text style={[styles.selText, !value && { color: COLORS.textDisabled }]}>{value || `Chọn ${label.toLowerCase()}...`}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textDisabled} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{song ? 'CHỈNH SỬA NHẠC' : 'THÊM NHẠC MỚI'}</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={loading} style={styles.saveBtn}>
          {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveBtnText}>Lưu</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.uploadSection}>
            <TouchableOpacity style={styles.coverBox} onPress={() => pickFile('image')}>
              {uploadingCover ? <ActivityIndicator color={COLORS.primary} /> : (
                <Image source={{ uri: formData.cover_url || 'https://via.placeholder.com/150' }} style={styles.coverImg} />
              )}
              <View style={styles.editBadge}><Ionicons name="camera" size={14} color="#FFF" /></View>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.audioBtn, formData.file_url && styles.audioBtnDone]} onPress={() => pickFile('audio')}>
              {uploadingSong ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name={formData.file_url ? 'checkmark-circle' : 'cloud-upload'} size={20} color="#FFF" />
                  <Text style={styles.audioBtnText}>{formData.file_url ? 'Đã tải lên file nhạc' : 'Chọn file nhạc (MP3)'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Tên bài hát *</Text>
              <TextInput style={styles.input} value={formData.title} onChangeText={v => setFormData({...formData, title: v})} placeholder="Nhập tiêu đề..." placeholderTextColor={COLORS.textDisabled} />
            </View>

            <SelectorField 
              label="Nghệ sĩ" 
              icon="mic-outline" 
              onPress={() => setShowArtistModal(true)} 
              value={artists.find(a => a.artist_id === formData.artist_id)?.name} 
            />
            <SelectorField 
              label="Album" 
              icon="disc-outline" 
              onPress={() => setShowAlbumModal(true)} 
              value={albums.find(a => a.album_id === formData.album_id)?.title} 
            />
            <SelectorField 
              label="Thể loại" 
              icon="list-outline" 
              onPress={() => setShowGenreModal(true)} 
              value={genres.find(g => g.genre_id === formData.genre_id)?.name} 
            />

            <View style={styles.field}>
              <Text style={styles.label}>Ngày phát hành</Text>
              <TextInput style={styles.input} value={formData.release_date} onChangeText={v => setFormData({...formData, release_date: v})} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textDisabled} />
            </View>

            <View style={styles.premiumRow}>
              <View>
                <Text style={styles.premiumLab}>Bản quyền Premium</Text>
                <Text style={styles.premiumSub}>Cần mua để nghe bản đầy đủ</Text>
              </View>
              <TouchableOpacity style={[styles.switch, formData.is_premium && styles.switchOn]} onPress={() => setFormData({...formData, is_premium: !formData.is_premium})}>
                <View style={[styles.switchThumb, formData.is_premium && styles.switchThumbOn]} />
              </TouchableOpacity>
            </View>

            {formData.is_premium && (
              <View style={styles.field}>
                <Text style={styles.label}>Giá bán (VNĐ)</Text>
                <TextInput style={styles.input} value={formData.price} onChangeText={v => setFormData({...formData, price: v})} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDisabled} />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Lời bài hát</Text>
              <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={formData.lyrics} onChangeText={v => setFormData({...formData, lyrics: v})} multiline placeholder="Nhập lời bài hát..." placeholderTextColor={COLORS.textDisabled} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Basic Modals */}
      <Modal visible={showArtistModal || showAlbumModal || showGenreModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn {showArtistModal ? 'nghệ sĩ' : showAlbumModal ? 'album' : 'thể loại'}</Text>
            <FlatList
              data={showArtistModal ? artists : showAlbumModal ? albums : genres}
              keyExtractor={item => (item.artist_id || item.album_id || item.genre_id).toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dropItem} onPress={() => {
                  if (showArtistModal) setFormData({...formData, artist_id: item.artist_id});
                  if (showAlbumModal) setFormData({...formData, album_id: item.album_id});
                  if (showGenreModal) setFormData({...formData, genre_id: item.genre_id});
                  setShowArtistModal(false); setShowAlbumModal(false); setShowGenreModal(false);
                }}>
                  <Text style={styles.dropText}>{item.name || item.title}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => {setShowArtistModal(false); setShowAlbumModal(false); setShowGenreModal(false);}}>
              <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.backgroundSecondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1.2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surface },
  saveBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  content: { padding: 20 },
  uploadSection: { alignItems: 'center', marginBottom: 32 },
  coverBox: { position: 'relative', marginBottom: 20 },
  coverImg: { width: 140, height: 140, borderRadius: 24, backgroundColor: COLORS.surface },
  editBadge: { position: 'absolute', bottom: 5, right: 5, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.background },
  audioBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.divider },
  audioBtnDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  audioBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.divider },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, color: '#FFF', borderSize: 1, borderColor: COLORS.divider },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderSize: 1, borderColor: COLORS.divider },
  selText: { flex: 1, color: '#FFF', fontSize: 14 },
  premiumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider, marginBottom: 20 },
  premiumLab: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  premiumSub: { fontSize: 12, color: COLORS.textDisabled, marginTop: 2 },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORS.divider, padding: 2 },
  switchOn: { backgroundColor: COLORS.primary },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF' },
  switchThumbOn: { alignSelf: 'flex-end' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  dropItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  dropText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  closeBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
});

export default AdminEditSongScreen;
