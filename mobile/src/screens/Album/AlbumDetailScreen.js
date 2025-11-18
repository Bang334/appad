import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';

const AlbumDetailScreen = ({ route, navigation }) => {
  const { albumId } = route.params;
  const { playSong } = usePlayer();
  
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbumData();
  }, [albumId]);

  const loadAlbumData = async () => {
    setLoading(true);
    try {
      const response = await songService.getSongsByAlbum(albumId);
      const songsData = response.data || [];
      setSongs(songsData);
      
      // Get album info from first song
      if (songsData.length > 0) {
        setAlbum({
          title: songsData[0].album_title,
          artist_name: songsData[0].artist_name,
          artist_id: songsData[0].artist_id,
          cover_url: songsData[0].cover_url,
          release_date: songsData[0].release_date,
        });
      }
    } catch (error) {
      console.error('Error loading album data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song, index) => {
    playSong(song, songs, index);
    songService.playSong(song.song_id).catch(console.error);
    navigation.navigate('FullPlayer');
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
      songService.playSong(songs[0].song_id).catch(console.error);
      navigation.navigate('FullPlayer');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const total = songs.reduce((sum, song) => sum + (song.duration || 0), 0);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} phút`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!album) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Không tìm thấy album</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Album Cover */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[COLORS.background, COLORS.surface, COLORS.background]}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <Image
            source={{ uri: album.cover_url || 'https://via.placeholder.com/200' }}
            style={styles.albumCover}
          />
          
          <Text style={styles.albumTitle}>{album.title}</Text>
          
          <TouchableOpacity
            onPress={() => {
              if (album.artist_id) {
                navigation.navigate('ArtistDetail', { artistId: album.artist_id });
              }
            }}
          >
            <Text style={styles.artistName}>{album.artist_name}</Text>
          </TouchableOpacity>

          <View style={styles.albumMeta}>
            <Text style={styles.metaText}>
              {songs.length} bài hát
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {getTotalDuration()}
            </Text>
            {album.release_date && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>
                  {new Date(album.release_date).getFullYear()}
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Play All Button */}
      <TouchableOpacity
        style={styles.playAllButton}
        onPress={handlePlayAll}
      >
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

      {/* Songs List */}
      <View style={styles.songsSection}>
        {songs.map((song, index) => (
          <TouchableOpacity
            key={song.song_id}
            style={styles.songItem}
            onPress={() => handlePlaySong(song, index)}
          >
            <View style={styles.songNumber}>
              <Text style={styles.songNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <View style={styles.songMeta}>
                <Ionicons name="headset" size={12} color={COLORS.textMuted} />
                <Text style={styles.listenCount}>
                  {song.listen_count?.toLocaleString() || '0'}
                </Text>
              </View>
            </View>
            <Text style={styles.duration}>
              {formatDuration(song.duration)}
            </Text>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {songs.length === 0 && (
          <View style={styles.emptySection}>
            <Ionicons name="musical-notes-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
  },
  headerContainer: {
    position: 'relative',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SIZES.padding,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  albumCover: {
    width: 200,
    height: 200,
    borderRadius: SIZES.borderRadius,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  albumTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: SIZES.padding * 2,
  },
  artistName: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  albumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
  playAllButton: {
    marginHorizontal: SIZES.padding,
    marginTop: 20,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  playAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  playAllText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  songsSection: {
    marginTop: 24,
    paddingHorizontal: SIZES.padding,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    borderRadius: SIZES.borderRadius,
  },
  songNumber: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  songNumberText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    fontWeight: '600',
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
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listenCount: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  duration: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  emptySection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});

export default AlbumDetailScreen;

