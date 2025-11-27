import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { commentService } from '../../services/commentService';
import { useAuth } from '../../context/AuthContext';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import SuccessModal from '../Common/SuccessModal';

const CommentSection = ({ songId, onRatingUpdate }) => {
  const { user } = useAuth();
  const { showModal, modalData, showSuccess, showError, hideModal } = useSuccessModal();
  const [comments, setComments] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (songId) {
      loadComments();
    }
  }, [songId]);

  const loadComments = async () => {
    if (!songId) return;
    
    setLoading(true);
    try {
      const response = await commentService.getSongComments(songId);
      setComments(response.data.comments || []);
      setRatingStats(response.data.rating_stats || null);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
      setRatingStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      showError('Lỗi', 'Vui lòng nhập nội dung bình luận');
      return;
    }

    if (userRating === 0) {
      showError('Lỗi', 'Vui lòng chọn số sao đánh giá');
      return;
    }

    setSubmitting(true);
    try {
      await commentService.createComment(songId, commentText.trim(), userRating);
      showSuccess('Thành công', 'Đánh giá của bạn đã được gửi!');
      setCommentText('');
      setUserRating(0);
      await loadComments();
      // Notify parent to refresh song data (for rating display)
      // Wait a bit for backend to update average_rating
      setTimeout(() => {
        if (onRatingUpdate) {
          onRatingUpdate();
        }
      }, 300);
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      showError('Lỗi', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa bình luận này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await commentService.deleteComment(commentId);
              showSuccess('Thành công', 'Đã xóa bình luận');
              await loadComments();
              // Notify parent to refresh song rating after delete
              setTimeout(() => {
                if (onRatingUpdate) {
                  onRatingUpdate();
                }
              }, 300);
            } catch (error) {
              showError('Lỗi', 'Không thể xóa bình luận');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating, onPress = null) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={24}
              color={star <= rating ? COLORS.warning : COLORS.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingStats = () => {
    if (!ratingStats || ratingStats.total_ratings === 0) {
      return null;
    }

    const avgRating = parseFloat(ratingStats.average_rating || 0).toFixed(1);
    const totalRatings = ratingStats.total_ratings || 0;

    return (
      <View style={styles.ratingStatsContainer}>
        <View style={styles.avgRatingContainer}>
          <Text style={styles.avgRatingNumber}>{avgRating}</Text>
          <View style={styles.avgRatingStars}>
            {renderStars(Math.round(avgRating))}
          </View>
          <Text style={styles.totalRatings}>
            {totalRatings} đánh giá
          </Text>
        </View>

        <View style={styles.ratingBarsContainer}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingStats[`${['one', 'two', 'three', 'four', 'five'][star - 1]}_star`] || 0;
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            return (
              <View key={star} style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>{star}★</Text>
                <View style={styles.ratingBarBg}>
                  <View
                    style={[
                      styles.ratingBarFill,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>
                <Text style={styles.ratingCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCommentItem = ({ item }) => {
    const isOwner = user && user.user_id === item.user_id;
    const isAdmin = user && user.role === 'admin';

    return (
      <View style={styles.commentItem}>
        <Image
          source={{
            uri: item.avatar_url || 'https://via.placeholder.com/40',
          }}
          style={styles.avatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.username}>{item.username}</Text>
            {item.rating && (
              <View style={styles.commentRating}>
                {renderStars(item.rating)}
              </View>
            )}
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          <View style={styles.commentFooter}>
            <Text style={styles.commentDate}>
              {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </Text>
            {(isOwner || isAdmin) && (
              <TouchableOpacity
                onPress={() => handleDeleteComment(item.comment_id)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!songId) {
    return null;
  }

  if (loading && comments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Đánh giá & Bình luận</Text>
        <View style={styles.initialLoadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đánh giá & Bình luận</Text>

      {renderRatingStats()}

      {user && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Đánh giá của bạn:</Text>
          {renderStars(userRating, setUserRating)}

          <TextInput
            style={styles.textInput}
            placeholder="Nhập bình luận của bạn..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={commentText}
            onChangeText={setCommentText}
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.commentsListContainer}>
        <Text style={styles.commentsTitle}>
          Bình luận ({comments.length})
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : comments.length > 0 ? (
          <FlatList
            data={comments}
            renderItem={renderCommentItem}
            keyExtractor={(item) => item.comment_id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noCommentsText}>Chưa có bình luận nào</Text>
        )}
      </View>

      {/* Success Modal */}
      <SuccessModal
        visible={showModal}
        onClose={hideModal}
        title={modalData.title}
        message={modalData.message}
        icon={modalData.icon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SIZES.padding * 2,
    marginTop: 32,
    marginBottom: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 16,
  },
  ratingStatsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    marginBottom: 20,
  },
  avgRatingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avgRatingNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.text,
  },
  avgRatingStars: {
    marginVertical: 8,
  },
  totalRatings: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  ratingBarsContainer: {
    marginTop: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starLabel: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    width: 30,
  },
  ratingBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
  },
  ratingCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    width: 30,
    textAlign: 'right',
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 12,
    color: COLORS.text,
    fontSize: SIZES.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    padding: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  commentsListContainer: {
    marginTop: 8,
  },
  commentsTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  commentRating: {
    transform: [{ scale: 0.7 }],
  },
  commentText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentDate: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
  noCommentsText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
    marginTop: 20,
  },
  initialLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 12,
  },
});

export default CommentSection;

