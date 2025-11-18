import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../../services/playlistService';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';

const PlaylistDetailScreen = ({ navigation, route }) => {
  const { playlistId, playlistName } = route.params;
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playSong } = usePlayer();

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

  const handlePlaySong = (song, index) => {
    playSong(song, songs, index);
    songService.playSong(song.song_id).catch(console.error);
    navigation.navigate('FullPlayer');
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

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
      songService.playSong(songs[0].song_id).catch(console.error);
      navigation.navigate('FullPlayer');
    }
  };

  const renderSongItem = ({ item, index }) => (
    <View style={styles.songItem}>
      <TouchableOpacity
        style={styles.songContent}
        onPress={() => handlePlaySong(item, index)}
        activeOpacity={0.7}
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
            {item.artist_name || 'Unknown Artist'}
          </Text>
        </View>
        <Ionicons name="play-circle" size={32} color={COLORS.primary} />
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => handleRemoveSong(item.song_id)}
        style={styles.removeButton}
      >
        <Ionicons name="close-circle" size={24} color={COLORS.error} />
      </TouchableOpacity>
    </View>
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
          <Ionicons name="musical-notes" size={64} color={COLORS.white} />
          <Text style={styles.playlistName}>{playlist?.name || playlistName}</Text>
          <Text style={styles.playlistInfo}>
            {songs.length} bài hát
          </Text>
        </View>

        <TouchableOpacity style={styles.moreButton}>
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
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.song_id.toString()}
          contentContainerStyle={styles.songsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Playlist trống</Text>
          <Text style={styles.emptySubtext}>Thêm bài hát vào playlist này</Text>
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
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: SIZES.padding,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 16,
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
  songsList: {
    paddingBottom: 100,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    paddingRight: 8,
  },
  songContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
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

