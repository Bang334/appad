import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';

const MiniPlayer = () => {
  const navigation = useNavigation();
  const { currentSong, isPlaying, togglePlayPause, playNext, playPrevious, stopPlayer } = usePlayer();

  if (!currentSong) return null;

  const openFullPlayer = () => {
    navigation.navigate('FullPlayer');
  };

  const handleClose = () => {
    stopPlayer();
  };

  return (
    <LinearGradient
      colors={[COLORS.surface, COLORS.surfaceLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Close Button */}
      <TouchableOpacity 
        onPress={handleClose} 
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={openFullPlayer} 
        style={styles.songInfo}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: currentSong.cover_url || 'https://via.placeholder.com/50' }}
          style={styles.cover}
        />
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist_name || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          <LinearGradient
            colors={COLORS.gradient.primary}
            style={styles.playButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={COLORS.white}
            />
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={playNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 10,
    padding: 4,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: 55,
    height: 55,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 20,
  },
  controlButton: {
    padding: 6,
  },
  playButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  playButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniPlayer;

