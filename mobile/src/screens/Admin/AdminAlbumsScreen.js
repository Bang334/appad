import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminAlbumsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllAlbums(100, 0);
      setAlbums(response.data || []);
    } catch (error) {
      console.error('Error loading albums:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách album');
      setAlbums([]);
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
    Alert.alert(
      'Xóa album',
      `Xóa album "${album.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteAlbum(album.album_id);
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
    <TouchableOpacity 
      style={styles.albumCard}
      onPress={() => navigation.navigate('AdminAlbumDetail', { album: item })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/300' }}
        style={styles.cover}
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.artistName} numberOfLines={1}>Nghệ sĩ: {item.artist_name || 'N/A'}</Text>
        <View style={styles.metaRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.song_count || 0} bài hát</Text>
          </View>
          <Text style={styles.dateText}>
            {item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.iconBtn, { backgroundColor: COLORS.primary + '15' }]}
          onPress={() => navigation.navigate('AdminEditAlbum', { album: item })}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconBtn, { backgroundColor: COLORS.error + '10' }]}
          onPress={() => handleDeleteAlbum(item)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DANH SÁCH ALBUM</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('AdminEditAlbum', { album: null })}>
            <Ionicons name="add" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsSummary}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{albums.length}</Text>
            <Text style={styles.summaryLabel}>Album</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>
              {albums.reduce((sum, a) => sum + (a.song_count || 0), 0)}
            </Text>
            <Text style={styles.summaryLabel}>Tổng bài hát</Text>
          </View>
        </View>
      </View>

      {loading && albums.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.album_id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={60} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Chưa có album nào</Text>
            </View>
          }
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
    backgroundColor: COLORS.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.2,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.divider,
  },
  list: {
    padding: 16,
    paddingTop: 24,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.small,
  },
  cover: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 16,
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tag: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textDisabled,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.textDisabled,
    fontSize: 14,
  },
});

export default AdminAlbumsScreen;

