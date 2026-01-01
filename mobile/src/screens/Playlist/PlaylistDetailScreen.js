import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator, OpacityDecorator, ShadowDecorator } from 'react-native-draggable-flatlist';
import { playlistService } from '../../services/playlistService';
import { songService } from '../../services/songService';
import { premiumService } from '../../services/premiumService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import { GlobalStyles } from '../../config/styles';

import BottomSheet from '../../components/Common/BottomSheet';
import PremiumBadge from '../../components/Common/PremiumBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import SuccessModal from '../../components/Common/SuccessModal';

const formatDuration = (seconds) => {
  if (seconds == null) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatListenCount = (count) => {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const PlaylistDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { playlistId, playlistName } = route.params;
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [purchasedSongIds, setPurchasedSongIds] = useState(new Set());
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [songToPurchase, setSongToPurchase] = useState(null);
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    icon: 'checkmark-circle',
    onClose: null
  });

  const showAlert = (title, message, icon = 'checkmark-circle', callback = null) => {
    setAlertConfig({
      title,
      message,
      icon,
      onClose: callback
    });
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertConfig.onClose) {
      alertConfig.onClose();
    }
  };

  useEffect(() => {
    loadPlaylist();
  }, []);

  const loadPlaylist = async () => {
    try {
      const [playlistResponse, purchased, premiumStatus] = await Promise.all([
        playlistService.getPlaylistById(playlistId),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        premiumService.checkStatus().catch(() => ({ data: { is_premium: false } })),
      ]);
      
      setPlaylist(playlistResponse.data);
      setSongs(playlistResponse.data.songs || []);
      
      const purchasedIds = new Set((purchased.data || []).map(song => song.song_id));
      setPurchasedSongIds(purchasedIds);
      setUserIsPremium(premiumStatus.data?.is_premium || false);
    } catch (error) {
      console.error('Error loading playlist:', error);
      showAlert('Lỗi', 'Không thể tải playlist', 'alert-circle');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (song, index, options = {}) => {
    const { navigateToFullPlayer = true } = options;

    // Check access
    const isPurchased = purchasedSongIds.has(song.song_id);
    let hasAccess = !song.is_premium || isPurchased || userIsPremium;

    // If still no access, check backend for artist membership or other access types
    if (!hasAccess && song.is_premium) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (response.success && response.data?.hasAccess) {
          hasAccess = true;
        }
      } catch (error) {
        console.error('Error checking song access:', error);
      }
    }

    if (!hasAccess) {
      setSongToPurchase(song);
      setShowPremiumModal(true);
      return;
    }

    if (currentSong?.song_id === song.song_id) {
      if (navigateToFullPlayer) {
        navigation.navigate('FullPlayer');
      } else {
        togglePlayPause();
      }
      return;
    }

    playSong(song, songs, index, playlist);
    await AsyncStorage.setItem('isPlayingPlaylist', '1');
    await AsyncStorage.setItem('currentPlaylistId', playlistId.toString());

    if (navigateToFullPlayer) {
      navigation.navigate('FullPlayer');
    }
  };

  const handleRemoveSong = (songId) => {
    Alert.alert(
      'Xóa bài hát',
      'Bạn có chắc muốn xóa bài này khỏi playlist?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.removeSongFromPlaylist(playlistId, songId);
              setSongs(songs.filter(s => s.song_id !== songId));
              showAlert('Thành công', 'Đã xóa bài khỏi playlist', 'checkmark-circle');
            } catch (error) {
              showAlert('Lỗi', 'Không thể xóa bài hát', 'alert-circle');
            }
          },
        },
      ]
    );
  };

  const handlePlayAll = async () => {
    if (songs.length === 0) return;

    // Find the first song the user has access to
    let firstAccessibleIndex = -1;
    
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const isPurchased = purchasedSongIds.has(song.song_id);
      const hasAccess = !song.is_premium || isPurchased || userIsPremium;
      
      if (hasAccess) {
        firstAccessibleIndex = i;
        break;
      }
    }

    if (firstAccessibleIndex !== -1) {
      handlePlaySong(songs[firstAccessibleIndex], firstAccessibleIndex);
    } else {
      // If no songs are accessible, play the first one to trigger the purchase modal
      handlePlaySong(songs[0], 0);
    }
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      'Xóa playlist',
      `Bạn có chắc muốn xóa playlist "${playlist?.name || playlistName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.deletePlaylist(playlistId);
              showAlert('Thành công', 'Đã xóa playlist', 'checkmark-circle', () => navigation.goBack());
            } catch (error) {
              console.error('Error deleting playlist:', error);
              showAlert('Lỗi', 'Không thể xóa playlist', 'alert-circle');
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Tùy chọn',
      'Chọn hành động',
      [
        {
          text: 'Xóa playlist',
          style: 'destructive',
          onPress: handleDeletePlaylist,
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleDragEnd = async ({ data }) => {
    // Update local state immediately
    setSongs(data);
    
    // Save order to backend
    setSavingOrder(true);
    try {
      const songOrders = data.map((song, index) => ({
        song_id: song.song_id,
        order: index
      }));
      
      await playlistService.updateSongOrder(playlistId, songOrders);
    } catch (error) {
      console.error('Error updating song order:', error);
      showAlert('Lỗi', 'Không thể lưu thứ tự bài hát', 'alert-circle');
      // Reload to get correct order
      loadPlaylist();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSongLongPress = (item) => {
    setSelectedSong(item);
    setShowBottomSheet(true);
  };

  const getBottomSheetOptions = () => {
    if (!selectedSong) return [];
    
    return [
      {
        text: 'Xóa khỏi playlist',
        icon: 'trash-outline',
        style: 'destructive',
        onPress: () => handleRemoveSong(selectedSong.song_id),
      },
      {
        text: 'Hủy',
        icon: 'close-outline',
        style: 'cancel',
        onPress: () => {},
      },
    ];
  };

  const renderSongItem = ({ item, index, drag, isActive }) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];
    
    // Only show price if user doesn't have access
    const isPurchased = purchasedSongIds.has(item.song_id);
    const hasAccess = !item.is_premium || isPurchased || userIsPremium;
    const showPrice = item.is_premium === 1 && !hasAccess && Number(item.price) > 0;
    
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
                    onPress={() => handlePlaySong(item, index, { navigateToFullPlayer: true })}
                    onLongPress={drag}
                    activeOpacity={0.85}
                    disabled={isActive}
                  >
                        <View style={GlobalStyles.coverContainer}>
                            <Image
                                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
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
                                {item.title}
                            </Text>
                            {item.album_is_premium === 1 ? (
                              <PremiumBadge text="ALBUM PRE" size="small" style={GlobalStyles.premiumBadge} />
                            ) : (
                              item.is_premium === 1 && <PremiumBadge size="small" style={GlobalStyles.premiumBadge} />
                            )}
                            </View>
                            <Text style={GlobalStyles.songArtist} numberOfLines={1}>
                            {item.artist_name || 'Unknown Artist'}
                            {item.album_title ? ` • ${item.album_title}` : ''}
                            </Text>
                            <View style={GlobalStyles.songMeta}>
                            <Ionicons name="headset" size={12} color="#94A3B8" />
                            <Text style={GlobalStyles.metaText}>{formatListenCount(item.listen_count)}</Text>
                            {item.average_rating != null && (
                                <>
                                <Ionicons name="star" size={12} color={COLORS.warning} />
                                <Text style={GlobalStyles.metaText}>{Number(item.average_rating).toFixed(1)}</Text>
                                </>
                            )}
                            {item.duration > 0 && (
                                <>
                                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                <Text style={GlobalStyles.metaText}>{formatDuration(item.duration)}</Text>
                                </>
                            )}
                            </View>
                            {showPrice && (
                            <View style={GlobalStyles.priceRow}>
                                <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                                <Text style={GlobalStyles.priceText}>
                                {Number(item.price).toLocaleString('vi-VN')}đ
                                </Text>
                            </View>
                            )}
                        </View>
                  </TouchableOpacity>

                  <View style={GlobalStyles.cardActions}>
                      <TouchableOpacity
                        style={GlobalStyles.playButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePlaySong(item, index, { navigateToFullPlayer: false });
                        }}
                      >
                        <Ionicons
                          name={isCurrentSong && isPlaying ? 'pause-circle' : 'play-circle'}
                          size={36}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[GlobalStyles.addButton, { padding: 4, marginRight: 0 }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleSongLongPress(item);
                        }}
                      >
                         <Ionicons name="ellipsis-vertical" size={24} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                  </View>
                </LinearGradient>
            </View>
          </ShadowDecorator>
        </OpacityDecorator>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* Header */}
      <LinearGradient
        colors={COLORS.gradient.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.playlistName}>{playlist?.name || playlistName}</Text>
          <Text style={styles.playlistInfo}>
            {songs.length} bài hát
          </Text>
        </View>

        <TouchableOpacity style={styles.moreButton} onPress={handleMoreOptions}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Play All Button */}
      {songs.length > 0 && (
        <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
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

      {/* Songs List */}
      {songs.length > 0 ? (
        <View style={styles.songsListContainer}>
          {savingOrder && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.savingText}>Đang lưu thứ tự...</Text>
            </View>
          )}
          <DraggableFlatList
            data={songs}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.song_id.toString()}
            renderItem={renderSongItem}
            contentContainerStyle={styles.songsList}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Playlist trống</Text>
          <Text style={styles.emptySubtext}>Thêm bài hát vào playlist này</Text>
        </View>
      )}
      
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title={selectedSong?.title}
        message="Chọn hành động"
        options={getBottomSheetOptions()}
      />

      <PremiumAccessModal
        visible={showPremiumModal}
        song={songToPurchase}
        onClose={() => setShowPremiumModal(false)}
        onPurchaseSong={async () => {
          if (songToPurchase) {
            try {
              await premiumService.purchaseSong(songToPurchase.song_id);
              setShowPremiumModal(false);
              showAlert('Thành công', 'Đã mua bài hát', 'checkmark-circle');
              // Refresh purchased list
              const purchased = await premiumService.getPurchasedSongs();
              const purchasedIds = new Set((purchased.data || []).map(s => s.song_id));
              setPurchasedSongIds(purchasedIds);
            } catch (error) {
              console.error('Error purchasing song:', error);
              showAlert('Lỗi', 'Không thể mua bài hát', 'alert-circle');
            }
          }
        }}
        onSubscribePremium={() => {
          setShowPremiumModal(false);
          navigation.navigate('Premium');
        }}
      />
      
      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />

      
    </View>
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
  header: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: SIZES.padding,
  },
  backButton: {
    position: 'relative',
    top:25,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 0,
  },
  playlistName: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  playlistInfo: {
    color: COLORS.white,
    fontSize: SIZES.base,
    marginTop: 8,
    opacity: 0.9,
  },
  moreButton: {
    position: 'absolute',
    right: SIZES.padding,
    top: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllButton: {
    marginHorizontal: SIZES.padding,
    marginVertical: 16,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  playAllText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  songsListContainer: {
    flex: 1,
  },
  songsList: {
    paddingBottom: 100,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginTop: 8,
    borderRadius: SIZES.borderRadius,
  },
  savingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginVertical: 6,
    paddingRight: 8,
  },
  songCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZES.borderRadius,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  songCardActive: {
    borderColor: COLORS.primary,
  },
  dragHandle: {
    paddingRight: 5,
    justifyContent: 'center',
  },
  songContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 300,
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    marginRight: 8,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: SIZES.md,
    fontWeight: '700',
    flex: 1,
    minWidth: 100,
  },
  songArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    flexWrap: 'wrap',
  },
  songMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  songMetaText: {
    color: '#CBD5F5',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  metaSeparator: {
    color: '#94A3B8',
    fontSize: SIZES.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  songPriceText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  quickPlayButton: {
    paddingLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    marginTop: 8,
  },
});

export default PlaylistDetailScreen;


