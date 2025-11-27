import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { walletService } from '../../services/walletService';
import { premiumService } from '../../services/premiumService';
import { useNavigation } from '@react-navigation/native';

const AlbumPurchaseModal = ({ visible, onClose, album, onSuccess }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchBalance();
    }
  }, [visible]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const response = await walletService.getBalance();
      if (response.success) {
        setBalance(response.data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!album) return;

    const price = parseFloat(album.price);
    if (balance < price) {
      Alert.alert(
        'Số dư không đủ',
        'Bạn không đủ tiền để mua album này. Vui lòng nạp thêm tiền.',
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Nạp tiền', 
            onPress: () => {
              onClose();
              navigation.navigate('Wallet');
            } 
          }
        ]
      );
      return;
    }

    setProcessing(true);
    try {
      const response = await premiumService.purchaseAlbum(album.album_id);
      if (response.success) {
        Alert.alert('Thành công', 'Mua album thành công! Bạn có thể nghe tất cả bài hát trong album này.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        Alert.alert('Lỗi', response.message || 'Có lỗi xảy ra khi mua album');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setProcessing(false);
    }
  };

  if (!album) return null;

  const price = parseFloat(album.price || 0);
  const isAffordable = balance >= price;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Mua Album</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Image
              source={{ uri: album.cover_url || 'https://via.placeholder.com/150' }}
              style={styles.cover}
            />
            <Text style={styles.albumTitle} numberOfLines={2}>{album.title}</Text>
            <Text style={styles.artistName}>{album.artist_name}</Text>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Giá album:</Text>
              <Text style={styles.priceValue}>{price.toLocaleString('vi-VN')}đ</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Số dư ví của bạn:</Text>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.balanceValue, !isAffordable && styles.insufficientBalance]}>
                  {balance.toLocaleString('vi-VN')}đ
                </Text>
              )}
            </View>

            {!isAffordable && !loading && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                <Text style={styles.warningText}>
                  Thiếu {(price - balance).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={processing}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton,
                (!isAffordable || processing) && styles.disabledButton
              ]}
              onPress={isAffordable ? handlePurchase : () => {
                onClose();
                navigation.navigate('Wallet');
              }}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <LinearGradient
                  colors={isAffordable ? COLORS.gradient.primary : [COLORS.textMuted, COLORS.textMuted]}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.confirmButtonText}>
                    {isAffordable ? 'Mua ngay' : 'Nạp tiền'}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    // minHeight removed to let content dictate height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cover: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  albumTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  artistName: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
    marginBottom: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  balanceValue: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  insufficientBalance: {
    color: COLORS.error,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
  },
  warningText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: SIZES.md,
  },
  confirmButton: {
    // Background handled by gradient
  },
  disabledButton: {
    opacity: 0.7,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.md,
  },
});

export default AlbumPurchaseModal;
