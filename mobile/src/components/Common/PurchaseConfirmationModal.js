import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../config/theme';

const PurchaseConfirmationModal = ({ 
  visible, 
  onClose, 
  onConfirm,
  type, // 'song', 'membership', 'premium'
  title,
  price,
  currentBalance,
  additionalInfo = {},
  loading = false
}) => {
  if (!visible) return null;

  const remainingBalance = currentBalance - price;
  const hasInsufficientBalance = remainingBalance < 0;

  const getTypeInfo = () => {
    switch (type) {
      case 'song':
        return {
          icon: 'musical-notes',
          color: COLORS.primary,
          refundInfo: 'Không thể hoàn tiền sau khi mua.',
          description: 'Bạn sẽ sở hữu bài hát này vĩnh viễn.',
        };
      case 'membership':
        return {
          icon: 'person-circle',
          color: COLORS.accent,
          refundInfo: 'Không thể hoàn tiền sau khi đăng ký.',
          description: `Hội viên sẽ có hiệu lực trong ${additionalInfo.duration_days || 30} ngày.`,
        };
      case 'premium':
        return {
          icon: 'star',
          color: COLORS.primary,
          refundInfo: 'Có thể hủy bất cứ lúc nào. Hoàn tiền 50% nếu hủy trong 7 ngày đầu.',
          description: 'Đăng ký Premium để nghe tất cả bài hát không giới hạn.',
        };
      default:
        return {
          icon: 'information-circle',
          color: COLORS.primary,
          refundInfo: '',
          description: '',
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <View 
          style={styles.modal}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            alwaysBounceVertical={false}
            scrollEnabled={true}
          >
            <View style={styles.header}>
              <Ionicons name={typeInfo.icon} size={60} color={typeInfo.color} />
              <Text style={styles.title}>Xác nhận giao dịch</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.itemTitle}>{title}</Text>
              
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Giá:</Text>
                  <Text style={styles.priceValue}>
                    {price.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Số dư hiện tại:</Text>
                  <Text style={styles.balanceValue}>
                    {currentBalance.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
                <View style={[styles.priceRow, styles.remainingRow]}>
                  <Text style={styles.remainingLabel}>Số dư còn lại:</Text>
                  <Text style={[
                    styles.remainingValue,
                    hasInsufficientBalance && styles.insufficientBalance
                  ]}>
                    {remainingBalance.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>

              {hasInsufficientBalance && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#EF5350" />
                  <Text style={styles.warningText}>
                    Số dư không đủ! Bạn cần nạp thêm {(Math.abs(remainingBalance)).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.infoText}>{typeInfo.description}</Text>
                
                <View style={styles.noticeBox}>
                  <Ionicons name="information-circle" size={18} color={COLORS.warning} />
                  <Text style={styles.noticeText}>{typeInfo.refundInfo}</Text>
                </View>

                {type === 'premium' && (
                  <View style={styles.premiumInfoBox}>
                    <Text style={styles.premiumInfoTitle}>Chính sách hủy Premium:</Text>
                    <Text style={styles.premiumInfoText}>
                      • Hủy trong 7 ngày đầu: Hoàn tiền 50%{'\n'}
                      • Hủy sau 7 ngày: Không hoàn tiền{'\n'}
                      • Có thể hủy bất cứ lúc nào trong cài đặt
                    </Text>
                  </View>
                )}

                {type === 'membership' && additionalInfo.artist_name && (
                  <View style={styles.membershipInfoBox}>
                    <Text style={styles.membershipInfoText}>
                      Hội viên của {additionalInfo.artist_name} sẽ cho phép bạn nghe tất cả bài hát premium của artist này.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Fixed Actions at Bottom */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton,
                hasInsufficientBalance && styles.disabledButton
              ]}
              onPress={onConfirm}
              disabled={loading || hasInsufficientBalance}
            >
              {loading ? (
                <Text style={styles.confirmButtonText}>Đang xử lý...</Text>
              ) : (
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    height: 1200,
    flexGrow: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 24,
    flexGrow: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  header: {
    height: 100,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  content: {
    marginBottom: 24,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  priceSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  remainingRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  remainingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  remainingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  insufficientBalance: {
    color: '#EF5350',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#EF5350',
    fontWeight: '500',
  },
  infoSection: {
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },
  premiumInfoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  premiumInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  premiumInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  membershipInfoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  membershipInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default PurchaseConfirmationModal;

