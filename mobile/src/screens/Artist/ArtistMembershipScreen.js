import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../../components/Player/MiniPlayer';

const ArtistMembershipScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId } = route.params;
  const { showSuccess, showError } = useAlert();
  
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const [membersRes, artistRes] = await Promise.all([
        artistService.getMembers(artistId),
        artistService.getArtistById(artistId),
      ]);
      
      if (membersRes.success) {
        setMembers(membersRes.data.members || []);
        setStats(membersRes.data.stats || {});
      }
      
      if (artistRes.success) {
        const artist = artistRes.data;
        setMembershipInfo({
          price: artist.membership_price || 0,
          duration_days: artist.membership_duration_days || 30,
        });
        setPriceInput((artist.membership_price || 0).toString());
        setDurationInput((artist.membership_duration_days || 30).toString());
      }
    } catch (error) {
      console.error('Error fetching membership data:', error);
      showError('Lỗi', 'Không thể tải dữ liệu hội viên');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [artistId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(priceInput);
    const duration = parseInt(durationInput);

    if (isNaN(price) || price < 0) {
      showError('Lỗi', 'Giá không hợp lệ');
      return;
    }

    if (isNaN(duration) || duration < 1) {
      showError('Lỗi', 'Thời hạn phải >= 1 ngày');
      return;
    }

    setUpdating(true);
    try {
      const response = await artistService.updateMembershipPrice(artistId, price, duration);
      if (response.success) {
        showSuccess('Thành công', 'Đã cập nhật giá hội viên');
        setShowPriceModal(false);
        setMembershipInfo({ price, duration_days: duration });
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating membership price:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      showError('Lỗi', message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return COLORS.success;
      case 'expired':
        return COLORS.textSecondary;
      case 'cancelled':
        return '#EF5350';
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'expired':
        return 'Hết hạn';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý hội viên</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowPriceModal(true)}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Membership Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Giá hội viên:</Text>
            <Text style={styles.infoValue}>
              {membershipInfo?.price ? `${membershipInfo.price.toLocaleString('vi-VN')}đ` : 'Chưa thiết lập'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời hạn:</Text>
            <Text style={styles.infoValue}>
              {membershipInfo?.duration_days || 30} ngày
            </Text>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{stats.active_members || 0}</Text>
              <Text style={styles.statLabel}>Hội viên đang hoạt động</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={32} color={COLORS.success} />
              <Text style={styles.statValue}>
                {(stats.total_revenue || 0).toLocaleString('vi-VN')}đ
              </Text>
              <Text style={styles.statLabel}>Tổng doanh thu</Text>
            </View>
          </View>
        )}

        {/* Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
          {members.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
            </View>
          ) : (
            members.map((member) => (
              <View key={member.membership_id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>
                      {member.full_name || member.username || 'Người dùng'}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(member.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(member.status) },
                        ]}
                      >
                        {getStatusText(member.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberDetail}>
                      Giá: {member.price_paid?.toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={styles.memberDetail}>
                      • Bắt đầu: {formatDate(member.start_date)}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberDetail}>
                      Hết hạn: {formatDate(member.expiry_date)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Price Update Modal */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật giá hội viên</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Giá (VNĐ)</Text>
                <TextInput
                  style={styles.input}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  placeholder="Nhập giá hội viên"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Thời hạn (ngày)</Text>
                <TextInput
                  style={styles.input}
                  value={durationInput}
                  onChangeText={setDurationInput}
                  placeholder="Nhập số ngày"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                onPress={handleUpdatePrice}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.updateButtonText}>Cập nhật</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MiniPlayer bottomOffset={0} />
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
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: 20,
    padding: 20,
    borderRadius: SIZES.borderRadius,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.padding,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    marginTop: 16,
  },
  memberCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    padding: 16,
    borderRadius: SIZES.borderRadius,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  memberDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  memberDetail: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: 12,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default ArtistMembershipScreen;

