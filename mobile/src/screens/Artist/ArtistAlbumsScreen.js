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

const ArtistAlbumsScreen = ({ route, navigation }) => {
  const { artistId } = route.params;
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showError, showSuccess, showWarning } = useAlert();

  useFocusEffect(
    useCallback(() => {
      loadAlbums();
    }, [artistId])
  );

  const loadAlbums = async () => {
    try {
      const response = await artistService.getMyAlbums(artistId);
      if (response.success) {
        setAlbums(response.data || []);
      }
    } catch (error) {
      console.error('Error loading albums:', error);
      showError('Lỗi', 'Không thể tải danh sách album');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlbums();
  };

  const handleDeleteAlbum = async (album) => {
    showWarning(
      'Xóa album',
      `Bạn có chắc muốn xóa album "${album.title}"? Hành động này không thể hoàn tác.`,
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
                await artistService.deleteAlbum(artistId, album.album_id);
                showSuccess('Thành công', 'Đã xóa album');
                loadAlbums();
              } catch (error) {
                showError('Lỗi', 'Không thể xóa album');
              }
            },
            closeOnPress: false,
          },
        ],
      }
    );
  };

  const renderAlbumItem = ({ item }) => (
    <TouchableOpacity
      style={styles.albumItem}
      onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
    >
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/120' }}
        style={styles.albumImage}
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.release_date && (
          <Text style={styles.albumDate}>
            {new Date(item.release_date).toLocaleDateString('vi-VN')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteAlbum(item)}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Quản lý album</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ArtistEditAlbum', { artistId })}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {albums.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="albums-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có album nào</Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => navigation.navigate('ArtistEditAlbum', { artistId })}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addFirstButtonText}>Thêm album đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.album_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          numColumns={2}
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
  albumItem: {
    flex: 1,
    margin: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
  },
  albumInfo: {
    padding: 12,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  albumDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
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

export default ArtistAlbumsScreen;

