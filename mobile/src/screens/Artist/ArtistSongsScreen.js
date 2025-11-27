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
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { usePlayer } from '../../context/PlayerContext';

const ArtistSongsScreen = ({ route, navigation }) => {
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

  const renderSongItem = ({ item }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handlePlaySong(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.songMeta}>
          <Ionicons name="headset" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>
            {item.listen_count?.toLocaleString('vi-VN') || '0'} lượt nghe
          </Text>
          {item.is_premium === 1 && (
            <>
              <Text style={styles.metaSeparator}>•</Text>
              <Ionicons name="cash" size={12} color={COLORS.primary} />
              <Text style={styles.metaText}>
                {parseFloat(item.price || 0).toLocaleString('vi-VN')}đ
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.songActions}>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        <TouchableOpacity
          style={[styles.actionButton, { marginLeft: 12 }]}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ArtistEditSong', { artistId, song: item });
          }}
        >
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { marginLeft: 4 }]}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteSong(item);
          }}
        >
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
          contentContainerStyle={styles.listContent}
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
    paddingTop: 60,
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
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metaSeparator: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButton: {
    padding: 8,
  },
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

