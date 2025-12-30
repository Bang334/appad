import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { premiumService } from '../../services/premiumService';
import { usePlayer } from '../../context/PlayerContext';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PurchasedSongsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

  const fetchPurchasedSongs = async () => {
    try {
      const response = await premiumService.getPurchasedSongs();
      if (response.success) {
        setSongs(response.data);
      }
    } catch (error) {
      console.error('Error fetching purchased songs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPurchasedSongs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPurchasedSongs();
  };

  const handlePlaySong = (song, index) => {
    // If clicking on currently playing song, toggle play/pause
    if (currentSong?.song_id === song.song_id) {
      togglePlayPause();
    } else {
      // Play new song
      playSong(song, songs, index);
    }
  };

  const handleSongPress = async (song, index) => {
    // Always open FullPlayer first for faster UX
    navigation.navigate('FullPlayer');

    // Play song if different from current
    if (currentSong?.song_id !== song.song_id) {
      await playSong(song, songs, index);
    }
  };

  const renderSongItem = ({ item, index }) => {
    const isCurrentSong = currentSong?.song_id === item.song_id;

    return (
      <View style={[styles.songItem, isCurrentSong && styles.songItemActive]}>
        <TouchableOpacity
          style={styles.songContent}
          onPress={() => handleSongPress(item, index)}
          activeOpacity={0.7}
        >
          <View style={styles.coverContainer}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.cover} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="musical-note" size={24} color={COLORS.textSecondary} />
            </View>
          )}
          {isCurrentSong && isPlaying && (
            <View style={styles.playingIndicator}>
              <Ionicons name="volume-high" size={20} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.artist_name && (
            <Text style={styles.artistName} numberOfLines={1}>
              {item.artist_name}
            </Text>
          )}
          <Text style={styles.purchaseDate}>
            Mua ngày: {new Date(item.purchase_date).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {parseFloat(item.price_paid).toLocaleString('vi-VN')}đ
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.playIconButton}
        onPress={() => handlePlaySong(item, index)}
      >
        <Ionicons 
          name={isCurrentSong && isPlaying ? "pause-circle" : "play-circle"} 
          size={36} 
          color={COLORS.primary} 
        />
      </TouchableOpacity>
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

  if (songs.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <Ionicons name="musical-notes-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Bạn chưa mua bài hát nào</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Khám phá ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={songs}
        renderItem={renderSongItem}
        keyExtractor={(item) => `purchased-${item.song_id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  listContent: {
    padding: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  songItemActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  songContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coverContainer: {
    position: 'relative',
    marginRight: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
  songInfo: {
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
  purchaseDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    marginLeft: 12,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  playIconButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default PurchasedSongsScreen;

