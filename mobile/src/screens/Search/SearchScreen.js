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
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { songService } from '../../services/songService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';

const ITEMS_PER_PAGE = 12;

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { playSong } = usePlayer();
  const albumCarouselRef = useRef(null);
  const scrollPosition = useRef(0);
  const panValue = useRef(new RNAnimated.Value(0)).current;

  // Load initial data (albums and songs)
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [albumsRes, songsRes] = await Promise.all([
        songService.getAlbums(),
        songService.getAllSongs(100, 0),
      ]);
      setAlbums(albumsRes.data || []);
      setAllSongs(songsRes.data || []);
      setFilteredSongs(songsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // Auto-scroll carousel
  useEffect(() => {
    if (albums.length === 0) return;

    const interval = setInterval(() => {
      if (albumCarouselRef.current && albums.length > 0) {
        scrollPosition.current = (scrollPosition.current + 1) % albums.length;
        
        albumCarouselRef.current.scrollToIndex({
          index: scrollPosition.current,
          animated: true,
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [albums]);

  // Filter songs based on search query
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredSongs(allSongs);
      setCurrentPage(1); // Reset to page 1
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allSongs.filter(song => 
      song.title.toLowerCase().includes(query) ||
      (song.artist_name && song.artist_name.toLowerCase().includes(query)) ||
      (song.album_title && song.album_title.toLowerCase().includes(query))
    );
    setFilteredSongs(filtered);
    setCurrentPage(1); // Reset to page 1 when searching
  }, [searchQuery, allSongs]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSongs = filteredSongs.slice(startIndex, endIndex);

  // Pan Responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 30; // Minimum swipe distance
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50 && currentPage < totalPages) {
          // Swipe left (next page)
          setCurrentPage(currentPage + 1);
        } else if (gestureState.dx > 50 && currentPage > 1) {
          // Swipe right (previous page)
          setCurrentPage(currentPage - 1);
        }
      },
    })
  ).current;

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handlePlaySong = (song, index) => {
    playSong(song, filteredSongs, index);
    songService.playSong(song.song_id).catch(console.error);
    navigation.navigate('FullPlayer');
  };

  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handlePlaySong(item, index)}
    >
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist_name}
        </Text>
        {item.average_rating != null && (
          <View style={styles.songRating}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.songRatingText}>
              {Number(item.average_rating).toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="play-circle" size={32} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const renderAlbumItem = ({ item }) => (
    <TouchableOpacity
      style={styles.albumCarouselItem}
      onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
    >
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/120' }}
        style={styles.albumCarouselImage}
      />
      <Text style={styles.albumCarouselTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.albumCarouselArtist} numberOfLines={1}>
        {item.artist_name}
      </Text>
    </TouchableOpacity>
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
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bài hát, nghệ sĩ, album..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Albums Carousel */}
        <View style={styles.carouselSection}>
          <Text style={styles.sectionTitle}>💿 Albums</Text>
          <FlatList
            ref={albumCarouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={albums}
            keyExtractor={(item) => item.album_id.toString()}
            pagingEnabled
            snapToInterval={112 + SIZES.padding}
            decelerationRate="fast"
            onScrollToIndexFailed={(info) => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                albumCarouselRef.current?.scrollToIndex({ index: info.index, animated: true });
              });
            }}
            renderItem={renderAlbumItem}
          />
        </View>

        {/* All Songs List with Pagination */}
        <View style={styles.songsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🎵 Tất cả bài hát {searchQuery && `(${filteredSongs.length})`}
            </Text>
            {totalPages > 1 && (
              <Text style={styles.pageInfo}>
                Trang {currentPage}/{totalPages}
              </Text>
            )}
          </View>
          
          {filteredSongs.length > 0 ? (
            <View {...panResponder.panHandlers}>
              {currentSongs.map((song, index) => (
                <View key={song.song_id}>
                  {renderSongItem({ item: song, index: startIndex + index })}
                </View>
              ))}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={currentPage === 1 ? COLORS.textMuted : COLORS.primary}
                    />
                    <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>
                      Trước
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Page Indicators */}
                  <View style={styles.pageIndicators}>
                    {[...Array(totalPages)].map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.pageIndicator,
                          currentPage === i + 1 && styles.pageIndicatorActive
                        ]}
                        onPress={() => setCurrentPage(i + 1)}
                      >
                        <Text style={[
                          styles.pageIndicatorText,
                          currentPage === i + 1 && styles.pageIndicatorTextActive
                        ]}>
                          {i + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={[styles.pageButtonText, currentPage === totalPages && styles.pageButtonTextDisabled]}>
                      Sau
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={currentPage === totalPages ? COLORS.textMuted : COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Swipe Hint */}
              {totalPages > 1 && (
                <Text style={styles.swipeHint}>
                  💡 Vuốt sang trái/phải để chuyển trang
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Không tìm thấy bài hát nào</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  carouselSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  albumCarouselItem: {
    width: 112, // 150 * 0.75 = 112.5 (nhỏ hơn 25%)
    marginLeft: SIZES.padding,
  },
  albumCarouselImage: {
    width: 112,
    height: 112,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  albumCarouselTitle: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  albumCarouselArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
  },
  songsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  pageInfo: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
    marginHorizontal: SIZES.padding,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
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
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  songRatingText: {
    color: COLORS.text,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  pageButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  pageIndicators: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pageIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(255,255,255,0.1)',
  },
  pageIndicatorActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pageIndicatorText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  pageIndicatorTextActive: {
    color: COLORS.white,
  },
  swipeHint: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  emptySection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 12,
  },
});

export default SearchScreen;

