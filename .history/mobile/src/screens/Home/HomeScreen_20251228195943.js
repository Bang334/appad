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
  Dimensions,
  Platform,
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

import DraggableFlatList, { ScaleDecorator, OpacityDecorator, ShadowDecorator } from 'react-native-draggable-flatlist';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation, route }) => {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [frequentSongs, setFrequentSongs] = useState([]);
  const [recommendedSongs, setRecommendedSongs] = useState([]);
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
  const { playSong, currentSong, isPlaying, togglePlayPause, updatePlaylist } = usePlayer();
  const flatListRef = useRef(null);
  const scrollPosition = useRef(0);
  const albumCarouselRef = useRef(null);
  const albumScrollPosition = useRef(0);
  const [activeTab, setActiveTab] = useState(0); // 0: recent, 1: frequent, 2: recommended
  const [loadingFrequent, setLoadingFrequent] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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

  // Listen for refresh trigger from header button
  useEffect(() => {
    if (route.params?.shouldRefresh) {
      onRefresh();
    }
  }, [route.params?.shouldRefresh]);

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
      console.log('🔥 [HOME] Loading initial home data...');
      const [trending, recent, albums, purchased, premiumStatus] = await Promise.all([
        songService.getTrendingSongs(10),
        songService.getAllSongs(20, 0),
        albumService.getAllAlbums(10, 0).catch(() => ({ data: [] })),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        premiumService.checkStatus().catch(() => ({ data: { is_premium: false } })),
      ]);

      console.log('✅ [HOME] Initial data loaded:', {
         trending: trending.data?.length,
         recent: recent.data?.length
      });

      setTrendingSongs(trending.data || []);
      setRecentSongs(recent.data || []);
      setNewAlbums(albums.data || []);
      
      // Create Set of purchased song IDs for quick lookup
      const purchasedIds = new Set((purchased.data || []).map(song => song.song_id));
      setPurchasedSongIds(purchasedIds);
      
      // Check if user has premium
      setUserIsPremium(premiumStatus.data?.is_premium || false);

      // Check access types for premium songs (initial lists only)
      checkAccessForSongs([
        ...(trending.data || []),
        ...(recent.data || [])
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lazy load frequent songs
  const fetchFrequentSongs = async () => {
    if (frequentSongs.length > 0) return; // Already loaded
    setLoadingFrequent(true);
    try {
      console.log('🎧 [HOME] Fetching frequent songs...');
      const res = await songService.getFrequentSongs(15);
      setFrequentSongs(res.data || []);
      checkAccessForSongs(res.data || []);
      console.log('✅ [HOME] Frequent songs loaded:', res.data?.length);
    } catch (error) {
      console.error('❌ [HOME] Error fetching frequent songs:', error);
    } finally {
      setLoadingFrequent(false);
    }
  };

  // Lazy load recommended songs
  const fetchRecommendedSongs = async () => {
    if (recommendedSongs.length > 0) return; // Already loaded
    setLoadingRecommended(true);
    try {
      console.log('✨ [HOME] Fetching recommended songs...');
      const res = await songService.getRecommendedSongs(15);
      setRecommendedSongs(res.data || []);
      checkAccessForSongs(res.data || []);
      console.log('✅ [HOME] Recommended songs loaded:', res.data?.length);
    } catch (error) {
      console.error('❌ [HOME] Error fetching recommended songs:', error);
    } finally {
      setLoadingRecommended(false);
    }
  };

  // Check access for premium songs
  const checkAccessForSongs = async (songs) => {
    const premiumSongs = (songs || []).filter(s => s && (s.is_premium === 1 || s.album_is_premium === 1));
    if (premiumSongs.length === 0) return;

    const accessTypesMap = { ...songAccessTypes };
    
    const accessChecks = premiumSongs.slice(0, 20).map(async (song) => {
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
  };

  // Lazy load when tab changes
  useEffect(() => {
    if (activeTab === 1) {
      fetchFrequentSongs();
    } else if (activeTab === 2) {
      fetchRecommendedSongs();
    }
  }, [activeTab]);

  const onRefresh = async () => {
    console.log('🔄 [REFRESH] Triggered onRefresh...');
    setRefreshing(true);
    // Clear lazy-loaded data to force refresh
    setFrequentSongs([]);
    setRecommendedSongs([]);
    await loadData();
    // Re-fetch current tab if needed
    if (activeTab === 1) fetchFrequentSongs();
    if (activeTab === 2) fetchRecommendedSongs();
    setRefreshing(false);
    console.log('✅ [REFRESH] Finished refreshing');
  };

  const handlePlaySong = async (song, index, list) => {
    // If clicking on currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
      return;
    }

    // Check if song is in an unreleased album
    if (song.album_release_date && new Date(song.album_release_date) > new Date()) {
      const { Alert } = require('react-native');
      const releaseDate = new Date(song.album_release_date);
      const formattedDate = releaseDate.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      });
      Alert.alert(
        '🎵 Sắp ra mắt',
        `Bài hát "${song.title}" sẽ được phát hành vào:\n\n⏰ ${formattedDate}`,
        [{ text: 'Đã hiểu' }]
      );
      return;
    }

    // Check if song is FREE but in a PREMIUM album
    if (song.album_is_premium === 1 && song.is_premium !== 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          const { Alert } = require('react-native');
          Alert.alert(
            '🔒 Nội dung Premium',
            `Bài hát "${song.title}" thuộc album Premium.\n\nMua album để nghe!`,
            [
              { text: 'Để sau', style: 'cancel' },
              { 
                text: 'Xem Album', 
                onPress: () => navigation.navigate('AlbumDetail', { albumId: song.album_id })
              }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking song access:', error);
        return; // Don't play if we can't verify access
      }
    }

    // Check if song is premium (single)
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
        return; // Don't play if we can't verify access
      }
    }

    // Play new song (will pause current if playing)
    playSong(song, list, index);
    // Don't navigate to FullPlayer, just show MiniPlayer
  };

  const handleSongPress = async (song, index, list) => {
    // If clicking on currently playing song, navigate to FullPlayer
    if (currentSong?.song_id === song.song_id) {
      navigation.navigate('FullPlayer');
      return;
    }

    // Check if song is in an unreleased album
    if (song.album_release_date && new Date(song.album_release_date) > new Date()) {
      const { Alert } = require('react-native');
      const releaseDate = new Date(song.album_release_date);
      const formattedDate = releaseDate.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      });
      Alert.alert(
        '🎵 Sắp ra mắt',
        `Bài hát "${song.title}" thuộc album "${song.album_title}" sẽ được phát hành vào:\n\n⏰ ${formattedDate}`,
        [{ text: 'Đã hiểu' }]
      );
      return;
    }

    // Check if song is FREE but in a PREMIUM album
    if (song.album_is_premium === 1 && song.is_premium !== 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          // Redirect to album detail page to purchase
          const { Alert } = require('react-native');
          Alert.alert(
            '🔒 Nội dung Premium',
            `Bài hát "${song.title}" thuộc album Premium "${song.album_title}".\n\nMua album để nghe tất cả bài hát!`,
            [
              { text: 'Để sau', style: 'cancel' },
              { 
                text: 'Xem Album', 
                onPress: () => navigation.navigate('AlbumDetail', { albumId: song.album_id })
              }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking song access:', error);
      }
    }

    // Check access for premium songs (singles)
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

  const getListData = () => {
    if (activeTab === 0) return recentSongs;
    if (activeTab === 1) return frequentSongs;
    if (activeTab === 2) return recommendedSongs;
    return [];
  };

  const handleUpdateList = (data) => {
    if (activeTab === 0) setRecentSongs(data);
    else if (activeTab === 1) setFrequentSongs(data);
    else if (activeTab === 2) setRecommendedSongs(data);
    
    // Update player playlist if the current song is in this list
    if (currentSong && data.some(s => s.song_id === currentSong.song_id)) {
        updatePlaylist(data);
    }
  };

  const renderDraggableItem = ({ item, drag, isActive, getIndex }) => {
    const song = item;
    const index = getIndex();
    const list = getListData();
    const isCurrentSong = currentSong?.song_id === song.song_id;
    const showPrice = song.is_premium === 1 && !userHasAccessToSong(song) && Number(song.price) > 0;

    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];

    return (
      <ScaleDecorator>
        <OpacityDecorator>
          <ShadowDecorator>
            <View style={[GlobalStyles.songItemWrapper, { marginBottom: 12 }]}>
                <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    GlobalStyles.songItem, 
                    isCurrentSong && GlobalStyles.songItemActive,
                    isActive && { 
                        borderColor: COLORS.primary, 
                        borderWidth: 1,
                        backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                ]}
                >
                <TouchableOpacity
                    style={GlobalStyles.songContent}
                    onPress={() => handleSongPress(song, index, list)}
                    onLongPress={drag}
                    disabled={isActive}
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
                        {song.album_is_premium === 1 ? (
                          <PremiumBadge text="ALBUM PRE" size="small" style={GlobalStyles.premiumBadge} />
                        ) : (
                          song.is_premium === 1 && <PremiumBadge size="small" style={GlobalStyles.premiumBadge} />
                        )}
                        {(song.album_is_premium === 1 || song.is_premium === 1) && songAccessTypes[song.song_id] && (
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
          </ShadowDecorator>
        </OpacityDecorator>
      </ScaleDecorator>
    );
  };

  const renderHeader = () => (
    <>
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
             // Ignore
          }}
          renderItem={({ item, index }) => {
            const isCurrentSong = currentSong?.song_id === item.song_id;
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
          renderItem={({ item }) => {
            const isReleased = !item.release_date || new Date(item.release_date) <= new Date();
            const releaseDate = item.release_date ? new Date(item.release_date) : null;
            const formattedReleaseTime = releaseDate ? releaseDate.toLocaleString('vi-VN', {
              hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
            }) : '';

            return (
              <TouchableOpacity
                style={GlobalStyles.trendingItem}
                onPress={() => {
                   if (isReleased) {
                     navigation.navigate('AlbumDetail', { albumId: item.album_id });
                   } else {
                      const formattedDateFull = releaseDate.toLocaleString('vi-VN', {
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                      });
                      const { Alert } = require('react-native');
                      Alert.alert(
                        '🎵 Sắp ra mắt',
                        `Album "${item.title}" sẽ được phát hành vào:\n\n⏰ ${formattedDateFull}`,
                        [{ text: 'Đã hiểu', style: 'default' }]
                      );
                   }
                }}
              >
              <View style={GlobalStyles.trendingImageContainer}>
                <Image
                  source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
                  style={[GlobalStyles.trendingImage, !isReleased && { opacity: 0.6 }]}
                />
                {/* Upcoming Overlay */}
                {!isReleased && (
                  <View style={styles.upcomingOverlay}>
                    <Ionicons name="time-outline" size={24} color="#FFF" />
                    <Text style={styles.upcomingBadgeText}>SẮP RA MẮT</Text>
                  </View>
                )}
                {item.is_premium === 1 && (
                  <View style={GlobalStyles.albumPremiumBadge}>
                    <PremiumBadge small />
                  </View>
                )}
              </View>
              <Text style={[GlobalStyles.trendingTitle, !isReleased && { color: COLORS.textMuted }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={GlobalStyles.trendingArtist} numberOfLines={1}>
                {item.artist_name || 'Unknown Artist'}
              </Text>
              {/* Show release time for upcoming albums */}
              {!isReleased && formattedReleaseTime ? (
                <View style={styles.releaseTimeContainer}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.info} />
                  <Text style={styles.releaseTimeText}>{formattedReleaseTime}</Text>
                </View>
              ) : item.song_count !== undefined && (
                <View style={GlobalStyles.albumSongCount}>
                  <Ionicons name="musical-notes" size={12} color={COLORS.textMuted} />
                  <Text style={GlobalStyles.albumSongCountText}>
                    {item.song_count} bài hát
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Mới nhất', 'Nhạc tủ', 'Gợi ý'].map((title, index) => (
            <TouchableOpacity 
            key={index}
            style={[styles.tabItem, activeTab === index && styles.activeTabItem]}
            onPress={() => setActiveTab(index)}
            >
            <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                {title}
            </Text>
            {activeTab === index && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
        ))}
      </View>

      {/* Mix Card Header for Recommendations - Removed as requested */}
    </>
  );

  if (loading) {
    return (
      <View style={GlobalStyles.loadingContainer}>
        <Text style={GlobalStyles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <DraggableFlatList
        data={getListData()}
        onDragBegin={() => {
           console.log('👆 [DRAG] Started');
           setIsDragging(true);
        }}
        onDragEnd={({ data }) => {
          setIsDragging(false);
          handleUpdateList(data);
        }}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setIsAtTop(y <= 5);
        }}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        keyExtractor={(item) => `home-song-${item.song_id}`}
        renderItem={renderDraggableItem}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {activeTab === 0 && <Text style={styles.emptyText}>Chưa có bài hát mới nào.</Text>}
                {activeTab === 1 && (
                    <>
                    {loadingFrequent ? <Text style={styles.emptyText}>Đ........ang tải nhạc tủ...</Text> : 
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>Nghe nhạc nhiều hơn để có danh sách tủ nhé!</Text>
                        </View>
                    }
                    </>
                )}
                {activeTab === 2 && (
                    <>
                    {loadingRecommended ? <Text style={styles.emptyText}>Đang phân tích gu nhạc...</Text> : 
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="pulse-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>Chưa có gợi ý nào.</Text>
                        </View>
                    }
                    </>
                )}
            </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
        }
      />
      {/* Add to Playlist Modal */}.......
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
              const response = await premiumService.purchaseSong(selectedSong.song_id);
              if (response.success) {
                setShowPremiumModal(false);
                // Refresh data, but don't fail if refresh APIs have errors
                try {
                  await loadData();
                } catch (refreshError) {
                  // Log but don't show error to user - purchase was successful
                  console.warn('Warning: Some data refresh APIs failed after purchase:', refreshError);
                }
              } else {
                console.error('Purchase failed:', response.message);
              }
            } catch (error) {
              // Only log error if purchase itself failed
              if (error.response?.status !== 400 || !error.response?.data?.success) {
                console.error('Error purchasing song:', error);
              } else {
                // Purchase succeeded but some update APIs failed
                console.warn('Purchase succeeded but some update APIs failed:', error);
                setShowPremiumModal(false);
                // Still try to refresh data
                try {
                  await loadData();
                } catch (refreshError) {
                  console.warn('Warning: Data refresh failed:', refreshError);
                }
              }
            }
          }
        }}
        onSubscribePremium={() => {
          setShowPremiumModal(false);
          navigation.navigate('Premium');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SIZES.padding,
    paddingHorizontal: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
    position: 'relative',
  },
  activeTabItem: {
    // borderBottomWidth managed by indicator
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%', // Smaller indicator centered
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    opacity: 0.7,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  mixCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mixCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  mixInfo: {
    flex: 1,
  },
  mixTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  mixSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  mixNote: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  mixPreviewList: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
  },
  mixPreviewItem: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  // Upcoming Album Styles
  upcomingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  releaseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  releaseTimeText: {
    color: COLORS.info,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default HomeScreen;
