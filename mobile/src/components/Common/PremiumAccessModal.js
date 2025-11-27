import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../config/theme';
import { walletService } from '../../services/walletService';
import { artistService } from '../../services/artistService';
import { premiumService } from '../../services/premiumService';
import PurchaseConfirmationModal from './PurchaseConfirmationModal';

const PremiumAccessModal = ({ visible, song, onClose, onPurchaseSong, onSubscribePremium, songList = [], playSong }) => {
  const [balance, setBalance] = useState(0);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState(null); // 'song', 'membership', 'premium'
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (visible && song?.artist_id) {
      fetchBalance();
      fetchMembershipInfo();
    }
  }, [visible, song?.artist_id]);

  const fetchBalance = async () => {
    try {
      const response = await walletService.getBalance();
      if (response.success) {
        // Ensure balance is a number
        const balanceValue = parseFloat(response.data.balance) || 0;
        setBalance(balanceValue);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(0);
    }
  };

  const fetchMembershipInfo = async () => {
    if (!song?.artist_id) return;
    setLoadingMembership(true);
    try {
      const [statusRes, artistRes] = await Promise.all([
        artistService.getMembershipStatus(song.artist_id),
        artistService.getArtistById(song.artist_id),
      ]);
      
      if (statusRes.success) {
        setMembershipStatus(statusRes.data);
        const info = statusRes.data.membership_info;
        if (info) {
          // Ensure price is a number
          setMembershipInfo({
            ...info,
            price: parseFloat(info.price) || 0,
          });
        } else {
          setMembershipInfo(null);
        }
      }
    } catch (error) {
      console.error('Error fetching membership info:', error);
      setMembershipInfo(null);
    } finally {
      setLoadingMembership(false);
    }
  };

  const handleSubscribeMembership = () => {
    if (!song?.artist_id || !membershipInfo) return;
    setConfirmType('membership');
    setShowConfirmModal(true);
  };

  const handlePurchaseSong = () => {
    setConfirmType('song');
    setShowConfirmModal(true);
  };

  const handleSubscribePremium = () => {
    setConfirmType('premium');
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    setLoadingConfirm(true);
    try {
      if (confirmType === 'song') {
        const response = await premiumService.purchaseSong(song.song_id);
        if (response.success) {
          setShowConfirmModal(false);
          onClose();
          onPurchaseSong && onPurchaseSong();
          
          // Find song index in the list
          const songIndex = songList.length > 0 
            ? songList.findIndex(s => s.song_id === song.song_id)
            : 0;
          
          // Play the purchased song
          if (songList.length > 0 && songIndex >= 0) {
            playSong(song, songList, songIndex);
          } else {
            // If no list provided, play just this song
            playSong(song, [song], 0);
          }
          
          // Navigate to FullPlayer
          setTimeout(() => {
            navigation.navigate('FullPlayer');
          }, 300);
          
          Alert.alert('Thành công', 'Bạn đã mua bài hát thành công!');
        } else {
          Alert.alert('Lỗi', response.message || 'Không thể mua bài hát');
        }
      } else if (confirmType === 'membership') {
        if (!song?.artist_id || !membershipInfo) return;
        const durationDays = membershipInfo?.duration_days || membershipInfo?.membership_duration_days || 30;
        
        console.log('[PremiumAccessModal] Subscribing membership:', {
          artist_id: song.artist_id,
          durationDays,
          membershipInfo,
          currentBalance: balance
        });
        
        const response = await artistService.subscribeMembership(song.artist_id, durationDays);
        
        console.log('[PremiumAccessModal] Membership subscription response:', {
          success: response.success,
          message: response.message,
          data: response.data,
          error: response.error
        });
        
        if (response.success) {
          setShowConfirmModal(false);
          onClose();
          const data = response.data || {};
          const newBalance = data.new_balance;
          const expiryDate = data.expiry_date 
            ? new Date(data.expiry_date).toLocaleDateString('vi-VN')
            : '';
          
          let message = `Bạn đã đăng ký hội viên ${song.artist_name || 'artist'} ${durationDays} ngày với giá ${membershipInfo.price.toLocaleString('vi-VN')}đ.`;
          if (expiryDate) {
            message += ` Hội viên sẽ hết hạn vào ${expiryDate}.`;
          }
          if (newBalance !== undefined) {
            message += ` Số dư còn lại: ${newBalance.toLocaleString('vi-VN')}đ.`;
          }
          
          // Find song index in the list
          const songIndex = songList.length > 0 
            ? songList.findIndex(s => s.song_id === song.song_id)
            : 0;
          
          // Play the song after successful membership subscription
          if (songList.length > 0 && songIndex >= 0) {
            playSong(song, songList, songIndex);
          } else {
            // If no list provided, play just this song
            playSong(song, [song], 0);
          }
          
          // Navigate to FullPlayer to listen to the song
          setTimeout(() => {
            navigation.navigate('FullPlayer');
          }, 300);
          
          Alert.alert('Đăng ký thành công!', message);
        } else {
          Alert.alert('Lỗi', response.message || 'Không thể đăng ký hội viên');
        }
      } else if (confirmType === 'premium') {
        setShowConfirmModal(false);
        onClose();
        setTimeout(() => {
          navigation.navigate('Premium');
        }, 300);
        onSubscribePremium && onSubscribePremium();
      }
    } catch (error) {
      console.error(`Error in ${confirmType}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Có lỗi xảy ra khi ${confirmType === 'song' ? 'mua bài hát' : confirmType === 'membership' ? 'đăng ký hội viên' : 'đăng ký Premium'}`;
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoadingConfirm(false);
    }
  };

  if (!song) return null;

  const songPrice = parseFloat(song.price) || 0;
  const membershipPrice = membershipInfo?.price ? parseFloat(membershipInfo.price) : 0;
  const premiumPrice = 99000; // Fixed premium price

  // Get confirmation modal props
  const getConfirmModalProps = () => {
    switch (confirmType) {
      case 'song':
        return {
          type: 'song',
          title: song.title,
          price: songPrice,
          currentBalance: balance,
          additionalInfo: {},
        };
      case 'membership':
        return {
          type: 'membership',
          title: `Đăng ký hội viên ${song.artist_name || 'Artist'}`,
          price: membershipPrice,
          currentBalance: balance,
          additionalInfo: {
            artist_name: song.artist_name,
            duration_days: membershipInfo?.duration_days || membershipInfo?.membership_duration_days || 30,
          },
        };
      case 'premium':
        return {
          type: 'premium',
          title: 'Đăng ký Premium',
          price: premiumPrice,
          currentBalance: balance,
          additionalInfo: {},
        };
      default:
        return null;
    }
  };

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
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Ionicons name="lock-closed" size={60} color={COLORS.primary} />
              <Text style={styles.title}>Bài hát Premium</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.songTitle}>{song.title}</Text>
              {song.artist_name && (
                <Text style={styles.artistName}>{song.artist_name}</Text>
              )}

              <Text style={styles.description}>
                Bài hát này yêu cầu Premium, mua riêng hoặc đăng ký hội viên artist để nghe. Chọn một trong các tùy chọn bên dưới:
              </Text>
            </View>

            <View style={styles.options}>
              {/* Option 1: Purchase Song */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handlePurchaseSong}
              >
                <View style={styles.optionHeader}>
                  <Ionicons name="musical-notes" size={32} color={COLORS.primary} />
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Mua bài hát</Text>
                    <Text style={styles.optionPrice}>
                      {songPrice.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </View>
                <Text style={styles.optionDescription}>
                  Mua một lần, nghe mãi mãi. Không cần đăng ký Premium.
                </Text>
                {parseFloat(balance) < parseFloat(songPrice) && (
                  <View style={styles.balanceWarning}>
                    <Ionicons name="warning" size={14} color="#EF5350" />
                    <Text style={styles.balanceWarningText}>
                      Số dư: {balance.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Option 2: Subscribe Artist Membership */}
              {song.artist_id && membershipInfo && membershipInfo.price > 0 && !membershipStatus?.has_membership && (
                <TouchableOpacity
                  style={[styles.optionCard, styles.membershipCard]}
                  onPress={handleSubscribeMembership}
                  disabled={loadingMembership}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons name="person-circle" size={32} color={COLORS.accent} />
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>
                        Đăng ký hội viên {song.artist_name || 'Artist'}
                      </Text>
                      <Text style={[styles.optionPrice, { color: COLORS.accent }]}>
                        {membershipInfo.price.toLocaleString('vi-VN')}đ/{membershipInfo.duration_days} ngày
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.optionDescription}>
                    Nghe tất cả bài hát premium của {song.artist_name || 'artist này'} không giới hạn. Chi phí thấp hơn Premium toàn nền tảng.
                  </Text>
                  {parseFloat(balance) < parseFloat(membershipInfo.price) && (
                    <View style={styles.balanceWarning}>
                      <Ionicons name="warning" size={14} color="#EF5350" />
                      <Text style={styles.balanceWarningText}>
                        Số dư: {balance.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

               {/* Option 3: Subscribe Premium */}
               <TouchableOpacity
                 style={[styles.optionCard, styles.premiumCard]}
                 onPress={handleSubscribePremium}
               >
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  style={styles.premiumGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons name="star" size={32} color="#FFF" />
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionTitle, styles.premiumTitle]}>
                        Đăng ký Premium
                      </Text>
                      <Text style={[styles.optionPrice, styles.premiumPrice]}>
                        99.000đ/tháng
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.premiumDescription}>
                    Nghe tất cả bài hát Premium không giới hạn. Hủy bất cứ lúc nào.
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

             <TouchableOpacity
               style={styles.cancelButton}
               onPress={onClose}
               activeOpacity={0.7}
             >
               <Text style={styles.cancelButtonText}>Hủy</Text>
             </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>

      {/* Confirmation Modal */}
      {showConfirmModal && getConfirmModalProps() && (
        <PurchaseConfirmationModal
          visible={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmPurchase}
          loading={loadingConfirm}
          {...getConfirmModalProps()}
        />
      )}
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
  },
  scrollView: {
    maxHeight: '100%',
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
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  options: {
    gap: 16,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  premiumCard: {
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  membershipCard: {
    borderColor: COLORS.accent,
  },
  premiumGradient: {
    borderRadius: 14,
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  premiumTitle: {
    color: '#FFF',
  },
  optionPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  premiumPrice: {
    color: '#FFF',
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  premiumDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  balanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderRadius: 8,
    gap: 4,
  },
  balanceWarningText: {
    fontSize: 12,
    color: '#EF5350',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default PremiumAccessModal;

