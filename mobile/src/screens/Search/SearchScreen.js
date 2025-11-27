import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { songService } from '../../services/songService';
import { artistService } from '../../services/artistService';
import { albumService } from '../../services/albumService';
import { followService } from '../../services/followService';
import { genreService } from '../../services/genreService';
import { usePlayer } from '../../context/PlayerContext';
import { useAlert } from '../../context/AlertContext';
import { COLORS, SIZES } from '../../config/theme';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';
import { premiumService } from '../../services/premiumService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
import AddToPlaylistModal from '../../components/Playlist/AddToPlaylistModal';
import { LinearGradient } from 'expo-linear-gradient';
const ITEMS_PER_PAGE = 12;

const SearchScreen = ({ navigation }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('songs'); // 'songs', 'artists', or 'genres'
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Common
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Songs
  const [allSongs, setAllSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [premiumFilter, setPremiumFilter] = useState('all'); // 'all', 'premium', 'free'
  const [purchasedSongIds, setPurchasedSongIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedSongList, setSelectedSongList] = useState([]);
  const [songAccessTypes, setSongAccessTypes] = useState({}); // { songId: accessType }
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistSong, setPlaylistSong] = useState(null);
  
  // Artists
  const [allArtists, setAllArtists] = useState([]);
  const [filteredArtists, setFilteredArtists] = useState([]);
  const [artistSortBy, setArtistSortBy] = useState('name'); // 'name', 'popular', 'recent'
  const [followedArtists, setFollowedArtists] = useState(new Set());
  const [artistCurrentPage, setArtistCurrentPage] = useState(1);
  
  // Albums
  const [allAlbums, setAllAlbums] = useState([]);
  const [filteredAlbums, setFilteredAlbums] = useState([]);
  const [albumCurrentPage, setAlbumCurrentPage] = useState(1);
  const [albumPremiumFilter, setAlbumPremiumFilter] = useState('all'); // 'all', 'premium', 'free'
  
  // Genres
  const [genres, setGenres] = useState([]);
  const [genreAvatars, setGenreAvatars] = useState({}); // { genreId: cover_url }
  
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
  const { showSuccess, showError } = useAlert();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [songsRes, artistsRes, genresRes, albumsRes, purchased, followed, premiumStatus] = await Promise.all([
        songService.getAllSongs(100, 0),
        artistService.getArtists(),
        genreService.getAllGenresWithSongCount().catch(() => ({ data: [] })),
        albumService.getAllAlbums(50, 0).catch(() => ({ data: [] })),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        followService.getMyFollowedArtists().catch(() => ({ data: [] })),
        premiumService.checkStatus().catch(() => ({ data: { is_premium: false } })),
      ]);
      
      const songsData = songsRes.data || [];
      setAllSongs(songsData);
      setFilteredSongs(songsData);
      
      setAllArtists(artistsRes.data || []);
      setAllArtists(artistsRes.data || []);
      setFilteredArtists(artistsRes.data || []);
      
      setAllAlbums(albumsRes.data || []);
      setFilteredAlbums(albumsRes.data || []);
      
      const genresData = genresRes.data || [];
      setGenres(genresData);
      
      // Lấy ngẫu nhiên một bài hát cho mỗi genre làm avatar
      const avatars = {};
      genresData.forEach(genre => {
        const genreSongs = songsData.filter(song => song.genre_id === genre.genre_id);
        if (genreSongs.length > 0) {
          const randomIndex = Math.floor(Math.random() * genreSongs.length);
          const randomSong = genreSongs[randomIndex];
          if (randomSong?.cover_url) {
            avatars[genre.genre_id] = randomSong.cover_url;
          }
        }
      });
      setGenreAvatars(avatars);
      
      // Create Set of purchased song IDs for quick lookup
      const purchasedIds = new Set((purchased.data || []).map(song => song.song_id));
      setPurchasedSongIds(purchasedIds);
      
      // Create Set of followed artist IDs
      const followedIds = new Set((followed.data || []).map(artist => artist.artist_id));
      setFollowedArtists(followedIds);
      
      // Check if user has premium
      setUserIsPremium(premiumStatus.data?.is_premium || false);

      // Check access types for premium songs (limit to first 50 to avoid too many requests)
      const accessTypesMap = {};
      const premiumSongs = songsData.filter(s => s.is_premium === 1).slice(0, 50);
      
      const accessChecks = premiumSongs.map(async (song) => {
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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleAddToPlaylist = (song) => {
    setPlaylistSong(song);
    setShowPlaylistModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // Filter songs based on search query and premium filter
  useEffect(() => {
    if (activeTab !== 'songs') return;
    
    let filtered = allSongs;

    // Apply premium filter
    if (premiumFilter === 'premium') {
      filtered = filtered.filter(song => song.is_premium === 1);
    } else if (premiumFilter === 'free') {
      filtered = filtered.filter(song => song.is_premium === 0 || !song.is_premium);
    }

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

    setFilteredSongs(filtered);
    setCurrentPage(1);
  }, [searchQuery, premiumFilter, allSongs, activeTab]);

  // Filter and sort artists
  useEffect(() => {
    if (activeTab !== 'artists') return;
    
    let filtered = allArtists;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        artist =>
          artist.name?.toLowerCase().includes(query) ||
          artist.country?.toLowerCase().includes(query) ||
          artist.bio?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (artistSortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (artistSortBy === 'popular') {
      filtered.sort((a, b) => (b.song_count || 0) - (a.song_count || 0));
    } else if (artistSortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    setFilteredArtists(filtered);
    setArtistCurrentPage(1);
  }, [searchQuery, artistSortBy, allArtists, activeTab]);

  // Filter albums
  useEffect(() => {
    if (activeTab !== 'albums') return;
    
    let filtered = allAlbums;

    // Apply premium filter
    if (albumPremiumFilter === 'premium') {
      filtered = filtered.filter(album => album.is_premium === 1);
    } else if (albumPremiumFilter === 'free') {
      filtered = filtered.filter(album => album.is_premium === 0 || !album.is_premium);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        album =>
          album.title?.toLowerCase().includes(query) ||
          album.artist_name?.toLowerCase().includes(query)
      );
    }

    setFilteredAlbums(filtered);
    setAlbumCurrentPage(1);
  }, [searchQuery, allAlbums, activeTab, albumPremiumFilter]);

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
    if (song.is_premium === 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          // Show premium access modal with 3 options
          setSelectedSong(song);
          setSelectedSongList(filteredSongs);
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
    await playSong(song, filteredSongs, index);
    
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
    
    // Already navigated above
  };

  const handleFollowToggle = async (artistId) => {
    try {
      if (followedArtists.has(artistId)) {
        await followService.unfollowArtist(artistId);
        setFollowedArtists(prev => {
          const newSet = new Set(prev);
          newSet.delete(artistId);
          return newSet;
        });
        showSuccess('Thành công', 'Đã bỏ theo dõi');
      } else {
        await followService.followArtist(artistId);
        setFollowedArtists(prev => new Set([...prev, artistId]));
        showSuccess('Thành công', 'Đã theo dõi nghệ sĩ');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      showError('Lỗi', 'Không thể thực hiện');
    }
  };

  const formatListenCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const getPaginatedSongs = () => {
    return filteredSongs.slice(0, currentPage * ITEMS_PER_PAGE);
  };

  const loadMoreSongs = () => {
    if (currentPage * ITEMS_PER_PAGE < filteredSongs.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const getPaginatedArtists = () => {
    return filteredArtists.slice(0, artistCurrentPage * ITEMS_PER_PAGE);
  };

  const loadMoreArtists = () => {
    if (artistCurrentPage * ITEMS_PER_PAGE < filteredArtists.length) {
      setArtistCurrentPage(prev => prev + 1);
    }
  };

  const getPaginatedAlbums = () => {
    return filteredAlbums.slice(0, albumCurrentPage * ITEMS_PER_PAGE);
  };

  const loadMoreAlbums = () => {
    if (albumCurrentPage * ITEMS_PER_PAGE < filteredAlbums.length) {
      setAlbumCurrentPage(prev => prev + 1);
    }
  };

  const renderAlbumItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.artistItem} // Reuse artist item style for consistency
        onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
      >
        <Image
          source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
          style={styles.artistImage}
        />
        
        <View style={styles.artistInfo}>
          <View style={styles.songTitleRow}>
            <Text style={styles.artistName} numberOfLines={1}>
              {item.title}
            </Text>
            {item.is_premium === 1 && <PremiumBadge small />}
          </View>
          
          <Text style={styles.artistStatText} numberOfLines={1}>
            {item.artist_name}
          </Text>
          
          <View style={styles.artistStats}>
            <Text style={styles.artistStatText}>
              {item.release_date ? new Date(item.release_date).getFullYear() : ''}
            </Text>
            {item.is_premium === 1 && item.price > 0 && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Ionicons name="cash-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.priceText}>
                  {parseFloat(item.price).toLocaleString('vi-VN')}đ
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSongItem = ({ item, index }) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;

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
            activeOpacity={0.8}
          >
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
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
                  {item.title}
                </Text>
                {item.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />}
                {item.is_premium === 1 && songAccessTypes[item.song_id] && (
                  <AccessBadge accessType={songAccessTypes[item.song_id]} size={16} />
                )}
              </View>
              <Text style={styles.songArtist} numberOfLines={1}>
                {item.artist_name || 'Unknown Artist'}
              </Text>
              <View style={styles.songMeta}>
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
            </View>
          </TouchableOpacity>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => handlePlaySong(item, index)}
            >
              <Ionicons
                name={isCurrentPlaying ? 'pause-circle' : 'play-circle'}
                size={36}
                color={COLORS.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToPlaylist(item)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#E2E8F0" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderArtistItem = ({ item }) => {
    const isFollowing = followedArtists.has(item.artist_id);
    
    return (
      <TouchableOpacity
        style={styles.artistItem}
        onPress={() => navigation.navigate('ArtistDetail', { artistId: item.artist_id })}
      >
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/80' }}
          style={styles.artistImage}
        />
        
        <View style={styles.artistInfo}>
          <Text style={styles.artistName} numberOfLines={1}>
            {item.name}
          </Text>
          
          {item.country && (
            <View style={styles.artistCountryRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.artistCountry}>{item.country}</Text>
            </View>
          )}
          
          <View style={styles.artistStats}>
            <Ionicons name="musical-notes" size={14} color={COLORS.textMuted} />
            <Text style={styles.artistStatText}>{item.song_count || 0} bài hát</Text>
            <Text style={styles.metaDot}>•</Text>
            <Ionicons name="disc" size={14} color={COLORS.textMuted} />
            <Text style={styles.artistStatText}>{item.album_count || 0} album</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={(e) => {
            e.stopPropagation();
            handleFollowToggle(item.artist_id);
          }}
        >
          <Ionicons
            name={isFollowing ? "checkmark" : "add"}
            size={20}
            color={isFollowing ? COLORS.primary : COLORS.text}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGenreItem = ({ item }) => {
    const avatarUrl = genreAvatars[item.genre_id];
    
    return (
      <TouchableOpacity
        style={styles.genreItem}
        onPress={() => navigation.navigate('GenreDetail', { genreId: item.genre_id })}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.genreAvatar}
          />
        ) : (
          <View style={styles.genreIconContainer}>
            <Ionicons name="musical-notes" size={32} color={COLORS.primary} />
          </View>
        )}
        
        <View style={styles.genreInfo}>
          <Text style={styles.genreName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.genreDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>

        <View style={styles.genreCountContainer}>
          <Text style={styles.genreCount}>{item.song_count || 0}</Text>
          <Text style={styles.genreCountLabel}>bài hát</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'songs':
        return 'Nhạc';
      case 'artists':
        return 'Nghệ sĩ';
      case 'genres':
        return 'Thể loại';
      case 'albums':
        return 'Album';
      default:
        return 'Nhạc';
    }
  };

  const getTabIconColor = () => {
    switch (activeTab) {
      case 'songs':
        return '#2196F3';
      case 'artists':
        return '#E91E63';
      case 'genres':
        return '#FF9800';
      case 'albums':
        return '#9C27B0';
      default:
        return COLORS.primary;
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'songs':
        return 'musical-notes';
      case 'artists':
        return 'mic';
      case 'genres':
        return 'albums';
      case 'albums':
        return 'disc';
      default:
        return 'musical-notes';
    }
  };

  const renderDropdown = () => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Ionicons
          name={getTabIcon()}
          size={20}
          color={getTabIconColor()}
        />
        <Text style={styles.dropdownButtonText}>{getTabLabel()}</Text>
        <Ionicons
          name={showDropdown ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {showDropdown && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={[styles.dropdownItem, activeTab === 'songs' && styles.dropdownItemActive]}
            onPress={() => {
              setActiveTab('songs');
              setShowDropdown(false);
            }}
          >
            <Ionicons
              name="musical-notes"
              size={20}
              color={activeTab === 'songs' ? '#2196F3' : '#2196F3'}
            />
            <Text style={[styles.dropdownItemText, activeTab === 'songs' && styles.dropdownItemTextActive]}>
              Nhạc
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dropdownItem, activeTab === 'artists' && styles.dropdownItemActive]}
            onPress={() => {
              setActiveTab('artists');
              setShowDropdown(false);
            }}
          >
            <Ionicons
              name="mic"
              size={20}
              color={activeTab === 'artists' ? '#E91E63' : '#E91E63'}
            />
            <Text style={[styles.dropdownItemText, activeTab === 'artists' && styles.dropdownItemTextActive]}>
              Nghệ sĩ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, activeTab === 'genres' && styles.dropdownItemActive]}
            onPress={() => {
              setActiveTab('genres');
              setShowDropdown(false);
            }}
          >
            <Ionicons
              name="albums"
              size={20}
              color={activeTab === 'genres' ? '#FF9800' : '#FF9800'}
            />
            <Text style={[styles.dropdownItemText, activeTab === 'genres' && styles.dropdownItemTextActive]}>
              Thể loại
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, activeTab === 'albums' && styles.dropdownItemActive]}
            onPress={() => {
              setActiveTab('albums');
              setShowDropdown(false);
            }}
          >
            <Ionicons
              name="disc"
              size={20}
              color={activeTab === 'albums' ? '#9C27B0' : '#9C27B0'}
            />
            <Text style={[styles.dropdownItemText, activeTab === 'albums' && styles.dropdownItemTextActive]}>
              Album
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loadingInitial) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Tìm ${activeTab === 'songs' ? 'bài hát' : activeTab === 'artists' ? 'nghệ sĩ' : 'thể loại'}...`}
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

      {/* Songs Tab Content */}
      {activeTab === 'songs' && (
        <FlatList
          data={getPaginatedSongs()}
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
          onEndReached={loadMoreSongs}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          ListHeaderComponentStyle={{ zIndex: 1000 }}
          ListHeaderComponent={
            <View style={{ zIndex: 1000 }}>
              {renderDropdown()}
              {/* Premium Filter */}
              <View style={styles.filterContainer}>
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
            </View>
          }
          ListFooterComponent={
            currentPage * ITEMS_PER_PAGE < filteredSongs.length ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={80} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy bài hát' : 'Chưa có bài hát nào'}
              </Text>
            </View>
          }
        />
      )}

      {/* Artists Tab Content */}
      {activeTab === 'artists' && (
        <FlatList
          data={getPaginatedArtists()}
          renderItem={renderArtistItem}
          keyExtractor={item => item.artist_id.toString()}
          contentContainerStyle={styles.artistsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={loadMoreArtists}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          ListHeaderComponentStyle={{ zIndex: 1000 }}
          ListHeaderComponent={
            <View style={{ zIndex: 1000 }}>
              {renderDropdown()}
              {/* Sort Filter */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, artistSortBy === 'name' && styles.activeFilter]}
                  onPress={() => setArtistSortBy('name')}
                >
                  <Text style={[styles.filterText, artistSortBy === 'name' && styles.activeFilterText]}>
                    Tên A-Z
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.filterButton, artistSortBy === 'popular' && styles.activeFilter]}
                  onPress={() => setArtistSortBy('popular')}
                >
                  <Text style={[styles.filterText, artistSortBy === 'popular' && styles.activeFilterText]}>
                    Phổ biến
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.filterButton, artistSortBy === 'recent' && styles.activeFilter]}
                  onPress={() => setArtistSortBy('recent')}
                >
                  <Text style={[styles.filterText, artistSortBy === 'recent' && styles.activeFilterText]}>
                    Mới nhất
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListFooterComponent={
            artistCurrentPage * ITEMS_PER_PAGE < filteredArtists.length ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-outline" size={80} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy nghệ sĩ' : 'Chưa có nghệ sĩ nào'}
              </Text>
            </View>
          }
        />
      )}

      {/* Albums Tab Content */}
      {activeTab === 'albums' && (
        <FlatList
          data={getPaginatedAlbums()}
          renderItem={renderAlbumItem}
          keyExtractor={item => item.album_id.toString()}
          contentContainerStyle={styles.artistsList} // Reuse
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={loadMoreAlbums}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          ListHeaderComponentStyle={{ zIndex: 1000 }}
          ListHeaderComponent={
            <View style={{ zIndex: 1000 }}>
              {renderDropdown()}
              {/* Album Premium Filter */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, albumPremiumFilter === 'all' && styles.activeFilter]}
                  onPress={() => setAlbumPremiumFilter('all')}
                >
                  <Text style={[styles.filterText, albumPremiumFilter === 'all' && styles.activeFilterText]}>
                    Tất cả
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.filterButton, albumPremiumFilter === 'premium' && styles.activeFilter]}
                  onPress={() => setAlbumPremiumFilter('premium')}
                >
                  <Text style={[styles.filterText, albumPremiumFilter === 'premium' && styles.activeFilterText]}>
                    Premium
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.filterButton, albumPremiumFilter === 'free' && styles.activeFilter]}
                  onPress={() => setAlbumPremiumFilter('free')}
                >
                  <Text style={[styles.filterText, albumPremiumFilter === 'free' && styles.activeFilterText]}>
                    Miễn phí
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListFooterComponent={
            albumCurrentPage * ITEMS_PER_PAGE < filteredAlbums.length ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="disc-outline" size={80} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy album' : 'Chưa có album nào'}
              </Text>
            </View>
          }
        />
      )}

      {/* Genres Tab Content */}
      {activeTab === 'genres' && (
        <>
          {(() => {
            let filteredGenres = genres;
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase();
              filteredGenres = genres.filter(
                genre => genre.name?.toLowerCase().includes(query) ||
                         genre.description?.toLowerCase().includes(query)
              );
            }
            return (
              <FlatList
                data={filteredGenres}
                renderItem={renderGenreItem}
                keyExtractor={item => item.genre_id.toString()}
                contentContainerStyle={styles.genresList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                removeClippedSubviews={false}
                ListHeaderComponentStyle={{ zIndex: 1000 }}
                ListHeaderComponent={renderDropdown()}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="albums-outline" size={80} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'Không tìm thấy thể loại' : 'Chưa có thể loại nào'}
                    </Text>
                  </View>
                }
              />
            );
          })()}
        </>
      )}

      <MiniPlayer bottomOffset={0} />
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
              await premiumService.purchaseSong(selectedSong.song_id);
              setShowPremiumModal(false);
              // Reload purchased songs
              const res = await premiumService.getPurchasedSongs();
              if (res.success && res.data) {
                setPurchasedSongIds(new Set(res.data.map(s => s.song_id)));
              }
            } catch (error) {
              console.error('Error purchasing song:', error);
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
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SIZES.padding,
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
  dropdownContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
    zIndex: 100,
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  dropdownButtonText: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: SIZES.padding,
    right: SIZES.padding,
    marginTop: 4,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 100,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primary + '20',
  },
  dropdownItemText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
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
    minWidth: 150,
    flex: 1,
  },
  premiumBadge: {
    marginLeft: 6,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  songArtist: {
    color: '#E2E8F0',
    fontSize: SIZES.sm,
    marginBottom: 4,
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
  metaDot: {
    color: '#94A3B8',
    fontSize: SIZES.sm,
  },
  priceText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  ratingText: {
    color: COLORS.warning,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  purchasedBadge: {
    marginLeft: 4,
  },
  playButton: {
    padding: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  addButton: {
    padding: 8,
  },
  artistsList: {
    paddingBottom: 100,
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginBottom: 8,
    borderRadius: SIZES.borderRadius,
  },
  artistImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistCountryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  artistCountry: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  artistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  artistStatText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
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
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  genresList: {
    paddingBottom: 100,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.padding,
    marginBottom: 8,
    borderRadius: SIZES.borderRadius,
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
  genreInfo: {
    flex: 1,
  },
  genreName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  genreDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  genreCountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  genreCount: {
    color: COLORS.primary,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  genreCountLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
});

export default SearchScreen;
