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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { artistService } from '../../services/artistService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ArtistWithdrawScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { artistId, wallet } = route.params;
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const availableBalance = parseFloat(wallet?.balance || 0);
  const hasBankInfo = wallet?.bank_name && wallet?.bank_account;

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (withdrawAmount < 50000) {
      Alert.alert('Lỗi', 'Số tiền rút tối thiểu là 50,000đ');
      return;
    }

    if (withdrawAmount > availableBalance) {
      Alert.alert('Lỗi', `Số dư không đủ. Số dư hiện tại: ${availableBalance.toLocaleString('vi-VN')}đ`);
      return;
    }

    if (!hasBankInfo) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Cập nhật',
            onPress: () => navigation.navigate('ArtistBankInfo', { artistId, wallet }),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Xác nhận rút tiền',
      `Bạn muốn rút ${withdrawAmount.toLocaleString('vi-VN')}đ?\n\nThời gian xử lý: 1-3 ngày làm việc`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await artistService.requestWithdrawal(artistId, withdrawAmount, note);
              if (response.success) {
                Alert.alert('Thành công', 'Yêu cầu rút tiền đã được gửi!', [
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
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={styles.content}>
        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <Text style={styles.balanceAmount}>
            {availableBalance.toLocaleString('vi-VN')}đ
          </Text>
        </View>

        {/* Bank Info */}
        {hasBankInfo ? (
          <View style={styles.bankInfoCard}>
            <View style={styles.bankInfoHeader}>
              <Ionicons name="card" size={20} color={COLORS.primary} />
              <Text style={styles.bankInfoTitle}>Thông tin nhận tiền</Text>
            </View>
            <Text style={styles.bankInfoText}>
              {wallet.bank_name} - {wallet.bank_account}
            </Text>
            <Text style={styles.bankInfoText}>{wallet.bank_account_name}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ArtistBankInfo', { artistId, wallet })}
            >
              <Text style={styles.editBankText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noBankCard}>
            <Ionicons name="alert-circle" size={40} color="#FFA726" />
            <Text style={styles.noBankText}>Chưa có thông tin ngân hàng</Text>
            <TouchableOpacity
              style={styles.addBankButton}
              onPress={() => navigation.navigate('ArtistBankInfo', { artistId, wallet })}
            >
              <Text style={styles.addBankText}>Thêm ngay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số tiền rút</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập số tiền"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={styles.currency}>đ</Text>
          </View>

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  amount === value.toString() && styles.quickAmountButtonActive,
                ]}
                onPress={() => handleQuickAmount(value)}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === value.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  {(value / 1000).toFixed(0)}K
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.allButton}
            onPress={() => setAmount(availableBalance.toString())}
          >
            <Text style={styles.allButtonText}>Rút tất cả</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú (tùy chọn)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Thêm ghi chú nếu cần..."
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              • Số tiền tối thiểu: 50,000đ{'\n'}
              • Phí rút tiền: Miễn phí{'\n'}
              • Thời gian xử lý: 1-3 ngày làm việc{'\n'}
              • Tiền sẽ được chuyển vào tài khoản đã đăng ký
            </Text>
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[styles.withdrawButton, loading && styles.withdrawButtonDisabled]}
          onPress={handleWithdraw}
          disabled={loading || !hasBankInfo}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cash" size={20} color="#FFF" />
              <Text style={styles.withdrawButtonText}>Rút tiền</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingTop: 60,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  bankInfoCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  bankInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  bankInfoText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  editBankText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  noBankCard: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  noBankText: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 16,
  },
  addBankButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  addBankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingVertical: 16,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickAmountButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  quickAmountButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickAmountTextActive: {
    color: '#FFF',
  },
  allButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  allButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  withdrawButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonDisabled: {
    opacity: 0.6,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});

export default ArtistWithdrawScreen;

