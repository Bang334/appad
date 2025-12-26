import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { premiumService } from '../../services/premiumService';
import { walletService } from '../../services/walletService';
import { useAlert } from '../../context/AlertContext';

const { width } = Dimensions.get('window');

const SongPurchaseModal = ({ visible, song, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [processing, setProcessing] = useState(false);
  const navigation = useNavigation();
  const { showPurchaseSuccess, showError, showWarning } = useAlert();

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
    const price = parseFloat(song.price) || 0;
    
    if (balance < price) {
      showWarning(
        'Số dư không đủ',
        `Bạn cần thêm ${(price - balance).toLocaleString('vi-VN')}đ để mua bài hát này. Bạn có muốn nạp tiền không?`,
        {
          buttons: [
            { text: 'Hủy', onPress: () => {} },
            { 
              text: 'Nạp tiền', 
              onPress: () => {
                onClose();
                navigation.navigate('Wallet');
              } 
            },
          ],
        }
      );
      return;
    }

    setProcessing(true);
    try {
      const response = await premiumService.purchaseSong(song.song_id);
      if (response.success) {
        onClose();
        showPurchaseSuccess(
          'Bạn đã sở hữu bài hát này!',
          response.data.new_balance,
          () => {
            onSuccess && onSuccess(response.data.song || song);
          }
        );
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi mua bài hát';
      showError('Lỗi', message);
    } finally {
      setProcessing(false);
    }
  };

  if (!song) return null;

  const price = parseFloat(song.price || 0);
  const isAffordable = balance >= price;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={['#1F1F1F', '#121212']}
            style={styles.container}
          >
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <View style={styles.closeIconBox}>
                <Ionicons name="close" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.content}>
              <Text style={styles.mainTitle}>Sở hữu Bài hát</Text>
              
              <View style={styles.coverWrapper}>
                <Image
                  source={{ uri: song.cover_url || 'https://via.placeholder.com/200' }}
                  style={styles.coverImg}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.coverShadow}
                />
                <View style={styles.songBadge}>
                  <Ionicons name="musical-note" size={16} color="#FFF" />
                </View>
              </View>

              <Text style={styles.songName} numberOfLines={2}>{song.title}</Text>
              <Text style={styles.artistName}>{song.artist_name}</Text>

              <View style={styles.priceBox}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Giá bài hát</Text>
                  <Text style={styles.priceText}>{price.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={[styles.divider, { marginVertical: 12 }]} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Số dư khả dụng</Text>
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={[
                      styles.balanceText, 
                      !isAffordable && styles.textError
                    ]}>
                      {balance.toLocaleString('vi-VN')}đ
                    </Text>
                  )}
                </View>
              </View>

              {!isAffordable && !loading && (
                <View style={styles.alertBox}>
                  <Ionicons name="information-circle" size={18} color={COLORS.error} />
                  <Text style={styles.alertText}>
                    Tài khoản còn thiếu {(price - balance).toLocaleString('vi-VN')}đ.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              {isAffordable ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handlePurchase}
                  disabled={processing}
                >
                  <LinearGradient
                    colors={COLORS.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    {processing ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="cart" size={20} color="#FFF" />
                        <Text style={styles.btnText}>Xác nhận mua</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    onClose();
                    navigation.navigate('Wallet');
                  }}
                >
                  <LinearGradient
                    colors={['#334155', '#1e293b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    <Ionicons name="wallet-outline" size={20} color="#FFF" />
                    <Text style={styles.btnText}>Nạp thêm tiền</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.secondaryBtn} 
                onPress={onClose}
                disabled={processing}
              >
                <Text style={styles.secondaryBtnText}>Để sau</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    overflow: 'hidden',
    ...SHADOWS.dark,
  },
  container: {
    padding: 32,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  closeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  coverWrapper: {
    position: 'relative',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  coverImg: {
    width: 160,
    height: 160,
    borderRadius: 80, // Circular for songs
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  coverShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderRadius: 80,
  },
  songBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1F1F1F',
  },
  songName: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  artistName: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  priceBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  priceText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  balanceText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: '#FFF',
  },
  textError: {
    color: COLORS.error,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  alertText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    width: '100%',
    marginTop: 8,
  },
  actionBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnText: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

export default SongPurchaseModal;
