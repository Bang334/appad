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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminAlbumsScreen = ({ navigation }) => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllAlbums(50, 0);
      setAlbums(response.data || []);
    } catch (error) {
      console.error('Error loading albums:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách album');
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlbums();
    setRefreshing(false);
  };

  const handleViewAlbum = (album) => {
    navigation.navigate('AdminAlbumDetail', { album });
  };

  const handleEditAlbum = (album) => {
    navigation.navigate('AdminEditAlbum', { album });
  };

  const handleDeleteAlbum = async (album) => {
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
              Alert.alert('Thành công', 'Đã xóa album');
              loadAlbums();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa album');
            }
          }
        }
      ]
    );
  };

  const renderAlbumItem = ({ item }) => (
    <View style={styles.albumItem}>
      <View style={styles.albumCover}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={styles.albumImage} />
        ) : (
          <Ionicons name="musical-notes" size={32} color={COLORS.primary} />
        )}
      </View>
      <View style={styles.albumInfo}>
        <Text style={styles.albumName} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.albumArtist} numberOfLines={1}>
          🎤 {item.artist_name || 'Unknown Artist'}
        </Text>
        <Text style={styles.albumStats}>
          🎵 {item.song_count || 0} bài hát • 📅 {new Date(item.release_date).getFullYear()}
        </Text>
        {item.description && (
          <Text style={styles.albumDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <View style={styles.albumActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewAlbum(item)}
        >
          <Ionicons name="eye" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditAlbum(item)}
        >
          <Ionicons name="create" size={20} color={COLORS.warning} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAlbum(item)}
        >
          <Ionicons name="trash" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Quản lý album</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdminEditAlbum', { album: null })}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{albums.length}</Text>
          <Text style={styles.statLabel}>Tổng album</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {albums.reduce((sum, a) => sum + (a.song_count || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Tổng bài hát</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {new Set(albums.map(a => a.artist_id)).size}
          </Text>
          <Text style={styles.statLabel}>Nghệ sĩ</Text>
        </View>
      </View>

      {loading && albums.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.album_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
  },
  listContainer: {
    padding: SIZES.padding,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  albumInfo: {
    flex: 1,
  },
  albumName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  albumArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  albumStats: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    marginBottom: 8,
  },
  albumDescription: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    fontStyle: 'italic',
  },
  albumActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: COLORS.primary + '20',
  },
  editButton: {
    backgroundColor: COLORS.warning + '20',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
  },
});

export default AdminAlbumsScreen;
