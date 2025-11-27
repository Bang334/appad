import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { songService } from '../../services/songService';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminAlbumDetailScreen = ({ route, navigation }) => {
  const { album } = route.params;
  const [albumSongs, setAlbumSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlbumSongs();
  }, []);

  const loadAlbumSongs = async () => {
    setLoading(true);
    try {
      const response = await songService.getSongsByAlbum(album.album_id);
      setAlbumSongs(response.data || []);
    } catch (error) {
      console.error('Error loading album songs:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bài hát');
      setAlbumSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlbumSongs();
    setRefreshing(false);
  };

  const handleEditAlbum = () => {
    navigation.navigate('AdminEditAlbum', { album });
  };

  const handleDeleteAlbum = async () => {
    Alert.alert(
      'Xóa album',
      `Bạn có chắc muốn xóa album "${album.title}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteAlbum(album.album_id);
              Alert.alert('Thành công', 'Đã xóa album', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa album');
            }
          }
        }
      ]
    );
  };

  const handleViewSong = (song) => {
    navigation.navigate('AdminEditSong', { song });
  };

  const renderSongItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.songItem}
      onPress={() => handleViewSong(item)}
    >
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist_name}
        </Text>
        <Text style={styles.songDuration}>
          {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '0:00'}
        </Text>
      </View>
      <View style={styles.songStats}>
        <Text style={styles.listenCount}>
          👁️ {item.listen_count || 0}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Chi tiết album</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditAlbum}
        >
          <Ionicons name="create" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.albumInfo}>
        <View style={styles.albumCoverContainer}>
          {album.cover_url ? (
            <Image source={{ uri: album.cover_url }} style={styles.albumCover} />
          ) : (
            <View style={styles.albumCoverPlaceholder}>
              <Ionicons name="musical-notes" size={60} color={COLORS.primary} />
            </View>
          )}
        </View>
        
        <View style={styles.albumDetails}>
          <Text style={styles.albumTitle}>{album.title}</Text>
          <Text style={styles.albumArtist}>🎤 {album.artist_name || 'Unknown Artist'}</Text>
          <Text style={styles.albumReleaseDate}>
            📅 {new Date(album.release_date).toLocaleDateString('vi-VN')}
          </Text>
          <Text style={styles.albumStats}>
            🎵 {albumSongs.length} bài hát
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditAlbum}>
          <Ionicons name="create" size={20} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteAlbum}>
          <Ionicons name="trash" size={20} color={COLORS.error} />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa album</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.songsSection}>
        <Text style={styles.sectionTitle}>Danh sách bài hát</Text>
        
        {loading && albumSongs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : albumSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Album này chưa có bài hát nào</Text>
          </View>
        ) : (
          <FlatList
            data={albumSongs}
            renderItem={renderSongItem}
            keyExtractor={(item) => item.song_id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumInfo: {
    flexDirection: 'row',
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    margin: SIZES.padding,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  albumCoverContainer: {
    marginRight: 16,
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  albumCoverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  albumTitle: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  albumArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginBottom: 4,
  },
  albumReleaseDate: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  albumStats: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  deleteButton: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '10',
  },
  actionButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: COLORS.error,
  },
  songsSection: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
    textAlign: 'center',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    marginBottom: 4,
  },
  songDuration: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  songStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listenCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
  },
});

export default AdminAlbumDetailScreen;
