import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { debounce } from 'lodash';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CreateNotificationModal = ({ visible, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searching, setSearching] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setTitle('');
      setMessage('');
      setSendToAll(true);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [visible]);

  // Debounced search function
  const searchUsers = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        // Use existing getAllUsers with search param as fallback if searchUsers endpoint doesn't exist yet
        // Or assume searchUsers endpoint is implemented as added in previous step
        const response = await adminService.searchUsers(query);
        if (response.success) {
          setSearchResults(response.data || []);
        }
      } catch (error) {
        console.error('Search users error:', error);
      } finally {
        setSearching(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    searchUsers(searchQuery);
  }, [searchQuery, searchUsers]);

  const handleSelectUser = (user) => {
    if (!selectedUsers.find(u => u.user_id === user.user_id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery(''); // Clear search after selection
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.user_id !== userId));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (title.trim().length < 5) {
      Alert.alert('Lỗi', 'Tiêu đề phải có ít nhất 5 ký tự');
      return;
    }

    if (message.trim().length < 10) {
      Alert.alert('Lỗi', 'Nội dung phải có ít nhất 10 ký tự');
      return;
    }

    if (!sendToAll && selectedUsers.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một người dùng để gửi thông báo');
      return;
    }

    setLoading(true);
    try {
      const user_ids = sendToAll ? null : selectedUsers.map(u => u.user_id);
      
      const response = await adminService.createSystemNotification(
        title.trim(),
        message.trim(),
        user_ids,
        null
      );

      if (response.success) {
        Alert.alert('Thành công', `Đã gửi thông báo đến ${response.data.notification_count} người dùng`, [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể tạo thông báo');
      }
    } catch (error) {
      console.error('Create notification error:', error);
      const errorMessage = error.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tạo thông báo hệ thống</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={true} 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Input */}
            <View style={styles.sectionFirst}>
              <Text style={styles.sectionTitle}>Tiêu đề *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Bảo trì hệ thống"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                editable={!loading}
              />
            </View>

            {/* Message Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nội dung *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập nội dung thông báo..."
                placeholderTextColor={COLORS.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
                editable={!loading}
              />
              <Text style={styles.charCount}>
                {message.length}/500
              </Text>
            </View>

            {/* Send To All Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="people" size={20} color={COLORS.text} />
                  <Text style={styles.toggleText}>Gửi cho tất cả người dùng</Text>
                </View>
                <Switch
                  value={sendToAll}
                  onValueChange={setSendToAll}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                  thumbColor={sendToAll ? COLORS.primary : COLORS.textSecondary}
                  disabled={loading}
                />
              </View>
            </View>

            {/* User Selection (if not send to all) */}
            {!sendToAll && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Người nhận ({selectedUsers.length})</Text>
                
                {/* Selected Users List */}
                {selectedUsers.length > 0 && (
                  <View style={styles.selectedUsersContainer}>
                    {selectedUsers.map(user => (
                      <View key={user.user_id} style={styles.selectedUserChip}>
                        <Image 
                          source={{ uri: user.avatar_url || 'https://via.placeholder.com/30' }} 
                          style={styles.chipAvatar} 
                        />
                        <Text style={styles.chipText} numberOfLines={1}>
                          {user.full_name || user.username || `User ${user.user_id}`} ({user.user_id})
                        </Text>
                        <TouchableOpacity onPress={() => handleRemoveUser(user.user_id)}>
                          <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* User Search Input */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm user theo tên hoặc ID..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    editable={!loading}
                  />
                  {searching && <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchLoader} />}
                </View>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <View style={styles.searchResultsContainer}>
                    {searchResults.map(user => {
                      const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
                      if (isSelected) return null; // Don't show already selected users
                      
                      return (
                        <TouchableOpacity 
                          key={user.user_id} 
                          style={styles.searchResultItem}
                          onPress={() => handleSelectUser(user)}
                        >
                          <Image 
                            source={{ uri: user.avatar_url || 'https://via.placeholder.com/40' }} 
                            style={styles.resultAvatar} 
                          />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName}>
                              {user.full_name || user.username || 'Unknown User'}
                            </Text>
                            <Text style={styles.resultId}>ID: {user.user_id}</Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Gửi thông báo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SIZES.padding,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionFirst: {
    marginTop: 0,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SIZES.padding,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    textAlign: 'right',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  
  // Search & User Selection Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: COLORS.surface,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  resultId: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    maxWidth: '100%',
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '500',
    marginRight: 8,
    maxWidth: 150,
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

export default CreateNotificationModal;

