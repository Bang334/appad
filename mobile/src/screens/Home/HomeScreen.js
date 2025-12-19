import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { GlobalStyles } from '../../config/styles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import PremiumBadge from '../../components/Common/PremiumBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import AccessBadge from '../../components/Common/AccessBadge';
import { premiumService } from '../../services/premiumService';
import { LinearGradient } from 'expo-linear-gradient';
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

  // Generate infinite lists for UI looping
  const infiniteTrendingSongs = useMemo(() => {
    if (trendingSongs.length === 0) return [];
    // Duplicate list 50 times to simulate infinite scrolling
    return Array(50).fill(trendingSongs).flat();
  }, [trendingSongs]);

  const infiniteAlbums = useMemo(() => {
    if (newAlbums.length === 0) return [];
    return Array(50).fill(newAlbums).flat();
  }, [newAlbums]);

  useEffect(() => {
    loadData();
  }, []);

  // Reset scroll position when data refreshes
  useEffect(() => {
    scrollPosition.current = 0;
    albumScrollPosition.current = 0;
  }, [trendingSongs, newAlbums]);

  // Auto-scroll carousel for Trending
  useEffect(() => {
    if (infiniteTrendingSongs.length === 0) return;

    const interval = setInterval(() => {
      if (flatListRef.current) {
        let nextIndex = scrollPosition.current + 1;
        
        // Loop back if we reach the very end
        if (nextIndex >= infiniteTrendingSongs.length) {
          nextIndex = 0;
          flatListRef.current.scrollToIndex({ index: 0, animated: false });
        } else {
          flatListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        }
        scrollPosition.current = nextIndex;
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [infiniteTrendingSongs]);

  // Auto-scroll carousel for Albums
  useEffect(() => {
    if (infiniteAlbums.length === 0) return;

    const interval = setInterval(() => {
      if (albumCarouselRef.current) {
        let nextIndex = albumScrollPosition.current + 1;
        
        if (nextIndex >= infiniteAlbums.length) {
          nextIndex = 0;
          albumCarouselRef.current.scrollToIndex({ index: 0, animated: false });
        } else {
          albumCarouselRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        }
        albumScrollPosition.current = nextIndex;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [infiniteAlbums]);

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

    // Navigate first for faster UX, then start playback
    navigation.navigate('FullPlayer');
    await playSong(song, list, index);
    
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
    
  };

  const renderSongItem = (song, index, list) => {
    const isCurrentSong = currentSong?.song_id === song.song_id;
    const showPrice = song.is_premium === 1 && !userHasAccessToSong(song) && Number(song.price) > 0;

    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];

    return (
      <View key={song.song_id} style={GlobalStyles.songItemWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[GlobalStyles.songItem, isCurrentSong && GlobalStyles.songItemActive]}
        >
          <TouchableOpacity
            style={GlobalStyles.songContent}
            onPress={() => handleSongPress(song, index, list)}
            activeOpacity={0.8}
          >
            <View style={GlobalStyles.coverContainer}>
              <Image
                source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                style={GlobalStyles.songImage}
              />
              {isCurrentSong && isPlaying && (
                <View style={GlobalStyles.playingIndicator}>
                  <Ionicons name="volume-high" size={24} color="#FFF" />
                </View>
              )}
            </View>
            <View style={GlobalStyles.songInfo}>
              <View style={GlobalStyles.titleRow}>
                <Text style={GlobalStyles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <View style={{display: 'flex', flexDirection: 'row', position: 'relative', top: -10, right:-30}}>
                  {song.is_premium === 1 && <PremiumBadge size="small" style={GlobalStyles.premiumBadge} />}
                  {song.is_premium === 1 && songAccessTypes[song.song_id] && (
                    <AccessBadge accessType={songAccessTypes[song.song_id]} size={16} />
                  )}
                </View>
              </View>
              <Text style={GlobalStyles.songArtist} numberOfLines={1}>
                {song.artist_name || 'Unknown Artist'}
                {song.album_title && (
                  <>
                    <Text style={{ color: '#94A3B8' }}> • </Text>
                    <Text style={{ color: '#CBD5F5', fontStyle: 'italic' }}>
                      {song.album_title}
                    </Text>
                  </>
                )}
              </Text>
              <View style={GlobalStyles.songMeta}>
                <Ionicons name="headset" size={12} color="#94A3B8" />
                <Text style={GlobalStyles.metaText}>
                  {formatListenCount(song.listen_count)}
                </Text>
                {song.average_rating != null && (
                  <>
                    <Ionicons name="star" size={12} color={COLORS.warning} />
                    <Text style={GlobalStyles.metaText}>
                      {Number(song.average_rating).toFixed(1)}
                    </Text>
                  </>
                )}
                {song.duration > 0 && (
                  <>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={GlobalStyles.metaText}>
                      {formatDuration(song.duration)}
                    </Text>
                  </>
                )}
              </View>
              {showPrice && (
                <View style={GlobalStyles.priceRow}>
                  <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                  <Text style={GlobalStyles.priceText}>
                    {Number(song.price).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={GlobalStyles.cardActions}>
            <TouchableOpacity
              style={GlobalStyles.playButton}
              onPress={() => handlePlaySong(song, index, list)}
            >
              <Ionicons 
                name={isCurrentSong && isPlaying ? "pause-circle" : "play-circle"} 
                size={36} 
                color={COLORS.primary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={GlobalStyles.addButton}
              onPress={() => handleAddToPlaylist(song)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#E2E8F0" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const formatListenCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    
    // Handle both seconds and milliseconds
    let totalSeconds = duration;
    if (duration > 10000) {
      // Likely in milliseconds, convert to seconds
      totalSeconds = Math.round(duration / 1000);
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAddToPlaylist = (song) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
  };

  const userHasAccessToSong = (song) => {
    if (purchasedSongIds.has(song.song_id)) return true;
    if (songAccessTypes[song.song_id]) return true;
    if (userIsPremium && song.is_premium === 1) return true;
    return false;
  };

  if (loading) {
    return (
      <View style={GlobalStyles.loadingContainer}>
        <Text style={GlobalStyles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={GlobalStyles.container}
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
      <View style={GlobalStyles.section}>
        <Text style={GlobalStyles.sectionTitle}>🔥 Trending</Text>
        <FlatList
          ref={flatListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={infiniteTrendingSongs}
          keyExtractor={(item, index) => `trending-${item.song_id}-${index}`}
          pagingEnabled
          snapToInterval={112 + SIZES.padding}
          decelerationRate="fast"
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          onScrollToIndexFailed={(info) => {
            console.warn('Scroll failed:', info);
             // Don't retry immediately to avoid loop
          }}
          renderItem={({ item, index }) => {
            const isCurrentSong = currentSong?.song_id === item.song_id;
            // Calculate original index to pass correct context to player
            const originalIndex = index % trendingSongs.length;
            
            return (
              <TouchableOpacity
                style={GlobalStyles.trendingItem}
                onPress={() => handlePlaySong(item, originalIndex, trendingSongs)}
              >
                <View style={GlobalStyles.trendingImageContainer}>
                  <Image
                    source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
                    style={GlobalStyles.trendingImage}
                  />
                  {isCurrentSong && isPlaying && (
                    <View style={GlobalStyles.trendingPlayingIndicator}>
                      <Ionicons name="volume-high" size={28} color="#FFF" />
                    </View>
                  )}
                </View>
                <Text style={GlobalStyles.trendingTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={GlobalStyles.trendingArtist} numberOfLines={1}>
                  {item.artist_name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* New Albums */}
      <View style={GlobalStyles.section}>
        <View style={GlobalStyles.sectionHeader}>
          <Ionicons name="albums" size={24} color={COLORS.primary} />
          <Text style={GlobalStyles.sectionTitle}>Album mới</Text>
        </View>
        <FlatList
          ref={albumCarouselRef}
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          data={infiniteAlbums}
          keyExtractor={(item, index) => `album-${item.album_id}-${index}`}
          pagingEnabled
          snapToInterval={112 + SIZES.padding}
          decelerationRate="fast"
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          onScrollToIndexFailed={(info) => {
             console.warn('Album scroll failed:', info);
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={GlobalStyles.trendingItem}
              onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
            >
              <View style={GlobalStyles.trendingImageContainer}>
                <Image
                  source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
                  style={GlobalStyles.trendingImage}
                />
                {item.is_premium === 1 && (
                  <View style={GlobalStyles.albumPremiumBadge}>
                    <PremiumBadge small />
                  </View>
                )}
              </View>
              <Text style={GlobalStyles.trendingTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={GlobalStyles.trendingArtist} numberOfLines={1}>
                {item.artist_name || 'Unknown Artist'}
              </Text>
              {item.song_count !== undefined && (
                <View style={GlobalStyles.albumSongCount}>
                  <Ionicons name="musical-notes" size={12} color={COLORS.textMuted} />
                  <Text style={GlobalStyles.albumSongCountText}>
                    {item.song_count} bài hát
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Recent Songs */}
      <View style={GlobalStyles.section}>
        <Text style={GlobalStyles.sectionTitle}>Mới nhất</Text>
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

const styles = StyleSheet.create({});

export default HomeScreen;
