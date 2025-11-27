import React, { useState } from 'react';
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
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { reportService } from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';



const REPORT_TYPES = [
  { value: 'error', label: 'Lỗi kỹ thuật', icon: 'bug-outline' },
  { value: 'copyright', label: 'Vi phạm bản quyền', icon: 'shield-outline' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp', icon: 'warning-outline' },
  { value: 'other', label: 'Khác', icon: 'ellipsis-horizontal-outline' },
];

const ReportModal = ({ visible, onClose, song }) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('error');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (title.trim().length < 5) {
      Alert.alert('Lỗi', 'Tiêu đề phải có ít nhất 5 ký tự');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Lỗi', 'Mô tả phải có ít nhất 10 ký tự');
      return;
    }

    setLoading(true);
    try {
      // Append user info to description
      const userInfo = `\n\n--- Người báo cáo ---\nTên: ${user?.full_name || user?.username || 'Unknown'}\nID: ${user?.user_id || 'Unknown'}`;
      const fullDescription = description.trim() + userInfo;

      const response = await reportService.createReport(
        song.song_id,
        reportType,
        title.trim(),
        fullDescription
      );

      if (response.success) {
        Alert.alert('Thành công', 'Báo cáo đã được gửi thành công. Cảm ơn bạn đã phản hồi!', [
          {
            text: 'OK',
            onPress: () => {
              setTitle('');
              setDescription('');
              setReportType('error');
              onClose();
            },
          },
        ]);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể gửi báo cáo');
      }
    } catch (error) {
      console.error('Report error:', error);
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
            <Text style={styles.modalTitle}>Báo cáo bài hát</Text>
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
            {/* Song Info */}
            {song && (
              <View style={styles.songInfo}>
                <Image
                  source={{ uri: song.cover_url || 'https://via.placeholder.com/60' }}
                  style={styles.songImage}
                />
                <View style={styles.songDetails}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {song.artist_name || 'Unknown Artist'}
                  </Text>
                </View>
              </View>
            )}

            {/* Report Type */}
            <View style={styles.sectionFirst}>
              <Text style={styles.sectionTitle}>Loại báo cáo</Text>
              <View style={styles.typeContainer}>
                {REPORT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      reportType === type.value && styles.typeButtonActive,
                    ]}
                    onPress={() => setReportType(type.value)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={type.icon}
                      size={20}
                      color={reportType === type.value ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        reportType === type.value && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tiêu đề *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Bài hát không phát được"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                editable={!loading}
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mô tả chi tiết *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
                editable={!loading}
              />
              <Text style={styles.charCount}>
                {description.length}/500
              </Text>
            </View>
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
                  <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
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
    justifyContent: 'center', // Center vertically
    padding: SIZES.padding,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24, // Rounded corners for all sides
    maxHeight: Dimensions.get('window').height * 0.85,
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
    // flex: 1, // Removed to allow auto-height
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 16,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
    marginBottom: 20,
    borderRadius: SIZES.borderRadius,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
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
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    width: '48%', // Adjusted for better fit
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '500',
    flex: 1, // Allow text to wrap if needed
  },
  typeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: SIZES.padding, // Equal padding all around
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

export default ReportModal;

