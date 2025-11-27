import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../config/theme';
import { adminService } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';
import MiniPlayer from '../../components/Player/MiniPlayer';

const AdminTransactionsScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending'); // all, pending, completed, cancelled
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchTransactions = async () => {
    try {
      const response = await adminService.getAllTransactions({
        type: 'deposit',
        status: filter === 'all' ? undefined : filter,
      });
      if (response.success) {
        setTransactions(response.data);
      }

      // Get pending count
      const countResponse = await adminService.getPendingDepositsCount();
      if (countResponse.success) {
        setPendingCount(countResponse.data.count);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const handleApprove = (transaction) => {
    Alert.alert(
      'Xác nhận duyệt',
      `Duyệt nạp tiền ${parseFloat(transaction.amount).toLocaleString('vi-VN')}đ cho ${transaction.username || transaction.email}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              const response = await adminService.approveDeposit(transaction.transaction_id);
              if (response.success) {
                Alert.alert('Thành công', 'Đã duyệt nạp tiền và cộng vào tài khoản');
                fetchTransactions();
              }
            } catch (error) {
              const message = error.response?.data?.message || 'Có lỗi xảy ra';
              Alert.alert('Lỗi', message);
            }
          },
        },
      ]
    );
  };

  const handleReject = (transaction) => {
    setSelectedTransaction(transaction);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedTransaction) return;

    if (!rejectReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      const response = await adminService.rejectDeposit(
        selectedTransaction.transaction_id,
        rejectReason.trim()
      );
      if (response.success) {
        Alert.alert('Thành công', 'Đã từ chối giao dịch');
        setShowRejectModal(false);
        setSelectedTransaction(null);
        setRejectReason('');
        fetchTransactions();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      Alert.alert('Lỗi', message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FFA726';
      case 'cancelled':
        return '#EF5350';
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Đã duyệt';
      case 'pending':
        return 'Chờ duyệt';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const isPending = item.status === 'pending';

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View>
            <Text style={styles.userName}>{item.full_name || item.username || item.email}</Text>
            <Text style={styles.amount}>
              {parseFloat(item.amount).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.email}</Text>
        </View>

        {item.reference_code && (
          <View style={styles.infoRow}>
            <Ionicons name="barcode" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Mã: {item.reference_code}</Text>
          </View>
        )}

        {item.description && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{item.description}</Text>
          </View>
        )}

        <Text style={styles.date}>Tạo: {formatDate(item.created_at)}</Text>
        {item.updated_at && item.updated_at !== item.created_at && (
          <Text style={styles.date}>Cập nhật: {formatDate(item.updated_at)}</Text>
        )}

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Duyệt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
            >
              <Ionicons name="close" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['pending', 'completed', 'cancelled', 'all'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tất cả' : getStatusText(f)}
            </Text>
            {f === 'pending' && pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Không có giao dịch nào</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => `transaction-${item.transaction_id}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRejectModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Từ chối giao dịch</Text>
                <TouchableOpacity
                  onPress={() => setShowRejectModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {selectedTransaction && (
                  <View style={styles.transactionInfo}>
                    <Text style={styles.infoLabel}>Người dùng:</Text>
                    <Text style={styles.infoValue}>
                      {selectedTransaction.full_name || selectedTransaction.username || selectedTransaction.email}
                    </Text>
                    <Text style={styles.infoLabel}>Số tiền:</Text>
                    <Text style={styles.infoValue}>
                      {parseFloat(selectedTransaction.amount).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Lý do từ chối *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập lý do từ chối giao dịch..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectModalButton]}
                  onPress={confirmReject}
                >
                  <Text style={styles.rejectButtonText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.surface,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: '#FFF',
  },
  badge: {
    backgroundColor: '#EF5350',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  noteBox: {
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.text,
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#EF5350',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: SIZES.padding,
  },
  transactionInfo: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    maxHeight: 150,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rejectModalButton: {
    backgroundColor: '#EF5350',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default AdminTransactionsScreen;

