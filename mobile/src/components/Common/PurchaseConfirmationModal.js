import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';

import { useNavigation } from '@react-navigation/native';

const PurchaseConfirmationModal = ({ 
  visible, 
  onClose, 
  onConfirm,
  type, // 'song', 'membership', 'premium'
  title,
  price,
  currentBalance,
  additionalInfo = {},
  loading = false,
  onDeposit // Callback for deposit action
}) => {
  const navigation = useNavigation();
  
  if (!visible) return null;

  const remainingBalance = currentBalance - price;
  const hasInsufficientBalance = remainingBalance < 0;

  const handleConfirm = () => {
    if (hasInsufficientBalance) {
      if (onDeposit) {
         onDeposit();
      } else {
        onClose();
        // Fallback navigation if no onDeposit provided
        navigation.navigate('Wallet');
      }
    } else {
      onConfirm();
    }
  };

  const getTypeInfo = () => {
    switch (type) {
      case 'song':
        return {
          icon: 'musical-notes',
          color: COLORS.primary,
          refundInfo: 'Không thể hoàn tiền sau khi mua.',
          description: 'Bạn sẽ sở hữu bài hát này vĩnh viễn.',
          badge: 'Mua một lần',
          badgeColor: ['#06b6d4', '#3b82f6']
        };
      case 'membership':
        return {
          icon: 'heart',
          color: '#ec4899',
          refundInfo: 'Không thể hoàn tiền sau khi đăng ký.',
          description: `Hội viên trong ${additionalInfo.duration_days || 30} ngày.`,
          badge: 'Gói hội viên',
          badgeColor: ['#ec4899', '#db2777']
        };
      case 'premium':
        return {
          icon: 'star',
          color: '#8b5cf6',
          refundInfo: 'Có thể hủy bất cứ lúc nào.',
          description: 'Nghe không giới hạn toàn bộ kho nhạc.',
          badge: 'Gói Premium',
          badgeColor: ['#8b5cf6', '#d946ef']
        };
      default:
        return {
          icon: 'information-circle',
          color: COLORS.primary,
          refundInfo: '',
          description: '',
          badge: 'Thông tin',
          badgeColor: [COLORS.primary, COLORS.secondary]
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
      <View style={styles.overlayContainer}>
        {/* Overlay click to close - Independent from Modal Content */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBackground} />
        </TouchableWithoutFeedback>

        {/* Modal Content */}
        <View style={styles.modal}>
          <LinearGradient
            colors={['#1F1F1F', '#121212']}
            style={styles.gradientBackground}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                 <LinearGradient
                    colors={typeInfo.badgeColor}
                    style={styles.iconGradient}
                 >
                    <Ionicons name={typeInfo.icon} size={32} color="#FFF" />
                 </LinearGradient>
              </View>
              <Text style={styles.title}>Xác nhận thanh toán</Text>
              <View style={styles.badgeContainer}>
                <Text style={[styles.badgeText, { color: typeInfo.badgeColor[1] }]}>
                  {typeInfo.badge}
                </Text>
              </View>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              indicatorStyle="white"
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.content}>
                <Text style={styles.itemTitle}>{title}</Text>
                
                <View style={styles.invoiceCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Đơn giá</Text>
                    <Text style={styles.priceValue}>
                      {price.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Số dư hiện tại</Text>
                    <Text style={styles.balanceValue}>
                      {currentBalance.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  
                  <View style={[styles.priceRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Số dư còn lại</Text>
                    <Text style={[
                      styles.totalValue,
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
                      Số dư không đủ. Vui lòng nạp thêm {(Math.abs(remainingBalance)).toLocaleString('vi-VN')}đ.
                    </Text>
                  </View>
                )}

                <View style={styles.infoSection}>
                  <Text style={styles.descriptionText}>
                    {typeInfo.description}
                  </Text>
                  
                  {typeInfo.refundInfo ? (
                     <View style={styles.refundBox}>
                       <Ionicons name="shield-checkmark" size={16} color={COLORS.textSecondary} />
                       <Text style={styles.refundText}>{typeInfo.refundInfo}</Text>
                     </View>
                  ) : null}
                </View>

                {/* Actions inside ScrollView to enforce scrolling */}
                <View style={styles.actionsContainerInline}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      // Remove opacity for 'disabled' look if we want it to be clickable
                      // hasInsufficientBalance && styles.disabledButtonWrapper 
                    ]}
                    onPress={handleConfirm}
                    disabled={loading} // Only disable if loading
                  >
                    <LinearGradient
                      colors={hasInsufficientBalance ? ['#333', '#333'] : COLORS.gradient.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      {loading ? (
                        <Text style={styles.confirmButtonText}>Đang xử lý...</Text>
                      ) : (
                        <Text style={[styles.confirmButtonText, hasInsufficientBalance && { color: '#EF5350' }]}>
                          {hasInsufficientBalance ? 'Nạp tiền ngay' : 'Xác nhận mua'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.medium,
    // Ensure modal sits above overlay background
    zIndex: 1, 
  },
  gradientBackground: {
    padding: 0,
    maxHeight: '100%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconContainer: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 500, // Limit height to ensure scrolling behavior if content is long
  },
  scrollContent: {
    padding: 24,
  },
  content: {
    gap: 24,
  },
  itemTitle: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
  },
  invoiceCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  balanceValue: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  totalRow: {
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  totalValue: {
    fontSize: 20,
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
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.2)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#EF5350',
    lineHeight: 20,
  },
  infoSection: {
    alignItems: 'center',
    gap: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  refundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refundText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsContainerInline: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  confirmButton: {
    flex: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  disabledButtonWrapper: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default PurchaseConfirmationModal;
