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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hội viên của tôi</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Active Memberships Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đang hoạt động ({activeCount})</Text>
          </View>
          
          {activeMemberships.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Bạn chưa có hội viên nào đang hoạt động</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.browseButtonText}>Khám phá nghệ sĩ</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeMemberships.map((membership) => {
              const daysRemaining = getDaysRemaining(membership.expiry_date);
              const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
              
              return (
                <View key={membership.membership_id} style={styles.membershipCard}>
                  <LinearGradient
                    colors={isExpiringSoon ? ['#FFA726', '#FF9800'] : [COLORS.primary, COLORS.accent]}
                    style={styles.membershipGradient}
                  >
                    <View style={styles.membershipHeader}>
                      <View style={styles.artistInfo}>
                        {membership.artist_image ? (
                          <Image
                            source={{ uri: membership.artist_image }}
                            style={styles.artistImage}
                          />
                        ) : (
                          <View style={styles.artistImagePlaceholder}>
                            <Ionicons name="person" size={24} color="#FFF" />
                          </View>
                        )}
                        <View style={styles.artistDetails}>
                          <Text style={styles.artistName}>{membership.artist_name}</Text>
                          <Text style={styles.membershipType}>Hội viên</Text>
                        </View>
                      </View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {getStatusText(membership.status, membership.expiry_date)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.membershipBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.infoText}>
                          Hết hạn: {formatDate(membership.expiry_date)}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="cash" size={16} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.infoText}>
                          Đã thanh toán: {membership.price_paid?.toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                      {isExpiringSoon && (
                        <View style={styles.warningBox}>
                          <Ionicons name="warning" size={16} color="#FFF" />
                          <Text style={styles.warningText}>
                            Hội viên sắp hết hạn! Còn {daysRemaining} ngày
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.membershipActions}>
                      <TouchableOpacity
                        style={styles.viewArtistButton}
                        onPress={() => navigation.navigate('ArtistDetail', { artistId: membership.artist_id })}
                      >
                        <Ionicons name="person" size={16} color="#FFF" />
                        <Text style={styles.viewArtistText}>Xem nghệ sĩ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelMembership(membership.artist_id, membership.artist_name)}
                      >
                        <Ionicons name="close-circle" size={16} color="#FFF" />
                        <Text style={styles.cancelButtonText}>Hủy</Text>
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
              <Text style={styles.sectionTitle}>Lịch sử ({historyMemberships.length})</Text>
            </View>
            
            {historyMemberships.map((membership) => (
              <TouchableOpacity
                key={membership.membership_id}
                style={styles.historyCard}
                onPress={() => navigation.navigate('ArtistDetail', { artistId: membership.artist_id })}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyArtistInfo}>
                    {membership.artist_image ? (
                      <Image
                        source={{ uri: membership.artist_image }}
                        style={styles.historyArtistImage}
                      />
                    ) : (
                      <View style={styles.historyArtistImagePlaceholder}>
                        <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <View style={styles.historyArtistDetails}>
                      <Text style={styles.historyArtistName}>{membership.artist_name}</Text>
                      <Text style={styles.historyDate}>
                        {formatDate(membership.start_date)} - {formatDate(membership.expiry_date)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.historyStatusBadge,
                      { backgroundColor: getStatusColor(membership.status, membership.expiry_date) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyStatusText,
                        { color: getStatusColor(membership.status, membership.expiry_date) },
                      ]}
                    >
                      {getStatusText(membership.status, membership.expiry_date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyFooter}>
                  <Text style={styles.historyPrice}>
                    {membership.price_paid?.toLocaleString('vi-VN')}đ
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
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
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
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    padding: 40,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: SIZES.borderRadius,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  membershipCard: {
    marginHorizontal: SIZES.padding,
    marginBottom: 16,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  membershipGradient: {
    padding: 20,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artistImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  artistImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artistDetails: {
    flex: 1,
  },
  artistName: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  membershipType: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
  },
  membershipBody: {
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    fontSize: SIZES.sm,
    color: '#FFF',
    fontWeight: '600',
  },
  membershipActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewArtistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
    gap: 6,
  },
  viewArtistText: {
    color: '#FFF',
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: SIZES.borderRadius,
    gap: 6,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    padding: 16,
    borderRadius: SIZES.borderRadius,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyArtistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyArtistImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  historyArtistImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyArtistDetails: {
    flex: 1,
  },
  historyArtistName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  historyPrice: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default UserMembershipScreen;


