import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { GlobalStyles } from '../../config/styles';
import { songService } from '../../services/songService';
import { albumService } from '../../services/albumService';
import { artistService } from '../../services/artistService';
import { premiumService } from '../../services/premiumService';
import { usePlayer } from '../../context/PlayerContext';
//  // Removed redundant import

import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import AlbumPurchaseModal from '../../components/Common/AlbumPurchaseModal';
import SongPurchaseModal from '../../components/Common/SongPurchaseModal';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';
import DraggableFlatList, { ScaleDecorator, OpacityDecorator, ShadowDecorator } from 'react-native-draggable-flatlist';

import { useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../config/api';

const AlbumDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { albumId } = route.params;
  const isFocused = useIsFocused();
  const { playSong, currentSong, isPlaying, togglePlayPause, playlist, currentIndex, moveSongInPlaylist } = usePlayer();
  
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  
  // Premium states
  const [isPremium, setIsPremium] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSongPurchaseModal, setShowSongPurchaseModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [userPremiumStatus, setUserPremiumStatus] = useState(false);
  const [hasArtistMembership, setHasArtistMembership] = useState(false);
  const [purchasedSongIds, setPurchasedSongIds] = useState(new Set());

  useEffect(() => {
    loadAlbumData();
  }, [albumId]);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${url}`;
  };

  const loadAlbumData = async () => {
    setLoading(true);
    try {
      // Load album details specifically to get price/premium info
      const response = await albumService.getAlbumById(albumId);
      
      if (response.success) {
        const albumData = response.data;
        setAlbum(albumData);
        setIsPremium(albumData.is_premium === 1);
        
        // Check user premium/purchase status
        checkAccessStatus(albumData);
      }

      // Load songs
      const songsResponse = await songService.getSongsByAlbum(albumId);
      setSongs(songsResponse.data || []);

      // Load purchased songs to check individual song access
      const purchasedSongsRes = await premiumService.getPurchasedSongs();
      if (purchasedSongsRes.success) {
        const purchasedIds = new Set(purchasedSongsRes.data.map(s => s.song_id));
        setPurchasedSongIds(purchasedIds);
      }

    } catch (error) {
      console.error('Error loading album data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccessStatus = async (albumData) => {
    try {
      // Check if user has premium subscription
      const statusRes = await premiumService.checkStatus();
      if (statusRes.success && statusRes.data.is_premium) {
        setUserPremiumStatus(true);
        return; // User has access via subscription
      }

      // Check if user purchased this album
      const purchasedRes = await premiumService.getPurchasedAlbums();
      if (purchasedRes.success) {
        const hasPurchased = purchasedRes.data.some(a => a.album_id === albumId);
        setIsPurchased(hasPurchased);
      }

      // Check if user has active artist membership
      if (albumData.artist_id) {
        const membershipRes = await artistService.getMembershipStatus(albumData.artist_id);
        if (membershipRes.success && membershipRes.data.has_membership) {
          setHasArtistMembership(true);
        }
      }
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const checkAccessAndShowModal = (song) => {
    // 1. Unreleased check
    if (album.release_date && new Date(album.release_date) > new Date()) {
        const releaseDate = new Date(album.release_date);
        const formattedDate = releaseDate.toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
        });
        Alert.alert(
            '🎵 Sắp ra mắt',
            `Album "${album.title}" sẽ được phát hành vào:\n\n⏰ ${formattedDate}`,
            [{ text: 'Đã hiểu' }]
        );
        return false;
    }

    // 2. Premium Check
    if (isPremium || (song && song.is_premium === 1)) {
        if (!hasSongAccess(song || songs[0])) {
            // Use the comprehensive PremiumAccessModal for choosing between ALL options
            if (song) {
                // Prepare song data with album info for the modal
                const modalSong = {
                    ...song,
                    album_id: albumId,
                    album_title: album.title,
                    album_price: album.price,
                    album_is_premium: album.is_premium,
                    artist_id: album.artist_id,
                    artist_name: album.artist_name
                };
                setSelectedSong(modalSong);
                setShowPremiumModal(true);
            } else {
                // If Play All is clicked and album is premium
                setShowPurchaseModal(true);
            }
            return false;
        }
    }

    return true;
  };

  const handlePlaySong = async (song, index) => {
    // If clicking on currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
      return;
    }

    // Check access first
    if (!checkAccessAndShowModal(song)) return;

    // Navigate and play
    navigation.navigate('FullPlayer');
    InteractionManager.runAfterInteractions(() => {
        playSong(song, songs, index);
        AsyncStorage.setItem('isPlayingAlbum', '1');
        AsyncStorage.setItem('currentAlbumId', albumId.toString());
    });
  };

  const handleSongPress = async (song, index) => {
    // If clicking on currently playing song, navigate to FullPlayer
    if (currentSong?.song_id === song.song_id) {
      navigation.navigate('FullPlayer');
      return;
    }

    // Check access first
    if (!checkAccessAndShowModal(song)) return;

    // Always open FullPlayer first for faster UX
    navigation.navigate('FullPlayer');

    // Play song if different from current
    if (currentSong?.song_id !== song.song_id) {
      InteractionManager.runAfterInteractions(async () => {
        await playSong(song, songs, index);
        // Save flag to localStorage that we're playing from album
        await AsyncStorage.setItem('isPlayingAlbum', '1');
        await AsyncStorage.setItem('currentAlbumId', albumId.toString());
      });
    }
  };

  const handlePlayAll = async () => {
    if (songs.length > 0) {
      // Check access for the album/songs
      if (!checkAccessAndShowModal(null)) return;

      navigation.navigate('FullPlayer');
      InteractionManager.runAfterInteractions(async () => {
        await playSong(songs[0], songs, 0);
        // Save flag to localStorage that we're playing from album
        await AsyncStorage.setItem('isPlayingAlbum', '1');
        await AsyncStorage.setItem('currentAlbumId', albumId.toString());
      });
    }
  };


  // Đã loại bỏ các chức năng chuyển bài hát lên đầu / chuyển đến vị trí trong playlist.


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

  const hasSongAccess = (song) => {
    if (!song) return false;
    if (userPremiumStatus || isPurchased || hasArtistMembership) return true;
    if (purchasedSongIds.has(song.song_id)) return true;
    return false;
  };

  const formatListenCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleUpdateSongs = (newData) => {
    setSongs(newData);
    // If the currently playing song is from this album, update the player's playlist
    // Note: this depends on how usePlayer handles playlist updates
  };

  const renderSongItem = ({ item, drag, isActive, getIndex }) => {
    const song = item;
    const index = getIndex();
    const isCurrentSong = currentSong?.song_id === song.song_id;
    const isSongPurchased = purchasedSongIds.has(song.song_id);
    const gradientColors = isCurrentSong ? ['#2B124C', '#08040F'] : ['#161616', '#050505'];
    const showPrice = song.is_premium === 1 && !hasSongAccess(song) && Number(song.price) > 0;

    return (
      <ScaleDecorator>
        <OpacityDecorator>
          <ShadowDecorator>
            <View style={[GlobalStyles.songItemWrapper, { paddingHorizontal: SIZES.padding }]}>
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
                  onPress={() => handleSongPress(song, index)}
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
                    {!isCurrentSong && (
                      <View style={styles.songNumberOverlay}>
                        <Text style={styles.songNumberText}>{index + 1}</Text>
                      </View>
                    )}
                  </View>

                  <View style={GlobalStyles.songInfo}>
                    <View style={GlobalStyles.titleRow}>
                      <Text style={GlobalStyles.songTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative', top: -10}}>
                        {isPremium ? (
                          <PremiumBadge text="ALBUM PRE" small />
                        ) : (
                          song.is_premium === 1 && <PremiumBadge small />
                        )}
                        {(isPremium || song.is_premium === 1) && (isPurchased || isSongPurchased) && (
                          <AccessBadge accessType="purchased" size={16} />
                        )}
                      </View>
                    </View>

                    <Text style={GlobalStyles.songArtist} numberOfLines={1}>
                      {album.artist_name || song.artist_name}
                    </Text>

                    <View style={[GlobalStyles.songMeta, { minWidth: 200 }]}>
                      <Ionicons name="headset" size={12} color="#94A3B8" />
                      <Text style={GlobalStyles.metaText}>{formatListenCount(song.listen_count)}</Text>
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
                          <Text style={GlobalStyles.metaText}>{formatDuration(song.duration)}</Text>
                        </>
                      )}
                    </View>

                    {showPrice && (
                      <View style={GlobalStyles.priceRow}>
                        <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                        <Text style={GlobalStyles.priceText}>
                          {parseFloat(song.price).toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={GlobalStyles.cardActions}>
                  <TouchableOpacity
                    style={GlobalStyles.playButton}
                    onPress={() => handlePlaySong(song, index)}
                  >
                    <Ionicons
                      name={isCurrentSong && isPlaying ? 'pause-circle' : 'play-circle'}
                      size={36}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={GlobalStyles.addButton}
                    onPress={() => {
                        setSelectedSong(song);
                        setShowPlaylistModal(true);
                    }}
                    activeOpacity={0.7}
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
            source={{ uri: getImageUrl(album.cover_url) || 'https://via.placeholder.com/200' }}
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


          {/* Premium/Purchase Status */}
          {isPremium && (
            <View style={styles.premiumContainer}>
              {userPremiumStatus ? (
                <View style={styles.statusBadge}>
                  <Ionicons name="star" size={16} color={COLORS.warning} />
                  <Text style={styles.statusText}>Premium Member</Text>
                </View>
              ) : isPurchased ? (
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.statusText}>Đã sở hữu</Text>
                </View>
              ) : (
                <View style={styles.purchaseContainer}>
                  <Text style={styles.priceText}>
                    {parseFloat(album.price).toLocaleString('vi-VN')}đ
                  </Text>
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => setShowPurchaseModal(true)}
                  >
                    <Text style={styles.buyButtonText}>Mua Album</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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

      <View style={{ height: 24 }} />
    </>
  );

  if (loading) {
    return (
      <View style={GlobalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={GlobalStyles.loadingText}>Đang tải...</Text>
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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <DraggableFlatList
        data={songs}
        renderItem={renderSongItem}
        keyExtractor={(item) => `album-song-${item.song_id}`}
        onDragEnd={({ data }) => handleUpdateSongs(data)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptySection}>
            <Ionicons name="musical-notes-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          </View>
        }
        contentContainerStyle={styles.scrollContent}
      />
      




      <AddToPlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        song={selectedSong}
      />

      {/* Album Purchase Modal */}
      <AlbumPurchaseModal
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        album={album}
        onSuccess={() => {
          setIsPurchased(true);
          loadAlbumData(); // Reload to update UI/songs access if needed
        }}
      />

      {/* Song Purchase Modal (Fallback/Direct) */}
      <SongPurchaseModal
        visible={showSongPurchaseModal}
        onClose={() => setShowSongPurchaseModal(false)}
        song={selectedSong}
        onSuccess={(purchasedSong) => {
          if (purchasedSong) {
            setPurchasedSongIds(prev => new Set([...prev, purchasedSong.song_id]));
          }
          loadAlbumData();
        }}
      />

      {/* Modern Multi-Choice Access Modal */}
      <PremiumAccessModal
        visible={showPremiumModal}
        song={selectedSong}
        onClose={() => setShowPremiumModal(false)}
        songList={songs}
        playSong={playSong}
        onPurchaseSong={() => {
          loadAlbumData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100, // Space for MiniPlayer
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
  songNumberOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songNumberText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  premiumContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: SIZES.md,
  },
  purchaseContainer: {
    alignItems: 'center',
    gap: 12,
  },
  priceText: {
    color: COLORS.warning,
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  buyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
});

export default AlbumDetailScreen;


