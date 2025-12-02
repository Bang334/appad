import React, { useMemo } from 'react';
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
import { usePlayer, usePlayerProgress } from '../../context/PlayerContext';
import { COLORS, SIZES } from '../../config/theme';
import Slider from '@react-native-community/slider';

const MiniPlayer = ({ bottomOffset = 60 }) => {
  const navigation = useNavigation();
  const { currentSong, isPlaying, togglePlayPause, playNext, playPrevious, stopPlayer, seekTo } = usePlayer();
  const { position, duration } = usePlayerProgress();

  // Optimize progress calculation
  const progress = useMemo(() => {
    return duration > 0 ? Math.min(position / duration, 1) : 0;
  }, [position, duration]);

  const openFullPlayer = () => {
    navigation.navigate('FullPlayer');
  };

  const handleClose = () => {
    stopPlayer();
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.round((ms || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <View
      style={[styles.container, { bottom: bottomOffset - 1 }]}
    >
      <View style={styles.contentRow}>
        {/* Close Button */}
        <TouchableOpacity 
          onPress={handleClose} 
          style={styles.closeButton}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
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
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name="play-skip-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={styles.playButton} hitSlop={{top: 5, bottom: 5, left: 5, right: 5}}>
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
          
          <TouchableOpacity onPress={playNext} style={styles.controlButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name="play-skip-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
          onSlidingComplete={seekTo}
        />
        <View style={styles.progressTimes}>
          <Text style={styles.progressTime}>{formatTime(position)}</Text>
          <Text style={styles.progressTime}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 100,  
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: SIZES.padding,
    backgroundColor: '#050505',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    gap: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -3,
    right: -3,
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
  progressWrapper: {
    width: '100%',
    marginTop: 0,
    position: 'relative',
    top: -10,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    top: -5,
  },
  progressTime: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 40,
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

export default React.memo(MiniPlayer);
