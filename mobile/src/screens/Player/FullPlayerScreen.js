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
  SafeAreaView,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayer, usePlayerProgress } from '../../context/PlayerContext';
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
  const { currentSong, isPlaying, togglePlayPause, playNext, playPrevious, seekTo, currentPlaylist, playlist, currentIndex, playSong, refreshCurrentSong, isRepeat, toggleRepeat, isShuffle, toggleShuffle } = usePlayer();
  const { position, duration } = usePlayerProgress();
  const [showLyrics, setShowLyrics] = useState(false);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [nextSongs, setNextSongs] = useState([]);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [activeQueueTab, setActiveQueueTab] = useState('queue'); // 'queue' or 'related'
  const [loadingNextSongs, setLoadingNextSongs] = useState(false);
  const [loadingRelatedSongs, setLoadingRelatedSongs] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isPlayingAlbum, setIsPlayingAlbum] = useState(false);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const nextSongsRequestIdRef = React.useRef(0);

  const coverScale = new Animated.Value(1);

  useEffect(() => {
    // Animate cover when playing
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(coverScale, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(coverScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => task.cancel();
  }, []);

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
        if (res.data && res.data.length > 0) {
           // Merge and deduplicate
           const existingIds = new Set(songs.map(s => s.song_id));
           const artistSongs = res.data.filter(s => !existingIds.has(s.song_id));
           songs = [...songs, ...artistSongs];
        }
      }

      // 3. Fallback/Fill to ensure 5 songs
      if (songs.length < 5) {
        const fillCount = 5 - songs.length;
        const res = await songService.getRecommendedSongs(10); // Fetch more to filter safely
        const recSongs = res.data || [];
        
        // Merge and deduplicate
        const existingIds = new Set(songs.map(s => s.song_id));
        existingIds.add(currentSong.song_id);
        
        for (const s of recSongs) {
           if (songs.length >= 5) break; 
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
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundSecondary, COLORS.surface]}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
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
            <Animated.View style={[styles.coverWrapper, { transform: [{ scale: isPlaying ? coverScale : 1 }] }]}>
              <Image
                source={{ uri: currentSong.cover_url || 'https://via.placeholder.com/300' }}
                style={styles.cover}
              />
            </Animated.View>
          </View>

          {/* Song Info */}
          <View style={styles.songInfo}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8}}>
              <Text style={styles.songTitle} numberOfLines={2}>
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
                if (currentSong.artist_id) {
                  navigation.navigate('ArtistDetail', { artistId: currentSong.artist_id });
                }
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
                  if (currentSong.genre_id) {
                    navigation.navigate('GenreDetail', { genreId: currentSong.genre_id });
                  }
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
                    navigation.navigate('AlbumDetail', { albumId: currentSong.album_id });
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
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={(duration > 0 ? duration : (currentSong?.duration > 10000 ? currentSong.duration : (currentSong?.duration * 1000 || 0))) || 100}
              // Use position if not being dragged, otherwise rely on internal slider logic or update via local state if strictly controlled
              // But standard Slider handles internal thumb well if value updates are paused.
              // Better approach:
              value={position}
              onValueChange={(val) => {
                 // Optional: Set a flag to stop position updates? 
                 // For now, simpler usage:
                 // The Context 'position' updates every second.
                 // While dragging, the user might fight play updates. 
                 // But since 'seekTo' effectively commits, we just need onSlidingComplete.
              }}
              onSlidingComplete={seekTo}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.player.progressBackground}
              thumbTintColor={COLORS.primary}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
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
                color={isShuffle ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={36} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                style={styles.playButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={40}
                  color={COLORS.white}
                />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={36} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleRepeat} style={styles.controlButton}>
              <Ionicons
                name={isRepeat ? 'repeat' : 'repeat-outline'}
                size={24}
                color={isRepeat ? COLORS.primary : COLORS.textSecondary}
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
                color={showComments ? COLORS.primary : COLORS.text} 
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
                color={showLyrics ? COLORS.primary : COLORS.text} 
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
                    colors={[COLORS.primary, '#9F1239']}
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
                    colors={[COLORS.primary, '#9F1239']}
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
              (activeQueueTab === 'queue' ? nextSongs : relatedSongs).map((song) => {
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
                    key={song.song_id}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: 60,
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
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  playButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 30,
    padding: 2,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
    width: '70%', // Compact width
    maxWidth: 300,
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
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
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
});

export default FullPlayerScreen;

