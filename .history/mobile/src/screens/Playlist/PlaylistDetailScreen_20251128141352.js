import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { playlistService } from '../../services/playlistService';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import MiniPlayer from '../../components/Player/MiniPlayer';
import PremiumBadge from '../../components/Common/PremiumBadge';

const formatDuration = (seconds) => {
  if (seconds == null) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatListenCount = (count) => {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const PlaylistDetailScreen = ({ navigation, route }) => {
  const { playlistId, playlistName } = route.params;
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

  useEffect(() => {
    loadPlaylist();
  }, []);

  const loadPlaylist = async () => {
    try {
      const response = await playlistService.getPlaylistById(playlistId);
      setPlaylist(response.data);
      setSongs(response.data.songs || []);
    } catch (error) {
      console.error('Error loading playlist:', error);
      Alert.alert('Lỗi', 'Không thể tải playlist');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (song, index, options = {}) => {
    const { navigateToFullPlayer = true } = options;

    if (currentSong?.song_id === song.song_id) {
      if (navigateToFullPlayer) {
        navigation.navigate('FullPlayer');
      } else {
        togglePlayPause();
      }
      return;
    }

    playSong(song, songs, index, playlist);
    await AsyncStorage.setItem('isPlayingPlaylist', '1');
    await AsyncStorage.setItem('currentPlaylistId', playlistId.toString());

    if (navigateToFullPlayer) {
      navigation.navigate('FullPlayer');
    }
  };

  const handleRemoveSong = (songId) => {
    Alert.alert(
      'Xóa bài hát',
      'Bạn có chắc muốn xóa bài này khỏi playlist?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.removeSongFromPlaylist(playlistId, songId);
              setSongs(songs.filter(s => s.song_id !== songId));
              Alert.alert('Thành công', 'Đã xóa bài khỏi playlist');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa bài hát');
            }
          },
        },
      ]
    );
  };

  const handlePlayAll = async () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0, playlist);
      // Save flag to localStorage that we're playing from playlist
      await AsyncStorage.setItem('isPlayingPlaylist', '1');
      await AsyncStorage.setItem('currentPlaylistId', playlistId.toString());
      navigation.navigate('FullPlayer');
    }
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      'Xóa playlist',
      `Bạn có chắc muốn xóa playlist "${playlist?.name || playlistName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.deletePlaylist(playlistId);
              Alert.alert('Thành công', 'Đã xóa playlist');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Lỗi', 'Không thể xóa playlist');
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Tùy chọn',
      'Chọn hành động',
      [
        {
          text: 'Xóa playlist',
          style: 'destructive',
          onPress: handleDeletePlaylist,
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleDragEnd = async ({ data }) => {
    // Update local state immediately
    setSongs(data);
    
    // Save order to backend
    setSavingOrder(true);
    try {
      const songOrders = data.map((song, index) => ({
        song_id: song.song_id,
        order: index
      }));
      
      await playlistService.updateSongOrder(playlistId, songOrders);
    } catch (error) {
      console.error('Error updating song order:', error);
      Alert.alert('Lỗi', 'Không thể lưu thứ tự bài hát');
      // Reload to get correct order
      loadPlaylist();
    } finally {
      setSavingOrder(false);
    }
  };

  const renderSongItem = ({ item, index, drag, isActive }) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];
    const showPrice = item.is_premium === 1 && Number(item.price) > 0;
    
    return (
      <ScaleDecorator>
        <View style={styles.songItem}>
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={drag}
            disabled={isActive}
          >
            <Ionicons 
              name="reorder-three-outline" 
              size={24} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.songContent}
            onPress={() => handlePlaySong(item, index, { navigateToFullPlayer: true })}
            activeOpacity={0.85}
            disabled={isActive}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.songCard, (isCurrentSong || isActive) && styles.songCardActive]}
            >
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songImage}
              />
              <View style={styles.songInfo}>
                <View style={styles.songTitleRow}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.is_premium === 1 && <PremiumBadge small />}
                </View>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {item.artist_name || 'Unknown Artist'}
                  {item.album_title ? ` • ${item.album_title}` : ''}
                </Text>
                <View style={styles.songMeta}>
                  <Ionicons name="headset" size={12} color="#94A3B8" />
                  <Text style={styles.songMetaText}>{formatListenCount(item.listen_count)}</Text>
                  {item.average_rating != null && (
                    <>
                      <Text style={styles.metaSeparator}>•</Text>
                      <Ionicons name="star" size={12} color={COLORS.warning} />
                      <Text style={styles.songMetaText}>{Number(item.average_rating).toFixed(1)}</Text>
                    </>
                  )}
                  {item.duration > 0 && (
                    <>
                      <Text style={styles.metaSeparator}>•</Text>
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
                      <Text style={styles.songMetaText}>{formatDuration(item.duration)}</Text>
                    </>
                  )}
                </View>
                {showPrice && (
                  <View style={styles.priceRow}>
                    <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                    <Text style={styles.songPriceText}>
                      {Number(item.price).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.quickPlayButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handlePlaySong(item, index, { navigateToFullPlayer: false });
                }}
              >
                <Ionicons
                  name={isCurrentSong && isPlaying ? 'pause-circle' : 'play-circle'}
                  size={30}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleRemoveSong(item.song_id)}
            style={styles.removeButton}
            disabled={isActive}
          >
            <Ionicons name="close-circle" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={COLORS.gradient.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.playlistName}>{playlist?.name || playlistName}</Text>
          <Text style={styles.playlistInfo}>
            {songs.length} bài hát
          </Text>
        </View>

        <TouchableOpacity style={styles.moreButton} onPress={handleMoreOptions}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Play All Button */}
      {songs.length > 0 && (
        <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
          <LinearGradient
            colors={COLORS.gradient.primary}
            style={styles.playAllGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="play" size={24} color={COLORS.white} />
            <Text style={styles.playAllText}>Phát tất cả</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Songs List */}
      {songs.length > 0 ? (
        <View style={styles.songsListContainer}>
          {savingOrder && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.savingText}>Đang lưu thứ tự...</Text>
            </View>
          )}
          <DraggableFlatList
            data={songs}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.song_id.toString()}
            renderItem={renderSongItem}
            contentContainerStyle={styles.songsList}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Playlist trống</Text>
          <Text style={styles.emptySubtext}>Thêm bài hát vào playlist này</Text>
        </View>
      )}
      <MiniPlayer bottomOffset={0} />
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
  header: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: SIZES.padding,
  },
  backButton: {
    position: 'relative',
    top:25,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 0,
  },
  playlistName: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  playlistInfo: {
    color: COLORS.white,
    fontSize: SIZES.base,
    marginTop: 8,
    opacity: 0.9,
  },
  moreButton: {
    position: 'absolute',
    right: SIZES.padding,
    top: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllButton: {
    marginHorizontal: SIZES.padding,
    marginVertical: 16,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  playAllText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  songsListContainer: {
    flex: 1,
  },
  songsList: {
    paddingBottom: 100,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginTop: 8,
    borderRadius: SIZES.borderRadius,
  },
  savingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginVertical: 6,
    paddingRight: 8,
  },
  songCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZES.borderRadius,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  songCardActive: {
    borderColor: COLORS.primary,
  },
  dragHandle: {
    paddingRight: 5,
    justifyContent: 'center',
  },
  songContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 300,
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    marginRight: 8,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: SIZES.md,
    fontWeight: '700',
    flex: 1,
  },
  songArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    flexWrap: 'wrap',
  },
  songMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  songMetaText: {
    color: '#CBD5F5',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  metaSeparator: {
    color: '#94A3B8',
    fontSize: SIZES.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  songPriceText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  quickPlayButton: {
    paddingLeft: 8,
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    marginTop: 8,
  },
});

export default PlaylistDetailScreen;

