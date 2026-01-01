import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { adminService } from '../../services/adminService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminSongsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
      Alert.alert('Lỗi', 'Không thể tải danh sách bài hát');
      setSongs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSongs();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSongs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDeleteSong = async (song) => {
    Alert.alert(
      'Xóa bài hát',
      `Xóa bài hát "${song.title}" khỏi hệ thống?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteSong(song.song_id);
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
    <View style={styles.songCard}>
      <View style={styles.songMain}>
        <Image
          source={{ uri: item.cover_url || 'https://via.placeholder.com/150' }}
          style={styles.cover}
        />
        <View style={styles.info}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.artistName} numberOfLines={1}>🎤 {item.artist_name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="play-outline" size={12} color={COLORS.textDisabled} />
              <Text style={styles.statText}>{(item.listen_count || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statDot} />
            <Text style={styles.statText}>{item.genre_name || 'Khác'}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.iconBtn, { backgroundColor: COLORS.primary + '15' }]}
          onPress={() => navigation.navigate('AdminEditSong', { song: item })}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconBtn, { backgroundColor: COLORS.error + '10' }]}
          onPress={() => handleDeleteSong(item)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KHO BÀI HÁT</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('AdminEditSong', { song: null })}>
            <Ionicons name="add" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textDisabled} />
          <TextInput
            placeholder="Tìm theo tiêu đề, nghệ sĩ..."
            placeholderTextColor={COLORS.textDisabled}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textDisabled} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && songs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.song_id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={60} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Không tìm thấy bài hát nào</Text>
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
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFF',
    paddingLeft: 8,
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  songMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textDisabled,
    marginHorizontal: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
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

export default AdminSongsScreen;

