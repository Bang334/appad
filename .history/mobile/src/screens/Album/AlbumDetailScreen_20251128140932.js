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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '../../config/theme';
import { songService } from '../../services/songService';
import { albumService } from '../../services/albumService';
import { premiumService } from '../../services/premiumService';
import { usePlayer } from '../../context/PlayerContext';
import MiniPlayer from '../../components/Player/MiniPlayer';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import AlbumPurchaseModal from '../../components/Common/AlbumPurchaseModal';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';

import { API_BASE_URL } from '../../config/api';

const AlbumDetailScreen = ({ route, navigation }) => {
  const { albumId } = route.params;
  const { playSong, currentSong, isPlaying, togglePlayPause, playlist, currentIndex, moveSongInPlaylist } = usePlayer();
  
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  
  // Premium states
  const [isPremium, setIsPremium] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [userPremiumStatus, setUserPremiumStatus] = useState(false);
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
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const handlePlaySong = (song, index) => {
    // If clicking on currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      // Play new song and navigate to FullPlayer
      playSong(song, songs, index);
      navigation.navigate('FullPlayer');
    }
  };

  const handleSongPress = async (song, index) => {
    // Check premium/purchase status
    if (song.is_premium === 1) {
      const isSongPurchased = purchasedSongIds.has(song.song_id);
      
      // If user is not premium, hasn't purchased the album, and hasn't purchased the song
      if (!userPremiumStatus && !isPurchased && !isSongPurchased) {
        // Show purchase modal for album
        setShowPurchaseModal(true);
        return;
      }
    }

    // Always open FullPlayer first for faster UX
    navigation.navigate('FullPlayer');

    // Play song if different from current
    if (currentSong?.song_id !== song.song_id) {
      await playSong(song, songs, index);
      // Save flag to localStorage that we're playing from album
      await AsyncStorage.setItem('isPlayingAlbum', '1');
      await AsyncStorage.setItem('currentAlbumId', albumId.toString());
    }
  };

  const handlePlayAll = async () => {
    if (songs.length > 0) {
      // Check access for the first song (assuming all songs in album have same access rules if album is premium)
      // Or check album premium status directly
      if (isPremium && !userPremiumStatus && !isPurchased) {
        // Check if user purchased ALL songs individually? 
        // For simplicity, if album is premium and not purchased, we require purchase unless user has purchased specific songs.
        // But "Play All" implies playing the whole album.
        // If user purchased some songs, we could play only those, but that's complex logic.
        // Let's stick to: if album is premium & not purchased & user not premium -> Show modal.
        
        // However, we should check if the user has purchased ALL songs.
        const allSongsPurchased = songs.every(s => purchasedSongIds.has(s.song_id));
        if (!allSongsPurchased) {
           setShowPurchaseModal(true);
           return;
        }
      }

      navigation.navigate('FullPlayer');
      await playSong(songs[0], songs, 0);
      // Save flag to localStorage that we're playing from album
      await AsyncStorage.setItem('isPlayingAlbum', '1');
      await AsyncStorage.setItem('currentAlbumId', albumId.toString());
    }
  };

  const openMenu = (song, index) => {
    setSelectedSong(song);
    setSelectedIndex(index);
    setShowMenu(true);
  };

  const closeMenu = () => {
    setShowMenu(false);
    setSelectedSong(null);
    setSelectedIndex(-1);
  };

  // Đã loại bỏ các chức năng chuyển bài hát lên đầu / chuyển đến vị trí trong playlist.

  const handleAddToPlaylist = () => {
    setShowPlaylistModal(true);
    closeMenu();
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

  const hasSongAccess = (song) => {
    if (!song) return false;
    if (userPremiumStatus || isPurchased) return true;
    if (purchasedSongIds.has(song.song_id)) return true;
    return false;
  };

  const formatListenCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
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

      {/* Songs List */}
      <View style={styles.songsSection}>
        {songs.map((song, index) => {
          const isCurrentSong = currentSong?.song_id === song.song_id;
          const isSongPurchased = purchasedSongIds.has(song.song_id);
          const gradientColors = isCurrentSong ? ['#2B124C', '#08040F'] : ['#161616', '#050505'];
          const showPrice = song.is_premium === 1 && !hasSongAccess(song) && Number(song.price) > 0;

          return (
            <View key={song.song_id} style={styles.songItemWrapper}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.songItem, isCurrentSong && styles.songItemActive]}
              >
                <TouchableOpacity
                  style={styles.songContent}
                  onPress={() => handleSongPress(song, index)}
                  activeOpacity={0.85}
                >
                  <View style={styles.coverContainer}>
                    <Image
                      source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                      style={styles.songCover}
                    />
                    {isCurrentSong && isPlaying && (
                      <View style={styles.playingIndicator}>
                        <Ionicons name="volume-high" size={20} color="#FFF" />
                      </View>
                    )}
                    {!isCurrentSong && (
                      <View style={styles.songNumberOverlay}>
                        <Text style={styles.songNumberText}>{index + 1}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.songInfo}>
                    <View style={styles.songTitleRow}>
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      {song.is_premium === 1 && <PremiumBadge small />}
                      {song.is_premium === 1 && isSongPurchased && (
                        <AccessBadge accessType="purchased" size={16} />
                      )}
                    </View>

                    <Text style={styles.songArtist} numberOfLines={1}>
                      {album.artist_name || song.artist_name}
                    </Text>

                    <View style={styles.songMeta}>
                      <Ionicons name="headset" size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>{formatListenCount(song.listen_count)}</Text>
                      {song.average_rating != null && (
                        <>
                          <Text style={styles.metaSeparator}>•</Text>
                          <Ionicons name="star" size={12} color={COLORS.warning} />
                          <Text style={styles.metaText}>
                            {Number(song.average_rating).toFixed(1)}
                          </Text>
                        </>
                      )}
                      {song.duration > 0 && (
                        <>
                          <Text style={styles.metaSeparator}>•</Text>
                          <Ionicons name="time-outline" size={12} color="#94A3B8" />
                          <Text style={styles.metaText}>{formatDuration(song.duration)}</Text>
                        </>
                      )}
                    </View>

                    {showPrice && (
                      <View style={styles.priceRow}>
                        <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                        <Text style={styles.songPriceText}>
                          {parseFloat(song.price).toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.songActions}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlaySong(song, index)}
                  >
                    <Ionicons
                      name={isCurrentSong && isPlaying ? 'pause-circle' : 'play-circle'}
                      size={34}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.songMoreButton}
                    onPress={() => openMenu(song, index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          );
        })}

        {songs.length === 0 && (
          <View style={styles.emptySection}>
            <Ionicons name="musical-notes-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          </View>
        )}
      </View>
      </ScrollView>
      <MiniPlayer bottomOffset={0} />

      {/* Song Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {selectedSong?.title}
            </Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAddToPlaylist}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Thêm vào playlist</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={closeMenu}
            >
              <Text style={styles.menuItemCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        song={selectedSong}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
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
  songsSection: {
    marginTop: 24,
    paddingHorizontal: SIZES.padding,
    gap: 10,
  },
  songItemWrapper: {
    borderRadius: SIZES.borderRadius,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    gap: 12,
  },
  songItemActive: {
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
  songCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background,
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
  songInfo: {
    flex: 1,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    color: '#CBD5F5',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  metaSeparator: {
    color: '#94A3B8',
    fontSize: SIZES.xs,
  },
  songPriceText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playButton: {
    padding: 4,
  },
  songMoreButton: {
    padding: 6,
  },
  emptySection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  menuTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
    gap: 12,
  },
  menuItemText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItemCancel: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    justifyContent: 'center',
  },
  menuItemCancelText: {
    fontSize: SIZES.md,
    color: COLORS.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  moveModalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  moveModalTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  moveModalSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  moveInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: SIZES.lg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    textAlign: 'center',
  },
  moveModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  moveModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  moveModalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moveModalButtonCancelText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  moveModalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  moveModalButtonConfirmText: {
    fontSize: SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
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

