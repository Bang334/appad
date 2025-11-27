import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../config/theme';

const { width } = Dimensions.get('window');

const CustomAlertModal = ({
  visible,
  onClose,
  title,
  message,
  type = 'success', // success, error, info, warning
  buttons = [{ text: 'OK', onPress: onClose }],
  showBalance = false,
  balance = 0,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: icon || 'checkmark-circle',
          color: '#4CAF50',
          gradient: ['#4CAF50', '#45A049'],
        };
      case 'error':
        return {
          name: icon || 'close-circle',
          color: '#EF5350',
          gradient: ['#EF5350', '#E53935'],
        };
      case 'warning':
        return {
          name: icon || 'warning',
          color: '#FFA726',
          gradient: ['#FFA726', '#FB8C00'],
        };
      case 'info':
        return {
          name: icon || 'information-circle',
          color: '#2196F3',
          gradient: ['#2196F3', '#1976D2'],
        };
      default:
        return {
          name: icon || 'checkmark-circle',
          color: '#4CAF50',
          gradient: ['#4CAF50', '#45A049'],
        };
    }
  };

  const iconConfig = getIconConfig();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d']}
            style={styles.modal}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Icon Container */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={iconConfig.gradient}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={iconConfig.name}
                  size={64}
                  color="#FFF"
                />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Balance Display (if showBalance) */}
            {showBalance && (
              <View style={styles.balanceContainer}>
                <View style={styles.balanceCard}>
                  <Ionicons name="wallet" size={20} color={COLORS.primary} />
                  <View style={styles.balanceInfo}>
                    <Text style={styles.balanceLabel}>Số dư còn lại</Text>
                    <Text style={styles.balanceValue}>
                      {parseFloat(balance).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => {
                const isPrimary = index === buttons.length - 1;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isPrimary ? styles.primaryButton : styles.secondaryButton,
                      buttons.length > 1 && index < buttons.length - 1 && styles.buttonMargin,
                    ]}
                    onPress={() => {
                      button.onPress && button.onPress();
                      if (button.closeOnPress !== false) {
                        onClose();
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {isPrimary ? (
                      <LinearGradient
                        colors={iconConfig.gradient}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.primaryButtonText}>{button.text}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.secondaryButtonText}>{button.text}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    zIndex: 1,
  },
  modal: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  balanceContainer: {
    width: '100%',
    marginBottom: 24,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonMargin: {
    marginRight: 0,
  },
  primaryButton: {
    // Gradient will be applied
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
});

export default CustomAlertModal;

