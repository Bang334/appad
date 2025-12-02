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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../../services/playlistService';
import { COLORS, SIZES } from '../../config/theme';
import SuccessModal from '../Common/SuccessModal';

const AddToPlaylistModal = ({ visible, onClose, song }) => {
  const [playlists, setPlaylists] = useState([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  
  // State for expanding playlist details
  const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);
  const [playlistDetails, setPlaylistDetails] = useState({}); // Cache: { id: { songs: [] } }
  const [loadingDetails, setLoadingDetails] = useState({}); // { id: boolean }

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    icon: 'checkmark-circle',
    onClose: null
  });

  useEffect(() => {
    if (visible) {
      loadPlaylists();
      setExpandedPlaylistId(null); // Reset expansion on open
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

  const showAlert = (title, message, icon = 'checkmark-circle', callback = null) => {
    setAlertConfig({
      title,
      message,
      icon,
      onClose: callback
    });
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertConfig.onClose) {
      alertConfig.onClose();
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    setLoading(true);
    try {
      await playlistService.addSongToPlaylist(playlistId, song.song_id);
      
      // Update local cache if exists
      if (playlistDetails[playlistId]) {
        const updatedSongs = [...playlistDetails[playlistId].songs, song];
        setPlaylistDetails(prev => ({
          ...prev,
          [playlistId]: { ...prev[playlistId], songs: updatedSongs }
        }));
      }
      
      showAlert('Thành công', 'Đã thêm bài hát vào playlist', 'checkmark-circle', onClose);
    } catch (error) {
      if (error.response?.status === 409) {
        showAlert('Thông báo', 'Bài hát này đã có trong playlist', 'information-circle');
      } else {
        showAlert('Lỗi', error.response?.data?.message || 'Không thể thêm bài hát', 'alert-circle');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên playlist', 'alert-circle');
      return;
    }

    setLoading(true);
    try {
      const response = await playlistService.createPlaylist(newPlaylistName, '');
      const playlistId = response.data.playlist_id;
      
      // Add song to new playlist
      await playlistService.addSongToPlaylist(playlistId, song.song_id);
      
      setNewPlaylistName('');
      setShowCreateNew(false);
      showAlert('Thành công', 'Đã tạo playlist và thêm bài hát', 'checkmark-circle', onClose);
    } catch (error) {
      showAlert('Lỗi', 'Không thể tạo playlist', 'alert-circle');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (playlistId) => {
    if (expandedPlaylistId === playlistId) {
      setExpandedPlaylistId(null);
      return;
    }

    setExpandedPlaylistId(playlistId);

    // Fetch details if not cached
    if (!playlistDetails[playlistId]) {
      setLoadingDetails(prev => ({ ...prev, [playlistId]: true }));
      try {
        const response = await playlistService.getPlaylistById(playlistId);
        setPlaylistDetails(prev => ({
          ...prev,
          [playlistId]: response.data
        }));
      } catch (error) {
        console.error('Error loading playlist details:', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [playlistId]: false }));
      }
    }
  };

  const renderPlaylistSongItem = (songItem) => (
    <View key={songItem.song_id} style={styles.miniSongItem}>
      <Image
        source={{ uri: songItem.cover_url || 'https://via.placeholder.com/40' }}
        style={styles.miniSongImage}
      />
      <View style={styles.miniSongInfo}>
        <Text style={styles.miniSongTitle} numberOfLines={1}>{songItem.title}</Text>
        <Text style={styles.miniSongArtist} numberOfLines={1}>{songItem.artist_name}</Text>
      </View>
    </View>
  );

  const renderPlaylistItem = ({ item }) => {
    const isExpanded = expandedPlaylistId === item.playlist_id;
    const isLoading = loadingDetails[item.playlist_id];
    const details = playlistDetails[item.playlist_id];
    const songs = details?.songs || [];
    
    // Check if current song is already in this playlist
    const isAlreadyAdded = details && songs.some(s => s.song_id === song?.song_id);

    return (
      <View style={styles.playlistItemContainer}>
        <View style={styles.playlistItemHeader}>
          <TouchableOpacity 
            style={styles.playlistMainClick}
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
            
            {isAlreadyAdded ? (
              <View style={styles.addedBadge}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                <Text style={styles.addedText}>Đã thêm</Text>
              </View>
            ) : (
              <View style={styles.addButton}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => toggleExpand(item.playlist_id)}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.playlistDetails}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: 10 }} />
            ) : songs.length > 0 ? (
              <View style={styles.songsList}>
                <Text style={styles.songsListHeader}>Danh sách bài hát:</Text>
                {songs.map(renderPlaylistSongItem)}
              </View>
            ) : (
              <Text style={styles.emptyPlaylistText}>Playlist trống</Text>
            )}
          </View>
        )}
      </View>
    );
  };

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
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
              <View style={styles.createNewIcon}>
                <Ionicons name="add" size={24} color={COLORS.white} />
              </View>
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
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            !showCreateNew && (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Chưa có playlist nào</Text>
                <Text style={styles.emptySubtext}>Tạo playlist đầu tiên của bạn ngay</Text>
              </View>
            )
          )}
        </View>
      </View>

      {/* Custom Success/Error Modal */}
      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  songImage: {
    width: 48,
    height: 48,
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
    padding: 16,
    marginHorizontal: SIZES.padding,
    marginVertical: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createNewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createNewText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  createNewContainer: {
    padding: SIZES.padding,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  createButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 14,
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
    paddingVertical: 14,
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
  playlistItemContainer: {
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playlistItemHeader: {
    flexDirection: 'row',
    minHeight: 70, // Ensure consistent height
  },
  playlistMainClick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
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
  addButton: {
    padding: 8,
    justifyContent: 'center',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  addedText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  expandButton: {
    width: 50,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  playlistDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
  },
  songsListHeader: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  miniSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 8,
    borderRadius: 8,
  },
  miniSongImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  miniSongInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  miniSongTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  miniSongArtist: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  emptyPlaylistText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
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
    fontSize: SIZES.md,
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

