import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminReviewsMainScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [artists, setArtists] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        adminService.getAllUsers(500, 0),
        adminService.getReviewStats()
      ]);

      if (usersRes.success) {
        setArtists(usersRes.data.filter(u => u.role === 'artist'));
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error loading review data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredArtists = artists.filter(a => 
    (a.artist_name || a.username).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatCard = (title, value, icon, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  const renderRankItem = (item, index, color = COLORS.primary) => (
    <View key={item.artist_id} style={styles.rankRow}>
        <View style={[styles.rankBadge, { backgroundColor: color }]}>
            <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        <View style={styles.rankInfo}>
          <Text style={styles.rankName} numberOfLines={1}>{item.artist_name}</Text>
          <Text style={styles.rankSubText}>{item.review_count} bình luận</Text>
        </View>
        <View style={styles.rankValueBox}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
            <Text style={styles.rankScoreText}>{Number(item.avg_rating).toFixed(1)}</Text>
        </View>
    </View>
  );

  const renderArtistItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.artistCard}
      onPress={() => navigation.navigate('AdminArtistReviews', { 
        artistId: item.artist_id, 
        artistName: item.artist_name || item.username 
      })}
    >
        <Image 
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }} 
            style={styles.artistAvatar} 
        />
        <View style={styles.artistMeta}>
            <Text style={styles.artistNameSimple} numberOfLines={1}>{item.artist_name || item.username}</Text>
            <Text style={styles.artistSub} numberOfLines={1}>Nghệ sĩ</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textDisabled} />
    </TouchableOpacity>
  );

  const Header = useCallback(() => (
    <View>
      <LinearGradient
        colors={[COLORS.backgroundSecondary, COLORS.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QUẢN LÝ ĐÁNH GIÁ</Text>
          <View style={{ width: 44 }} />
        </View>

        <TouchableOpacity 
            style={styles.allReviewsBtn}
            onPress={() => navigation.navigate('AdminAllReviews')}
        >
            <LinearGradient colors={['#1DB954', '#1AA34A']} style={styles.allReviewsGradient}>
                <View style={styles.allReviewsContent}>
                    <View>
                        <Text style={styles.allReviewsTitle}>Xem Tất Cả Đánh Giá</Text>
                        <Text style={styles.allReviewsSub}>Toàn bộ hệ thống ({stats?.total_reviews || 0})</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={32} color="#FFF" />
                </View>
            </LinearGradient>
        </TouchableOpacity>

        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              placeholder="Tìm kiếm nghệ sĩ..."
              placeholderTextColor={COLORS.textDisabled}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
        </View>
      </LinearGradient>

      {stats && (
        <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
                {renderStatCard('Tổng đánh giá', stats.total_reviews, 'chatbubbles', COLORS.primary)}
                {renderStatCard('Đánh giá TB', Number(stats.avg_rating || 0).toFixed(1), 'star', COLORS.warning)}
            </View>

            <View style={styles.rankingSection}>
                <Text style={styles.sectionHeading}>🔥 TOP ĐÁNH GIÁ</Text>
                <View style={styles.rankingBox}>
                  {stats.top_artists.slice(0, 5).map((artist, index) => renderRankItem(artist, index, COLORS.primary))}
                </View>
            </View>

            <View style={styles.rankingSection}>
                <Text style={styles.sectionHeading}>🏆 NGHỆ SĨ YÊU THÍCH</Text>
                <View style={[styles.rankingBox, { borderColor: COLORS.warning + '30' }]}>
                  {stats.best_rated_artists.slice(0, 5).map((artist, index) => renderRankItem(artist, index, COLORS.warning))}
                </View>
            </View>

            <Text style={[styles.sectionHeading, { marginBottom: 12 }]}>🎵 DANH SÁCH NGHỆ SĨ</Text>
        </View>
      )}
    </View>
  ), [stats, searchQuery, insets.top]);

  if (loading && !refreshing) {
      return (
          <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={filteredArtists}
        renderItem={renderArtistItem}
        keyExtractor={(item) => item.user_id.toString()}
        ListHeaderComponent={Header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
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
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    textAlign: 'center',
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allReviewsBtn: {
      marginHorizontal: 16,
      marginBottom: 20,
      borderRadius: 16,
      overflow: 'hidden',
      ...SHADOWS.medium,
  },
  allReviewsGradient: {
      padding: 20,
  },
  allReviewsContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  allReviewsTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: 'bold',
  },
  allReviewsSub: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 13,
      marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    paddingLeft: 10,
    fontSize: 14,
  },
  statsSection: {
      padding: 16,
  },
  statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
  },
  statCard: {
      flex: 1,
      backgroundColor: COLORS.surface,
      padding: 16,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: COLORS.divider,
  },
  statIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  },
  statValue: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: 'bold',
  },
  statLabel: {
      color: COLORS.textSecondary,
      fontSize: 11,
  },
  rankingSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  rankingBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    overflow: 'hidden',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  rankInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  rankName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankSubText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  rankValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankScoreText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  artistCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: COLORS.surface,
      marginBottom: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.divider,
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  artistMeta: {
      flex: 1,
  },
  artistNameSimple: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: 'bold',
  },
  artistSub: {
      color: COLORS.textSecondary,
      fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminReviewsMainScreen;

