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
  Image,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';
import { walletService } from '../../services/walletService';
import MiniPlayer from '../../components/Player/MiniPlayer';
import SuccessModal from '../../components/Common/SuccessModal';

const TopUpScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    icon: 'checkmark-circle',
    onClose: null
  });

  const showAlert = (title, message, icon = 'checkmark-circle', callback = null) => {
    setAlertConfig({
      title,
      message,
      icon,
      onClose: callback
    });
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertConfig.onClose) {
      alertConfig.onClose();
    }
  };

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleCreateTopUp = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Lỗi', 'Vui lòng nhập số tiền hợp lệ', 'alert-circle');
      return;
    }

    if (parseFloat(amount) < 10000) {
      showAlert('Lỗi', 'Số tiền tối thiểu là 10,000đ', 'alert-circle');
      return;
    }

    setLoading(true);
    try {
      const response = await walletService.createTopUp(parseFloat(amount));
      if (response.success) {
        setQrData(response.data);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      showAlert('Lỗi', message, 'alert-circle');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    showAlert('Thành công', `Đã sao chép ${label}`, 'checkmark-circle');
  };

  const handleComplete = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn đã chuyển khoản thành công chưa?',
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Đã chuyển',
          onPress: () => {
            navigation.goBack();
            setTimeout(() => {
              showAlert(
                'Thông báo',
                'Giao dịch của bạn đang được xử lý. Số dư sẽ được cập nhật sau khi kiểm tra.',
                'checkmark-circle'
              );
            }, 500);
          },
        },
      ]
    );
  };

  if (qrData) {
    return (
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Quét mã QR để chuyển khoản</Text>
          
          <View style={styles.qrCodeWrapper}>
            <Image
              source={{ uri: qrData.bank_info.qr_url }}
              style={styles.qrCode}
              resizeMode="contain"
            />
          </View>

          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>Số tiền</Text>
            <Text style={styles.amountValue}>
              {parseFloat(qrData.amount).toLocaleString('vi-VN')}đ
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Thông tin chuyển khoản</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ngân hàng</Text>
                <Text style={styles.infoValue}>{qrData.bank_info.bank_name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Số tài khoản</Text>
                <Text style={styles.infoValue}>{qrData.bank_info.account_number}</Text>
              </View>
              <TouchableOpacity
                onPress={() => copyToClipboard(qrData.bank_info.account_number, 'số tài khoản')}
              >
                <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Chủ tài khoản</Text>
                <Text style={styles.infoValue}>{qrData.bank_info.account_name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nội dung</Text>
                <Text style={[styles.infoValue, styles.referenceCode]}>
                  {qrData.reference_code}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => copyToClipboard(qrData.reference_code, 'nội dung')}
              >
                <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#FFA726" />
            <Text style={styles.warningText}>
              Vui lòng ghi đúng nội dung chuyển khoản để hệ thống tự động xử lý
            </Text>
          </View>

          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Đã chuyển khoản</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setQrData(null);
              setAmount('');
            }}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        <MiniPlayer bottomOffset={0} />
        
        <SuccessModal
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          icon={alertConfig.icon}
          onClose={handleAlertClose}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.content}>
        <Text style={styles.title}>Nạp tiền vào ví</Text>
        <Text style={styles.subtitle}>
          Nhập số tiền bạn muốn nạp vào ví
        </Text>

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

        <View style={styles.quickAmountsContainer}>
          <Text style={styles.quickAmountsLabel}>Số tiền gợi ý</Text>
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
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoBoxText}>
              • Số tiền tối thiểu: 10,000đ{'\n'}
              • Phí giao dịch: Miễn phí{'\n'}
              • Thời gian xử lý: Tức thì sau khi chuyển khoản
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateTopUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="qr-code" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Tạo mã QR</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
      <MiniPlayer bottomOffset={0} />
      
      <SuccessModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        onClose={handleAlertClose}
      />
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
    paddingBottom: 100, // Space for MiniPlayer
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
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
    marginLeft: 8,
  },
  quickAmountsContainer: {
    marginBottom: 24,
  },
  quickAmountsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  infoBoxText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  qrContainer: {
    padding: 20,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  amountDisplay: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  referenceCode: {
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA726',
    marginLeft: 8,
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default TopUpScreen;

