import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/theme';
import { premiumService } from '../../services/premiumService';
import { walletService } from '../../services/walletService';
import { useAlert } from '../../context/AlertContext';

const SongPurchaseModal = ({ visible, song, onClose, onPurchaseSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const navigation = useNavigation();
  const { showPurchaseSuccess, showError, showWarning } = useAlert();

  useEffect(() => {
    if (visible) {
      fetchBalance();
    }
  }, [visible]);

  const fetchBalance = async () => {
    try {
      const response = await walletService.getBalance();
      if (response.success) {
        setBalance(response.data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handlePurchase = async () => {
    const price = parseFloat(song.price) || 0;
    
    // Check if user has enough balance
    if (balance < price) {
      const needed = price - balance;
      showWarning(
        'Số dư không đủ',
        `Bạn cần thêm ${needed.toLocaleString('vi-VN')}đ để mua bài hát này. Bạn có muốn nạp tiền không?`,
        {
          buttons: [
            {
              text: 'Hủy',
              onPress: () => {},
            },
            {
              text: 'Nạp tiền',
              onPress: () => {
                onClose();
                navigation.navigate('Wallet');
              },
            },
          ],
        }
      );
      return;
    }

    setLoading(true);
    try {
      const response = await premiumService.purchaseSong(song.song_id);
      if (response.success) {
        onClose();
        showPurchaseSuccess(
          'Bạn đã mua bài hát thành công!',
          response.data.new_balance,
          () => {
            onPurchaseSuccess && onPurchaseSuccess();
          }
        );
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi mua bài hát';
      
      // Check if error is insufficient balance
      if (error.response?.data?.data?.needed) {
        const needed = error.response.data.data.needed;
        showWarning(
          'Số dư không đủ',
          `Bạn cần thêm ${needed.toLocaleString('vi-VN')}đ. Bạn có muốn nạp tiền không?`,
          {
            buttons: [
              {
                text: 'Hủy',
                onPress: () => {},
              },
              {
                text: 'Nạp tiền',
                onPress: () => {
                  onClose();
                  navigation.navigate('Wallet');
                },
              },
            ],
          }
        );
      } else {
        showError('Lỗi', message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!song) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="musical-notes" size={60} color={COLORS.primary} />
            <Text style={styles.title}>Mua bài hát</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.songTitle}>{song.title}</Text>
            {song.artist_name && (
              <Text style={styles.artistName}>{song.artist_name}</Text>
            )}

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Giá:</Text>
              <Text style={styles.price}>
                {parseFloat(song.price).toLocaleString('vi-VN')}đ
              </Text>
            </View>

            <Text style={styles.description}>
              Sau khi mua, bạn có thể nghe bài hát này không giới hạn mà không cần đăng ký Premium.
            </Text>

            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Số dư ví của bạn:</Text>
              <Text style={[
                styles.balanceValue,
                { color: balance >= parseFloat(song.price || 0) ? '#4CAF50' : '#EF5350' }
              ]}>
                {parseFloat(balance).toLocaleString('vi-VN')}đ
              </Text>
            </View>

            {balance < parseFloat(song.price || 0) && (
              <TouchableOpacity
                style={styles.topUpHint}
                onPress={() => {
                  onClose();
                  navigation.navigate('Wallet');
                }}
              >
                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                <Text style={styles.topUpHintText}>
                  Nhấn để nạp thêm tiền vào ví
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.purchaseButton]}
              onPress={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.purchaseButtonText}>Mua ngay</Text>
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
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  songTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topUpHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 8,
  },
  topUpHintText: {
    fontSize: 13,
    color: COLORS.primary,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default SongPurchaseModal;

