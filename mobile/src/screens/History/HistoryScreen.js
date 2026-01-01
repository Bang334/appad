import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { historyService } from '../../services/historyService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import PremiumBadge from '../../components/Common/PremiumBadge';
//  // Removed redundant import


const HistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [historyByDay, setHistoryByDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // REMOVED usePlayer from here - will use in child component only

  // Add header with back button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Lịch sử nghe nhạc',
      headerStyle: {
        backgroundColor: COLORS.background,
      },
      headerTintColor: COLORS.text,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      // Only load if we don't have data yet
      if (historyByDay.length === 0 && !loading) {
        loadHistory();
      }
    }, []) // Empty deps - only check on first focus
  );

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await historyService.getUserHistoryByDay(100);
      if (response.success) {
        setHistoryByDay(response.data || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Normalize dateString to YYYY-MM-DD format
      let normalizedDate = '';
      if (typeof dateString === 'string') {
        normalizedDate = dateString.split('T')[0].split(' ')[0];
      } else if (dateString instanceof Date) {
        const year = dateString.getFullYear();
        const month = String(dateString.getMonth() + 1).padStart(2, '0');
        const day = String(dateString.getDate()).padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      } else {
        normalizedDate = String(dateString).split('T')[0].split(' ')[0];
      }
      
      // Validate format (should be YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        return String(dateString);
      }
      
      // Get today and yesterday as YYYY-MM-DD strings
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayYear = yesterday.getFullYear();
      const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
      
      // Compare date strings directly
      if (normalizedDate === todayStr) {
        return 'Hôm nay';
      }
      if (normalizedDate === yesterdayStr) {
        return 'Hôm qua';
      }
      
      // Format as date
      const [dateYear, dateMonth, dateDay] = normalizedDate.split('-').map(Number);
      const date = new Date(dateYear, dateMonth - 1, dateDay);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return String(dateString);
    }
  };

  // Song Item Component - Isolated with usePlayer to prevent parent re-renders
  const SongItemWithPlayer = React.memo(({ song, songs, index, navigation }) => {
    const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
    const isCurrentSong = currentSong?.song_id === song.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;

    const handlePlaySong = () => {
      if (currentSong?.song_id === song.song_id) {
        togglePlayPause();
      } else {
        playSong(song, songs, index);
      }
    };

    return (
      <TouchableOpacity
        style={styles.songItem}
        onPress={() => {
          if (currentSong?.song_id !== song.song_id) {
            playSong(song, songs, index);
          }
          navigation.navigate('FullPlayer');
        }}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
          style={styles.songImage}
        />
        <View style={styles.songInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            {song.album_is_premium === 1 ? (
              <PremiumBadge text="ALBUM PRE" size="small" style={styles.premiumBadge} />
            ) : (
              song.is_premium === 1 && <PremiumBadge size="small" style={styles.premiumBadge} />
            )}
          </View>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist_name || 'Nghệ sĩ không xác định'}
          </Text>
          <View style={styles.songMeta}>
            {song.count > 0 && (
              <>
                <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
                <Text style={styles.songCount}>
                  {song.count} lần
                </Text>
              </>
            )}
            {song.total_duration > 0 && (
              <>
                {song.count > 0 && <Text style={styles.metaDot}>•</Text>}
                <Ionicons 
                  name={song.completed_count === song.count ? "checkmark-circle" : "play-circle"} 
                  size={12} 
                  color={song.completed_count === song.count ? COLORS.success : COLORS.textMuted} 
                />
                <Text style={styles.songTime}>
                  {song.completed_count === song.count 
                    ? `Hoàn thành • ${Math.floor(song.total_duration / 60)} phút`
                    : `${Math.floor((song.completed_count / song.count) * 100)}% • ${Math.floor(song.total_duration / 60)} phút`
                  }
                </Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handlePlaySong();
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isCurrentPlaying ? "pause-circle" : "play-circle"} 
            size={32} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  });

  const renderSongItem = ({ item, index, songs }) => {
    return (
      <SongItemWithPlayer 
        song={item} 
        songs={songs} 
        index={index} 
        navigation={navigation}
      />
    );
  };

  const renderDaySection = ({ item, index }) => {
    if (!item.songs || item.songs.length === 0) return null;

    return (
      <View style={[styles.daySection]}>
        {index === 0 && <View style={styles.daySectionSpacer} />}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDate(item.day)}</Text>
          <Text style={styles.daySubtitle}>
            {item.song_count} bài hát
          </Text>
        </View>
        {item.songs.map((song, songIndex) => (
          <View key={`song-${song.song_id}-${songIndex}-${item.day}`}>
            {renderSongItem({ item: song, index: songIndex, songs: item.songs })}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
      </View>
    );
  }

  if (historyByDay.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Chưa có lịch sử nghe nhạc</Text>
        <Text style={styles.emptySubtext}>
          Bắt đầu nghe nhạc để xem lịch sử của bạn
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <FlatList
        data={historyByDay}
        renderItem={renderDaySection}
        keyExtractor={(item, index) => `day-${item.day}-${index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

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
  list: {
    paddingTop: 0,
    paddingBottom: 100,
  },
  daySection: {
    marginBottom: 24,
  },
  daySectionSpacer: {
    height: SIZES.padding * 1.5, // 24px
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  dayTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  daySubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: COLORS.surface,
  },
  songInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  premiumBadge: {
    marginLeft: 6,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 2,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  songTime: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  songCount: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default React.memo(HistoryScreen);


