import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../config/theme';
import { walletService } from '../../services/walletService';
import { artistService } from '../../services/artistService';
import { premiumService } from '../../services/premiumService';
import PurchaseConfirmationModal from './PurchaseConfirmationModal';

const { width } = Dimensions.get('window');

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
          
          const songIndex = songList.length > 0 
            ? songList.findIndex(s => s.song_id === song.song_id)
            : 0;
          
          if (songList.length > 0 && songIndex >= 0) {
            playSong(song, songList, songIndex);
          } else {
            playSong(song, [song], 0);
          }
          
          setTimeout(() => {
            navigation.navigate('FullPlayer');
          }, 300);
          
          Alert.alert('Thành công', 'Bạn đã mua bài hát thành công!');
        } else {
          Alert.alert('Lỗi', response.message || 'Không thể mua bài hát');
        }
      } else if (confirmType === 'membership') {
        if (!song?.artist_id || !membershipInfo) return;
        const durationDays = membershipInfo?.duration_days;
        
        const response = await artistService.subscribeMembership(song.artist_id, durationDays);
        
        if (response.success) {
          setShowConfirmModal(false);
          onClose();
          const data = response.data || {};
          const expiryDate = data.expiry_date 
            ? new Date(data.expiry_date).toLocaleDateString('vi-VN')
            : '';
          
          let message = `Đăng ký hội viên thành công! Hạn đến: ${expiryDate}`;
          
          const songIndex = songList.length > 0 
            ? songList.findIndex(s => s.song_id === song.song_id)
            : 0;
          
          if (songList.length > 0 && songIndex >= 0) {
            playSong(song, songList, songIndex);
          } else {
            playSong(song, [song], 0);
          }
          
          setTimeout(() => {
            navigation.navigate('FullPlayer');
          }, 300);
          
          Alert.alert('Thành công', message);
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
      Alert.alert('Lỗi', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  if (!song) return null;

  const songPrice = parseFloat(song.price) || 0;
  const membershipPrice = membershipInfo?.price ? parseFloat(membershipInfo.price) : 0;
  const premiumPrice = 99000;

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
            duration_days: membershipInfo?.duration_days,
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={onClose}
      >
        <Pressable 
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={['#1F1F1F', '#121212']}
            style={styles.gradientBackground}
          >
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <View style={styles.closeIconContainer}>
                <Ionicons name="close" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.coverContainer}>
                  <Image 
                    source={{ uri: song.cover_url || 'https://via.placeholder.com/150' }}
                    style={styles.coverImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.coverOverlay}
                  />
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={16} color="#FFF" />
                  </View>
                </View>
                
                <Text style={styles.title}>{song.title}</Text>
                {song.artist_name && (
                  <Text style={styles.artistName}>{song.artist_name}</Text>
                )}

                <Text style={styles.description}>
                  Dành riêng cho thành viên Premium
                </Text>
              </View>

              <View style={styles.options}>
                {/* Option 3: Subscribe Premium (Highlighted) */}
                <TouchableOpacity
                   style={styles.optionCard}
                   onPress={handleSubscribePremium}
                   activeOpacity={0.9}
                 >
                  <LinearGradient
                    colors={['#8b5cf6', '#ec4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumGradient}
                  >
                    <View style={styles.premiumContent}>
                      <View style={styles.optionHeader}>
                        <View style={styles.iconContainerWhite}>
                          <Ionicons name="star" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.optionInfo}>
                          <Text style={[styles.optionTitle, styles.textWhite]}>
                            Đăng ký Premium
                          </Text>
                          <Text style={[styles.optionPrice, styles.textWhite]}>
                            99.000đ/tháng
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.optionDescription, styles.textWhiteOpacity]}>
                        Nghe không giới hạn toàn bộ kho nhạc. Chất lượng cao nhất. Hủy bất kỳ lúc nào.
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Option 2: Subscribe Artist Membership */}
                {song.artist_id && membershipInfo && membershipInfo.price > 0 && !membershipStatus?.has_membership && (
                  <TouchableOpacity
                    style={[styles.optionCard, styles.normalCard]}
                    onPress={handleSubscribeMembership}
                    disabled={loadingMembership}
                  >
                    <View style={styles.optionHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                        <Ionicons name="heart" size={24} color={COLORS.secondary} />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>
                          Fan cứng {song.artist_name}
                        </Text>
                        <Text style={styles.optionPrice}>
                          {membershipInfo.price.toLocaleString('vi-VN')}đ
                          <Text style={styles.periodText}>/{membershipInfo.duration_days} ngày</Text>
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>
                      Truy cập đặc quyền tất cả bài hát Premium của nghệ sĩ này.
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Option 1: Purchase Song */}
                <TouchableOpacity
                  style={[styles.optionCard, styles.normalCard]}
                  onPress={handlePurchaseSong}
                >
                  <View style={styles.optionHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                      <Ionicons name="cart" size={24} color={COLORS.accent} />
                    </View>
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>Mua bài hát này</Text>
                      <Text style={styles.optionPrice}>
                        {songPrice.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.optionDescription}>
                    Sở hữu vĩnh viễn bài hát này. Không cần đăng ký gói tháng.
                  </Text>
                  {parseFloat(balance) < parseFloat(songPrice) && (
                    <View style={styles.balanceWarning}>
                      <Text style={styles.balanceWarningText}>
                        Số dư hiện tại: {balance.toLocaleString('vi-VN')}đ (Không đủ)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Để sau</Text>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>

      {/* Confirmation Modal */}
      {showConfirmModal && getConfirmModalProps() && (
        <PurchaseConfirmationModal
          visible={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmPurchase}
          loading={loadingConfirm}
          onDeposit={() => {
            setShowConfirmModal(false);
            onClose();
            navigation.navigate('Wallet');
          }}
          {...getConfirmModalProps()}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  gradientBackground: {
    height: '100%',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  closeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  coverContainer: {
    position: 'relative',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  coverImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    borderRadius: 70,
  },
  lockBadge: {
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  artistName: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  options: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  normalCard: {
    backgroundColor: '#2A2A2A',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  premiumGradient: {
    padding: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerWhite: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  periodText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: 'normal',
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  textWhite: {
    color: '#FFF',
  },
  textWhiteOpacity: {
    color: 'rgba(255,255,255,0.9)',
  },
  balanceWarning: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  balanceWarningText: {
    fontSize: 12,
    color: '#EF5350',
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default PremiumAccessModal;
