import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../../services/playlistService';
import { COLORS, SIZES } from '../../config/theme';

const AddToPlaylistModal = ({ visible, onClose, song }) => {
  const [playlists, setPlaylists] = useState([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  useEffect(() => {
    if (visible) {
      loadPlaylists();
    }
  }, [visible]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const response = await playlistService.getUserPlaylists();
      setPlaylists(response.data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    setLoading(true);
    try {
      await playlistService.addSongToPlaylist(playlistId, song.song_id);
      Alert.alert('Thành công', 'Đã thêm bài hát vào playlist');
      onClose();
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert('Thông báo', 'Bài hát này đã có trong playlist');
      } else {
        Alert.alert('Lỗi', error.response?.data?.message || 'Không thể thêm bài hát');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên playlist');
      return;
    }

    setLoading(true);
    try {
      const response = await playlistService.createPlaylist(newPlaylistName, '');
      const playlistId = response.data.playlist_id;
      
      // Add song to new playlist
      await playlistService.addSongToPlaylist(playlistId, song.song_id);
      
      Alert.alert('Thành công', 'Đã tạo playlist và thêm bài hát');
      setNewPlaylistName('');
      setShowCreateNew(false);
      onClose();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tạo playlist');
    } finally {
      setLoading(false);
    }
  };

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(item.playlist_id)}
      disabled={loading}
    >
      <View style={styles.playlistIcon}>
        <Ionicons name="musical-notes" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.song_count || 0} bài hát</Text>
      </View>
      <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm vào playlist</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Song Info */}
          {song && (
            <View style={styles.songInfo}>
              <Image
                source={{ uri: song.cover_url || 'https://via.placeholder.com/50' }}
                style={styles.songImage}
              />
              <View style={styles.songDetails}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {song.artist_name}
                </Text>
              </View>
            </View>
          )}

          {/* Create New Playlist */}
          {showCreateNew ? (
            <View style={styles.createNewContainer}>
              <TextInput
                style={styles.input}
                placeholder="Tên playlist mới"
                placeholderTextColor={COLORS.textMuted}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />
              <View style={styles.createButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowCreateNew(false);
                    setNewPlaylistName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.createButton]}
                  onPress={handleCreatePlaylist}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={COLORS.gradient.primary}
                    style={styles.createButtonGradient}
                  >
                    <Text style={styles.createButtonText}>
                      {loading ? 'Đang tạo...' : 'Tạo'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createNewButton}
              onPress={() => setShowCreateNew(true)}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.createNewText}>Tạo playlist mới</Text>
            </TouchableOpacity>
          )}

          {/* Playlists List */}
          {loadingPlaylists ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : playlists.length > 0 ? (
            <FlatList
              data={playlists}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.playlist_id.toString()}
              style={styles.playlistsList}
            />
          ) : (
            !showCreateNew && (
              <View style={styles.emptyContainer}>
                <Ionicons name="list-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Chưa có playlist nào</Text>
                <Text style={styles.emptySubtext}>Tạo playlist mới để bắt đầu</Text>
              </View>
            )
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginTop: 16,
    borderRadius: SIZES.borderRadius,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginVertical: 16,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 12,
  },
  createNewText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  createNewContainer: {
    padding: SIZES.padding,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  createButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 12,
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
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  playlistsList: {
    paddingHorizontal: SIZES.padding,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  playlistIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  loadingContainer: {
    padding: SIZES.padding * 3,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    marginTop: 12,
  },
  emptyContainer: {
    padding: SIZES.padding * 3,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 4,
  },
});

export default AddToPlaylistModal;

