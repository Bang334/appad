import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { favoriteService } from '../../services/favoriteService';
import { playlistService } from '../../services/playlistService';
import { songService } from '../../services/songService';
import { premiumService } from '../../services/premiumService';
import { historyService } from '../../services/historyService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import PremiumBadge from '../../components/Common/PremiumBadge';
import AccessBadge from '../../components/Common/AccessBadge';
import PremiumAccessModal from '../../components/Common/PremiumAccessModal';
// MiniPlayer removed - rendered in TabNavigator
import SuccessModal from '../../components/Common/SuccessModal';
import { API_BASE_URL } from '../../config/api';

const LibraryScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('favorites'); // favorites, playlists, premium
  const [showDropdown, setShowDropdown] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState([]);
  const [purchasedSongs, setPurchasedSongs] = useState([]);
  const [filteredPurchasedSongs, setFilteredPurchasedSongs] = useState([]);
  const [purchasedAlbums, setPurchasedAlbums] = useState([]);
  const [filteredPurchasedAlbums, setFilteredPurchasedAlbums] = useState([]);
  const [historyByDay, setHistoryByDay] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [songAccessTypes, setSongAccessTypes] = useState({}); // { songId: accessType }
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedSongList, setSelectedSongList] = useState([]);
  
  // History Pagination
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title'); // 'title', 'artist', 'recent'
  
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
    loadData();
  }, []);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${url}`;
  };

  const loadData = async () => {
    try {
      console.log('Loading library data...');
      const [favoritesData, playlistsData, purchasedData, purchasedAlbumsData, historyData] = await Promise.all([
        favoriteService.getUserFavorites(),
        playlistService.getUserPlaylists(),
        premiumService.getPurchasedSongs().catch(() => ({ data: [] })),
        premiumService.getPurchasedAlbums().catch(() => ({ data: [] })),
        historyService.getUserHistoryByDay(3, 0).catch(() => ({ success: true, data: [] })),
      ]);
      console.log('Favorites data:', favoritesData);
      const favs = favoritesData.data || [];
      const pls = playlistsData.data || [];
      const purchased = purchasedData.data || [];
      const purchasedAlbs = purchasedAlbumsData.data || [];
      const history = historyData.data || [];
      
      setFavorites(favs);
      setFilteredFavorites(favs);
      setPlaylists(pls);
      setFilteredPlaylists(pls);
      setPurchasedSongs(purchased);
      setFilteredPurchasedSongs(purchased);
      setPurchasedAlbums(purchasedAlbs);
      setFilteredPurchasedAlbums(purchasedAlbs);
      setHistoryByDay(history);
      setFilteredHistory(history);
      setHistoryOffset(3);
      setHistoryHasMore(history.length >= 3);
      
      // Check access types for premium songs in favorites and purchased songs
      const accessTypesMap = {};
      const allSongs = [...favs, ...purchased];
      const premiumSongs = allSongs.filter(s => s.is_premium === 1);
      
      // Check access for premium songs in parallel (limit to avoid too many requests)
      const accessChecks = premiumSongs.slice(0, 100).map(async (song) => {
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
      console.error('Error loading library:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadMoreHistory = async () => {
    if (loadingMoreHistory || !historyHasMore || activeTab !== 'history' || searchQuery.trim()) return;
    
    setLoadingMoreHistory(true);
    try {
      const response = await historyService.getUserHistoryByDay(3, historyOffset);
      const moreHistory = response.data || [];
      
      if (moreHistory && moreHistory.length > 0) {
        setHistoryByDay(prev => [...prev, ...moreHistory]);
        setHistoryOffset(prev => prev + 3);
        if (moreHistory.length < 3) {
          setHistoryHasMore(false);
        }
      } else {
        setHistoryHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more history:', error);
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tên playlist', 'alert-circle');
      return;
    }

    setCreatingPlaylist(true);
    try {
      await playlistService.createPlaylist(newPlaylistName, '');
      showAlert('Thành công', 'Đã tạo playlist mới', 'checkmark-circle');
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      loadData();
    } catch (error) {
      showAlert('Lỗi', 'Không thể tạo playlist', 'alert-circle');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleSongPress = async (song, index, list) => {
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
          setSelectedSongList(list);
          setShowPremiumModal(true);
          return;
        }
        // Update access type if we just checked it and user has access
        if (response.success && response.data?.accessType) {
          setSongAccessTypes(prev => ({
            ...prev,
            [song.song_id]: response.data.accessType
          }));
        }
      } catch (error) {
        console.error('Error checking song access:', error);
        // If error, try to play anyway
      }
    }

    // Navigate first for faster UX, then start playback
    navigation.navigate('FullPlayer');
    await playSong(song, list, index);
  };

  const handlePlayButtonPress = async (song, index, list) => {
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
      return;
    }

    // Check access for premium songs
    if (song.is_premium === 1) {
      try {
        const response = await premiumService.checkSongAccess(song.song_id);
        if (!response.data?.hasAccess) {
          // Show premium access modal with 3 options
          setSelectedSong(song);
          setSelectedSongList(list);
          setShowPremiumModal(true);
          return;
        }
        // Update access type if we just checked it and user has access
        if (response.success && response.data?.accessType) {
          setSongAccessTypes(prev => ({
            ...prev,
            [song.song_id]: response.data.accessType
          }));
        }
      } catch (error) {
        console.error('Error checking song access:', error);
        // If error, try to play anyway
      }
    }

    // Play song
    playSong(song, list, index);
  };

  const handlePlayAll = (list) => {
    if (list.length > 0) {
      navigation.navigate('FullPlayer');
      playSong(list[0], list, 0);
    }
  };

  const hasSongAccess = (song) => {
    if (!song) return false;
    if (songAccessTypes[song.song_id]) return true;
    if (song.price_paid || song.is_purchased) return true;
    return false;
  };

  const formatListenCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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

  // Filter and sort logic for favorites & premium
  useEffect(() => {
    // Xác định nguồn dữ liệu theo tab
    let source = [];
    if (activeTab === 'favorites') {
      source = favorites;
    } else if (activeTab === 'premium') {
      source = purchasedSongs;
    } else if (activeTab === 'albums') {
      source = purchasedAlbums;
    } else {
      return;
    }

    let filtered = [...source];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        song =>
          song.title?.toLowerCase().includes(query) ||
          song.artist_name?.toLowerCase().includes(query) ||
          song.album_title?.toLowerCase().includes(query)
      );
    }
    
    // Sort and Group by Artist if applicable
    if (sortBy === 'artist' && (activeTab === 'favorites' || activeTab === 'premium')) {
      // Group by artist
      const groupedByArtist = {};
      filtered.forEach(song => {
        const artistName = song.artist_name || 'Nghệ sĩ không xác định';
        if (!groupedByArtist[artistName]) {
          groupedByArtist[artistName] = [];
        }
        groupedByArtist[artistName].push(song);
      });
      
      // Convert to array of sections, sorted by artist name
      const sections = Object.keys(groupedByArtist)
        .sort((a, b) => a.localeCompare(b))
        .map(artistName => ({
          artistName,
          songs: groupedByArtist[artistName].sort((a, b) => 
            (a.title || '').localeCompare(b.title || '')
          )
        }));
      
      if (activeTab === 'favorites') {
        setFilteredFavorites(sections);
      } else if (activeTab === 'premium') {
        setFilteredPurchasedSongs(sections);
      }
    } else {
      // Regular sorting for non-artist sort or albums tab
      if (sortBy === 'title') {
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      } else if (sortBy === 'artist') {
        filtered.sort((a, b) => (a.artist_name || '').localeCompare(b.artist_name || ''));
      } else if (sortBy === 'recent') {
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
      
      if (activeTab === 'favorites') {
        setFilteredFavorites(filtered);
      } else if (activeTab === 'premium') {
        setFilteredPurchasedSongs(filtered);
      } else if (activeTab === 'albums') {
        setFilteredPurchasedAlbums(filtered);
      }
    }
  }, [searchQuery, sortBy, favorites, purchasedSongs, purchasedAlbums, activeTab]);

  // Filter playlists
  useEffect(() => {
    let filtered = [...playlists];
    if (searchQuery.trim() && activeTab === 'playlists') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        playlist => playlist.name?.toLowerCase().includes(query)
      );
    }
    
    if (sortBy === 'title') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    
    if (activeTab === 'playlists') {
      setFilteredPlaylists(filtered);
    }
  }, [searchQuery, sortBy, playlists, activeTab]);

  // Filter history
  useEffect(() => {
    if (activeTab === 'history') {
      let filtered = [...historyByDay];
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.map(daySection => ({
          ...daySection,
          songs: daySection.songs.filter(
            song =>
              song.title?.toLowerCase().includes(query) ||
              song.artist_name?.toLowerCase().includes(query) ||
              song.album_title?.toLowerCase().includes(query)
          )
        })).filter(daySection => daySection.songs.length > 0);
      }
      
      setFilteredHistory(filtered);
    }
  }, [searchQuery, historyByDay, activeTab]);

  const getTabLabel = () => {
    switch (activeTab) {
      case 'favorites':
        return 'Yêu thích';
      case 'playlists':
        return 'Playlist';
      case 'premium':
        return 'Bài hát đã mua';
      case 'albums':
        return 'Album đã mua';
      case 'history':
        return 'Lịch sử';
      default:
        return 'Yêu thích';
    }
  };

  const getTabIconColor = (tab) => {
    switch (tab) {
      case 'favorites':
        return '#E91E63';
      case 'playlists':
        return '#2196F3';
      case 'premium':
        return '#FFD700';
      case 'albums':
        return '#9C27B0';
      case 'history':
        return '#4CAF50';
      default:
        return COLORS.primary;
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'favorites':
        return 'heart';
      case 'playlists':
        return 'list';
      case 'premium':
        return 'musical-note';
      case 'albums':
        return 'disc';
      case 'history':
        return 'time';
      default:
        return 'heart';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      let normalizedDate = '';
      if (typeof dateString === 'string') {
        normalizedDate = dateString.split('T')[0].split(' ')[0];
      } else if (dateString instanceof Date) {
        const year = dateString.getFullYear();
        const month = String(dateString.getMonth() + 1).padStart(2, '0');
        const day = String(dateString.getDate()).padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      } else {
        normalizedDate = String(dateString).split('T')[0].split(' ')[0];
      }
      
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        return String(dateString);
      }
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayYear = yesterday.getFullYear();
      const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
      
      if (normalizedDate === todayStr) {
        return 'Hôm nay';
      }
      if (normalizedDate === yesterdayStr) {
        return 'Hôm qua';
      }
      
      const [dateYear, dateMonth, dateDay] = normalizedDate.split('-').map(Number);
      const date = new Date(dateYear, dateMonth - 1, dateDay);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return String(dateString);
    }
  };

  const getAllHistorySongs = () => {
    const allSongs = [];
    filteredHistory.forEach(daySection => {
      daySection.songs.forEach(song => {
        allSongs.push(song);
      });
    });
    return allSongs;
  };

  const renderHistorySongItem = (song, songIndex, allSongs) => {
    const isCurrentSong = currentSong?.song_id === song.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;
    const globalIndex = allSongs.findIndex(s => s.song_id === song.song_id);

    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];

    return (
      <View key={song.song_id || songIndex} style={styles.songItemWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.songItem, isCurrentSong && styles.songItemActive]}
        >
          <TouchableOpacity
            style={styles.songContent}
            onPress={() => {
              const targetIndex = globalIndex >= 0 ? globalIndex : songIndex;
              if (currentSong?.song_id !== song.song_id) {
                playSong(song, allSongs, targetIndex);
              }
              navigation.navigate('FullPlayer');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songImage}
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
                  {song.title}
                </Text>
                <View style={{display: 'flex', flexDirection: 'row', position: 'relative', top: -10, right:-35}}>
                  {song.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />}
                </View>
              </View>
              <Text style={styles.songArtist} numberOfLines={1}>
                {song.artist_name || 'Nghệ sĩ không xác định'}
                {song.album_title && (
                  <>
                    <Text style={{ color: '#94A3B8' }}> • </Text>
                    <Text style={{ color: '#CBD5F5', fontStyle: 'italic' }}>
                      {song.album_title}
                    </Text>
                  </>
                )}
              </Text>
              <View style={styles.songMeta}>
                {song.count > 1 && (
                  <>
                    <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{song.count} lần</Text>
                    <Text style={styles.metaSeparator}>•</Text>
                  </>
                )}
                {song.total_duration > 0 && (
                  <Text style={styles.metaText}>
                    {Math.floor(song.total_duration / 60)} phút
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => {
                const targetIndex = globalIndex >= 0 ? globalIndex : songIndex;
                if (currentSong?.song_id === song.song_id) {
                  togglePlayPause();
                } else {
                  playSong(song, allSongs, targetIndex);
                }
              }}
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

  const renderHistorySection = ({ item: daySection, index: sectionIndex }) => {
    if (!daySection.songs || daySection.songs.length === 0) return null;
    
    const allSongs = getAllHistorySongs();
    
    return (
      <View key={daySection.day || sectionIndex} style={styles.historySection}>
        {sectionIndex === 0 && <View style={styles.daySectionSpacer} />}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDate(daySection.day)}</Text>
          <Text style={styles.dayCount}>{daySection.total_listens || daySection.songs.length} bài hát</Text>
        </View>
        {daySection.songs.map((song, songIndex) => 
          renderHistorySongItem(song, songIndex, allSongs)
        )}
      </View>
    );
  };

  // Helper to check if data is sections (for artist grouping)
  const isSectionData = (data) => {
    return data.length > 0 && data[0].artistName !== undefined && data[0].songs !== undefined;
  };

  // Get all songs from sections or flat list
  const getAllSongsFromData = (data) => {
    if (isSectionData(data)) {
      const allSongs = [];
      data.forEach(section => {
        section.songs.forEach(song => allSongs.push(song));
      });
      return allSongs;
    }
    return data;
  };

  // Render artist section
  const renderArtistSection = ({ item: artistSection, index: sectionIndex }, allSongs, renderSongItem) => {
    if (!artistSection.songs || artistSection.songs.length === 0) return null;
    
    return (
      <View key={artistSection.artistName || sectionIndex} style={styles.historySection}>
        {sectionIndex === 0 && <View style={styles.daySectionSpacer} />}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{artistSection.artistName}</Text>
          <Text style={styles.dayCount}>{artistSection.songs.length} bài hát</Text>
        </View>
        {artistSection.songs.map((song, songIndex) => {
          const globalIndex = allSongs.findIndex(s => s.song_id === song.song_id);
          return renderSongItem(song, globalIndex >= 0 ? globalIndex : songIndex, allSongs);
        })}
      </View>
    );
  };

  const renderFavoriteSongItem = (item, index, songs) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;
    const showPrice = item.is_premium === 1 && !hasSongAccess(item) && Number(item.price) > 0;

    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];

    return (
      <View style={styles.songItemWrapper} key={item.song_id}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.songItem, isCurrentSong && styles.songItemActive]}
        >
          <TouchableOpacity
            style={styles.songContent}
            onPress={() => handleSongPress(item, index, songs)}
            activeOpacity={0.85}
          >
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songImage}
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
                <View style={{display: 'flex', flexDirection: 'row', position: 'relative', top: -10, right:-35}}>
                  {item.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />}
                  {item.is_premium === 1 && songAccessTypes[item.song_id] && (
                    <AccessBadge accessType={songAccessTypes[item.song_id]} size={16} />
                  )}
                </View>
              </View>
              <Text style={styles.songArtist} numberOfLines={1}>
                {item.artist_name}
                {item.album_title && (
                  <>
                    <Text style={{ color: '#94A3B8' }}> • </Text>
                    <Text style={{ color: '#CBD5F5', fontStyle: 'italic' }}>
                      {item.album_title}
                    </Text>
                  </>
                )}
              </Text>
              <View style={styles.songMeta}>
                <Ionicons name="headset" size={12} color="#94A3B8" />
                <Text style={styles.metaText}>{formatListenCount(item.listen_count)}</Text>
                {item.average_rating != null && (
                  <>
                    <Ionicons name="star" size={12} color={COLORS.warning} />
                    <Text style={styles.metaText}>
                      {Number(item.average_rating).toFixed(1)}
                    </Text>
                  </>
                )}
                {item.duration > 0 && (
                  <>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      {formatDuration(item.duration)}
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
              onPress={() => handlePlayButtonPress(item, index, songs)}
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

  const renderPurchasedSongItem = (item, index, allSongs) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;

    const gradientColors = isCurrentSong
      ? ['#2B124C', '#08040F']
      : ['#161616', '#050505'];

    return (
      <View style={styles.songItemWrapper} key={item.song_id}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.songItem, isCurrentSong && styles.songItemActive]}
        >
          <TouchableOpacity
            style={styles.songContent}
            onPress={() => {
              if (currentSong?.song_id !== item.song_id) {
                playSong(item, allSongs, index);
              }
              navigation.navigate('FullPlayer');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songImage}
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
                <View style={{display: 'flex', flexDirection: 'row', position: 'relative', top: -10, right:-35}}>
                  {item.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />}
                  {songAccessTypes[item.song_id] && (
                    <AccessBadge accessType={songAccessTypes[item.song_id]} size={16} />
                  )}
                </View>
              </View>
              <Text style={styles.songArtist} numberOfLines={1}>
                {item.artist_name}
                {item.album_title && (
                  <>
                    <Text style={{ color: '#94A3B8' }}> • </Text>
                    <Text style={{ color: '#CBD5F5', fontStyle: 'italic' }}>
                      {item.album_title}
                    </Text>
                  </>
                )}
              </Text>
              <View style={styles.songMeta}>
                <Ionicons name="headset" size={12} color="#94A3B8" />
                <Text style={styles.metaText}>{formatListenCount(item.listen_count)}</Text>
                {item.average_rating != null && (
                  <>
                    <Ionicons name="star" size={12} color={COLORS.warning} />
                    <Text style={styles.metaText}>
                      {Number(item.average_rating).toFixed(1)}
                    </Text>
                  </>
                )}
                {item.duration > 0 && (
                  <>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      {formatDuration(item.duration)}
                    </Text>
                  </>
                )}
              </View>
              <View style={styles.priceRow}>
                <Ionicons name="cash-outline" size={12} color={COLORS.primary} />
                <Text style={styles.priceText}>
                  Đã mua: {parseFloat(item.price_paid || item.price || 0).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => {
                if (currentSong?.song_id === item.song_id) {
                  togglePlayPause();
                } else {
                  playSong(item, allSongs, index);
                }
              }}
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

  const renderPurchasedItem = ({ item, index }) => {
    return renderPurchasedSongItem(item, index, filteredPurchasedSongs);
  };

  const handleOpenPlaylist = (playlist) => {
    navigation.navigate('PlaylistDetail', {
      playlistId: playlist.playlist_id,
      playlistName: playlist.name,
    });
  };

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => handleOpenPlaylist(item)}
      activeOpacity={0.7}
    >
      {item.cover_url ? (
        <Image
          source={{ uri: item.cover_url }}
          style={styles.playlistCover}
        />
      ) : (
        <View style={styles.playlistIcon}>
          <Ionicons name="musical-notes" size={32} color={COLORS.primary} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.song_count} bài hát</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderAlbumItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getImageUrl(item.cover_url) || 'https://via.placeholder.com/60' }}
        style={styles.playlistCover}
      />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.title}</Text>
        <Text style={styles.playlistCount}>{item.artist_name}</Text>
        <View style={styles.songMeta}>
          <Ionicons name="cash" size={12} color={COLORS.primary} />
          <Text style={styles.priceText}>
            Đã mua: {parseFloat(item.price_paid || item.price || 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const handleTabChange = (tab) => {
    setShowDropdown(false);
    setLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setLoading(false);
    }, 500);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Dropdown Navigation */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Ionicons
            name={getTabIcon()}
            size={20}
            color={getTabIconColor(activeTab)}
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
              style={[styles.dropdownItem, activeTab === 'favorites' && styles.dropdownItemActive]}
              onPress={() => {
                handleTabChange('favorites');
              }}
            >
              <Ionicons
                name="heart"
                size={20}
                color={getTabIconColor('favorites')}
              />
              <Text style={[styles.dropdownItemText, activeTab === 'favorites' && styles.dropdownItemTextActive]}>
                Yêu thích
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dropdownItem, activeTab === 'playlists' && styles.dropdownItemActive]}
              onPress={() => {
                handleTabChange('playlists');
              }}
            >
              <Ionicons
                name="list"
                size={20}
                color={getTabIconColor('playlists')}
              />
              <Text style={[styles.dropdownItemText, activeTab === 'playlists' && styles.dropdownItemTextActive]}>
                Playlist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, activeTab === 'premium' && styles.dropdownItemActive]}
              onPress={() => {
                handleTabChange('premium');
              }}
            >
              <Ionicons
                name="star"
                size={20}
                color={getTabIconColor('premium')}
              />
              <Text style={[styles.dropdownItemText, activeTab === 'premium' && styles.dropdownItemTextActive]}>
                Premium
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, activeTab === 'albums' && styles.dropdownItemActive]}
              onPress={() => {
                handleTabChange('albums');
              }}
            >
              <Ionicons
                name="disc"
                size={20}
                color={getTabIconColor('albums')}
              />
              <Text style={[styles.dropdownItemText, activeTab === 'albums' && styles.dropdownItemTextActive]}>
                Album đã mua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, activeTab === 'history' && styles.dropdownItemActive]}
              onPress={() => {
                handleTabChange('history');
              }}
            >
              <Ionicons
                name="time"
                size={20}
                color={getTabIconColor('history')}
              />
              <Text style={[styles.dropdownItemText, activeTab === 'history' && styles.dropdownItemTextActive]}>
                Lịch sử
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scrollable Content Container */}
      <View style={styles.scrollableContent}>
        {activeTab === 'favorites' ? (
          filteredFavorites.length > 0 ? (
            isSectionData(filteredFavorites) ? (
              <FlatList
                data={filteredFavorites}
                renderItem={(props) => renderArtistSection(props, getAllSongsFromData(filteredFavorites), renderFavoriteSongItem)}
                keyExtractor={(item, index) => item.artistName || `artist-${index}`}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ListHeaderComponent={
                  <>
                    {/* Play All Button */}
                    <TouchableOpacity
                      style={styles.playAllButton}
                      onPress={() => handlePlayAll(getAllSongsFromData(filteredFavorites))}
                    >
                      <Ionicons name="play-circle" size={24} color={COLORS.text} />
                      <Text style={styles.playAllText}>Phát tất cả</Text>
                    </TouchableOpacity>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm bài hát yêu thích..."
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
                        style={[styles.filterButton, sortBy === 'artist' && styles.activeFilter]}
                        onPress={() => setSortBy('artist')}
                      >
                        <Text style={[styles.filterText, sortBy === 'artist' && styles.activeFilterText]}>
                          Nghệ sĩ
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
                </>
              }
            />
            ) : (
              <FlatList
                data={filteredFavorites}
                renderItem={({ item, index }) => renderFavoriteSongItem(item, index, filteredFavorites)}
                keyExtractor={(item) => item.song_id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ListHeaderComponent={
                  <>
                    {/* Play All Button */}
                    <TouchableOpacity
                      style={styles.playAllButton}
                      onPress={() => handlePlayAll(filteredFavorites)}
                    >
                      <Ionicons name="play-circle" size={24} color={COLORS.text} />
                      <Text style={styles.playAllText}>Phát tất cả</Text>
                    </TouchableOpacity>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm bài hát yêu thích..."
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
                          style={[styles.filterButton, sortBy === 'artist' && styles.activeFilter]}
                          onPress={() => setSortBy('artist')}
                        >
                          <Text style={[styles.filterText, sortBy === 'artist' && styles.activeFilterText]}>
                            Nghệ sĩ
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
                  </>
                }
              />
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy bài hát yêu thích' : 'Chưa có bài hát yêu thích'}
              </Text>
            </View>
          )
        ) : activeTab === 'premium' ? (
          filteredPurchasedSongs.length > 0 ? (
            isSectionData(filteredPurchasedSongs) ? (
              <FlatList
                data={filteredPurchasedSongs}
                renderItem={(props) => renderArtistSection(props, getAllSongsFromData(filteredPurchasedSongs), renderPurchasedSongItem)}
                keyExtractor={(item, index) => item.artistName || `artist-${index}`}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ListHeaderComponent={
                  <>
                    {/* Play All Button */}
                    <TouchableOpacity
                      style={styles.playAllButton}
                      onPress={() => handlePlayAll(getAllSongsFromData(filteredPurchasedSongs))}
                    >
                      <Ionicons name="play-circle" size={24} color={COLORS.text} />
                      <Text style={styles.playAllText}>Phát tất cả</Text>
                    </TouchableOpacity>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm bài hát premium..."
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
                          style={[styles.filterButton, sortBy === 'artist' && styles.activeFilter]}
                          onPress={() => setSortBy('artist')}
                        >
                          <Text style={[styles.filterText, sortBy === 'artist' && styles.activeFilterText]}>
                            Nghệ sĩ
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
                  </>
                }
              />
            ) : (
              <FlatList
                data={filteredPurchasedSongs}
                renderItem={renderPurchasedItem}
                keyExtractor={(item) => item.song_id?.toString() || item.purchase_id?.toString()}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ListHeaderComponent={
                <>
                  {/* Play All Button */}
                  <TouchableOpacity
                    style={styles.playAllButton}
                    onPress={() => handlePlayAll(filteredPurchasedSongs)}
                  >
                    <Ionicons name="play-circle" size={24} color={COLORS.text} />
                    <Text style={styles.playAllText}>Phát tất cả</Text>
                  </TouchableOpacity>

                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm bài hát premium..."
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
                        style={[styles.filterButton, sortBy === 'artist' && styles.activeFilter]}
                        onPress={() => setSortBy('artist')}
                      >
                        <Text style={[styles.filterText, sortBy === 'artist' && styles.activeFilterText]}>
                          Nghệ sĩ
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
                </>
              }
            />
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy bài hát premium' : 'Chưa có bài hát premium nào'}
              </Text>
              {!searchQuery && (
                <>
                  <Text style={styles.emptySubtext}>Mua bài hát premium để nghe không giới hạn</Text>
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => navigation.navigate('Premium')}
                  >
                    <Text style={styles.buyButtonText}>Xem Premium</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        ) : activeTab === 'albums' ? (
          filteredPurchasedAlbums.length > 0 ? (
            <FlatList
              data={filteredPurchasedAlbums}
              renderItem={renderAlbumItem}
              keyExtractor={(item) => item.album_id?.toString() || item.purchase_id?.toString()}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              ListHeaderComponent={
                <>
                  {/* Search Bar */}
                  <View style={[styles.searchContainer, { marginTop: 10 }]}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm album đã mua..."
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
                        style={[styles.filterButton, sortBy === 'artist' && styles.activeFilter]}
                        onPress={() => setSortBy('artist')}
                      >
                        <Text style={[styles.filterText, sortBy === 'artist' && styles.activeFilterText]}>
                          Nghệ sĩ
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
                </>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="disc-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy album' : 'Chưa có album đã mua nào'}
              </Text>
            </View>
          )
        ) : activeTab === 'playlists' ? (
          <>
            {/* Create Playlist Button */}
            {showCreatePlaylist ? (
              <View style={styles.createPlaylistContainer}>
                <View style={styles.createPlaylistForm}>
                  <TextInput
                    style={styles.playlistInput}
                    placeholder="Tên playlist mới"
                    placeholderTextColor={COLORS.textMuted}
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    autoFocus
                  />
                  <View style={styles.createPlaylistButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowCreatePlaylist(false);
                        setNewPlaylistName('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleCreatePlaylist}
                      disabled={creatingPlaylist}
                    >
                      <LinearGradient
                        colors={COLORS.gradient.primary}
                        style={styles.createButtonGradient}
                      >
                        <Text style={styles.createButtonText}>
                          {creatingPlaylist ? 'Đang tạo...' : 'Tạo'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addPlaylistButton}
                onPress={() => setShowCreatePlaylist(true)}
              >
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                <Text style={styles.addPlaylistText}>Tạo playlist mới</Text>
              </TouchableOpacity>
            )}

            {/* Playlists List */}
            {filteredPlaylists.length > 0 ? (
              <FlatList
                data={filteredPlaylists}
                renderItem={renderPlaylistItem}
                keyExtractor={(item) => item.playlist_id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ListHeaderComponent={
                  <>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm playlist..."
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
                          style={[styles.filterButton, sortBy === 'recent' && styles.activeFilter]}
                          onPress={() => setSortBy('recent')}
                        >
                          <Text style={[styles.filterText, sortBy === 'recent' && styles.activeFilterText]}>
                            Mới nhất
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                }
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="list-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Không tìm thấy playlist' : 'Chưa có playlist nào'}
                </Text>
                {!searchQuery && (
                  <Text style={styles.emptySubtext}>Tạo playlist mới để bắt đầu</Text>
                )}
              </View>
            )}
          </>
        ) : activeTab === 'history' ? (
          filteredHistory.length > 0 ? (
            <FlatList
              data={filteredHistory}
              renderItem={renderHistorySection}
              keyExtractor={(item, index) => item.day || `history-${index}`}
              contentContainerStyle={styles.list}
              onEndReached={loadMoreHistory}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMoreHistory ? (
                  <View style={{ padding: 20 }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              ListHeaderComponent={
                <>
                  {/* Play All Button */}
                  <TouchableOpacity
                    style={styles.playAllButton}
                    onPress={() => handlePlayAll(getAllHistorySongs())}
                  >
                    <Ionicons name="play-circle" size={24} color={COLORS.text} />
                    <Text style={styles.playAllText}>Phát tất cả</Text>
                  </TouchableOpacity>

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
                        style={[styles.filterButton, sortBy === 'recent' && styles.activeFilter]}
                        onPress={() => setSortBy('recent')}
                      >
                        <Text style={[styles.filterText, sortBy === 'recent' && styles.activeFilterText]}>
                          Mới nhất
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy bài hát' : 'Chưa có lịch sử nghe nhạc'}
              </Text>
            </View>
          )
        ) : null}
      </View>

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
              loadData();
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

      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />
      
      {/* MiniPlayer removed - rendered in TabNavigator */}
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
  dropdownContainer: {
    // Đặt giống SearchScreen, nhưng thêm zIndex để dropdown nổi trên list
    position: 'relative',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  scrollableContent: {
    flex: 1,
    marginTop: 0,
    zIndex: 0,
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
    top: '120%',
    left: SIZES.padding,
    right: SIZES.padding,
    marginTop: 10,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 300,
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
  playAllButton: {
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.padding,
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
  list: {
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
  playButton: {
    padding: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  premiumBadge: {
    marginLeft: 6,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  priceText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  buyButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
  playlistIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: COLORS.surface,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  addPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    margin: SIZES.padding,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 12,
  },
  addPlaylistText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  createPlaylistContainer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.background,
  },
  createPlaylistForm: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playlistInput: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  createPlaylistButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 24,
  },
  daySectionSpacer: {
    height: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
    marginBottom: 8,
  },
  dayTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  dayCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
});

export default LibraryScreen;

