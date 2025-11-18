import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { songService } from '../../services/songService';

const AdminSongsScreen = ({ navigation }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllSongs(50, 0, searchQuery);
      setSongs(response.data || []);
    } catch (error) {
      console.error('Error loading songs:', error);
      // Fallback to regular song API if admin API fails
      try {
        const fallbackResponse = await songService.getAllSongs(50, 0);
        setSongs(fallbackResponse.data || []);
      } catch (fallbackError) {
        Alert.alert('Lỗi', 'Không thể tải danh sách bài hát');
        setSongs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSongs();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setTimeout(() => loadSongs(), 500); // Debounce search
  };

  const handleEditSong = (song) => {
    navigation.navigate('AdminEditSong', { song });
  };

  const handleDeleteSong = async (song) => {
    Alert.alert(
      'Xóa bài hát',
      `Bạn có chắc muốn xóa bài hát "${song.title}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteSong(song.song_id);
              Alert.alert('Thành công', 'Đã xóa bài hát');
              loadSongs();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa bài hát');
            }
          }
        }
      ]
    );
  };

  const renderSongItem = ({ item }) => (
    <View style={styles.songItem}>
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
        <Text style={styles.songAlbum} numberOfLines={1}>
          {item.album_title || 'Single'}
        </Text>
        <View style={styles.songMeta}>
          <Text style={styles.songGenre}>{item.genre_name}</Text>
          <Text style={styles.songPlays}>
            👁️ {(item.listen_count || 0).toLocaleString()}
          </Text>
        </View>
      </View>
      <View style={styles.songActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditSong(item)}
        >
          <Ionicons name="create" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSong(item)}
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
        <Text style={styles.title}>Quản lý bài hát</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdminEditSong', { song: null })}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bài hát..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading && songs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.song_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 2,
  },
  songAlbum: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 8,
  },
  songMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  songGenre: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '500',
  },
  songPlays: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
  },
  songActions: {
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
  editButton: {
    backgroundColor: COLORS.primary + '20',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
  },
});

export default AdminSongsScreen;
