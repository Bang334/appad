import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { albumService } from '../../services/albumService';
import { songService } from '../../services/songService';
import { followService } from '../../services/followService';
import { usePlayer } from '../../context/PlayerContext';
import { useAlert } from '../../context/AlertContext';
//  // Removed redundant import 

import { walletService } from '../../services/walletService';
import { premiumService } from '../../services/premiumService';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';

const ArtistDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId } = route.params;
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
  const { showSuccess, showError, showWarning } = useAlert();
  
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [newAlbums, setNewAlbums] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedSongList, setSelectedSongList] = useState([]);
  const [songAccessTypes, setSongAccessTypes] = useState({});
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistSong, setPlaylistSong] = useState(null);
  const [showMembershipConfirm, setShowMembershipConfirm] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [purchasedSongIds, setPurchasedSongIds] = useState(new Set());

  useEffect(() => {
    loadArtistData();
  }, [artistId]);

  const loadArtistData = async () => {
    setLoading(true);
    try {
      const [artistRes, albumsRes, songsRes, followRes, followerCountRes, allSongsRes, allAlbumsRes, purchasedRes, premiumStatusRes, membershipRes] = await Promise.all([
        artistService.getArtistById(artistId),
        artistService.getArtistAlbums(artistId),
        artistService.getArtistSongs(artistId),
        followService.checkFollowing(artistId).catch(() => ({ data: { is_following: false } })),
        followService.getFollowerCount(artistId).catch(() => ({ data: { follower_count: 0 } })),
        songService.getAllSongs(20, 0),
        albumService.getAllAlbums(50, 0).catch(() => ({ data: [] })),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        premiumService.checkStatus().catch(() => ({ data: { is_premium: false } })),
        artistService.getMembershipStatus(artistId).catch(() => ({ success: false })), // Moved membershipRes to the end to match new Promise.all order
      ]);
      
      const artistData = artistRes.data;
      const albumsData = albumsRes.data || [];
      const songsData = songsRes.data || [];
      const allAlbumsData = allAlbumsRes.data || []; // Get all albums data

      setArtist(artistData);
      setAlbums(albumsData);
      setSongs(songsData);
      setNewAlbums(allAlbumsData); // Set newAlbums state
      setIsFollowing(followRes.data?.is_following || false);
      setFollowerCount(followerCountRes.data?.follower_count || 0);
      if (membershipRes.success) {
        setMembershipStatus(membershipRes.data);
      }
      
      setUserIsPremium(premiumStatusRes.data?.is_premium || false);
      setPurchasedSongIds(new Set((purchasedRes.data || []).map(s => s.song_id)));

      // Preload access types for this artist's premium songs (similar to SearchScreen)
      const accessTypesMap = {};
      const artistPremiumSongs = songsData.filter(s => s.is_premium === 1 || s.album_is_premium === 1).slice(0, 50);

      const accessChecks = artistPremiumSongs.map(async (song) => {
        try {
          const accessRes = await premiumService.checkSongAccess(song.song_id);
          if (accessRes.success && accessRes.data?.hasAccess && accessRes.data?.accessType) {
            accessTypesMap[song.song_id] = accessRes.data.accessType;
          }
        } catch (error) {
          // Silent fail
        }
      });

      await Promise.all(accessChecks);
      setSongAccessTypes(accessTypesMap);
    } catch (error) {
      console.error('Error loading artist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollowArtist(artistId);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await followService.followArtist(artistId);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      showError('Lỗi', message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePlaySong = async (song, index) => {
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
        return;
      }
    }

    // Check if song is premium (single)
    if (song.is_premium === 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          setSelectedSong(song);
          setSelectedSongList(songs);
          setShowPremiumModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking song access:', error);
        return;
      }
    }

    playSong(song, songs, index);
  };

  const handleSongPress = async (song, index) => {
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
          setSelectedSong(song);
          setSelectedSongList(songs);
          setShowPremiumModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking song access:', error);
      }
    }

    navigation.navigate('FullPlayer');
    await playSong(song, songs, index);
  };

  const handleAddToPlaylist = (song) => {
    setPlaylistSong(song);
    setShowPlaylistModal(true);
  };

  const handlePlayAllSongs = async () => {
    if (songs.length > 0) {
      navigation.navigate('FullPlayer');
      await playSong(songs[0], songs, 0);
    }
  };

  const handleSubscribeMembership = () => {
    if (!membershipStatus?.membership_info?.price || membershipStatus?.membership_info?.price <= 0) {
      showWarning('Thông báo', 'Artist chưa thiết lập giá hội viên');
      return;
    }

    if (membershipStatus?.has_membership) {
      showWarning('Thông báo', 'Bạn đã có hội viên của artist này');
      return;
    }

    setShowMembershipConfirm(true);
  };

  const confirmSubscribeMembership = async () => {
    setShowMembershipConfirm(false);
    setMembershipLoading(true);
    try {
      // Check balance first
      const balanceRes = await walletService.getBalance();
      const balance = Number(balanceRes.data?.balance || 0);
      const price = Number(membershipStatus.membership_info.price || 0);

      if (balance < price) {
        showWarning('Số dư không đủ', `Bạn cần ${price.toLocaleString('vi-VN')}đ nhưng chỉ có ${balance.toLocaleString('vi-VN')}đ`);
        setMembershipLoading(false);
        return;
      }

      const durationDays = membershipStatus.membership_info.duration_days || 30;
      const response = await artistService.subscribeMembership(artistId, durationDays);

      if (response.success) {
        const data = response.data || {};
        const newBalance = data.new_balance;
        const expiryDate = data.expiry_date 
          ? new Date(data.expiry_date).toLocaleDateString('vi-VN')
          : '';
        
        let message = `Bạn đã đăng ký hội viên ${artist.name} ${durationDays} ngày với giá ${price.toLocaleString('vi-VN')}đ.`;
        if (expiryDate) {
          message += ` Hội viên sẽ hết hạn vào ${expiryDate}.`;
        }
        if (newBalance !== undefined) {
          message += ` Số dư còn lại: ${newBalance.toLocaleString('vi-VN')}đ.`;
        }
        
        showSuccess('Đăng ký hội viên thành công!', message);
        // Reload data
        await loadArtistData();
      }
    } catch (error) {
      console.error('Error subscribing membership:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký';
      showError('Lỗi', message);
    } finally {
      setMembershipLoading(false);
    }
  };

  const isPremiumSong = (song) => {
    if (!song) return false;
    
    // 1. Check direct song premium status
    if (song.is_premium == 1 || song.is_premium === true || song.is_premium == '1') return true;
    
    // 2. Check album premium status from song object (returned by JOIN in backend)
    if (song.album_is_premium == 1 || song.album_is_premium === true || song.album_is_premium == '1') return true;
    
    // 3. Backup: Manual lookup in albums list (current artist's albums)
    if (song.album_id && albums && albums.length > 0) {
      const album = albums.find(a => String(a.album_id) === String(song.album_id));
      if (album && (album.is_premium == 1 || album.is_premium === true || album.is_premium == '1')) {
        return true;
      }
    }

    // 4. Second Backup: Manual lookup in global allAlbums list if available
    if (song.album_id && newAlbums && newAlbums.length > 0) {
      const album = newAlbums.find(a => String(a.album_id) === String(song.album_id));
      if (album && (album.is_premium == 1 || album.is_premium === true || album.is_premium == '1')) {
        return true;
      }
    }
    
    return false;
  };

  const userHasAccessToSong = (song) => {
    if (membershipStatus?.has_membership) return true;
    if (userIsPremium && isPremiumSong(song)) return true;
    if (purchasedSongIds.has(song.song_id)) return true;
    if (songAccessTypes[song.song_id]) return true;
    return false;
  };

  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    
    // Handle both seconds and milliseconds
    let totalSeconds = duration;
    if (duration > 10000) {
      // Likely in milliseconds, convert to seconds
      totalSeconds = Math.floor(duration / 1000);
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatListenCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  // Filter premium content
  const premiumSongs = songs.filter(song => song.is_premium == 1 || song.album_is_premium == 1);
  const premiumAlbums = albums.filter(album => album.is_premium == 1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Không tìm thấy ca sĩ</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      {/* Header with Artist Image */}
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
            source={{ uri: artist.image_url || 'https://via.placeholder.com/200' }}
            style={styles.artistImage}
          />
          
          <Text style={styles.artistName}>{artist.name}</Text>
          
          {artist.country && (
            <View style={styles.countryContainer}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.countryText}>{artist.country}</Text>
            </View>
          )}

          {artist.bio && (
            <Text style={styles.bioText} numberOfLines={3}>
              {artist.bio}
            </Text>
          )}

          {/* Follow Button */}
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? COLORS.primary : COLORS.text} />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? "checkmark-circle" : "add-circle-outline"}
                  size={20}
                  color={isFollowing ? COLORS.primary : COLORS.text}
                />
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {/* Row 1 */}
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#8b5cf6', '#ec4899']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={20} color="#FFF" />
            </View>
            <Text style={styles.statValue}>{followerCount}</Text>
            <Text style={styles.statLabel}>Người theo dõi</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#06b6d4', '#3b82f6']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="disc" size={20} color="#FFF" />
            </View>
            <Text style={styles.statValue}>{albums.length}</Text>
            <Text style={styles.statLabel}>Album</Text>
          </LinearGradient>
        </View>
        
        {/* Row 2 */}
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#f59e0b', '#ef4444']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="musical-notes" size={20} color="#FFF" />
            </View>
            <Text style={styles.statValue}>{songs.length}</Text>
            <Text style={styles.statLabel}>Bài hát</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#10b981', '#34d399']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="headset" size={20} color="#FFF" />
            </View>
            <Text style={styles.statValue}>
              {formatListenCount(songs.reduce((sum, s) => sum + (s.listen_count || 0), 0))}
            </Text>
            <Text style={styles.statLabel}>Lượt nghe</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {songs.length > 0 && (
          <TouchableOpacity
            style={styles.playAllButton}
            onPress={handlePlayAllSongs}
          >
            <Ionicons name="play" size={20} color="#FFF" />
            <Text style={styles.playAllText}>Phát tất cả</Text>
          </TouchableOpacity>
        )}
        
        {/* Membership Button */}
        {membershipStatus?.membership_info?.price > 0 && (
          <TouchableOpacity
            style={[
              styles.membershipButton,
              membershipStatus?.has_membership && styles.membershipButtonActive
            ]}
            onPress={membershipStatus?.has_membership ? undefined : handleSubscribeMembership}
            disabled={membershipLoading || membershipStatus?.has_membership}
          >
            {membershipLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons 
                  name={membershipStatus?.has_membership ? "checkmark-circle" : "person-add"} 
                  size={20} 
                  color="#FFF" 
                />
                <Text style={styles.membershipButtonText}>
                  {membershipStatus?.has_membership 
                    ? 'Đã có hội viên' 
                    : `${(membershipStatus?.membership_info?.price || 0).toLocaleString('vi-VN')}đ`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Member Benefits Section */}
      {(premiumSongs.length > 0 || premiumAlbums.length > 0) && (
        <View style={styles.memberBenefitsSection}>
          <View style={styles.memberBenefitsHeader}>
            <View style={styles.memberBenefitsTitleContainer}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.memberBenefitsTitle}>Quyền lợi hội viên</Text>
            </View>
            <Text style={styles.memberBenefitsSubtitle}>
              Đăng ký hội viên để truy cập tất cả nội dung premium
            </Text>
          </View>

          {/* Premium Albums */}
          {premiumAlbums.length > 0 && (
            <View style={styles.premiumContentSection}>
              <Text style={styles.premiumContentTitle}>Albums Premium</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={premiumAlbums}
                keyExtractor={(item) => item.album_id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.premiumAlbumItem}
                    onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
                  >
                    <View style={styles.premiumImageContainer}>
                      <Image
                        source={{ uri: item.cover_url || 'https://via.placeholder.com/120' }}
                        style={styles.premiumAlbumImage}
                      />
                      <View style={styles.premiumBadgeOverlay}>
                        <PremiumBadge />
                      </View>
                    </View>
                    <Text style={styles.premiumAlbumTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.price > 0 && (
                      <Text style={styles.premiumPrice}>
                        {parseFloat(item.price).toLocaleString('vi-VN')}đ
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Premium Songs */}
          {premiumSongs.length > 0 && (
            <View style={styles.premiumContentSection}>
              <Text style={styles.premiumContentTitle}>Bài hát Premium</Text>
              <View style={styles.premiumSongsContainer}>
                {premiumSongs.slice(0, 5).map((song, index) => {
                  const isCurrentSong = currentSong?.song_id === song.song_id;
                  const isCurrentPlaying = isCurrentSong && isPlaying;
                  const hasAccess = userHasAccessToSong(song);
                  const showPrice = (song.is_premium == 1 || song.album_is_premium == 1) && !songAccessTypes[song.song_id] && Number(song.price) > 0;
                  const mainIndex = songs.findIndex(s => s.song_id === song.song_id);

                  const gradientColors = isCurrentSong
                    ? ['#2B124C', '#08040F']
                    : ['#161616', '#050505'];

                  return (
                    <View key={song.song_id} style={[styles.songItemWrapper, { position: 'relative', left: -20 }]}>
                      <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.songItem, isCurrentSong && styles.songItemActive]}
                      >
                        <TouchableOpacity
                          style={styles.songContent}
                          onPress={() => handleSongPress(song, mainIndex)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.coverContainer}>
                            <Image
                              source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                              style={styles.songImage}
                            />
                            {isCurrentPlaying && (
                              <View style={styles.playingIndicator}>
                                <Ionicons name="volume-high" size={20} color="#FFF" />
                              </View>
                            )}
                          </View>

                          <View style={styles.songInfo}>
                            <View style={[styles.songTitleRow, { justifyContent: 'space-between' }]}>
                              <Text style={styles.songTitle} numberOfLines={1}>
                                {song.title}
                              </Text>
                              <View style={styles.badgeContainer}>
                                {song.album_is_premium == 1 ? (
                                  <PremiumBadge text="ALBUM PRE" size="small" />
                                ) : (
                                  song.is_premium == 1 && <PremiumBadge size="small" />
                                )}
                                {hasAccess && (song.is_premium == 1 || song.album_is_premium == 1) && (
                                    <AccessBadge 
                                      accessType={
                                        membershipStatus?.has_membership ? 'membership' :
                                        userIsPremium ? 'premium' :
                                        purchasedSongIds.has(song.song_id) ? 'purchase' :
                                        songAccessTypes[song.song_id] || 'free'
                                      } 
                                      size={16} 
                                    />
                                )}
                              </View>
              </View>
                            
                            <Text style={styles.songArtist} numberOfLines={1}>
                              {song.artist_name || artist.name}
                              {song.album_title && (
                                <>
                                  <Text style={{ color: '#94A3B8' }}> • </Text>
                                  <Text style={{ color: '#CBD5F5', fontStyle: 'italic' }}>
                                    {song.album_title}
                                  </Text>
                                </>
                              )}
                            </Text>

                            <View style={[styles.songMeta, { paddingTop: 4 }]}>
                              <Ionicons name="headset" size={12} color="#94A3B8" />
                              <Text style={styles.metaText}>
                                {formatListenCount(song.listen_count)}
                              </Text>
                              {song.average_rating != null && (
                                <>
                                  <Ionicons name="star" size={12} color={COLORS.warning} />
                                  <Text style={styles.metaText}>
                                    {Number(song.average_rating).toFixed(1)}
                                  </Text>
                                </>
                              )}
                              <Ionicons name="time-outline" size={12} color="#94A3B8" />
                              <Text style={styles.metaText}>
                                {formatDuration(song.duration)}
                              </Text>
                            </View>

                            {showPrice && (
                              <View style={styles.priceRow}>
                                <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                                <Text style={styles.priceText}>
                                  {Number(song.price).toLocaleString('vi-VN')}đ
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>

                        <View style={[styles.cardActions, { paddingTop: 10 }]}>
                          <TouchableOpacity
                            style={styles.playButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handlePlaySong(song, mainIndex);
                            }}
                          >
                            <Ionicons
                              name={isCurrentPlaying ? 'pause-circle' : 'play-circle'}
                              size={36}
                              color={COLORS.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddToPlaylist(song);
                            }}
                          >
                            <Ionicons name="add-circle-outline" size={24} color="#E2E8F0" />
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </View>
                  );
                })}
                {premiumSongs.length > 5 && (
                  <Text style={styles.morePremiumText}>
                    +{premiumSongs.length - 5} bài hát premium khác
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Upcoming Albums Section */}
      {albums.filter(a => a.release_date && new Date(a.release_date) > new Date()).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.info} />
            <Text style={[styles.sectionTitle, { color: COLORS.info }]}>Album sắp ra mắt</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={albums.filter(a => a.release_date && new Date(a.release_date) > new Date())}
            keyExtractor={(item) => `upcoming-${item.album_id}`}
            renderItem={({ item }) => {
              const releaseDate = new Date(item.release_date);
              const formattedDate = releaseDate.toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
              });
              
              return (
                <TouchableOpacity
                  style={styles.upcomingAlbumItem}
                  onPress={() => {
                    const { Alert } = require('react-native');
                    const fullDate = releaseDate.toLocaleString('vi-VN', {
                      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                    });
                    Alert.alert(
                      '🎵 Sắp ra mắt',
                      `Album "${item.title}" sẽ được phát hành vào:\n\n⏰ ${fullDate}`,
                      [{ text: 'Đã hiểu' }]
                    );
                  }}
                >
                  <View style={styles.upcomingAlbumImageContainer}>
                    <Image
                      source={{ uri: item.cover_url || 'https://via.placeholder.com/120' }}
                      style={[styles.albumImage, { opacity: 0.6 }]}
                    />
                    <View style={styles.upcomingOverlay}>
                      <Ionicons name="time-outline" size={28} color="#FFF" />
                    </View>
                    {item.is_premium === 1 && (
                      <View style={styles.premiumBadgeOverlay}>
                        <PremiumBadge />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.albumTitle, { color: COLORS.textMuted }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.upcomingDateContainer}>
                    <Ionicons name="calendar-outline" size={12} color={COLORS.info} />
                    <Text style={styles.upcomingDateText}>{formattedDate}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Released Albums Section */}
      {albums.filter(a => !a.release_date || new Date(a.release_date) <= new Date()).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Albums</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={albums.filter(a => !a.release_date || new Date(a.release_date) <= new Date())}
            keyExtractor={(item) => item.album_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumItem}
                onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
              >
                <Image
                  source={{ uri: item.cover_url || 'https://via.placeholder.com/120' }}
                  style={styles.albumImage}
                />
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.albumYear}>
                  {item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* All Songs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tất cả bài hát</Text>
        {songs.map((song, index) => {
          const isCurrentSong = currentSong?.song_id === song.song_id;
          const isCurrentPlaying = isCurrentSong && isPlaying;
          const hasAccess = userHasAccessToSong(song);
          const showPrice = (song.is_premium === 1 || song.album_is_premium === 1) && !hasAccess && Number(song.price || 0) > 0;

          const gradientColors = isCurrentSong
            ? ['#2B124C', '#08040F']
            : ['#161616', '#050505'];

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
                  activeOpacity={0.8}
                >
                  <View style={styles.coverContainer}>
                    <Image
                      source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                      style={styles.songImage}
                    />
                    {isCurrentPlaying && (
                      <View style={styles.playingIndicator}>
                        <Ionicons name="volume-high" size={20} color="#FFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.songInfo}>
                    <View style={[styles.songTitleRow, { justifyContent: 'space-between' }]}>
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <View style={styles.badgeContainer}>
                        {song.album_is_premium == 1 ? (
                          <PremiumBadge text="ALBUM PRE" size="small" />
                        ) : (
                          song.is_premium == 1 && <PremiumBadge size="small" />
                        )}
                        {hasAccess && (song.is_premium == 1 || song.album_is_premium == 1) && (
                          <AccessBadge 
                            accessType={
                              membershipStatus?.has_membership ? 'membership' :
                              userIsPremium ? 'premium' :
                              purchasedSongIds.has(song.song_id) ? 'purchase' :
                              songAccessTypes[song.song_id] || 'free'
                            } 
                            size={16} 
                          />
                        )}
                      </View>
                    </View>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {song.artist_name || artist.name}
                      {song.album_title && (
                        <>
                          <Text style={{ color: '#94A3B8' }}> • </Text>
                          <Text style={{ color: '#CBD5F5', fontStyle: 'italic' }}>
                            {song.album_title}
                          </Text>
                        </>
                      )}
                    </Text>

                    <View style={[styles.songMeta, { paddingTop: 4 }]}>
                      <Ionicons name="headset" size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>
                        {formatListenCount(song.listen_count)}
                      </Text>
                      {song.average_rating != null && (
                        <>
                          <Ionicons name="star" size={12} color={COLORS.warning} />
                          <Text style={styles.metaText}>
                            {Number(song.average_rating).toFixed(1)}
                          </Text>
                        </>
                      )}
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>
                        {formatDuration(song.duration)}
                      </Text>
                    </View>
                    {showPrice && (
                      <View style={styles.priceRow}>
                        <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                        <Text style={styles.priceText}>
                          {Number(song.price).toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePlaySong(song, index);
                    }}
                  >
                    <Ionicons
                      name={isCurrentPlaying ? 'pause-circle' : 'play-circle'}
                      size={36}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddToPlaylist(song);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#E2E8F0" />
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
      <PremiumAccessModal
        visible={showPremiumModal}
        song={selectedSong}
        songList={selectedSongList}
        playSong={playSong}
        onClose={() => setShowPremiumModal(false)}
        onPurchaseSong={async () => {
          if (selectedSong) {
            try {
              await premiumService.purchaseSong(selectedSong.song_id);
              setShowPremiumModal(false);
              showSuccess('Thành công', 'Đã mua bài hát');
            } catch (error) {
              console.error('Error purchasing song:', error);
              showError('Lỗi', 'Không thể mua bài hát');
            }
          }
        }}
        onSubscribePremium={() => {
          setShowPremiumModal(false);
          navigation.navigate('Premium');
        }}
      />
      <AddToPlaylistModal
        visible={showPlaylistModal}
        song={playlistSong}
        onClose={() => {
          setShowPlaylistModal(false);
          setPlaylistSong(null);
        }}
      />

      {/* Membership Confirmation Modal */}
      <Modal
        visible={showMembershipConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMembershipConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="star" size={60} color="#FFD700" />
            <Text style={styles.confirmModalTitle}>Xác nhận đăng ký</Text>
            <Text style={styles.confirmModalSubtitle}>
              Bạn sẽ nhận được toàn bộ quyền lợi hội viên của {artist.name}
            </Text>

            <View style={styles.membershipInfoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên nghệ sĩ</Text>
                <Text style={styles.infoValue}>{artist.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời hạn</Text>
                <Text style={styles.infoValue}>{membershipStatus?.membership_info?.duration_days || 30} ngày</Text>
              </View>
              <View style={styles.infoRowLast}>
                <Text style={styles.infoLabel}>Tổng phí</Text>
                <Text style={styles.priceValue}>
                  {(membershipStatus?.membership_info?.price || 0).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setShowMembershipConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmBtn} 
                onPress={confirmSubscribeMembership}
              >
                <Text style={styles.confirmBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  artistImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  artistName: {
    fontSize: SIZES.xxxl,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  countryText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
  },
  bioText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    textAlign: 'center',
    paddingHorizontal: SIZES.padding * 2,
    lineHeight: 22,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    minWidth: 150,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followButtonText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginLeft: 8,
  },
  followingButtonText: {
    color: COLORS.primary,
  },
  statsContainer: {
    marginHorizontal: SIZES.padding,
    marginTop: -16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: SIZES.borderRadius,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: SIZES.xxl,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: SIZES.padding,
    marginTop: 20,
    gap: 12,
  },
  playAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    gap: 8,
  },
  playAllText: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  membershipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: SIZES.borderRadius,
    gap: 8,
  },
  membershipButtonActive: {
    backgroundColor: COLORS.success,
  },
  membershipButtonText: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  albumItem: {
    width: 120,
    marginLeft: SIZES.padding,
  },
  albumImage: {
    width: 120,
    height: 120,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  albumTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  albumYear: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: 8,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    gap: 12,
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: SIZES.md,
    fontWeight: '700',
    minWidth: 100,
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'ralative',
    top: -10,
    right: -10,
  },
  premiumBadge: {
    marginLeft: 6,
  },
  songArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  songAlbumText: {
    color: '#CBD5F5',
    fontStyle: 'italic',
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
    marginHorizontal: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  priceText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  playButton: {
    padding: 4,
  },
  addButton: {
    padding: 8,
  },
  emptySection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  memberBenefitsSection: {
    marginTop: 24,
    marginHorizontal: SIZES.padding,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
  },
  memberBenefitsHeader: {
    marginBottom: 16,
  },
  memberBenefitsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  memberBenefitsTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  memberBenefitsSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  premiumContentSection: {
    marginTop: 16,
  },
  premiumContentTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  premiumAlbumItem: {
    width: 140,
    marginLeft: SIZES.padding,
  },
  premiumImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  premiumAlbumImage: {
    width: 140,
    height: 140,
    borderRadius: SIZES.borderRadius,
  },
  premiumBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 20,
  },
  premiumAlbumTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
    marginBottom: 4,
  },
  premiumPrice: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  premiumSongsContainer: {
    minWidth: 360,
    gap: 8,
  },
  premiumSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: SIZES.borderRadius,
    gap: 12,
  },
  premiumSongImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  premiumSongInfo: {
    flex: 1,
  },
  premiumSongTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  premiumSongTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  premiumSongAlbum: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  premiumSongPrice: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  morePremiumText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  // Upcoming Albums Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  upcomingAlbumItem: {
    width: 120,
    marginRight: 12,
  },
  upcomingAlbumImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  upcomingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  upcomingDateText: {
    color: COLORS.info,
    fontSize: 11,
    fontWeight: '600',
  },
  // Membership Confirm Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)', // Subtle gold border
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  membershipInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  priceValue: {
    color: '#FFD700', // Gold color for price
    fontSize: 20,
    fontWeight: 'bold',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ArtistDetailScreen;

