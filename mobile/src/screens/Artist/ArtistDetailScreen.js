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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { songService } from '../../services/songService';
import { followService } from '../../services/followService';
import { usePlayer } from '../../context/PlayerContext';
import { useAlert } from '../../context/AlertContext';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { walletService } from '../../services/walletService';
import { premiumService } from '../../services/premiumService';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';

const ArtistDetailScreen = ({ route, navigation }) => {
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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedSongList, setSelectedSongList] = useState([]);
  const [songAccessTypes, setSongAccessTypes] = useState({});

  useEffect(() => {
    loadArtistData();
  }, [artistId]);

  const loadArtistData = async () => {
    setLoading(true);
    try {
      const [artistRes, albumsRes, songsRes, followRes, followerCountRes, membershipRes] = await Promise.all([
        artistService.getArtistById(artistId),
        artistService.getArtistAlbums(artistId),
        artistService.getArtistSongs(artistId),
        followService.checkFollowing(artistId).catch(() => ({ data: { is_following: false } })),
        followService.getFollowerCount(artistId).catch(() => ({ data: { follower_count: 0 } })),
        artistService.getMembershipStatus(artistId).catch(() => ({ success: false })),
      ]);
      
      const artistData = artistRes.data;
      const albumsData = albumsRes.data || [];
      const songsData = songsRes.data || [];

      setArtist(artistData);
      setAlbums(albumsData);
      setSongs(songsData);
      setIsFollowing(followRes.data?.is_following || false);
      setFollowerCount(followerCountRes.data?.follower_count || 0);
      if (membershipRes.success) {
        setMembershipStatus(membershipRes.data);
      }

      // Preload access types for this artist's premium songs (similar to SearchScreen)
      const accessTypesMap = {};
      const artistPremiumSongs = songsData.filter(s => s.is_premium === 1).slice(0, 50);

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
        showSuccess('Thành công', 'Đã bỏ theo dõi nghệ sĩ');
      } else {
        await followService.followArtist(artistId);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        showSuccess('Thành công', 'Đã theo dõi nghệ sĩ');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      showError('Lỗi', message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePlaySong = (song, index) => {
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      playSong(song, songs, index);
    }
  };

  const handleSongPress = async (song, index) => {
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
          // Show premium access modal with options
          setSelectedSong(song);
          setSelectedSongList(songs);
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
    await playSong(song, songs, index);
  };

  const handlePlayAllSongs = async () => {
    if (songs.length > 0) {
      navigation.navigate('FullPlayer');
      await playSong(songs[0], songs, 0);
    }
  };

  const handleSubscribeMembership = async () => {
    if (!membershipStatus?.membership_info?.price || membershipStatus?.membership_info?.price <= 0) {
      showWarning('Thông báo', 'Artist chưa thiết lập giá hội viên');
      return;
    }

    if (membershipStatus?.has_membership) {
      showWarning('Thông báo', 'Bạn đã có hội viên của artist này');
      return;
    }

    setMembershipLoading(true);
    try {
      // Check balance first
      const balanceRes = await walletService.getBalance();
      const balance = balanceRes.data?.balance || 0;
      const price = membershipStatus.membership_info.price;

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
  const premiumSongs = songs.filter(song => song.is_premium === 1);
  const premiumAlbums = albums.filter(album => album.is_premium === 1);

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
    <View style={styles.container}>
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
                {premiumSongs.slice(0, 5).map((song, index) => (
                  <TouchableOpacity
                    key={song.song_id}
                    style={styles.premiumSongItem}
                    onPress={() => handleSongPress(song, songs.findIndex(s => s.song_id === song.song_id))}
                  >
                    <Image
                      source={{ uri: song.cover_url || 'https://via.placeholder.com/50' }}
                      style={styles.premiumSongImage}
                    />
                    <View style={styles.premiumSongInfo}>
                      <View style={styles.premiumSongTitleRow}>
                        <Text style={styles.premiumSongTitle} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <PremiumBadge small />
                      </View>
                      {song.album_title && (
                        <Text style={styles.premiumSongAlbum} numberOfLines={1}>
                          {song.album_title}
                        </Text>
                      )}
                    </View>
                    {song.price > 0 && (
                      <Text style={styles.premiumSongPrice}>
                        {parseFloat(song.price).toLocaleString('vi-VN')}đ
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
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

      {/* Albums Section */}
      {albums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Albums</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={albums}
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

          return (
            <TouchableOpacity
              key={song.song_id}
              style={[styles.songItem, isCurrentSong && styles.songItemActive]}
              onPress={() => handleSongPress(song, index)}
            >
              <Image
                source={{ uri: song.cover_url || 'https://via.placeholder.com/50' }}
                style={styles.songImage}
              />
              <View style={styles.songInfo}>
                <View style={[styles.songTitleRow, { justifyContent: 'space-between' }]}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {song.is_premium === 1 && <PremiumBadge small />}
                    {song.is_premium === 1 && songAccessTypes[song.song_id] && (
                      <AccessBadge accessType={songAccessTypes[song.song_id]} size={16} />
                    )}
                  </View>
                </View>
                <View style={styles.songMeta}>
                  {song.album_title && (
                    <Text style={styles.songAlbum} numberOfLines={1}>
                      {song.album_title}
                    </Text>
                  )}
                </View>
                <View style={styles.songMeta}>
                  <Ionicons name="headset" size={12} color={COLORS.textMuted} />
                  <Text style={styles.listenCount}>
                    {formatListenCount(song.listen_count)}
                  </Text>
                  {song.average_rating != null && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <Ionicons name="star" size={12} color={COLORS.warning} />
                      <Text style={styles.duration}>
                        {Number(song.average_rating).toFixed(1)}
                      </Text>
                    </>
                  )}
                  <Text style={styles.metaDot}>•</Text>
                  <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.duration}>
                    {formatDuration(song.duration)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.playButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handlePlaySong(song, index);
                }}
              >
                <Ionicons
                  name={isCurrentPlaying ? 'pause' : 'play'}
                  size={24}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
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
      <MiniPlayer bottomOffset={0} />
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
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginBottom: 8,
    borderRadius: SIZES.borderRadius,
  },
  songItemActive: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
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
    marginBottom: 4,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songAlbum: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
  listenCount: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  duration: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  playButton: {
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
});

export default ArtistDetailScreen;
