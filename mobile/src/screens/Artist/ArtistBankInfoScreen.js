import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { artistService } from '../../services/artistService';

const ArtistBankInfoScreen = ({ route, navigation }) => {
  const { artistId, wallet } = route.params;
  
  const [bankName, setBankName] = useState(wallet?.bank_name || '');
  const [bankAccount, setBankAccount] = useState(wallet?.bank_account || '');
  const [bankAccountName, setBankAccountName] = useState(wallet?.bank_account_name || '');
  const [loading, setLoading] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const popularBanks = [
    'VietComBank',
    'Techcombank',
    'BIDV',
    'VietinBank',
    'Agribank',
    'MB Bank',
    'ACB',
    'TPBank',
    'Sacombank',
    'VPBank',
  ];

  const handleSave = async () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const response = await artistService.updateBankInfo(artistId, {
        bank_name: bankName.trim(),
        bank_account: bankAccount.trim(),
        bank_account_name: bankAccountName.trim(),
      });

      if (response.success) {
        Alert.alert('Thành công', 'Cập nhật thông tin ngân hàng thành công', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="card" size={60} color={COLORS.primary} />
          <Text style={styles.title}>Thông tin ngân hàng</Text>
          <Text style={styles.subtitle}>
            Cập nhật thông tin để nhận tiền khi rút
          </Text>
        </View>

        {/* Bank Name (Dropdown) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tên ngân hàng *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowBankModal(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                !bankName && styles.dropdownPlaceholder,
              ]}
            >
              {bankName || 'Chọn ngân hàng'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Bank Account */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Số tài khoản *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số tài khoản"
            value={bankAccount}
            onChangeText={setBankAccount}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Account Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tên chủ tài khoản *</Text>
          <TextInput
            style={styles.input}
            placeholder="NGUYEN VAN A"
            value={bankAccountName}
            onChangeText={(text) => setBankAccountName(text.toUpperCase())}
            autoCapitalize="characters"
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.hint}>
            Ghi chính xác như trên thẻ ngân hàng (không dấu, chữ in hoa)
          </Text>
        </View>

        {/* Warning */}
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#FFA726" />
          <Text style={styles.warningText}>
            Vui lòng kiểm tra kỹ thông tin. Tiền sẽ được chuyển vào tài khoản này khi rút.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Lưu thông tin</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {/* Bank selection modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {popularBanks.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={styles.modalItem}
                  onPress={() => {
                    setBankName(bank);
                    setShowBankModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{bank}</Text>
                  {bankName === bank && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {popularBanks.length === 0 && (
                <Text style={styles.emptyText}>Chưa có danh sách ngân hàng</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  bankButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  bankButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  bankButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bankButtonText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  bankButtonTextActive: {
    color: '#FFF',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  modalItemText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA726',
    marginLeft: 12,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});

export default ArtistBankInfoScreen;

