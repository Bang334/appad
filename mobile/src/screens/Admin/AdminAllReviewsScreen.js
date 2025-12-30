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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const AdminAllReviewsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  // Modal states
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    loadArtists();
  }, []);

  useEffect(() => {
     loadReviews();
  }, [selectedArtistId, selectedRating, sortBy]);

  const loadArtists = async () => {
    try {
      const response = await adminService.getAllUsers(500, 0); // Simplified: getting artists from user list
      if (response.success) {
        setArtists(response.data.filter(u => u.role === 'artist') || []);
      }
    } catch (error) {
      console.error('Error loading artists:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = {
        artist_id: selectedArtistId,
        rating: selectedRating,
        sort_by: sortBy
      };
      
      const response = await adminService.getAllReviews(params);
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

  const handleDeleteReview = (reviewId) => {
    Alert.alert(
      'Xóa đánh giá',
      'Bạn có chắc chắn muốn xóa đánh giá này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
             try {
               const response = await adminService.deleteReview(reviewId);
               if (response.success) {
                 loadReviews();
               }
             } catch (error) {
               console.error('Error deleting review:', error);
             }
          }
        }
      ]
    );
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
        <View style={styles.artistTag}>
           <Text style={styles.artistNameSmall}>{item.artist_name || 'N/A'}</Text>
        </View>
      </View>
      
      <View style={styles.songPreview}>
         <Image source={{ uri: item.song_cover }} style={styles.miniCover} />
         <Text style={styles.songTitle} numberOfLines={1}>{item.song_title}</Text>
      </View>

      <View style={styles.ratingContainer}>
        {renderStars(item.rating)}
      </View>
      
      {item.content && (
        <Text style={styles.content}>{item.content}</Text>
      )}

      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => handleDeleteReview(item.comment_id)}
      >
        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        <Text style={styles.deleteButtonText}>Xóa đánh giá</Text>
      </TouchableOpacity>
    </View>
  );

  const artistOptions = [
    { label: 'Tất cả nghệ sĩ', value: null },
    ...artists.map(a => ({ label: a.artist_name || a.username, value: a.artist_id }))
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TẤT CẢ ĐÁNH GIÁ</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, selectedArtistId && styles.filterChipActive]} 
            onPress={() => setShowArtistModal(true)}
          >
            <Ionicons name="mic" size={16} color={selectedArtistId ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.filterChipText, selectedArtistId && styles.filterChipTextActive]}>
              {selectedArtistId ? artists.find(a => a.artist_id === selectedArtistId)?.artist_name || 'Nghệ sĩ' : 'Tất cả nghệ sĩ'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={selectedArtistId ? COLORS.primary : COLORS.textSecondary} />
          </TouchableOpacity>

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
        </ScrollView>
      </View>

      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.comment_id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        ListEmptyComponent={
            loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbox-outline" size={60} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Không tìm thấy đánh giá nào.</Text>
                </View>
            )
        }
      />

      <FilterModal
        visible={showArtistModal}
        onClose={() => setShowArtistModal(false)}
        title="Chọn nghệ sĩ"
        data={artistOptions}
        selectedValue={selectedArtistId}
        onSelect={setSelectedArtistId}
      />

      <FilterModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Lọc theo đánh giá"
        data={ratingOptions}
        selectedValue={selectedRating}
        onSelect={setSelectedRating}
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
    fontSize: 16,
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
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  listContent: {
    padding: SIZES.padding,
  },
  reviewItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  username: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  date: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  artistTag: {
     backgroundColor: COLORS.primary + '20',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 6,
  },
  artistNameSmall: {
      color: COLORS.primary,
      fontSize: 10,
      fontWeight: 'bold',
  },
  songPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#222',
      padding: 8,
      borderRadius: 10,
      marginBottom: 12,
  },
  miniCover: {
      width: 30,
      height: 30,
      borderRadius: 4,
  },
  songTitle: {
      color: COLORS.text,
      fontSize: 12,
      flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 2,
  },
  content: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-end',
  },
  deleteButtonText: {
      color: COLORS.error,
      fontSize: 12,
      fontWeight: 'bold',
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
  },
  emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10
  },
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
    fontWeight: 'bold',
  },
});

export default AdminAllReviewsScreen;
