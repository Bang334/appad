import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { favoriteService } from '../../services/favoriteService';
import { playlistService } from '../../services/playlistService';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';

const LibraryScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('favorites'); // favorites, playlists
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const { playSong } = usePlayer();

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      console.log('Loading library data...');
      const [favoritesData, playlistsData] = await Promise.all([
        favoriteService.getUserFavorites(),
        playlistService.getUserPlaylists(),
      ]);
      console.log('Favorites data:', favoritesData);
      setFavorites(favoritesData.data || []);
      setPlaylists(playlistsData.data || []);
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên playlist');
      return;
    }

    setCreatingPlaylist(true);
    try {
      await playlistService.createPlaylist(newPlaylistName, '');
      Alert.alert('Thành công', 'Đã tạo playlist mới');
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      loadData();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tạo playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handlePlaySong = (song, index, list) => {
    playSong(song, list, index);
    songService.playSong(song.song_id).catch(console.error);
    navigation.navigate('FullPlayer');
  };

  const renderFavoriteItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handlePlaySong(item, index, favorites)}
    >
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist_name}
        </Text>
      </View>
      <Ionicons name="play-circle" size={32} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const handleOpenPlaylist = (playlist) => {
    navigation.navigate('PlaylistDetail', {
      playlistId: playlist.playlist_id,
      playlistName: playlist.name,
    });
  };

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => handleOpenPlaylist(item)}
      activeOpacity={0.7}
    >
      <View style={styles.playlistIcon}>
        <Ionicons name="musical-notes" size={32} color={COLORS.primary} />
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.song_count} bài hát</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
            Yêu thích
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
          onPress={() => setActiveTab('playlists')}
        >
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
            Playlist
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'favorites' ? (
        favorites.length > 0 ? (
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.song_id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Chưa có bài hát yêu thích</Text>
          </View>
        )
      ) : (
        <View style={{ flex: 1 }}>
          {/* Create Playlist Button */}
          {showCreatePlaylist ? (
            <View style={styles.createPlaylistContainer}>
              <View style={styles.createPlaylistForm}>
                <TextInput
                  style={styles.playlistInput}
                  placeholder="Tên playlist mới"
                  placeholderTextColor={COLORS.textMuted}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <View style={styles.createPlaylistButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCreatePlaylist(false);
                      setNewPlaylistName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreatePlaylist}
                    disabled={creatingPlaylist}
                  >
                    <LinearGradient
                      colors={COLORS.gradient.primary}
                      style={styles.createButtonGradient}
                    >
                      <Text style={styles.createButtonText}>
                        {creatingPlaylist ? 'Đang tạo...' : 'Tạo'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPlaylistButton}
              onPress={() => setShowCreatePlaylist(true)}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.addPlaylistText}>Tạo playlist mới</Text>
            </TouchableOpacity>
          )}

          {/* Playlists List */}
          {playlists.length > 0 ? (
            <FlatList
              data={playlists}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.playlist_id.toString()}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Chưa có playlist nào</Text>
              <Text style={styles.emptySubtext}>Tạo playlist mới để bắt đầu</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  tabs: {
    flexDirection: 'row',
    padding: SIZES.padding,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  list: {
    paddingBottom: 100,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
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
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
  playlistIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  addPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    margin: SIZES.padding,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 12,
  },
  addPlaylistText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  createPlaylistContainer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.background,
  },
  createPlaylistForm: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playlistInput: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  createPlaylistButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
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
    flex: 1,
    borderRadius: SIZES.borderRadius,
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
});

export default LibraryScreen;

