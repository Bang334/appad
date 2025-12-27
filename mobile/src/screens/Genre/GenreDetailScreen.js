import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../../config/theme';
import { songService } from '../../services/songService';
import { genreService } from '../../services/genreService';
import { usePlayer } from '../../context/PlayerContext';
import { useAlert } from '../../context/AlertContext';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import { premiumService } from '../../services/premiumService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { LinearGradient } from 'expo-linear-gradient';

const GenreDetailScreen = ({ route, navigation }) => {
  const { genreId } = route.params;
  const [genre, setGenre] = useState(null);
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [randomSongCover, setRandomSongCover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasedSongIds, setPurchasedSongIds] = useState(new Set());
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [songAccessTypes, setSongAccessTypes] = useState({});
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [premiumFilter, setPremiumFilter] = useState('all'); // 'all', 'premium', 'free'
  const [sortBy, setSortBy] = useState('title'); // 'title', 'popular', 'recent'
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedSongList, setSelectedSongList] = useState([]);

  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
  const { showError } = useAlert();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [genreId])
  );

  const loadData = async () => {
    try {
      const [genreRes, songsRes, purchased, premiumStatus] = await Promise.all([
        genreService.getGenreById(genreId).catch(() => ({ data: null })),
        songService.getSongsByGenre(genreId).catch(() => ({ data: [] })),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        premiumService.checkStatus().catch(() => ({ data: { is_premium: false } })),
      ]);

      setGenre(genreRes.data || null);
      const songsData = songsRes.data || [];
      setSongs(songsData);
      setFilteredSongs(songsData);

      // Lấy ngẫu nhiên một bài hát làm avatar
      if (songsData.length > 0) {
        const randomIndex = Math.floor(Math.random() * songsData.length);
        const randomSong = songsData[randomIndex];
        setRandomSongCover(randomSong.cover_url || null);
      } else {
        setRandomSongCover(null);
      }

      const purchasedIds = new Set((purchased.data || []).map(song => song.song_id));
      setPurchasedSongIds(purchasedIds);
      setUserIsPremium(premiumStatus.data?.is_premium || false);
    } catch (error) {
      console.error('Error loading genre data:', error);
      showError('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlaySong = (song, index) => {
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      playSong(song, filteredSongs, index);
    }
  };

  const handleSongPress = async (song, index) => {
    // If clicking on currently playing song, navigate to FullPlayer
    if (currentSong?.song_id === song.song_id) {
      navigation.navigate('FullPlayer');
      return;
    }

    // Check access for premium songs
    if (song.is_premium === 1 || song.album_is_premium === 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          setSelectedSong(song);
          setSelectedSongList(filteredSongs);
          setShowPremiumModal(true);
          return;
        }
        // Update access type cache
        if (response.success && response.data?.accessType) {
          setSongAccessTypes(prev => ({
            ...prev,
            [song.song_id]: response.data.accessType
          }));
        }
      } catch (error) {
        console.error('Error checking song access:', error);
      }
    }

    navigation.navigate('FullPlayer');
    await playSong(song, filteredSongs, index);
  };

  const handlePlayAll = async () => {
    if (filteredSongs.length > 0) {
      navigation.navigate('FullPlayer');
      // Đảm bảo playlist được set đúng để tự động chuyển bài
      await playSong(filteredSongs[0], filteredSongs, 0);
    }
  };

  // Filter and sort songs
  useEffect(() => {
    let filtered = [...songs];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        song =>
          song.title?.toLowerCase().includes(query) ||
          song.artist_name?.toLowerCase().includes(query) ||
          song.album_title?.toLowerCase().includes(query)
      );
    }

    // Apply premium filter
    if (premiumFilter === 'premium') {
      filtered = filtered.filter(song => song.is_premium === 1);
    } else if (premiumFilter === 'free') {
      filtered = filtered.filter(song => song.is_premium === 0 || !song.is_premium);
    }

    // Apply sorting
    if (sortBy === 'title') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.listen_count || 0) - (a.listen_count || 0));
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
    }

    setFilteredSongs(filtered);
  }, [searchQuery, premiumFilter, sortBy, songs]);

  const formatListenCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const renderSongItem = ({ item, index }) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;
    const isPurchased = purchasedSongIds.has(item.song_id);
    const showPrice = item.is_premium === 1 && !isPurchased && !userIsPremium && Number(item.price) > 0;

    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];

    return (
      <View style={styles.songItemWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.songItem, isCurrentSong && styles.songItemActive]}
        >
          <TouchableOpacity
            style={styles.songContent}
            onPress={() => handleSongPress(item, index)}
            activeOpacity={0.85}
          >
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songCover}
              />
              {isCurrentPlaying && (
                <View style={styles.playingIndicator}>
                  <Ionicons name="volume-high" size={18} color="#FFF" />
                </View>
              )}
            </View>

            <View style={styles.songInfo}>
              <View style={styles.songTitleRow}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.album_is_premium === 1 ? (
                  <PremiumBadge text="ALBUM PRE" size="small" style={styles.premiumBadge} />
                ) : (
                  item.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />
                )}
                {(item.album_is_premium === 1 || item.is_premium === 1) && songAccessTypes[item.song_id] && (
                  <AccessBadge accessType={songAccessTypes[item.song_id]} size={16} />
                )}
              </View>
              <Text style={styles.songArtist} numberOfLines={1}>
                {item.artist_name}
              </Text>
              <View style={styles.songStats}>
                <Ionicons name="headset" size={12} color="#94A3B8" />
                <Text style={styles.metaText}>
                  {formatListenCount(item.listen_count)}
                </Text>
                {item.average_rating != null && (
                  <>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Ionicons name="star" size={12} color={COLORS.warning} />
                    <Text style={styles.metaText}>
                      {Number(item.average_rating).toFixed(1)}
                    </Text>
                  </>
                )}
              </View>
              {showPrice && (
                <View style={styles.priceRow}>
                  <Ionicons name="cash-outline" size={12} color={COLORS.warning} />
                  <Text style={styles.priceText}>
                    {Number(item.price).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => handlePlaySong(item, index)}
            >
              <Ionicons
                name={isCurrentPlaying ? 'pause-circle' : 'play-circle'}
                size={32}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {randomSongCover ? (
            <Image
              source={{ uri: randomSongCover }}
              style={styles.genreAvatar}
            />
          ) : (
            <View style={styles.genreIconContainer}>
              <Ionicons name="albums" size={32} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.headerText}>
            <View style={styles.genreNameRow}>
              <Text style={styles.genreName}>{genre?.name || 'Thể loại'}</Text>
              {genre?.description && (
                <>
                  <Text style={styles.genreSeparator}> • </Text>
                  <Text style={styles.genreDescription}>{genre.description}</Text>
              </>
              )}
            </View>
            <Text style={styles.songCount}>{filteredSongs.length} bài hát</Text>
          </View>
        </View>
      </View>

      {/* Play All Button */}
      {filteredSongs.length > 0 && (
        <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
          <Ionicons name="play-circle" size={24} color={COLORS.text} />
          <Text style={styles.playAllText}>Phát tất cả</Text>
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bài hát..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Lọc:</Text>
          <TouchableOpacity
            style={[styles.filterButton, premiumFilter === 'all' && styles.activeFilter]}
            onPress={() => setPremiumFilter('all')}
          >
            <Text style={[styles.filterText, premiumFilter === 'all' && styles.activeFilterText]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, premiumFilter === 'premium' && styles.activeFilter]}
            onPress={() => setPremiumFilter('premium')}
          >
            <Text style={[styles.filterText, premiumFilter === 'premium' && styles.activeFilterText]}>
              Premium
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, premiumFilter === 'free' && styles.activeFilter]}
            onPress={() => setPremiumFilter('free')}
          >
            <Text style={[styles.filterText, premiumFilter === 'free' && styles.activeFilterText]}>
              Miễn phí
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Sắp xếp:</Text>
          <TouchableOpacity
            style={[styles.filterButton, sortBy === 'title' && styles.activeFilter]}
            onPress={() => setSortBy('title')}
          >
            <Text style={[styles.filterText, sortBy === 'title' && styles.activeFilterText]}>
              Tên A-Z
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, sortBy === 'popular' && styles.activeFilter]}
            onPress={() => setSortBy('popular')}
          >
            <Text style={[styles.filterText, sortBy === 'popular' && styles.activeFilterText]}>
              Phổ biến
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, sortBy === 'recent' && styles.activeFilter]}
            onPress={() => setSortBy('recent')}
          >
            <Text style={[styles.filterText, sortBy === 'recent' && styles.activeFilterText]}>
              Mới nhất
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Songs List */}
      <FlatList
        data={filteredSongs}
        renderItem={renderSongItem}
        keyExtractor={item => item.song_id.toString()}
        contentContainerStyle={styles.songsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={80} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          </View>
        }
      />

      <PremiumAccessModal
        visible={showPremiumModal}
        song={selectedSong}
        onClose={() => setShowPremiumModal(false)}
        onPurchaseSong={async () => {
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
          navigation.navigate('PremiumTab');
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
    paddingTop: 40,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  genreAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  genreNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  genreName: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  genreSeparator: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  genreDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    fontWeight: '400',
    flex: 1,
  },
  songCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SIZES.padding,
    marginVertical: SIZES.padding,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
    gap: 8,
  },
  playAllText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.padding,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.borderRadius,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  filterContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.padding,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    minWidth: 60,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  activeFilterText: {
    color: COLORS.text,
  },
  songsList: {
    paddingBottom: 100,
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
  songCover: {
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
    gap: 8,
    marginBottom: 4,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: SIZES.md,
    fontWeight: '700',
    flex: 1,
  },
  premiumBadge: {
    marginLeft: 6,
  },
  songArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  songStats: {
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
  },
  playButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    marginTop: 16,
  },
});

export default GenreDetailScreen;

