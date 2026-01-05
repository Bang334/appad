import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { artistService } from '../../services/artistService';
import { songService } from '../../services/songService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const AdminEditAlbumScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { album } = route.params;
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [albumSongs, setAlbumSongs] = useState([]);
  const [showArtistList, setShowArtistList] = useState(false);
  const [formData, setFormData] = useState({
    title: album?.title || '',
    artist_id: album?.artist_id || '',
    release_date: album?.release_date ? new Date(album.release_date).toISOString().split('T')[0] : '',
    cover_url: album?.cover_url || '',
    is_premium: album?.is_premium === 1,
    price: album?.price ? album.price.toString() : '0',
  });
  const [coverFile, setCoverFile] = useState(null);


  useEffect(() => {
    loadArtists();
  }, []);

  useFocusEffect(
    useCallback(() => {
        if (album) {
            loadAlbumSongs();
        }
    }, [album])
  );

  const loadAlbumSongs = async () => {
    try {
        const response = await songService.getSongsByAlbum(album.album_id);
        if (response.success) {
            setAlbumSongs(response.data || []);
        }
    } catch (error) {
        console.error('Error loading album songs:', error);
    }
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
        setFormData({ ...formData, cover_url: asset.uri });
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh bìa');
    }
  };

  const loadArtists = async () => {

    try {
      const response = await artistService.getArtists();
      setArtists(response.data || []);
    } catch (error) {
      console.error('Error loading artists:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.artist_id) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
    }
    setLoading(true);
    try {
      if (album) {
        await adminService.updateAlbum(album.album_id, formData, coverFile ? { cover: coverFile } : null);
        Alert.alert('Thành công', 'Đã lưu thay đổi album');
      } else {
        await adminService.createAlbum(formData, coverFile ? { cover: coverFile } : null);
        Alert.alert('Thành công', 'Đã tạo album mới');
      }
      navigation.goBack();
    } catch (error) {

      Alert.alert('Lỗi', 'Không thể lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const InputLabel = ({ label, required }) => (
    <View style={styles.labelRow}>
      <Text style={styles.labelText}>{label}</Text>
      {required && <Text style={{ color: COLORS.error }}> *</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{album ? 'CẬP NHẬT ALBUM' : 'THÊM ALBUM MỚI'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
          {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveBtnText}>Lưu</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover Preview Section */}
          <View style={styles.coverSection}>
            <View style={styles.coverPreview}>
              <Image 
                source={{ uri: formData.cover_url || 'https://via.placeholder.com/300' }} 
                style={styles.coverImg} 
              />
              <View style={styles.coverBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </View>
            <View style={styles.coverInputBox}>
              <TouchableOpacity 
                style={styles.uploadBtn}
                onPress={pickCoverImage}
              >
                <Ionicons name="image" size={18} color="#000" />
                <Text style={styles.uploadBtnText}>CHỌN ẢNH TỪ MÁY</Text>
              </TouchableOpacity>
              {formData.cover_url ? (
                <Text style={styles.uploadStatus}>✓ Đã chọn ảnh bìa</Text>
              ) : null}
            </View>

          </View>

          {/* Form Fields */}
          <View style={styles.formCard}>
            <View style={styles.field}>
              <InputLabel label="Tên Album" required />
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={v => setFormData({ ...formData, title: v })}
                placeholder="Ví dụ: Những Bài Hát Hay Nhất..."
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>

            <View style={styles.field}>
              <InputLabel label="Nghệ Sĩ Sở Hữu" required />
              <TouchableOpacity 
                style={styles.selector} 
                onPress={() => setShowArtistList(!showArtistList)}
              >
                <Text style={[styles.selectorText, !formData.artist_id && { color: COLORS.textDisabled }]}>
                  {artists.find(a => a.artist_id === formData.artist_id)?.name || 'Chọn nghệ sĩ...'}
                </Text>
                <Ionicons name={showArtistList ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textDisabled} />
              </TouchableOpacity>
              
              {showArtistList && (
                <View style={styles.dropdown}>
                  {artists.map(artist => (
                    <TouchableOpacity 
                      key={artist.artist_id} 
                      style={styles.dropItem}
                      onPress={() => {
                        setFormData({ ...formData, artist_id: artist.artist_id });
                        setShowArtistList(false);
                      }}
                    >
                      <Text style={[styles.dropText, formData.artist_id === artist.artist_id && { color: COLORS.primary, fontWeight: 'bold' }]}>
                        {artist.name}
                      </Text>
                      {formData.artist_id === artist.artist_id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <InputLabel label="Ngày Phát Hành" required />
              <TextInput
                style={styles.input}
                value={formData.release_date}
                onChangeText={v => setFormData({ ...formData, release_date: v })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>

            <View style={styles.premiumSwitchRow}>
              <View>
                <Text style={styles.premiumLabel}>Album Premium</Text>
                <Text style={styles.premiumSub}>Người dùng cần mua để nghe</Text>
              </View>
              <TouchableOpacity 
                style={[styles.switch, formData.is_premium && styles.switchOn]}
                onPress={() => setFormData({ ...formData, is_premium: !formData.is_premium })}
              >
                <View style={[styles.switchThumb, formData.is_premium && styles.switchThumbOn]} />
              </TouchableOpacity>
            </View>

            {formData.is_premium && (
              <View style={styles.field}>
                <InputLabel label="Giá Bán (VNĐ)" />
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={v => setFormData({ ...formData, price: v })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.textDisabled}
                />
              </View>
            )}

            {/* Integrated Songs List Section */}
            {album && (
              <View style={styles.integratedSongsContainer}>
                <View style={styles.separator} />
                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                  <View>
                    <Text style={styles.premiumSectionTitle}>DANH SÁCH BÀI HÁT</Text>
                    <Text style={styles.premiumSectionSub}>{albumSongs.length} bài hát trong album</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.premiumAddBtn}
                    onPress={() => navigation.navigate('AdminEditSong', { song: null, initialAlbumId: album.album_id })}
                  >
                    <Ionicons name="add" size={18} color="#000" />
                    <Text style={styles.premiumAddBtnText}>Thêm</Text>
                  </TouchableOpacity>
                </View>

                {albumSongs.length > 0 ? (
                  <View style={styles.premiumSongList}>
                    {albumSongs.map((song, index) => (
                      <TouchableOpacity 
                        key={song.song_id} 
                        style={styles.premiumSongItem}
                        onPress={() => navigation.navigate('AdminEditSong', { song })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.songRankBox}>
                          <Text style={styles.songRankText}>{(index + 1).toString().padStart(2, '0')}</Text>
                        </View>
                        
                        <View style={styles.songImageWrapper}>
                          <Image 
                            source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }} 
                            style={styles.premiumSongCover} 
                          />
                          {song.is_premium === 1 && (
                            <View style={styles.miniPremiumBadge}>
                              <Ionicons name="star" size={8} color="#000" />
                            </View>
                          )}
                        </View>

                        <View style={styles.premiumSongBody}>
                          <Text style={styles.premiumSongTitle} numberOfLines={1}>{song.title}</Text>
                          <View style={styles.premiumMetaRow}>
                            <View style={styles.metaBadge}>
                              <Ionicons name="play" size={10} color={COLORS.primary} />
                              <Text style={styles.metaBadgeText}>{song.listen_count || 0}</Text>
                            </View>
                            <View style={styles.metaBadge}>
                              <Ionicons name="time-outline" size={10} color={COLORS.textSecondary} />
                              <Text style={styles.metaBadgeText}>
                                {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.editActionCircle}>
                          <Ionicons name="pencil" size={14} color={COLORS.primary} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.premiumEmptyState}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                      style={styles.emptyGradient}
                    >
                      <Ionicons name="musical-notes-outline" size={48} color={COLORS.textDisabled} />
                      <Text style={styles.premiumEmptyText}>Chưa có nhạc trong album</Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Delete Button at the very bottom */}
          {album && (
            <TouchableOpacity 
              style={styles.finalDeleteBtn}
              onPress={() => Alert.alert('Xác nhận', 'Bạn muốn xóa vĩnh viễn album này?', [
                { text: 'Hủy', style: 'cancel' },
                { 
                  text: 'Xóa', 
                  style: 'destructive', 
                  onPress: async () => {
                    try {
                      await adminService.deleteAlbum(album.album_id);
                      navigation.goBack();
                    } catch (e) { Alert.alert('Lỗi', 'Không thể xóa album'); }
                  } 
                }
              ])}
            >
              <View style={styles.deleteDivider} />
              <View style={styles.deleteContent}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteBtnText}>XÓA VĨNH VIỄN ALBUM NÀY</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: COLORS.backgroundSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1.2 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surface },
  saveBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  content: { padding: 20 },
  coverSection: { flexDirection: 'row', gap: 20, marginBottom: 32, alignItems: 'center' },
  coverPreview: { position: 'relative' },
  coverImg: { width: 100, height: 100, borderRadius: 20, backgroundColor: COLORS.surface },
  coverBadge: { position: 'absolute', bottom: -5, right: -5, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.background },
  coverInputBox: { flex: 1 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.divider },
  field: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', marginBottom: 8 },
  labelText: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, color: '#FFF', borderSize: 1, borderColor: COLORS.divider },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderSize: 1, borderColor: COLORS.divider },
  selectorText: { color: '#FFF', fontSize: 14 },
  dropdown: { backgroundColor: COLORS.backgroundSecondary, borderRadius: 12, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.divider },
  dropItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  dropText: { color: COLORS.textSecondary, fontSize: 13 },
  premiumSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider, marginBottom: 20 },
  premiumLabel: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  premiumSub: { fontSize: 12, color: COLORS.textDisabled, marginTop: 2 },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORS.divider, padding: 2 },
  switchOn: { backgroundColor: COLORS.primary },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF' },
  switchThumbOn: { alignSelf: 'flex-end' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 8 },
  deleteBtnText: { color: COLORS.error, fontWeight: 'bold' },
  sectionHeaderRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 40, 
    marginBottom: 20 
  },
  premiumSectionTitle: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#FFF', 
    letterSpacing: 1.5 
  },
  premiumSectionSub: { 
    fontSize: 11, 
    color: COLORS.textDisabled, 
    marginTop: 2 
  },
  premiumAddBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    gap: 4 
  },
  premiumAddBtnText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  premiumSongList: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 24, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  premiumSongItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1, 
    borderColor: 'transparent'
  },
  songRankBox: { 
    width: 24, 
    alignItems: 'center' 
  },
  songRankText: { 
    fontSize: 10, 
    color: COLORS.textDisabled, 
    fontWeight: '900' 
  },
  songImageWrapper: {
    position: 'relative',
    marginLeft: 8,
  },
  premiumSongCover: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: COLORS.surface 
  },
  miniPremiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  premiumSongBody: { 
    flex: 1, 
    paddingHorizontal: 16 
  },
  premiumSongTitle: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginBottom: 6 
  },
  premiumMetaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadgeText: { 
    color: COLORS.textSecondary, 
    fontSize: 10,
    fontWeight: '600'
  },
  editActionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumEmptyState: {
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumEmptyText: {
    color: COLORS.textDisabled,
    fontSize: 13,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyAddBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyAddBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  integratedSongsContainer: {
    marginTop: 10,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: -20,
    marginTop: 12,
  },
  finalDeleteBtn: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  deleteDivider: {
    height: 1,
    backgroundColor: COLORS.error + '25',
    marginBottom: 24,
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.error + '10',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  uploadStatus: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
});


export default AdminEditAlbumScreen;

