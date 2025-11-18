import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  
  const soundRef = useRef(null);
  const positionInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, []);

  const playSong = async (song, songList = null, index = 0, playlistData = null) => {
    try {
      // Stop current song if playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Load new song
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.file_url },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setCurrentSong(song);
      setIsPlaying(true);

      if (songList) {
        setPlaylist(songList);
        setCurrentIndex(index);
      }

      if (playlistData) {
        setCurrentPlaylist(playlistData);
      } else {
        setCurrentPlaylist(null);
      }

      // Get duration
      const status = await sound.getStatusAsync();
      setDuration(status.durationMillis || 0);

      // Update position
      startPositionTracking();

      // Handle playback status
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          playNext();
        }
      });
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        stopPositionTracking();
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        startPositionTracking();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const playNext = async () => {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    await playSong(playlist[nextIndex], playlist, nextIndex);
  };

  const playPrevious = async () => {
    if (playlist.length === 0) return;
    
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    await playSong(playlist[prevIndex], playlist, prevIndex);
  };

  const seekTo = async (value) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(value);
      setPosition(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const startPositionTracking = () => {
    stopPositionTracking();
    positionInterval.current = setInterval(async () => {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
        }
      }
    }, 1000);
  };

  const stopPositionTracking = () => {
    if (positionInterval.current) {
      clearInterval(positionInterval.current);
      positionInterval.current = null;
    }
  };

  const stopPlayer = async () => {
    try {
      // Dừng tracking và clear state ngay lập tức
      stopPositionTracking();
      setCurrentSong(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setPlaylist([]);
      setCurrentIndex(-1);
      setCurrentPlaylist(null);
      
      // Unload sound ở background để không block UI
      if (soundRef.current) {
        const sound = soundRef.current;
        soundRef.current = null;
        
        // Stop trước khi unload
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
      }
    } catch (error) {
      console.error('Error stopping player:', error);
    }
  };

  const value = {
    currentSong,
    isPlaying,
    duration,
    position,
    playlist,
    currentPlaylist,
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    stopPlayer,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

