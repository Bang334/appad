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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { historyService } from '../../services/historyService';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import PremiumBadge from '../../components/Common/PremiumBadge';
import MiniPlayer from '../../components/Player/MiniPlayer';

const HistoryScreen = ({ navigation }) => {
  const [historyByDay, setHistoryByDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

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
      loadHistory();
    }, [])
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
      // Handle both string and Date object
      let normalizedDate = '';
      if (typeof dateString === 'string') {
        // Remove time part if exists (T or space)
        normalizedDate = dateString.split('T')[0].split(' ')[0];
      } else if (dateString instanceof Date) {
        // If it's a Date object, convert to YYYY-MM-DD
        const year = dateString.getFullYear();
        const month = String(dateString.getMonth() + 1).padStart(2, '0');
        const day = String(dateString.getDate()).padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      } else {
        // Try to convert to string first
        normalizedDate = String(dateString).split('T')[0].split(' ')[0];
      }
      
      // Validate format (should be YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        console.warn('Invalid date format:', dateString, '->', normalizedDate);
        return String(dateString);
      }
      
      // Get today and yesterday as YYYY-MM-DD strings (in LOCAL timezone, not UTC)
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
      
      // Debug log - uncomment to debug date comparison issues
      console.log('Date comparison:', { 
        original: dateString, 
        normalized: normalizedDate, 
        today: todayStr, 
        yesterday: yesterdayStr,
        isToday: normalizedDate === todayStr,
        isYesterday: normalizedDate === yesterdayStr
      });
      
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


  const handlePlaySong = (song, songs, index) => {
    // If clicking on the currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      // Otherwise, play the new song (don't navigate to FullPlayer)
      playSong(song, songs, index);
    }
  };

  const renderSongItem = ({ item, index, songs }) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;
    const isCurrentPlaying = isCurrentSong && isPlaying;

    return (
      <TouchableOpacity
        style={styles.songItem}
        onPress={() => {
          // Navigate to FullPlayer when clicking on song item
          if (currentSong?.song_id !== item.song_id) {
            playSong(item, songs, index);
          }
          navigation.navigate('FullPlayer');
        }}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
          style={styles.songImage}
        />
        <View style={styles.songInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.is_premium === 1 && (
              <PremiumBadge size="small" style={styles.premiumBadge} />
            )}
          </View>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist_name || 'Nghệ sĩ không xác định'}
          </Text>
          <View style={styles.songMeta}>
            {item.count > 0 && (
              <>
                <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
                <Text style={styles.songCount}>
                  {item.count} lần
                </Text>
              </>
            )}
            {item.total_duration > 0 && (
              <>
                {item.count > 0 && <Text style={styles.metaDot}>•</Text>}
                <Ionicons 
                  name={item.completed_count === item.count ? "checkmark-circle" : "play-circle"} 
                  size={12} 
                  color={item.completed_count === item.count ? COLORS.success : COLORS.textMuted} 
                />
                <Text style={styles.songTime}>
                  {item.completed_count === item.count 
                    ? `Hoàn thành • ${Math.floor(item.total_duration / 60)} phút`
                    : `${Math.floor((item.completed_count / item.count) * 100)}% • ${Math.floor(item.total_duration / 60)} phút`
                  }
                </Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering parent onPress
            handlePlaySong(item, songs, index);
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
    <View style={styles.container}>
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
      <MiniPlayer bottomOffset={0} />
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

export default HistoryScreen;

