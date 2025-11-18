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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import { formatTime } from '../../utils/formatTime';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import CommentSection from '../../components/Player/CommentSection';
import SuccessModal from '../../components/Common/SuccessModal';
import { songService } from '../../services/songService';
import { favoriteService } from '../../services/favoriteService';

const { width, height } = Dimensions.get('window');

const FullPlayerScreen = ({ navigation, route }) => {
  const { currentSong, isPlaying, togglePlayPause, playNext, playPrevious, seekTo, position, duration, currentPlaylist, playlist, currentIndex, playSong } = usePlayer();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [nextSongs, setNextSongs] = useState([]);
  const [loadingNextSongs, setLoadingNextSongs] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const coverScale = new Animated.Value(1);

  useEffect(() => {
    // Animate cover when playing
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
  }, []);

  useEffect(() => {
    loadNextSongs();
  }, [currentSong, currentPlaylist, playlist, currentIndex]);

  useEffect(() => {
    checkFavoriteStatus();
  }, [currentSong]);

  const loadNextSongs = async () => {
    setLoadingNextSongs(true);
    try {
      if (currentPlaylist && playlist.length > 0) {
        // Load next songs from current playlist
        const nextSongsFromPlaylist = playlist.slice(currentIndex + 1, currentIndex + 4);
        setNextSongs(nextSongsFromPlaylist);
      } else {
        // Load trending songs as "You might also like"
        const response = await songService.getTrendingSongs(6);
        // Filter out current song
        const filteredSongs = response.data?.filter(song => song.song_id !== currentSong?.song_id) || [];
        setNextSongs(filteredSongs.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading next songs:', error);
      setNextSongs([]);
    } finally {
      setLoadingNextSongs(false);
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
            <Text style={styles.songTitle} numberOfLines={2}>
              {currentSong.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (currentSong.artist_id) {
                  navigation.navigate('ArtistDetail', { artistId: currentSong.artist_id });
                }
              }}
            >
              <Text style={styles.artistName}>
                {currentSong.artist_name || 'Unknown Artist'}
              </Text>
            </TouchableOpacity>
            <View style={styles.songMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="musical-note" size={14} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{currentSong.album_title || 'Single'}</Text>
              </View>
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
              maximumValue={duration || 100}
              value={position}
              onSlidingComplete={seekTo}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.player.progressBackground}
              thumbTintColor={COLORS.primary}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)} style={styles.controlButton}>
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

            <TouchableOpacity onPress={() => setIsRepeat(!isRepeat)} style={styles.controlButton}>
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
          </View>

          {/* Lyrics */}
          {showLyrics && (
            <View style={styles.lyricsContainer}>
              <Text style={styles.lyricsTitle}>Lời bài hát</Text>
              <Text style={styles.lyricsText} selectable={true}>{lyrics}</Text>
            </View>
          )}

          {/* Comments Section */}
          {showComments && (
            <CommentSection songId={currentSong?.song_id} />
          )}

          {/* Up Next / Playlist */}
          <View style={styles.upNextContainer}>
            <Text style={styles.upNextTitle}>
              {currentPlaylist ? 'Tiếp theo' : 'Có thể bạn cũng thích'}
            </Text>
            {loadingNextSongs ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Đang tải...</Text>
              </View>
            ) : nextSongs.length > 0 ? (
              nextSongs.map((song, index) => (
                <TouchableOpacity 
                  key={song.song_id} 
                  style={styles.nextSongItem}
                  onPress={() => {
                    // Play the selected song
                    if (currentPlaylist && playlist.length > 0) {
                      // Play from playlist
                      const newIndex = playlist.findIndex(s => s.song_id === song.song_id);
                      if (newIndex !== -1) {
                        playSong(song, playlist, newIndex, currentPlaylist);
                      }
                    } else {
                      // Play random song
                      playSong(song);
                    }
                  }}
                >
                  <Image
                    source={{ uri: song.cover_url || 'https://via.placeholder.com/40' }}
                    style={styles.nextSongImage}
                  />
                  <View style={styles.nextSongInfo}>
                    <Text style={styles.nextSongTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.nextSongArtist} numberOfLines={1}>
                      {song.artist_name}
                    </Text>
                  </View>
                  <Ionicons name="play-circle-outline" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyNextContainer}>
                <Text style={styles.emptyNextText}>Không có bài hát nào</Text>
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
  },
  upNextContainer: {
    marginHorizontal: SIZES.padding * 2,
    marginTop: 32,
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
  nextSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  nextSongImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  nextSongInfo: {
    flex: 1,
  },
  nextSongTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  nextSongArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  emptyNextContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyNextText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
  },
});

export default FullPlayerScreen;

