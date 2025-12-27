import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';

const PremiumBadge = ({ size = 'small', style, text = 'PREMIUM' }) => {
  const sizeStyles = size === 'large' ? styles.large : styles.small;
  const iconSize = size === 'large' ? 14 : 10;
  const fontSize = size === 'large' ? 10 : 8;

  return (
    <View style={[styles.badge, sizeStyles, style]}>
      <Ionicons name="star" size={iconSize} color="#FFD700" />
      <Text style={[styles.text, { fontSize }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  small: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  large: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 2,
  },
});

export default PremiumBadge;

