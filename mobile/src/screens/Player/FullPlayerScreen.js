import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  InteractionManager,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayer, usePlayerProgress } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { COLORS, SIZES } from '../../config/theme';
import { formatTime } from '../../utils/formatTime';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import CommentSection from '../../components/Player/CommentSection';
import SuccessModal from '../../components/Common/SuccessModal';
import ReportModal from '../../components/Common/ReportModal';
import { songService } from '../../services/songService';
import { favoriteService } from '../../services/favoriteService';
import PremiumBadge from '../../components/Common/PremiumBadge';

const { width, height } = Dimensions.get('window');

const FullPlayerScreen = ({ navigation, route }) => {
  const { user, updateUser } = useAuth();
  const { 
    currentSong, isPlaying, togglePlayPause, playNext, playPrevious, seekTo, 
    currentPlaylist, playlist, currentIndex, playSong, refreshCurrentSong, 
    isRepeat, toggleRepeat, isShuffle, toggleShuffle,
    startSleepTimer, cancelSleepTimer, sleepTimerTarget,
    isInfinitePlay, enableInfinitePlay
  } = usePlayer();
  const { position, duration } = usePlayerProgress();
  const insets = useSafeAreaInsets();
  
  // Calculate premium status
  const isUserPremiumSub = user?.is_premium == 1; 
  const isArtistMember = user?.is_membership == 1;
  const isPremiumSong = currentSong?.is_premium == 1 || currentSong?.album_is_premium == 1;
  
  const isPremiumContent = isUserPremiumSub || isArtistMember || isPremiumSong;

  // Refresh user profile if we have a user but status might be stale
  useEffect(() => {
    if (user && user.is_premium != 1) {
      const refreshProfile = async () => {
        try {
          const response = await userService.getProfile();
          if (response.success && response.data) {
            if (response.data.is_premium != user.is_premium) {
              updateUser(response.data);
            }
          }
        } catch (error) {
          // Silent fail
        }
      };
      refreshProfile();
    }
  }, [user?.user_id]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [nextSongs, setNextSongs] = useState([]);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [activeQueueTab, setActiveQueueTab] = useState('queue'); // 'queue' or 'related'
  const [loadingNextSongs, setLoadingNextSongs] = useState(false);
  const [loadingRelatedSongs, setLoadingRelatedSongs] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingValue, setSeekingValue] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [isPlayingAlbum, setIsPlayingAlbum] = useState(false);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const [sleepSliderValue, setSleepSliderValue] = useState(30); // Default 30 mins
  const nextSongsRequestIdRef = React.useRef(0);

  const coverScale = new Animated.Value(1);
  const playButtonScale = React.useRef(new Animated.Value(1)).current;
  const haloScale = React.useRef(new Animated.Value(1)).current;
  const haloOpacity = React.useRef(new Animated.Value(0)).current;
  const pulseAnimation = React.useRef(null);
  const haloAnimation = React.useRef(null);

  useEffect(() => {
    // Animate cover when playing
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(coverScale, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(coverScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(playButtonScale, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(playButtonScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      
      haloAnimation.current = Animated.loop(
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 2.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(haloOpacity, {
              toValue: 0.5,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseAnimation.current.start();
      haloAnimation.current.start();
    } else {
      if (pulseAnimation.current) pulseAnimation.current.stop();
      if (haloAnimation.current) haloAnimation.current.stop();
      
      Animated.parallel([
        Animated.timing(playButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (pulseAnimation.current) pulseAnimation.current.stop();
      if (haloAnimation.current) haloAnimation.current.stop();
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!currentSong) return;
    
    // Defer heavy data loading until transition completes to prevent stutter
    const task = InteractionManager.runAfterInteractions(() => {
      // Debounce to prevent double loading
      const timer = setTimeout(() => {
        loadNextSongs();
        loadRelatedSongs();
      }, 100);
      
      return () => clearTimeout(timer);
    });

    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.song_id, currentPlaylist?.playlist_id, playlist?.length, currentIndex, isRepeat]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      checkFavoriteStatus();
    });
    return () => task.cancel();
  }, [currentSong]);

  const loadNextSongs = async () => {
    const requestId = Date.now();
    nextSongsRequestIdRef.current = requestId;
      setLoadingNextSongs(true);
    setNextSongs([]); // ensure stale list cleared immediately
    
    try {
      let finalSongs = [];
      const needCount = 5;

      // 1. If Repeat is ON, next song is the current song itself
      if (isRepeat) {
        finalSongs = [{ ...currentSong, _isRepeatClone: true }];
        
        // Skip queue logic
      }
      // 2. Get from Queue/Playlist (Normal mode)
      else if (playlist && playlist.length > 0) {
        const currentIdx = playlist.findIndex(s => s.song_id === currentSong.song_id);
         
        if (currentIdx !== -1) {
          // Wrap-around logic: Get next songs cyclically
          // Max songs to show is 5, OR (total - 1) to avoid showing current song again in next list if playlist is small
          const maxCount = Math.min(playlist.length - 1, 5);
          
          for (let i = 1; i <= maxCount; i++) {
             const nextIndex = (currentIdx + i) % playlist.length;
             finalSongs.push(playlist[nextIndex]);
          }

          if (finalSongs.length > 0) {
             setIsPlayingPlaylist(true); 
          }
        }
      }

      // 3. Fill with Recommendation ONLY if we have NO songs in queue (e.g. playing single song from search)
      // If we are playing a playlist/album (even if it has only 1 song), we do NOT fill random stuff.
      if (finalSongs.length === 0 && (!playlist || playlist.length <= 1)) {
         // Avoid duplicates
         const existingIds = new Set(finalSongs.map(s => s.song_id));
         existingIds.add(currentSong.song_id);

         const res = await songService.getTrendingSongs(10); 
         const trending = res.data || [];
         
          for (const s of trending) {
            if (finalSongs.length >= needCount) break;
            if (!existingIds.has(s.song_id)) {
               finalSongs.push({...s, isRecommendation: true}); 
               existingIds.add(s.song_id);
            }
          }
        } else {
          // If we had something in finalSongs but less than needCount, ensure unique
          // (Though current logic for playlist doesn't fill with trending, let's be safe)
        }

      if (nextSongsRequestIdRef.current === requestId) {
         setNextSongs(finalSongs);
      }

    } catch (error) {
      console.error('Error loading next songs:', error);
      if (nextSongsRequestIdRef.current === requestId) {
        setNextSongs([]);
      }
    } finally {
      if (nextSongsRequestIdRef.current === requestId) {
        setLoadingNextSongs(false);
      }
    }
  };

  const loadRelatedSongs = async () => {
    if (!currentSong) return;
    setLoadingRelatedSongs(true);
    setRelatedSongs([]);
    
    try {
      let songs = [];
      // 1. Try by Genre
      if (currentSong.genre_id) {
        const res = await songService.getSongsByGenre(currentSong.genre_id);
        if (res.data && res.data.length > 0) {
          songs = res.data;
        }
      }
      
      // 2. If genre songs are few, add Artist songs
      if (songs.length < 5 && currentSong.artist_id) {
        const res = await songService.getSongsByArtist(currentSong.artist_id);
        const artistData = res.data || [];
        if (artistData.length > 0) {
           // Merge and deduplicate
           const existingIds = new Set(songs.map(s => s.song_id));
           existingIds.add(currentSong.song_id);
           
           for (const s of artistData) {
             if (songs.length >= 8) break; 
             if (!existingIds.has(s.song_id)) {
               songs.push(s);
               existingIds.add(s.song_id);
             }
           }
        }
      }

      // 3. Fallback/Fill to ensure at least 5 songs
      if (songs.length < 5) {
        const res = await songService.getRecommendedSongs(10);
        const recSongs = res.data || [];
        
        const existingIds = new Set(songs.map(s => s.song_id));
        existingIds.add(currentSong.song_id);
        
        for (const s of recSongs) {
           if (songs.length >= 10) break; 
           if (!existingIds.has(s.song_id)) {
              songs.push(s);
              existingIds.add(s.song_id);
           }
        }
      }

      // Final slice just in case
      setRelatedSongs(songs.slice(0, 5));
    } catch (error) {
      console.error('Error loading related songs:', error);
    } finally {
      setLoadingRelatedSongs(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!currentSong) return;
    
    try {
      const response = await favoriteService.checkFavorite(currentSong.song_id);
      setIsFavorite(response.data.isFavorite || false);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    if (!currentSong || loadingFavorite) return;
    
    setLoadingFavorite(true);
    try {
      if (isFavorite) {
        console.log('Removing favorite for song:', currentSong.song_id);
        await favoriteService.removeFavorite(currentSong.song_id);
        setIsFavorite(false);
        setSuccessMessage('Đã xóa khỏi yêu thích');
        setShowSuccessModal(true);
      } else {
        console.log('Adding favorite for song:', currentSong.song_id);
        await favoriteService.addFavorite(currentSong.song_id);
        setIsFavorite(true);
        setSuccessMessage('Đã thêm vào yêu thích');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setSuccessMessage('Có lỗi xảy ra. Vui lòng thử lại.');
      setShowSuccessModal(true);
    } finally {
      setLoadingFavorite(false);
    }
  };

  if (!currentSong) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.emptyText}>Đang tải...</Text>
      </View>
    );
  }

  const lyrics = currentSong.lyrics || `Lời bài hát chưa có

Bạn có thể thêm lời bài hát vào database:

UPDATE songs 
SET lyrics = 'Lời bài hát ở đây...' 
WHERE song_id = ${currentSong.song_id};`;

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundSecondary, COLORS.surface]}
        style={[styles.container, { paddingBottom: insets.bottom }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-down" size={32} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Now Playing</Text>
            <Text style={styles.headerSubtitle}>{currentSong.genre_name || 'Music'}</Text>
          </View>
          <View style={styles.moreButton} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={[
            styles.scrollContent, 
            (showLyrics || showComments) && styles.scrollContentExpanded
          ]}
          bounces={true}
          nestedScrollEnabled={true}
        >
          {/* Album Cover */}
          <View style={styles.coverContainer}>
            <Animated.View style={[
              styles.coverWrapper, 
              { transform: [{ scale: isPlaying ? coverScale : 1 }] },
              isPremiumContent && styles.premiumCoverWrapper
            ]}>
              <Image
                source={{ uri: currentSong.cover_url || 'https://via.placeholder.com/300' }}
                style={styles.cover}
              />
            </Animated.View>
          </View>

          {/* Song Info */}
          <View style={styles.songInfo}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8}}>
              <Text style={[styles.songTitle, isPremiumContent && { color: COLORS.warning }]} numberOfLines={2}>
                {currentSong.title}
              </Text>
              {currentSong.album_is_premium === 1 ? (
                <PremiumBadge text="ALBUM PRE" size="small" />
              ) : (
                currentSong.is_premium === 1 && <PremiumBadge size="small" />
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                  navigation.goBack();
                  navigation.navigate('Main', {
                    screen: 'ArtistDetail',
                    params: { artistId: currentSong.artist_id }
                  });
              }}
            >
          <View style={styles.artistRow}>
            <Text style={styles.artistName}>
              {currentSong.artist_name || 'Unknown Artist'}
            </Text>
            {currentSong.genre_name && (
              <TouchableOpacity
                style={styles.genreTag}
                onPress={() => {
                  navigation.goBack();
                  navigation.navigate('Main', {
                    screen: 'GenreDetail',
                    params: { genreId: currentSong.genre_id }
                  });
                }}
                activeOpacity={currentSong.genre_id ? 0.7 : 1}
              >
                <Ionicons name="pricetag" size={14} color={COLORS.primary} />
                <Text style={styles.genreText}>
                  {currentSong.genre_name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
            </TouchableOpacity>
            <View style={styles.songMeta}>
              <TouchableOpacity
                style={styles.metaItem}
                onPress={() => {
                  if (currentSong.album_id) {
                    navigation.goBack();
                    navigation.navigate('Main', {
                      screen: 'AlbumDetail',
                      params: { albumId: currentSong.album_id }
                    });
                  }
                }}
                activeOpacity={currentSong.album_id ? 0.7 : 1}
              >
                <Ionicons name="musical-note" size={14} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{currentSong.album_title || 'Single'}</Text>
              </TouchableOpacity>
              <View style={styles.metaItem}>
                <Ionicons name="headset" size={14} color={COLORS.textMuted} />
                <Text style={styles.metaText}>
                  {currentSong.listen_count ? currentSong.listen_count.toLocaleString('vi-VN') : '0'} lượt nghe
                </Text>
              </View>
            </View>
            {/* Rating */}
            {currentSong.average_rating != null && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {Number(currentSong.average_rating).toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>
                  ({currentSong.rating_count || 0} đánh giá)
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            {isSeeking && (
              <View 
                style={[
                  styles.seekingTooltip, 
                  { 
                    left: `${(seekingValue / (duration || 1)) * 100}%`,
                  }
                ]}
              >
                <Text style={styles.seekingTooltipText}>{formatTime(seekingValue)}</Text>
                <View style={[styles.tooltipArrow, { borderTopColor: isPremiumContent ? COLORS.warning : COLORS.primary }]} />
              </View>
            )}
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={(duration > 0 ? duration : (currentSong?.duration > 10000 ? currentSong.duration : (currentSong?.duration * 1000 || 0))) || 100}
              value={position}
              onSlidingStart={() => {
                setIsSeeking(true);
                setSeekingValue(position);
              }}
              onValueChange={(val) => {
                setSeekingValue(val);
              }}
              onSlidingComplete={(val) => {
                setIsSeeking(false);
                seekTo(val);
              }}
              minimumTrackTintColor={isPremiumContent ? COLORS.warning : COLORS.primary}
              maximumTrackTintColor={COLORS.player.progressBackground}
              thumbTintColor={isPremiumContent ? COLORS.warning : COLORS.primary}
            />
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, isSeeking && { color: isPremiumContent ? COLORS.warning : COLORS.primary, fontWeight: '700' }]}>
                {formatTime(isSeeking ? seekingValue : position)}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(duration > 0 ? duration : (currentSong?.duration > 10000 ? currentSong.duration : (currentSong?.duration * 1000 || 0)))}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.controlButton}>
              <Ionicons
                name="shuffle"
                size={24}
                color={isShuffle ? (isPremiumContent ? COLORS.warning : COLORS.primary) : COLORS.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={36} color={isPremiumContent ? COLORS.warning : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playButtonContainer}>
              <Animated.View style={[
                styles.halo,
                {
                  transform: [{ scale: haloScale }],
                  opacity: haloOpacity,
                  backgroundColor: isPremiumContent ? COLORS.warning : COLORS.primary,
                }
              ]} />
              
              <Animated.View style={{ transform: [{ scale: playButtonScale }] }}>
                <LinearGradient
                  colors={isPremiumContent ? ['#ea580c', '#fdba74', '#f97316'] : COLORS.gradient.primary}
                  style={[styles.playButtonGradient, isPremiumContent && styles.premiumPlayButton]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={isPremiumContent ? styles.shineOverlay : null} />
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={40}
                    color={isPremiumContent ? '#000' : COLORS.white}
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={36} color={isPremiumContent ? COLORS.warning : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleRepeat} style={styles.controlButton}>
              <Ionicons
                name={isRepeat ? 'repeat' : 'repeat-outline'}
                size={24}
                color={isRepeat ? (isPremiumContent ? COLORS.warning : COLORS.primary) : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              onPress={toggleFavorite} 
              style={styles.actionButton}
              disabled={loadingFavorite}
            >
              {loadingFavorite ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isFavorite ? COLORS.error : COLORS.text}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setShowComments(!showComments);
                if (!showComments) setShowLyrics(false); // Tắt lyrics khi bật comments
              }} 
              style={styles.actionButton}
            >
              <Ionicons 
                name={showComments ? 'chatbubbles' : 'chatbubbles-outline'} 
                size={26} 
                color={showComments ? (isPremiumContent ? COLORS.warning : COLORS.primary) : COLORS.text} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setShowLyrics(!showLyrics);
                if (!showLyrics) setShowComments(false); // Tắt comments khi bật lyrics
              }} 
              style={styles.actionButton}
            >
              <Ionicons 
                name={showLyrics ? 'document-text' : 'document-text-outline'} 
                size={26} 
                color={showLyrics ? (isPremiumContent ? COLORS.warning : COLORS.primary) : COLORS.text} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowSleepTimer(true)}
              style={styles.actionButton}
            >
              <Ionicons 
                name={sleepTimerTarget ? 'moon' : 'moon-outline'} 
                size={26} 
                color={sleepTimerTarget ? COLORS.warning : COLORS.text} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowAddToPlaylist(true)}
              style={styles.actionButton}
            >
              <Ionicons name="add-circle-outline" size={26} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowReportModal(true)}
              style={styles.actionButton}
            >
              <Ionicons name="flag-outline" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Lyrics */}
          {showLyrics && (
            <View style={styles.lyricsContainer}>
              <Text style={styles.lyricsTitle}>Lời bài hát</Text>
              <Text style={styles.lyricsText} selectable={true}>
                {isLyricsExpanded ? lyrics : (
                  lyrics.split('\n').length > 6 
                    ? lyrics.split('\n').slice(0, 6).join('\n') + '...' 
                    : lyrics
                )}
              </Text>
              {lyrics.split('\n').length > 6 && (
                <TouchableOpacity 
                  onPress={() => setIsLyricsExpanded(!isLyricsExpanded)}
                  style={styles.seeMoreButton}
                >
                  <Text style={styles.seeMoreText}>
                    {isLyricsExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Comments Section */}
          {showComments && (
            <CommentSection 
              songId={currentSong?.song_id} 
              onRatingUpdate={refreshCurrentSong}
            />
          )}

          {/* Up Next / Playlist & Related Tabs */}
          <View style={styles.upNextContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={styles.tabButtonWrapper}
                onPress={() => setActiveQueueTab('queue')}
                activeOpacity={0.8}
              >
                {activeQueueTab === 'queue' ? (
                  <LinearGradient
                    colors={isPremiumContent ? ['#F59E0B', '#F97316'] : ['#8B5CF6', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabButtonActiveGradient}
                  >
                    <Text style={styles.tabTextActive}>Tiếp theo</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabButton}>
                    <Text style={styles.tabText}>Tiếp theo</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.tabButtonWrapper}
                onPress={() => setActiveQueueTab('related')}
                activeOpacity={0.8}
              >
                {activeQueueTab === 'related' ? (
                  <LinearGradient
                    colors={isPremiumContent ? ['#F59E0B', '#F97316'] : ['#8B5CF6', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabButtonActiveGradient}
                  >
                    <Text style={styles.tabTextActive}>Gợi ý</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabButton}>
                    <Text style={styles.tabText}>Gợi ý</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* List Content */}
            {(activeQueueTab === 'queue' ? loadingNextSongs : loadingRelatedSongs) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Đang tải...</Text>
              </View>
            ) : (activeQueueTab === 'queue' ? nextSongs : relatedSongs).length > 0 ? (
              (activeQueueTab === 'queue' ? nextSongs : relatedSongs).map((song, index) => {
                const isFromRecommendations = activeQueueTab === 'related';
                const isAlbumSuggestion = !!song.album_id;
                const gradientColors = isAlbumSuggestion && !isFromRecommendations
                  ? ['#2B124C', '#06030E']
                  : ['#141414', '#050505'];

                const handlePress = () => {
                  if (currentSong?.song_id === song.song_id) return;

                  if (activeQueueTab === 'queue' && currentPlaylist && playlist.length > 0) {
                    const newIndex = playlist.findIndex(s => s.song_id === song.song_id);
                    if (newIndex !== -1) {
                      playSong(song, playlist, newIndex, currentPlaylist);
                      return;
                    }
                  }
                  // For related songs, plain play
                  playSong(song);
                };

                return (
                  <TouchableOpacity
                    key={`${activeQueueTab}-${song.song_id}-${index}`}
                    style={styles.nextSongWrapper}
                    activeOpacity={0.85}
                    onPress={handlePress}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.nextSongItem,
                        activeQueueTab === 'related' && styles.recommendationCard,
                      ]}
                    >
                      <Image
                        source={{ uri: song.cover_url || 'https://via.placeholder.com/40' }}
                        style={styles.nextSongImage}
                      />
                      <View style={styles.nextSongInfo}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                          <Text style={styles.nextSongTitle} numberOfLines={1}>
                            {song.title}
                          </Text>
                          {song.album_is_premium === 1 ? (
                            <PremiumBadge text="ALBUM PRE" size="small" />
                          ) : (
                            song.is_premium === 1 && <PremiumBadge size="small" />
                          )}
                        </View>
                        <Text style={styles.nextSongArtist} numberOfLines={2}>
                          <Text style={styles.nextSongArtistName}>{song.artist_name}</Text>
                          {song.album_title ? (
                            <>
                              <Text style={styles.metaSeparator}> • </Text>
                              <Text style={[
                                styles.nextSongAlbum,
                                isAlbumSuggestion && styles.nextSongAlbumHighlight
                              ]}>
                                {song.album_title}
                              </Text>
                            </>
                          ) : null}
                        </Text>
                        <View style={styles.nextSongMetaRow}>
                          <Ionicons name="time-outline" size={12} color="#BCC4E2" style={{ marginRight: 4 }} />
                          <Text style={styles.nextSongDuration}>
                            {formatTime(song.duration > 10000 ? song.duration : song.duration * 1000)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="play-circle-outline" size={28} color={COLORS.primary} />
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyNextContainer}>
                <Text style={styles.emptyNextText}>
                  {activeQueueTab === 'queue' 
                    ? 'Đã hết bài hát trong danh sách' 
                    : 'Không có gợi ý nào phù hợp'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        song={currentSong}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        song={currentSong}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Thành công"
        message={successMessage}
        icon={successMessage.includes('lỗi') ? 'alert-circle' : 'checkmark-circle'}
      />

      {/* Sleep Timer Modal */}
      <Modal
        visible={showSleepTimer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSleepTimer(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSleepTimer(false)}>
          <View style={styles.centerModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.centerModalContainer}>
                <Text style={styles.modalTitle}>
                  {sleepTimerTarget ? 'Đang hẹn giờ tắt nhạc' : (isInfinitePlay ? 'Đang phát mãi mãi' : 'Hẹn giờ tắt nhạc')}
                </Text>
                
                {sleepTimerTarget ? (
                  <View style={styles.activeTimerStatusContainer}>
                    <View style={styles.activeTimerStatusIcon}>
                      <Ionicons name="moon" size={32} color={COLORS.warning} />
                      <View style={styles.activeTimerPulse} />
                    </View>
                    <View>
                        <Text style={styles.activeTimerStatusText}>
                          Nhạc sẽ tắt lúc
                        </Text>
                        <Text style={styles.activeTimerTimeText}>
                           {new Date(sleepTimerTarget).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.activeTimerRemainingText}>
                          (Còn khoảng {Math.ceil((sleepTimerTarget - Date.now()) / 60000)} phút)
                        </Text>
                    </View>
                  </View>
                ) : isInfinitePlay ? (
                  <View style={[styles.activeTimerStatusContainer, {borderColor: COLORS.secondary, backgroundColor: 'rgba(139, 92, 246, 0.1)'}]}>
                    <View style={[styles.activeTimerStatusIcon, {backgroundColor: 'rgba(139, 92, 246, 0.2)'}]}>
                      <Ionicons name="infinite" size={32} color={COLORS.secondary} />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.activeTimerStatusText, {color: '#C4B5FD'}]}>
                          Chế độ phát mãi mãi
                        </Text>
                        <Text style={styles.activeTimerRemainingText}>
                          Nhạc sẽ không tự dừng sau 30 phút.
                        </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noTimerText}>Chưa hẹn giờ</Text>
                )}

                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderValueText}>
                    {sleepSliderValue < 60 
                      ? `${Math.floor(sleepSliderValue)} phút` 
                      : `${Math.floor(sleepSliderValue / 60)} giờ ${Math.floor(sleepSliderValue % 60)} phút`}
                  </Text>
                  
                  <Slider
                    style={styles.sleepSlider}
                    minimumValue={1}
                    maximumValue={300}
                    step={1}
                    value={sleepSliderValue}
                    onValueChange={setSleepSliderValue}
                    minimumTrackTintColor={COLORS.warning}
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor={COLORS.warning}
                  />
                  
                  <View style={styles.rulerContainer}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <View key={i} style={styles.rulerTickGroup}>
                         <View style={styles.rulerLineMajor} />
                         <Text style={styles.rulerText}>{i}h</Text>
                      </View>
                    ))}
                    {/* Absolute positioned track for minor ticks could be complex, simplifying to just major hour marks nicely spaced or using space-between with intermediate ticks */}
                  </View>
                  
                  {/* Detailed ruler with minor ticks */}
                  <View style={styles.detailedRuler}>
                     {Array.from({ length: 21 }).map((_, i) => { // 0 to 20 (every 15 mins? 5h * 4 = 20 segments)
                        const isHour = i % 4 === 0;
                        if (isHour) return null; // handled by major above, or just overlay
                        return <View key={i} style={styles.rulerLineMinor} />;
                     })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.setTimerButton}
                  onPress={() => {
                    startSleepTimer(Math.floor(sleepSliderValue));
                    setShowSleepTimer(false);
                    setSuccessMessage(sleepTimerTarget ? `Đã cập nhật hẹn giờ tắt sau ${Math.floor(sleepSliderValue)} phút` : `Đã hẹn giờ tắt sau ${Math.floor(sleepSliderValue)} phút`);
                    setShowSuccessModal(true);
                  }}
                >
                  <LinearGradient
                    colors={[COLORS.warning, '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.runTimerGradient}
                  >
                    <Text style={styles.setTimerText}>{sleepTimerTarget ? 'Cập nhật hẹn giờ' : 'Bắt đầu hẹn giờ'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {sleepTimerTarget && (
                  <TouchableOpacity
                    style={styles.cancelTimerButton}
                    onPress={() => {
                      cancelSleepTimer();
                      setShowSleepTimer(false);
                      setSuccessMessage('Đã hủy hẹn giờ tắt nhạc');
                      setShowSuccessModal(true);
                    }}
                  >
                    <Text style={styles.cancelTimerText}>Hủy hẹn giờ</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.playForeverButton,
                    isInfinitePlay && styles.playForeverButtonActive
                  ]}
                  onPress={() => {
                    if (isInfinitePlay) {
                       // If already infinite, maybe cancel it (toggle back to normal)?
                       cancelSleepTimer(); // This resets everything to default
                       setShowSleepTimer(false);
                       setSuccessMessage('Đã tắt chế độ phát mãi mãi');
                       setShowSuccessModal(true);
                    } else {
                       enableInfinitePlay();
                       setShowSleepTimer(false);
                       setSuccessMessage('Đã bật chế độ phát mãi mãi');
                       setShowSuccessModal(true);
                    }
                  }}
                >
                  <Ionicons 
                    name="infinite" 
                    size={24} 
                    color={isInfinitePlay ? COLORS.white : COLORS.textSecondary} 
                    style={{marginRight: 8}} 
                  />
                  <Text style={[
                     styles.playForeverText,
                     isInfinitePlay && { color: COLORS.white }
                  ]}>
                    {isInfinitePlay ? 'Tắt hẹn giờ' : 'Phát mãi mãi'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowSleepTimer(false)}
                >
                  <Text style={styles.closeModalText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (keep existing styles up to centerModalOverlay)
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  scrollContentExpanded: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 10,
    paddingBottom: 20,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  coverWrapper: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  premiumCoverWrapper: {
    borderColor: COLORS.warning,
    borderWidth: 2,
    shadowColor: COLORS.warning,
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 20,
  },
  cover: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  songInfo: {
    paddingHorizontal: SIZES.padding * 2,
    marginBottom: 24,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    textAlign: 'center',
    fontWeight: '500',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  genreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '20',
    gap: 4,
  },
  genreText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  ratingText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  ratingCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
  progressContainer: {
    paddingHorizontal: SIZES.padding * 2,
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  premiumPlayButton: {
    shadowColor: COLORS.warning,
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 40,
  },
  playButtonGradient: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SIZES.padding * 3,
    marginBottom: 24,
  },
  actionButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsContainer: {
    marginHorizontal: SIZES.padding * 2,
    marginTop: 24,
    marginBottom: 24,
    padding: SIZES.padding * 2,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 200,
  },
  lyricsTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  lyricsText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    lineHeight: 26,
    textAlign: 'left',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  seeMoreButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  seeMoreText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  upNextContainer: {
    paddingHorizontal: SIZES.padding,
    marginTop: 24,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 30,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'center',
    width: '80%', 
    maxWidth: 340,
  },
  tabButtonWrapper: {
    flex: 1,
  },
  tabButton: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  tabButtonActiveGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  upNextTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 12,
  },
  nextSongWrapper: {
    marginBottom: 12,
  },
  nextSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    gap: 14,
  },
  recommendationCard: {
    borderColor: 'rgba(255,255,255,0.18)',
  },
  albumSuggestionCard: {
    borderColor: 'rgba(192,132,252,0.65)',
  },
  nextSongImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 16,
  },
  nextSongInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nextSongArtistName: {
    color: '#F1F5F9',
    fontWeight: '600',
  },
  metaSeparator: {
    color: '#94A3B8',
  },
  nextSongAlbum: {
    color: '#CBD5F5',
    fontStyle: 'italic',
  },
  nextSongAlbumHighlight: {
    color: '#C084FC',
    fontWeight: '700',
  },
  nextSongTitle: {
    color: '#F8FAFC',
    fontSize: SIZES.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  nextSongArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  nextSongMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextSongDuration: {
    color: '#CBD5F5',
    fontSize: SIZES.xs,
  },
  emptyNextContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyNextText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
  },
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    height: '50%', // Upper half shine for full player button (which is larger)
    opacity: 0.5,
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E1E1E', 
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 24,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  noTimerText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  activeTimerStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 16,
  },
  activeTimerStatusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeTimerPulse: {
     position: 'absolute',
     width: '100%',
     height: '100%',
     borderRadius: 30,
     borderWidth: 2,
     borderColor: COLORS.warning,
     opacity: 0.5,
  },
  activeTimerStatusText: {
    color: '#FDE68A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeTimerTimeText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  activeTimerRemainingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  timerOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  timerOptionButton: {
    width: '30%', // Grid of 3
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  timerOptionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelTimerButton: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cancelTimerText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '700',
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  sliderValueText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sleepSlider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    display: 'none',
  },
  detailedRuler: {
    position: 'absolute',
    bottom: 22, // adjust based on slider height
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 10,
    zIndex: -1,
    opacity: 0.5,
  },
  rulerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: -10, // Pull up closer to slider
  },
  rulerTickGroup: {
    alignItems: 'center',
    width: 20,
  },
  rulerLineMajor: {
    width: 2,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  rulerLineMinor: {
    width: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rulerText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  setTimerButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  runTimerGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTimerText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  playForeverButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playForeverButtonActive: {
    backgroundColor: COLORS.secondary, // Or primary
    borderColor: COLORS.secondary,
  },
  playForeverText: {
     color: COLORS.textSecondary,
     fontSize: 16,
     fontWeight: '600',
  },
  closeModalButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  closeModalText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelTimerButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelTimerText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  // Seeking styles
  seekingTooltip: {
    position: 'absolute',
    top: -45,
    width: 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 100,
  },
  seekingTooltipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default FullPlayerScreen;
