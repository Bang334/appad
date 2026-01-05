import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../config/theme';
import { premiumService } from '../../services/premiumService';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UserMembershipScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showWarning } = useAlert();
  const { refreshUser } = useAuth();
  
  const [activeMemberships, setActiveMemberships] = useState([]);
  const [historyMemberships, setHistoryMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  const fetchData = async () => {
    try {
      const response = await premiumService.getArtistMembershipsHistory();
      if (response.success) {
        setActiveMemberships(response.data.active || []);
        setHistoryMemberships(response.data.history || []);
        setActiveCount(response.data.active_count || 0);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
      showError('Lỗi', 'Không thể tải danh sách hội viên');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCancelMembership = async (artistId, artistName) => {
    showWarning(
      'Hủy hội viên',
      `Bạn có chắc muốn hủy hội viên của ${artistName}?`,
      {
        buttons: [
          {
            text: 'Không',
            onPress: () => {},
          },
          {
            text: 'Có',
            onPress: async () => {
              try {
                const response = await artistService.cancelMembership(artistId);
                if (response.success) {
                  showSuccess('Thành công', 'Đã hủy hội viên thành công');
                  await refreshUser();
                  await fetchData();
                }
              } catch (error) {
                console.error('Error cancelling membership:', error);
                const message = error.response?.data?.message || 'Có lỗi xảy ra';
                showError('Lỗi', message);
              }
            },
            closeOnPress: false,
          },
        ],
      }
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getStatusColor = (status, expiryDate) => {
    if (status === 'active' && new Date(expiryDate) > new Date()) {
      return COLORS.success;
    }
    if (status === 'expired') {
      return COLORS.textSecondary;
    }
    if (status === 'cancelled') {
      return '#EF5350';
    }
    return COLORS.textSecondary;
  };

  const getStatusText = (status, expiryDate) => {
    if (status === 'active' && new Date(expiryDate) > new Date()) {
      const days = getDaysRemaining(expiryDate);
      return `Còn ${days} ngày`;
    }
    if (status === 'expired') {
      return 'Hết hạn';
    }
    if (status === 'cancelled') {
      return 'Đã hủy';
    }
    return status;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={styles.background}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.backButtonBlur}>
               <Ionicons name="arrow-back" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hội viên Nghệ sĩ</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Active Memberships Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color="#FFD700" style={{marginRight: 8}} />
            <Text style={styles.sectionTitle}>Đang hoạt động ({activeCount})</Text>
          </View>
          
          {activeMemberships.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people" size={40} color="rgba(255,255,255,0.3)" />
              </View>
              <Text style={styles.emptyText}>Bạn chưa tham gia hội viên nào</Text>
              <Text style={styles.emptySubText}>Ủng hộ nghệ sĩ yêu thích để nhận đặc quyền riêng</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.browseButtonText}>Khám phá ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeMemberships.map((membership) => {
              const daysRemaining = getDaysRemaining(membership.expiry_date);
              const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
              
              return (
                <View key={membership.membership_id} style={styles.membershipCard}>
                  {/* Subtle dark gradient for card background */}
                  <LinearGradient
                    colors={['#2A2A2A', '#1F1F1F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardContent}
                  >
                    {/* Top Stripe for aesthetic (Gold) */}
                    <View style={styles.cardAccentStripe} />

                    <View style={styles.cardMain}>
                      <View style={styles.cardHeader}>
                        <View style={styles.imageContainer}>
                          {membership.artist_image ? (
                            <Image
                              source={{ uri: membership.artist_image }}
                              style={styles.artistImage}
                            />
                          ) : (
                            <View style={styles.artistImagePlaceholder}>
                              <Ionicons name="person" size={24} color="rgba(255,255,255,0.5)" />
                            </View>
                          )}
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                          </View>
                        </View>
                        
                        <View style={styles.headerInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.artistName} numberOfLines={1}>{membership.artist_name}</Text> 
                          </View>
                          
                          <View style={styles.subInfoRow}>
                             <View style={styles.tierContainer}>
                                <Ionicons name="ribbon" size={12} color="#FFD700" />
                                <Text style={styles.membershipTier}>Hội viên chính thức</Text>
                             </View>
                             <View style={styles.statusBadge}>
                                <Text style={[
                                  styles.statusText,
                                  { color: isExpiringSoon ? '#FFA726' : '#4CAF50' }
                                ]}>
                                   {isExpiringSoon ? `Còn ${daysRemaining} ngày` : 'Đang hoạt động'}
                                </Text>
                             </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.cardStats}>
                       <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Ngày hết hạn</Text>
                          <Text style={styles.statValue}>{formatDate(membership.expiry_date)}</Text>
                       </View>
                       <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Giá gói</Text>
                          <Text style={styles.statValue}>{Number(membership.price_paid || 0).toLocaleString('vi-VN')} đ</Text>
                       </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.viewArtistButton}
                        onPress={() => navigation.navigate('ArtistDetail', { artistId: membership.artist_id })}
                      >
                        <Text style={styles.viewArtistText}>Truy cập trang nghệ sĩ</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelMembership(membership.artist_id, membership.artist_name)}
                      >
                        <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              );
            })
          )}
        </View>

        {/* History Section */}
        {historyMemberships.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.5)" style={{marginRight: 8}} />
              <Text style={[styles.sectionTitle, {color: 'rgba(255,255,255,0.7)'}]}>Lịch sử tham gia</Text>
            </View>
            
            {historyMemberships.map((membership) => (
              <TouchableOpacity
                key={membership.membership_id}
                style={styles.historyItem}
                onPress={() => navigation.navigate('ArtistDetail', { artistId: membership.artist_id })}
              >
                  <View style={styles.historyLeft}>
                    {membership.artist_image ? (
                        <Image
                          source={{ uri: membership.artist_image }}
                          style={styles.historyImage}
                        />
                      ) : (
                        <View style={styles.historyPlaceholderImg}>
                           <Ionicons name="person" size={16} color="rgba(255,255,255,0.3)" />
                        </View>
                      )}
                      
                      <View>
                        <Text style={styles.historyName}>{membership.artist_name}</Text>
                        <Text style={styles.historyDateRange}>
                          {formatDate(membership.start_date)} - {formatDate(membership.expiry_date)}
                        </Text>
                      </View>
                  </View>

                  <View style={styles.historyRight}>
                     <View style={[styles.historyBadge, 
                        membership.status === 'expired' ? styles.badgeExpired : styles.badgeCancelled
                     ]}>
                        <Text style={styles.historyStatus}>
                          {membership.status === 'expired' ? 'Hết hạn' : 'Đã hủy'}
                        </Text>
                     </View>
                     <Text style={styles.historyPrice}>
                        {membership.price_paid?.toLocaleString('vi-VN')} đ
                     </Text>
                  </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: SIZES.md,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  browseButton: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  browseButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  // MEMBERSHIP CARD
  membershipCard: {
    marginBottom: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardContent: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  cardAccentStripe: {
    height: 4,
    width: '100%',
    backgroundColor: '#FFD700',
    opacity: 0.8,
  },
  cardMain: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
    marginRight: 16,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  artistImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  nameRow: {
    marginBottom: 4,
    marginRight: 8,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  artistName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  tierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  membershipTier: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
  },
  cardStats: {
    flexDirection: 'row',
    padding: 20,
    gap: 32,
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  viewArtistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  viewArtistText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  // HISTORY LIST
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  historyPlaceholderImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDateRange: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  historyRight: {
     alignItems: 'flex-end',
     gap: 4,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeExpired: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgeCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  historyStatus: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  historyPrice: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default UserMembershipScreen;


