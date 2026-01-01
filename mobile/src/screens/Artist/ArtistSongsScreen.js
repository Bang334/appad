import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../config/theme';
import { GlobalStyles } from '../../config/styles';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { usePlayer } from '../../context/PlayerContext';
import PremiumBadge from '../../components/Common/PremiumBadge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ArtistSongsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId } = route.params;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showError, showSuccess, showWarning } = useAlert();
  const { playSong } = usePlayer();

  useFocusEffect(
    useCallback(() => {
      loadSongs();
    }, [artistId])
  );

  const loadSongs = async () => {
    try {
      const response = await artistService.getMySongs(artistId);
      if (response.success) {
        setSongs(response.data || []);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
      showError('Lỗi', 'Không thể tải danh sách bài hát');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSongs();
  };

  const handleDeleteSong = async (song) => {
    showWarning(
      'Xóa bài hát',
      `Bạn có chắc muốn xóa bài hát "${song.title}"? Hành động này không thể hoàn tác.`,
      {
        buttons: [
          {
            text: 'Hủy',
            onPress: () => {},
          },
          {
            text: 'Xóa',
            onPress: async () => {
              try {
                await artistService.deleteSong(artistId, song.song_id);
                showSuccess('Thành công', 'Đã xóa bài hát');
                loadSongs();
              } catch (error) {
                showError('Lỗi', 'Không thể xóa bài hát');
              }
            },
            closeOnPress: false,
          },
        ],
      }
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaySong = async (song) => {
    try {
      // Play the song
      await playSong(song, songs, songs.findIndex(s => s.song_id === song.song_id));
      
      // Navigate to full player
      navigation.navigate('FullPlayer');
    } catch (error) {
      console.error('Error playing song:', error);
      showError('Lỗi', 'Không thể phát bài hát');
    }
  };

  const renderSongItem = ({ item }) => {
    const isHidden = item.status === 0;
    const gradientColors = isHidden 
      ? ['#2D1F1F', '#0F0505'] // Red tint for hidden songs
      : ['#161616', '#050505'];

    return (
      <View style={GlobalStyles.songItemWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[GlobalStyles.songItem, isHidden && styles.hiddenSongItem]}
        >
          <TouchableOpacity
            style={GlobalStyles.songContent}
            onPress={() => handlePlaySong(item)}
            activeOpacity={0.8}
          >
            <View style={GlobalStyles.coverContainer}>
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
                style={GlobalStyles.songImage}
              />
              {isHidden && (
                <View style={styles.hiddenOverlay}>
                  <Ionicons name="eye-off" size={20} color="#FFF" />
                </View>
              )}
            </View>

            <View style={GlobalStyles.songInfo}>
              <View style={[GlobalStyles.titleRow, { justifyContent: 'space-between' }]}>
                <Text style={GlobalStyles.songTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {isHidden && (
                    <View style={styles.hiddenBadge}>
                      <Text style={styles.hiddenBadgeText}>Ẩn</Text>
                    </View>
                  )}
                  {item.album_is_premium === 1 ? (
                    <PremiumBadge text="ALBUM PRE" size="small" />
                  ) : (
                    item.is_premium === 1 && <PremiumBadge size="small" />
                  )}
                </View>
              </View>
              <Text style={GlobalStyles.songArtist} numberOfLines={1}>
                {item.album_title || 'Single'}
              </Text>
              <View style={GlobalStyles.songMeta}>
                <Ionicons name="headset" size={12} color="#94A3B8" />
                <Text style={GlobalStyles.metaText}>
                  {item.listen_count?.toLocaleString('vi-VN') || '0'}
                </Text>
                {item.duration > 0 && (
                  <>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={GlobalStyles.metaText}>
                      {formatDuration(item.duration)}
                    </Text>
                  </>
                )}
                {item.is_premium === 1 && (
                  <>
                    <Ionicons name="cash" size={12} color={COLORS.primary} />
                    <Text style={[GlobalStyles.metaText, { color: COLORS.primary }]}>
                      {parseFloat(item.price || 0).toLocaleString('vi-VN')}đ
                    </Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.songActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('ArtistEditSong', { artistId, song: item });
              }}
            >
              <Ionicons name="create-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteSong(item);
              }}
            >
              <Ionicons name="trash-outline" size={24} color={COLORS.error} />
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý bài hát</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ArtistEditSong', { artistId })}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => navigation.navigate('ArtistEditSong', { artistId })}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addFirstButtonText}>Thêm bài hát đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.song_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        />
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  // Song actions (edit, delete buttons)
  songActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 6,
  },
  // Hidden song styling
  hiddenSongItem: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    opacity: 0.85,
  },
  hiddenOverlay: {
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
  hiddenBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hiddenBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ArtistSongsScreen;

