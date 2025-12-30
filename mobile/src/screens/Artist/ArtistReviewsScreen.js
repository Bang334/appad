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
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const FilterModal = ({ visible, onClose, title, data, onSelect, selectedValue, renderItem }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 20 }}>
          {data.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.modalOption,
                selectedValue === item.value && styles.modalOptionSelected
              ]}
              onPress={() => {
                onSelect(item.value);
                onClose();
              }}
            >
              {renderItem ? renderItem(item) : (
                 <Text style={[
                  styles.modalOptionText,
                  selectedValue === item.value && styles.modalOptionTextSelected
                ]}>
                  {item.label}
                </Text>
              )}
              {selectedValue === item.value && (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const ArtistReviewsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [songs, setSongs] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest_rating, lowest_rating

  // Modal states
  const [showSongModal, setShowSongModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    loadSongs();
  }, [artistId]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [artistId, selectedSongId, selectedRating, sortBy])
  );

  const loadSongs = async () => {
    try {
      const response = await artistService.getArtistSongs(artistId);
      if (response.success) {
        setSongs(response.data || []);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const params = {
        song_id: selectedSongId,
        rating: selectedRating,
        sort_by: sortBy
      };
      
      const response = await artistService.getReviews(artistId, params);
      if (response.success) {
        setReviews(response.data || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? "star" : "star-outline"}
        size={14}
        color={COLORS.warning}
      />
    ));
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
           <Image
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{item.username || 'Người dùng ẩn danh'}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
          </View>
        </View>
        <View style={styles.songInfo}>
           <Image
             source={{ uri: item.song_cover || 'https://via.placeholder.com/30' }}
             style={styles.miniCover}
           />
           <Text style={styles.songTitle} numberOfLines={1}>{item.song_title}</Text>
        </View>
      </View>
      
      <View style={styles.ratingContainer}>
        {renderStars(item.rating)}
      </View>
      
      {item.content && (
        <Text style={styles.content}>{item.content}</Text>
      )}
    </View>
  );

  // Filter Data
  const songOptions = [
    { label: 'Tất cả bài hát', value: null },
    ...songs.map(s => ({ label: s.title, value: s.song_id, cover: s.cover_url }))
  ];

  const ratingOptions = [
    { label: 'Tất cả đánh giá', value: null },
    { label: '5 Sao', value: 5 },
    { label: '4 Sao', value: 4 },
    { label: '3 Sao', value: 3 },
    { label: '2 Sao', value: 2 },
    { label: '1 Sao', value: 1 },
  ];

  const sortOptions = [
    { label: 'Mới nhất', value: 'newest' },
    { label: 'Cũ nhất', value: 'oldest' },
    { label: 'Đánh giá cao nhất', value: 'highest_rating' },
    { label: 'Đánh giá thấp nhất', value: 'lowest_rating' },
  ];

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá từ khán giả</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Song Filter */}
          <TouchableOpacity 
            style={[styles.filterChip, selectedSongId && styles.filterChipActive]} 
            onPress={() => setShowSongModal(true)}
          >
            <Ionicons name="musical-notes" size={16} color={selectedSongId ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.filterChipText, selectedSongId && styles.filterChipTextActive]}>
              {selectedSongId ? songs.find(s => s.song_id === selectedSongId)?.title || 'Bài hát' : 'Tất cả bài hát'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={selectedSongId ? COLORS.primary : COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Rating Filter */}
          <TouchableOpacity 
            style={[styles.filterChip, selectedRating && styles.filterChipActive]} 
            onPress={() => setShowRatingModal(true)}
          >
            <Ionicons name="star" size={16} color={selectedRating ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.filterChipText, selectedRating && styles.filterChipTextActive]}>
              {selectedRating ? `${selectedRating} Sao` : 'Tất cả sao'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={selectedRating ? COLORS.primary : COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Sort Filter */}
          <TouchableOpacity 
            style={[styles.filterChip, styles.filterChipActive]} 
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={16} color={COLORS.primary} />
            <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
              {sortOptions.find(o => o.value === sortBy)?.label}
            </Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
          </TouchableOpacity>

           {/* Clear Filter */}
           {(selectedSongId || selectedRating) && (
            <TouchableOpacity 
              style={styles.clearFilterButton} 
              onPress={() => {
                setSelectedSongId(null);
                setSelectedRating(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.comment_id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbox-outline" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy đánh giá nào.</Text>
            </View>
        }
      />

      {/* Modals */}
      <FilterModal
        visible={showSongModal}
        onClose={() => setShowSongModal(false)}
        title="Chọn bài hát"
        data={songOptions}
        selectedValue={selectedSongId}
        onSelect={setSelectedSongId}
        renderItem={(item) => (
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {item.cover && <Image source={{ uri: item.cover }} style={{ width: 30, height: 30, borderRadius: 4 }} />}
              <Text style={[
                styles.modalOptionText,
                selectedSongId === item.value && styles.modalOptionTextSelected,
                { flex: 1 }
              ]}>{item.label}</Text>
           </View>
        )}
      />

      <FilterModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Lọc theo đánh giá"
        data={ratingOptions}
        selectedValue={selectedRating}
        onSelect={setSelectedRating}
        renderItem={(item) => (
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[
                  styles.modalOptionText,
                  selectedRating === item.value && styles.modalOptionTextSelected
                ]}>
                  {item.label}
              </Text>
              {item.value && (
                 <View style={{ flexDirection: 'row' }}>
                   {[...Array(item.value)].map((_, i) => (
                     <Ionicons key={i} name="star" size={14} color={COLORS.warning} />
                   ))}
                 </View>
              )}
           </View>
        )}
      />

      <FilterModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        title="Sắp xếp"
        data={sortOptions}
        selectedValue={sortBy}
        onSelect={setSortBy}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: COLORS.background,
  },
  filterScroll: {
    paddingHorizontal: SIZES.padding,
    gap: 10,
    alignItems: 'center'
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  filterChipActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)', // Primary color with opacity
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500'
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  clearFilterButton: {
    padding: 4
  },
  listContent: {
    padding: SIZES.padding,
  },
  reviewItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  username: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 6,
    borderRadius: 6,
    maxWidth: '40%',
    gap: 6
  },
  miniCover: {
      width: 20, 
      height: 20, 
      borderRadius: 4
  },
  songTitle: {
      color: COLORS.textSecondary,
      fontSize: 11,
      flex: 1
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 2,
  },
  content: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
  },
  emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20 // SafeArea bottom
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalScroll: {
    padding: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(29, 185, 84, 0.05)',
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ArtistReviewsScreen;
