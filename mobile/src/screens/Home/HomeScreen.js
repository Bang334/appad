import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';

const HomeScreen = ({ navigation }) => {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const { playSong } = usePlayer();
  const flatListRef = useRef(null);
  const scrollPosition = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (trendingSongs.length === 0) return;

    const interval = setInterval(() => {
      if (flatListRef.current && trendingSongs.length > 0) {
        scrollPosition.current = (scrollPosition.current + 1) % trendingSongs.length;
        
        flatListRef.current.scrollToIndex({
          index: scrollPosition.current,
          animated: true,
        });
      }
    }, 3000); // Auto scroll every 3 seconds

    return () => clearInterval(interval);
  }, [trendingSongs]);

  const loadData = async () => {
    try {
      const [trending, recent] = await Promise.all([
        songService.getTrendingSongs(10),
        songService.getAllSongs(20, 0),
      ]);
      setTrendingSongs(trending.data);
      setRecentSongs(recent.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePlaySong = (song, index, list) => {
    playSong(song, list, index);
    songService.playSong(song.song_id).catch(console.error);
    // Navigate to Full Player
    navigation.navigate('FullPlayer');
  };

  const renderSongItem = (song, index, list) => (
    <View key={song.song_id} style={styles.songItemWrapper}>
      <TouchableOpacity
        style={styles.songItem}
        onPress={() => handlePlaySong(song, index, list)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
          style={styles.songImage}
        />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist_name || 'Unknown Artist'}
          </Text>
          <View style={styles.songMeta}>
            <Ionicons name="headset" size={12} color={COLORS.textMuted} />
            <Text style={styles.listenCount}>
              {formatListenCount(song.listen_count)}
            </Text>
            {song.average_rating != null && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {Number(song.average_rating).toFixed(1)}
                </Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.playButton}>
          <Ionicons name="play-circle" size={40} color={COLORS.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddToPlaylist(song)}
      >
        <Ionicons name="add-circle-outline" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const formatListenCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const handleAddToPlaylist = (song) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Trending Songs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Trending</Text>
        <FlatList
          ref={flatListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={trendingSongs}
          keyExtractor={(item) => item.song_id.toString()}
          pagingEnabled
          snapToInterval={112 + SIZES.padding}
          decelerationRate="fast"
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.trendingItem}
              onPress={() => handlePlaySong(item, index, trendingSongs)}
            >
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
                style={styles.trendingImage}
              />
              <Text style={styles.trendingTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.trendingArtist} numberOfLines={1}>
                {item.artist_name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Recent Songs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mới nhất</Text>
        {recentSongs.map((song, index) =>
          renderSongItem(song, index, recentSongs)
        )}
      </View>

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        song={selectedSong}
      />
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
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  trendingItem: {
    width: 112, // Same as album carousel
    marginLeft: SIZES.padding,
  },
  trendingImage: {
    width: 112,
    height: 112,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  trendingTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  trendingArtist: {
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
    marginVertical: 4,
    borderRadius: SIZES.borderRadius,
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
  metaSeparator: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    marginHorizontal: 4,
  },
  ratingText: {
    color: COLORS.text,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  playButton: {
    padding: 4,
  },
  songItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addButton: {
    padding: 8,
    marginRight: SIZES.padding,
  },
});

export default HomeScreen;

