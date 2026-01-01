import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { premiumService } from '../../services/premiumService';
import { useFocusEffect } from '@react-navigation/native';
import { usePlayer } from '../../context/PlayerContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PurchaseHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

  const fetchData = async () => {
    try {
      const [historyResponse, spentResponse] = await Promise.all([
        premiumService.getPurchaseHistory(),
        premiumService.getTotalSpent(),
      ]);

      if (historyResponse.success) {
        setHistory(historyResponse.data);
      }

      if (spentResponse.success) {
        setTotalSpent(spentResponse.data.total_spent);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePlaySong = (song, index) => {
    // If clicking on currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      // Play new song
      playSong(song, history, index);
    }
  };

  const handleSongPress = async (song, index) => {
    // Always open FullPlayer first for faster UX
    navigation.navigate('FullPlayer');

    // Play song if different from current
    if (currentSong?.song_id !== song.song_id) {
      await playSong(song, history, index);
    }
  };

  const renderHistoryItem = ({ item, index }) => {
    const isCurrentSong = item.type === 'song' && currentSong?.song_id === item.song_id;
    const isPremiumSubscription = item.type === 'premium_subscription';
    const isAlbum = item.type === 'album';

    const getItemTitle = () => {
      if (isPremiumSubscription) {
        return item.description || 'Đăng ký Premium';
      }
      return item.title || 'Không có tiêu đề';
    };

    const getItemSubtitle = () => {
      if (isPremiumSubscription) {
        return 'Gói Premium';
      }
      if (isAlbum) {
        return item.artist_name ? `${item.artist_name} • Album` : 'Album';
      }
      return item.artist_name || '';
    };

    const getItemIcon = () => {
      if (isPremiumSubscription) {
        return 'star';
      }
      if (isAlbum) {
        return 'disc';
      }
      return 'musical-note';
    };

    return (
      <View style={[styles.historyItem, isCurrentSong && styles.historyItemActive]}>
        <TouchableOpacity
          style={styles.historyContent}
          onPress={() => {
            if (item.type === 'song') {
              handleSongPress(item, index);
            } else if (item.type === 'album') {
              navigation.navigate('AlbumDetail', { albumId: item.album_id });
            }
            // Premium subscription không có action
          }}
          activeOpacity={0.7}
          disabled={isPremiumSubscription}
        >
        <View style={styles.coverContainer}>
          {isPremiumSubscription ? (
            <View style={[styles.iconCover, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name={getItemIcon()} size={30} color={COLORS.primary} />
            </View>
          ) : (
            <>
              <Image
                source={{ uri: item.cover_url || 'https://via.placeholder.com/60' }}
                style={styles.songCover}
              />
              {isCurrentSong && isPlaying && (
                <View style={styles.playingIndicator}>
                  <Ionicons name="volume-high" size={20} color="#FFF" />
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {getItemTitle()}
            </Text>
            {isPremiumSubscription && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color={COLORS.primary} />
              </View>
            )}
          </View>
          {getItemSubtitle() && (
            <Text style={styles.artistName} numberOfLines={1}>
              {getItemSubtitle()}
            </Text>
          )}
          <Text style={styles.date}>
            {new Date(item.purchase_date).toLocaleString('vi-VN')}
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {parseFloat(item.price_paid || item.total_amount || 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>
        </TouchableOpacity>
        {item.type === 'song' && (
          <TouchableOpacity
            style={styles.playIconButton}
            onPress={() => handlePlaySong(item, index)}
          >
            <Ionicons 
              name={isCurrentSong && isPlaying ? "pause-circle" : "play-circle"} 
              size={32} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tổng chi tiêu</Text>
        <Text style={styles.summaryAmount}>
          {parseFloat(totalSpent).toLocaleString('vi-VN')}đ
        </Text>
        <Text style={styles.summaryCount}>
          {history.length} giao dịch
        </Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có lịch sử mua hàng</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => {
            if (item.type === 'premium_subscription') {
              return `history-premium-${item.sharing_id || item.transaction_id}`;
            }
            return `history-${item.type}-${item.purchase_id || item.album_id || item.song_id}`;
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 100 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyItemActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coverContainer: {
    position: 'relative',
    marginRight: 12,
  },
  songCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  playingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    marginLeft: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  playIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumBadge: {
    marginLeft: 8,
    padding: 2,
    borderRadius: 4,
    backgroundColor: COLORS.primary + '20',
  },
  iconCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PurchaseHistoryScreen;

