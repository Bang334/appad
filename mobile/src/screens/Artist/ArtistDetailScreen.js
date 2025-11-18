import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';

const ArtistDetailScreen = ({ route, navigation }) => {
  const { artistId } = route.params;
  const { playSong } = usePlayer();
  
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtistData();
  }, [artistId]);

  const loadArtistData = async () => {
    setLoading(true);
    try {
      const [artistRes, albumsRes, songsRes] = await Promise.all([
        artistService.getArtistById(artistId),
        artistService.getArtistAlbums(artistId),
        artistService.getArtistSongs(artistId),
      ]);
      
      setArtist(artistRes.data);
      setAlbums(albumsRes.data || []);
      setSongs(songsRes.data || []);
    } catch (error) {
      console.error('Error loading artist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song, index) => {
    playSong(song, songs, index);
    songService.playSong(song.song_id).catch(console.error);
    navigation.navigate('FullPlayer');
  };

  const handlePlayAllSongs = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
      songService.playSong(songs[0].song_id).catch(console.error);
      navigation.navigate('FullPlayer');
    }
  };

  const formatListenCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Không tìm thấy ca sĩ</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Artist Image */}
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
            source={{ uri: artist.image_url || 'https://via.placeholder.com/200' }}
            style={styles.artistImage}
          />
          
          <Text style={styles.artistName}>{artist.name}</Text>
          
          {artist.country && (
            <View style={styles.countryContainer}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.countryText}>{artist.country}</Text>
            </View>
          )}

          {artist.bio && (
            <Text style={styles.bioText} numberOfLines={3}>
              {artist.bio}
            </Text>
          )}
        </LinearGradient>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{albums.length}</Text>
          <Text style={styles.statLabel}>Album</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{songs.length}</Text>
          <Text style={styles.statLabel}>Bài hát</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatListenCount(songs.reduce((sum, s) => sum + (s.listen_count || 0), 0))}
          </Text>
          <Text style={styles.statLabel}>Lượt nghe</Text>
        </View>
      </View>

      {/* Play All Button */}
      {songs.length > 0 && (
        <TouchableOpacity
          style={styles.playAllButton}
          onPress={handlePlayAllSongs}
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
      )}

      {/* Albums Section */}
      {albums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Albums</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={albums}
            keyExtractor={(item) => item.album_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumItem}
                onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
              >
                <Image
                  source={{ uri: item.cover_url || 'https://via.placeholder.com/120' }}
                  style={styles.albumImage}
                />
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.albumYear}>
                  {item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* All Songs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tất cả bài hát</Text>
        {songs.map((song, index) => (
          <TouchableOpacity
            key={song.song_id}
            style={styles.songItem}
            onPress={() => handlePlaySong(song, index)}
          >
            <Image
              source={{ uri: song.cover_url || 'https://via.placeholder.com/50' }}
              style={styles.songImage}
            />
            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <View style={styles.songMeta}>
                {song.album_title && (
                  <Text style={styles.songAlbum} numberOfLines={1}>
                    {song.album_title}
                  </Text>
                )}
                {song.album_title && <Text style={styles.metaDot}>•</Text>}
                <Ionicons name="headset" size={12} color={COLORS.textMuted} />
                <Text style={styles.listenCount}>
                  {formatListenCount(song.listen_count)}
                </Text>
              </View>
            </View>
            <TouchableOpacity>
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
  artistImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  artistName: {
    fontSize: SIZES.xxxl,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  countryText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
  },
  bioText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    textAlign: 'center',
    paddingHorizontal: SIZES.padding * 2,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginTop: -16,
    borderRadius: SIZES.borderRadius,
    padding: 20,
    justifyContent: 'space-around',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.xxl,
    fontWeight: '900',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
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
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  albumItem: {
    width: 120,
    marginLeft: SIZES.padding,
  },
  albumImage: {
    width: 120,
    height: 120,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  albumTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  albumYear: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginBottom: 8,
    borderRadius: SIZES.borderRadius,
  },
  songImage: {
    width: 50,
    height: 50,
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
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songAlbum: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
  listenCount: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  emptySection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});

export default ArtistDetailScreen;

