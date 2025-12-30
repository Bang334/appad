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
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { songService } from '../../services/songService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AdminAlbumDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlbumSongs();
  };

  const handleDeleteAlbum = async () => {
    Alert.alert(
      'Xác nhận xóa',
      `Xóa album "${album.title}"? Dữ liệu này không thể khôi phục.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteAlbum(album.album_id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Lỗi', 'Thao tác xóa thất bại');
            }
          }
        }
      ]
    );
  };

  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.songCard}
      onPress={() => navigation.navigate('AdminEditSong', { song: item })}
      activeOpacity={0.7}
    >
      <View style={styles.songIndex}>
        <Text style={styles.indexText}>{(index + 1).toString().padStart(2, '0')}</Text>
      </View>
      <View style={styles.songCore}>
        <View style={styles.songTitleRow}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
          {item.is_premium === 1 && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
          {item.status === 0 && (
            <View style={styles.hiddenBadge}>
              <Text style={styles.hiddenBadgeText}>ẨN</Text>
            </View>
          )}
        </View>
        <Text style={styles.songSub} numberOfLines={1}>
          {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '0:00'} • 👁️ {item.listen_count || 0}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.moreBtn}
        onPress={() => navigation.navigate('AdminEditSong', { song: item })}
      >
        <Ionicons name="create-outline" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header Container */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>CHI TIẾT ALBUM</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AdminEditAlbum', { album })} 
            style={styles.iconBtn}
          >
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.albumIdentity}>
          <View style={styles.imageShadow}>
            <Image 
              source={{ uri: album.cover_url || 'https://via.placeholder.com/300' }} 
              style={styles.mainCover} 
            />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.mainTitle} numberOfLines={2}>{album.title}</Text>
            <Text style={styles.artistName}>🎤 {album.artist_name || 'N/A'}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.pillBadge}>
                <Ionicons name="musical-notes" size={12} color={COLORS.primary} />
                <Text style={styles.pillText}>{albumSongs.length} bài hát</Text>
              </View>
              <Text style={styles.yearText}>
                {album.release_date ? new Date(album.release_date).getFullYear() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('AdminEditAlbum', { album })}
          >
            <Ionicons name="settings-outline" size={18} color="#FFF" />
            <Text style={styles.mainActionText}>Cập nhật thông tin</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: COLORS.error + '20', borderWidth: 1, borderColor: COLORS.error }]}
            onPress={handleDeleteAlbum}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            <Text style={[styles.mainActionText, { color: COLORS.error }]}>Xóa Album</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={albumSongs}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.song_id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={styles.listLabel}>DANH SÁCH BÀI HÁT</Text>}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={60} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Album này đang trống</Text>
            </View>
          )
        }
      />
      <MiniPlayer bottomOffset={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 24,
    ...SHADOWS.medium,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumIdentity: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  imageShadow: {
    ...SHADOWS.large,
    elevation: 10,
  },
  mainCover: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  identityText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  pillText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  yearText: {
    fontSize: 12,
    color: COLORS.textDisabled,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  mainActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  mainActionText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    padding: 24,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  songIndex: {
    width: 32,
    alignItems: 'center',
  },
  indexText: {
    fontSize: 12,
    color: COLORS.textDisabled,
    fontWeight: '900',
  },
  songCore: {
    flex: 1,
    paddingHorizontal: 12,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    flexShrink: 1,
  },
  premiumBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  premiumBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
  },
  hiddenBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hiddenBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
  },
  songSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  moreBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.textDisabled,
    fontSize: 14,
  },
});

export default AdminAlbumDetailScreen;
