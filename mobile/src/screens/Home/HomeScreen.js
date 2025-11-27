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
import { albumService } from '../../services/albumService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import PremiumBadge from '../../components/Common/PremiumBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import AccessBadge from '../../components/Common/AccessBadge';
import { premiumService } from '../../services/premiumService';

const HomeScreen = ({ navigation }) => {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [newAlbums, setNewAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedSongList, setSelectedSongList] = useState([]);
  const [purchasedSongIds, setPurchasedSongIds] = useState(new Set());
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [songAccessTypes, setSongAccessTypes] = useState({}); // { songId: accessType }
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
  const flatListRef = useRef(null);
  const scrollPosition = useRef(0);
  const albumCarouselRef = useRef(null);
  const albumScrollPosition = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-scroll carousel for Trending
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

  // Auto-scroll carousel for Albums (reverse direction)
  useEffect(() => {
    if (newAlbums.length === 0) return;

    // Start from the end
    albumScrollPosition.current = newAlbums.length - 1;

    const interval = setInterval(() => {
      if (albumCarouselRef.current && newAlbums.length > 0) {
        // Scroll backwards (reverse direction)
        albumScrollPosition.current = (albumScrollPosition.current - 1 + newAlbums.length) % newAlbums.length;
        
        albumCarouselRef.current.scrollToIndex({
          index: albumScrollPosition.current,
          animated: true,
        });
      }
    }, 3000); // Auto scroll every 3 seconds

    return () => clearInterval(interval);
  }, [newAlbums]);

  const loadData = async () => {
    try {
      const [trending, recent, albums, purchased, premiumStatus] = await Promise.all([
        songService.getTrendingSongs(10),
        songService.getAllSongs(20, 0),
        albumService.getAllAlbums(10, 0).catch(() => ({ data: [] })),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        premiumService.checkStatus().catch(() => ({ data: { is_premium: false } })),
      ]);
      setTrendingSongs(trending.data);
      setRecentSongs(recent.data);
      setNewAlbums(albums.data || []);
      
      // Create Set of purchased song IDs for quick lookup
      const purchasedIds = new Set((purchased.data || []).map(song => song.song_id));
      setPurchasedSongIds(purchasedIds);
      
      // Check if user has premium
      setUserIsPremium(premiumStatus.data?.is_premium || false);

      // Check access types for premium songs
      const accessTypesMap = {};
      const premiumSongs = [...(trending.data || []), ...(recent.data || [])].filter(s => s.is_premium === 1);
      
      // Check access for premium songs in parallel (limit to avoid too many requests)
      const accessChecks = premiumSongs.slice(0, 50).map(async (song) => {
        try {
          const accessRes = await premiumService.checkSongAccess(song.song_id);
          if (accessRes.success && accessRes.data?.hasAccess && accessRes.data?.accessType) {
            accessTypesMap[song.song_id] = accessRes.data.accessType;
          }
        } catch (error) {
          // Silent fail for access checks
        }
      });
      
      await Promise.all(accessChecks);
      setSongAccessTypes(accessTypesMap);
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

  const handlePlaySong = async (song, index, list) => {
    // If clicking on currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      // Check if song is premium
      if (song.is_premium) {
        try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data.hasAccess) {
          // Show premium access modal with 3 options
          setSelectedSong(song);
          setSelectedSongList(list);
          setShowPremiumModal(true);
          return;
        }
        } catch (error) {
          console.error('Error checking song access:', error);
          // If error, try to play anyway (for backward compatibility)
        }
      }

      // Play new song (will pause current if playing)
      playSong(song, list, index);
    }
    // Don't navigate to FullPlayer, just show MiniPlayer
  };

  const handleSongPress = async (song, index, list) => {
    // If clicking on currently playing song, navigate to FullPlayer
    if (currentSong?.song_id === song.song_id) {
      navigation.navigate('FullPlayer');
      return;
    }

    // Check access for premium songs
    if (song.is_premium === 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          // Show premium access modal with 3 options
          setSelectedSong(song);
          setSelectedSongList(list);
          setShowPremiumModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking song access:', error);
        // If error, try to play anyway
      }
    }

    // Play song and navigate to FullPlayer
    playSong(song, list, index);
    
    // Update access type if we just checked it
    try {
      const accessRes = await premiumService.checkSongAccess(song.song_id);
      if (accessRes.success && accessRes.data?.hasAccess && accessRes.data?.accessType) {
        setSongAccessTypes(prev => ({
          ...prev,
          [song.song_id]: accessRes.data.accessType
        }));
      }
    } catch (error) {
      // Silent fail
    }
    
    navigation.navigate('FullPlayer');
  };

  const renderSongItem = (song, index, list) => {
    const isCurrentSong = currentSong?.song_id === song.song_id;

    return (
      <View key={song.song_id} style={styles.songItemWrapper}>
        <View style={[styles.songItem, isCurrentSong && styles.songItemActive]}>
          <TouchableOpacity
            style={styles.songContent}
            onPress={() => handleSongPress(song, index, list)}
            activeOpacity={0.7}
          >
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songImage}
              />
              {isCurrentSong && isPlaying && (
                <View style={styles.playingIndicator}>
                  <Ionicons name="volume-high" size={24} color="#FFF" />
                </View>
              )}
            </View>
            <View style={styles.songInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            {song.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />}
            {song.is_premium === 1 && songAccessTypes[song.song_id] && (
              <AccessBadge accessType={songAccessTypes[song.song_id]} size={16} />
            )}
          </View>
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
            {song.is_premium === 1 && song.price > 0 && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <Ionicons name="cash" size={12} color={COLORS.primary} />
                <Text style={styles.priceText}>
                  {parseFloat(song.price).toLocaleString('vi-VN')}đ
                </Text>
              </>
            )}
          </View>
        </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handlePlaySong(song, index, list)}
          >
            <Ionicons 
              name={isCurrentSong && isPlaying ? "pause-circle" : "play-circle"} 
              size={40} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
        </View>
      
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToPlaylist(song)}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

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
          renderItem={({ item, index }) => {
            const isCurrentSong = currentSong?.song_id === item.song_id;
            
            return (
              <TouchableOpacity
                style={styles.trendingItem}
                onPress={() => handlePlaySong(item, index, trendingSongs)}
              >
                <View style={styles.trendingImageContainer}>
                  <Image
                    source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
                    style={styles.trendingImage}
                  />
                  {isCurrentSong && isPlaying && (
                    <View style={styles.trendingPlayingIndicator}>
                      <Ionicons name="volume-high" size={28} color="#FFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.trendingTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.trendingArtist} numberOfLines={1}>
                  {item.artist_name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* New Albums */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="albums" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Album mới</Text>
        </View>
        <FlatList
          ref={albumCarouselRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={newAlbums}
          keyExtractor={(item) => item.album_id.toString()}
          pagingEnabled
          snapToInterval={112 + SIZES.padding}
          decelerationRate="fast"
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              albumCarouselRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.trendingItem}
              onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
            >
              <View style={styles.trendingImageContainer}>
                <Image
                  source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
                  style={styles.trendingImage}
                />
                {item.is_premium === 1 && (
                  <View style={styles.albumPremiumBadge}>
                    <PremiumBadge small />
                  </View>
                )}
              </View>
              <Text style={styles.trendingTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.trendingArtist} numberOfLines={1}>
                {item.artist_name || 'Unknown Artist'}
              </Text>
              {item.song_count !== undefined && (
                <View style={styles.albumSongCount}>
                  <Ionicons name="musical-notes" size={12} color={COLORS.textMuted} />
                  <Text style={styles.albumSongCountText}>
                    {item.song_count} bài hát
                  </Text>
                </View>
              )}
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
      
      <PremiumAccessModal
        visible={showPremiumModal}
        song={selectedSong}
        songList={selectedSongList}
        playSong={playSong}
        onClose={() => setShowPremiumModal(false)}
        onPurchaseSong={async () => {
          // Handle song purchase
          if (selectedSong) {
            try {
              await premiumService.purchaseSong(selectedSong.song_id);
              setShowPremiumModal(false);
              loadData();
            } catch (error) {
              console.error('Error purchasing song:', error);
            }
          }
        }}
        onSubscribePremium={() => {
          setShowPremiumModal(false);
          navigation.navigate('Premium');
        }}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  trendingItem: {
    width: 112, // Same as album carousel
    marginLeft: SIZES.padding,
  },
  trendingImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  trendingImage: {
    width: 112,
    height: 112,
    borderRadius: SIZES.borderRadius,
  },
  trendingPlayingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
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
  songItemActive: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  songContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coverContainer: {
    position: 'relative',
    marginRight: 12,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '700',
    flex: 1,
  },
  premiumBadge: {
    marginLeft: 6,
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  purchasedText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
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
  priceText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '700',
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
  albumPremiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
  },
  albumSongCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  albumSongCountText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
});

export default HomeScreen;

