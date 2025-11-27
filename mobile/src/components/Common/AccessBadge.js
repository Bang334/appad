import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';

const AccessBadge = ({ accessType, size = 16 }) => {
  if (!accessType) return null;

  const getIcon = () => {
    switch (accessType) {
      case 'premium':
        return { name: 'star', color: '#FFD700' };
      case 'purchased':
        return { name: 'checkmark-circle', color: COLORS.success };
      case 'album_purchased':
        return { name: 'disc', color: COLORS.primary };
      case 'artist_membership':
        return { name: 'people', color: '#9C27B0' };
      case 'artist_owner':
        return { name: 'mic', color: COLORS.primary };
      default:
        return null;
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  return (
    <View style={styles.container}>
      <Ionicons name={icon.name} size={size} color={icon.color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 6,
  },
});

export default AccessBadge;

