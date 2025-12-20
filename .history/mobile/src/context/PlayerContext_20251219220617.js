import React, { createContext, useState, useContext, useRef, useEffect, useCallback } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { songService } from '../services/songService';
import { premiumService } from '../services/premiumService';
import PremiumAccessModal from '../components/Common/PremiumAccessModal';
import SongPurchaseModal from '../components/Common/SongPurchaseModal';

const PlayerContext = createContext();
const PlayerProgressContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const usePlayerProgress = () => {
  const context = useContext(PlayerProgressContext);
  if (!context) {
    throw new Error('usePlayerProgress must be used within a PlayerProvider');
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
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumSong, setPremiumSong] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSong, setPurchaseSong] = useState(null);
  
  // Player ref instead of hook
  const playerRef = useRef(null);
  const statusSubscriptionRef = useRef(null);
  
  // Refs
  const isRepeatRef = useRef(false);
  const isShuffleRef = useRef(false);
  const originalPlaylistRef = useRef([]);
  
  // Playback tracking refs
  const playStartTimeRef = useRef(null); // When current playback started
  const accumulatedDurationRef = useRef(0); // Total ms listened (handles pause/resume)
  const lastRecordedSongRef = useRef(null); // Track last song to avoid duplicate records
  const playlistRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const playbackRequestIdRef = useRef(0); // Track playback requests to prevent race conditions
  const currentSongRef = useRef(null); // Ref to track current song (won't be lost on state updates)
  const lastDidFinishRef = useRef(false);
  const durationUpdateSentRef = useRef(null); // Track if duration update was sent for current song

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Configure audio mode on mount
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: false,
        });
      } catch (error) {
        console.error('Error configuring audio:', error);
      }
    };

    configureAudio();

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, []);

  // Record listening data helper - restored for internal logic consistency
  const recordListeningData = async () => {
    // USE REF to avoid stale state
    const song = currentSongRef.current;
    if (!song) return;
    
    try {
      let totalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        totalDuration += (Date.now() - playStartTimeRef.current);
      }
      const durationSeconds = Math.floor(totalDuration / 1000);
      
      const songDurationSeconds = Math.floor((duration || song.duration || 0) / 1000);
      const listenPercentage = songDurationSeconds > 0 ? durationSeconds / songDurationSeconds : 0;
      const isCompleted = listenPercentage >= 0.9;
      
      console.log('🎵 [recordListeningData] Manual record', {
        songId: song.song_id,
        durationSeconds,
        isCompleted
      });
      
      await songService.playSong(song.song_id, durationSeconds, isCompleted);
      
      // Reset tracking
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
    } catch (error) {
      console.error('❌ Error recording listening data:', error);
    }
  };

  const handlePlaybackFinished = useCallback(async () => {
    const finishedSong = currentSongRef.current;
    let finalDuration = accumulatedDurationRef.current;
    if (playStartTimeRef.current) {
      const finalPlayDuration = Date.now() - playStartTimeRef.current;
      finalDuration += finalPlayDuration;
    }
    const finalDurationSeconds = Math.floor(finalDuration / 1000);
    
    // Get actual song duration
    const actualSongDurationMs = duration;
    const actualSongDurationSeconds = Math.floor(actualSongDurationMs / 1000);
    
    let songDurationSeconds = actualSongDurationSeconds;
    if (songDurationSeconds === 0) {
      const songDuration = finishedSong?.duration || 0;
      if (songDuration > 10000) {
        songDurationSeconds = Math.floor(songDuration / 1000);
      } else if (songDuration > 0) {
        songDurationSeconds = songDuration;
      }
    }
    
    console.log('🎵 [AUTO-FINISH] Song finished automatically', {
      finishedSongId: finishedSong?.song_id,
      finishedSongTitle: finishedSong?.title,
      finalDurationSeconds: finalDurationSeconds,
      songDurationSeconds: songDurationSeconds,
    });
    
    // Update accumulatedDurationRef
    if (playStartTimeRef.current) {
      accumulatedDurationRef.current = finalDuration;
      playStartTimeRef.current = null;
    }
    
    const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
    const isCompleted = listenPercentage >= 0.9;
    
    if (isRepeatRef.current) {
      // Repeat current song
      if (finishedSong && finalDurationSeconds > 0) {
        songService.playSong(finishedSong.song_id, finalDurationSeconds, isCompleted)
          .then(result => {
            console.log('🎵 [AUTO-FINISH] History recorded for repeated song:', result);
          })
          .catch(err => {
            console.error('❌ [AUTO-FINISH] Error recording history for repeated song:', err);
          });
      }
      
      // Reset and replay
      if (playerRef.current) {
        try {
          playStartTimeRef.current = Date.now();
          accumulatedDurationRef.current = 0;
          playerRef.current.seekTo(0);
          playerRef.current.play();
        } catch (error) {
          console.error('Error repeating song:', error);
        }
      }
    } else {
      // Record history for finished song BEFORE calling playNext
      if (finishedSong && finalDurationSeconds > 0) {
        songService.playSong(finishedSong.song_id, finalDurationSeconds, isCompleted)
          .then(result => {
            console.log('🎵 [AUTO-FINISH] History recorded result:', result);
          })
          .catch(err => {
            console.error('❌ [AUTO-FINISH] Error recording history:', err);
          });
      }
      
      // Now play next song
      console.log('🎵 [AUTO-FINISH] Calling playNext()');
      playNext();
    }
  }, [duration]);

  const setupPlayerStatusListener = useCallback((player) => {
    // Remove existing subscription
    if (statusSubscriptionRef.current) {
      statusSubscriptionRef.current.remove();
      statusSubscriptionRef.current = null;
    }

    // Listen to player status changes
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status) {
        // Update position and duration (expo-audio uses seconds)
        if (status.currentTime !== undefined) {
          setPosition(Math.floor(status.currentTime * 1000)); // Convert to ms
        }
        if (status.duration !== undefined && status.duration > 0) {
          const durationMs = Math.floor(status.duration * 1000); // Convert to ms
          setDuration(durationMs);
          
          // Auto-update duration in database if song doesn't have duration
          // Only send once per song to avoid spam
          const currentSong = currentSongRef.current;
          if (currentSong) {
            // Normalize song duration from database to seconds for comparison
            let songDurationSeconds = 0;
            if (currentSong.duration !== null && currentSong.duration !== undefined) {
              // Duration could be in seconds (INT) or milliseconds
              // If > 10000, assume milliseconds (e.g. 180000ms = 3min)
              // If <= 10000, assume seconds (e.g. 180s = 3min)
              songDurationSeconds = currentSong.duration > 10000 
                ? Math.floor(currentSong.duration / 1000) 
                : currentSong.duration;
            }
            
            // Only update if song has no duration or duration is 0
            const needsUpdate = !currentSong.duration || currentSong.duration === null || currentSong.duration === 0 || songDurationSeconds === 0;
            
            console.log(`🔍 [PlayerContext] Duration check for song ${currentSong.song_id}:`, {
              playerDuration: durationMs,
              playerDurationSeconds: Math.round(durationMs / 1000),
              dbDuration: currentSong.duration,
              normalizedDurationSeconds: songDurationSeconds,
              needsUpdate,
              alreadySent: durationUpdateSentRef.current === currentSong.song_id
            });
            
            if (needsUpdate && durationUpdateSentRef.current !== currentSong.song_id) {
              const actualDurationSeconds = Math.round(durationMs / 1000);
              if (actualDurationSeconds > 0) {
                durationUpdateSentRef.current = currentSong.song_id;
                console.log(`🔄 [PlayerContext] Auto-updating duration for song ${currentSong.song_id}: ${actualDurationSeconds}s (current DB: ${songDurationSeconds}s)`);
                
                // Send duration update to backend (non-blocking)
                songService.playSong(currentSong.song_id, 0, false, durationMs)
                  .then(() => {
                    console.log(`✅ [PlayerContext] Successfully auto-updated duration for song ${currentSong.song_id}: ${actualDurationSeconds}s`);
                  })
                  .catch(err => {
                    console.error('⚠️ [PlayerContext] Error auto-updating duration:', err);
                    // Reset ref so we can retry next time
                    durationUpdateSentRef.current = null;
                  });
              }
            } else if (durationUpdateSentRef.current === currentSong.song_id) {
              console.log(`ℹ️ [PlayerContext] Duration update already sent for song ${currentSong.song_id}`);
            } else {
              console.log(`ℹ️ [PlayerContext] Song ${currentSong.song_id} already has duration: ${songDurationSeconds}s, skipping update`);
            }
          } else {
            console.warn('⚠️ [PlayerContext] No currentSong available for duration update');
          }
        } else {
          // Log when duration is not available yet
          if (status.duration === undefined || status.duration === 0) {
            const currentSong = currentSongRef.current;
            if (currentSong) {
              console.log(`⏳ [PlayerContext] Waiting for duration from player for song ${currentSong.song_id}, status.duration:`, status.duration);
            }
          }
        }
        
        // Update playing state
        setIsPlaying(status.playing || false);
        
        // Handle playback finished - check if current time is at the end
        const isAtEnd = status.duration > 0 && 
                       status.currentTime >= status.duration - 0.5 && 
                       !status.playing;
        
        if (isAtEnd && !lastDidFinishRef.current) {
          lastDidFinishRef.current = true;
          handlePlaybackFinished();
        } else if (status.playing) {
          lastDidFinishRef.current = false;
        }
      }
    });

    statusSubscriptionRef.current = subscription;
  }, [handlePlaybackFinished]);

  const checkSongAccess = async (song) => {
    // If not premium song, everyone can access
    if (!song.is_premium || song.is_premium === 0) {
      return { hasAccess: true };
    }

    try {
      const response = await premiumService.checkSongAccess(song.song_id);
      if (response.success && response.data) {
        return response.data;
      }
      return { hasAccess: false, reason: 'Cannot check access' };
    } catch (error) {
      console.error('Error checking song access:', error);
      // If error, assume no access for premium songs
      return { hasAccess: false, reason: 'Error checking access' };
    }
  };

  const playSong = async (song, songList = null, index = 0, playlistData = null) => {
    await playSongInternal(song, songList, index, playlistData, false);
  };

  const togglePlayPause = async () => {
    if (!playerRef.current) return;

    try {
      if (playerRef.current.playing) {
        // Pausing - accumulate current play duration
        if (playStartTimeRef.current) {
          const playDuration = Date.now() - playStartTimeRef.current;
          accumulatedDurationRef.current += playDuration;

          playStartTimeRef.current = null;
        }
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        // Resuming - start new play session
        playStartTimeRef.current = Date.now();

        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // Helper function to stop current song immediately and consolidate duration
  const stopCurrentSong = async () => {
    try {
      // Consolidate duration immediately
      if (playStartTimeRef.current) {
        const playDuration = Date.now() - playStartTimeRef.current;
        accumulatedDurationRef.current += playDuration;
        playStartTimeRef.current = null;
      }

      setPosition(0);
      setIsPlaying(false);
      // Removed setCurrentSong(null) to preserve state for history recording in playSongInternal
      
      if (playerRef.current) {
        playerRef.current.pause();
        // playerRef.current.seekTo(0); 
      }
    } catch (error) {
      console.error('Error stopping current song:', error);
    }
  };

  // Helper function to find and play next accessible song (internal, skips access check in playSong)
  const playNextAccessibleSong = async (songList, startIndex = -1, skipAccessCheck = false) => {
    if (songList.length === 0) return;
    
    // Stop current song immediately
    await stopCurrentSong();
    
    const startIdx = startIndex >= 0 ? startIndex : currentIndex;
    let attempts = 0;
    const maxAttempts = songList.length;
    
    while (attempts < maxAttempts) {
      let nextIndex;
      if (isShuffleRef.current) {
        // Shuffle mode: pick random song
        nextIndex = Math.floor(Math.random() * songList.length);
      } else {
        // Normal mode: play next song in order
        nextIndex = (startIdx + attempts + 1) % songList.length;
      }
      
      const nextSong = songList[nextIndex];
      
      // Check access unless we're already skipping it
      if (!skipAccessCheck) {
        const accessInfo = await checkSongAccess(nextSong);
        if (!accessInfo.hasAccess) {
          attempts++;
          continue;
        }
      }
      
      // Play the song (with access check disabled to avoid infinite loop)
      await playSongInternal(nextSong, songList, nextIndex, null, true);
      return;
    }
    
    console.warn('No accessible songs found in playlist');
  };

  // Internal playSong function that can skip access check
  const playSongInternal = async (song, songList = null, index = 0, playlistData = null, skipAccessCheck = false) => {
    // Increment request ID to invalidate any previous pending requests
    const requestId = ++playbackRequestIdRef.current;
    
    try {
      // 1. Calculate duration for the current (old) song BEFORE resetting refs
      let finalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        finalDuration += (Date.now() - playStartTimeRef.current);
      }
      const finalDurationSeconds = Math.floor(finalDuration / 1000);
      
      // 2. Capture old song from REF to ensure we have the latest data even if state is stale
      const oldSong = currentSongRef.current; // CHANGED FROM currentSong TO currentSongRef.current
      const oldPlayer = playerRef.current;
      
      console.log('🎵 [playSongInternal] Calculating duration for old song', {
        oldSongId: oldSong?.song_id,
        oldSongTitle: oldSong?.title,
        newSongId: song.song_id,
        newSongTitle: song.title,
        finalDuration: finalDuration,
        finalDurationSeconds: finalDurationSeconds,
      });

      // 3. Reset UI and Refs IMMEDIATELY
      setPosition(0);
      setIsPlaying(false);
      
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
      lastDidFinishRef.current = false;

      // 4. Process old song cleanup and recording in BACKGROUND
      (async () => {
        try {
          // Release old player
          if (oldPlayer) {
            if (statusSubscriptionRef.current) {
              statusSubscriptionRef.current.remove();
              statusSubscriptionRef.current = null;
            }
            if (typeof oldPlayer.pause === 'function') oldPlayer.pause();
            oldPlayer.remove();
          }
          
          // Record history if we had a song and it's different
          if (oldSong && oldSong.song_id !== song.song_id) {
             const songDurationSeconds = Math.floor((oldSong.duration || 0) / 1000);
             const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
             const isCompleted = listenPercentage >= 0.9;
             
             console.log('🎵 [playSongInternal] Recording history for old song', {
               oldSongId: oldSong.song_id,
               finalDurationSeconds: finalDurationSeconds,
               isCompleted: isCompleted,
             });
             
             await songService.playSong(oldSong.song_id, finalDurationSeconds, isCompleted);
          } else {
            console.log('🎵 [playSongInternal] Skipping history record', {
              hasOldSong: !!oldSong,
              oldSongId: oldSong?.song_id,
              isSameSong: oldSong?.song_id === song.song_id,
            });
          }
        } catch (err) {
          console.error('❌ [playSongInternal] Background cleanup error:', err);
        }
      })();
      
      // 5. Check access before playing (unless skipped)
      if (!skipAccessCheck) {
        const accessInfo = await checkSongAccess(song);
        if (!accessInfo.hasAccess) {
          // Show premium access modal
          setPremiumSong(song);
          setShowPremiumModal(true);
          return;
        }
      }

      // Reset playback tracking for new song
      playStartTimeRef.current = Date.now();
      accumulatedDurationRef.current = 0;


      // Check if playing from album and if new song is from different album
      const isPlayingAlbum = await AsyncStorage.getItem('isPlayingAlbum');
      const currentAlbumId = await AsyncStorage.getItem('currentAlbumId');
      
      if (isPlayingAlbum === '1' && currentAlbumId) {
        // If new song is not from the same album, reset flag
        if (song.album_id?.toString() !== currentAlbumId) {
          await AsyncStorage.setItem('isPlayingAlbum', '0');
          await AsyncStorage.removeItem('currentAlbumId');
        }
      }

      // Check if playing from playlist and if new song is from different playlist
      const isPlayingPlaylist = await AsyncStorage.getItem('isPlayingPlaylist');
      const currentPlaylistId = await AsyncStorage.getItem('currentPlaylistId');
      
      if (isPlayingPlaylist === '1' && currentPlaylistId) {
        // Check if the song is from the same playlist
        let isFromSamePlaylist = false;
        
        // If playlistData is provided, check playlist_id
        if (playlistData?.playlist_id) {
          isFromSamePlaylist = playlistData.playlist_id.toString() === currentPlaylistId;
        }
        
        // If not from same playlist and songList is provided, check if song is in the list
        if (!isFromSamePlaylist && songList) {
          const songInList = songList.some(s => s.song_id === song.song_id);
          if (songInList) {
            // Song is in the provided list, assume it's from the same playlist
            isFromSamePlaylist = true;
          }
        }
        
        // If not from same playlist, reset flag
        if (!isFromSamePlaylist) {
          await AsyncStorage.setItem('isPlayingPlaylist', '0');
          await AsyncStorage.removeItem('currentPlaylistId');
        }
      }

      // Update currentSong immediately with full song data
      setCurrentSong(song);
      setIsPlaying(false); // Set to false first, will be set to true after sound loads
      
      // Reset duration update tracking for new song
      durationUpdateSentRef.current = null;
      
      // Create history record immediately (with 0 duration)
      // This ensures the song appears in history even if user listens for a short time
      songService.playSong(song.song_id, 0, false).catch(err => console.error('Error creating history record:', err));

      // Check if a new request has started while we were processing
      if (requestId !== playbackRequestIdRef.current) {
        return;
      }

      // Create new player with the song source
      const newPlayer = createAudioPlayer({ uri: song.file_url }, {
        updateInterval: 1000, // Update every second (1000ms)
      });
      
      playerRef.current = newPlayer;
      
      // Setup status listener
      setupPlayerStatusListener(newPlayer);
      
      // Wait a bit for the player to initialize, then play
      setTimeout(() => {
        if (requestId === playbackRequestIdRef.current && playerRef.current) {
          playerRef.current.play();
          setIsPlaying(true);
          
          // Check duration after a delay to ensure it's loaded
          // This is a fallback in case the status listener doesn't catch it immediately
          setTimeout(() => {
            if (requestId === playbackRequestIdRef.current && playerRef.current) {
              newPlayer.getStatus().then(status => {
                if (status && status.duration && status.duration > 0) {
                  const durationMs = Math.floor(status.duration * 1000);
                  const currentSong = currentSongRef.current;
                  
                  if (currentSong && currentSong.song_id === song.song_id) {
                    // Check if we need to update duration
                    let songDurationSeconds = 0;
                    if (currentSong.duration !== null && currentSong.duration !== undefined) {
                      songDurationSeconds = currentSong.duration > 10000 
                        ? Math.floor(currentSong.duration / 1000) 
                        : currentSong.duration;
                    }
                    
                    const needsUpdate = !currentSong.duration || currentSong.duration === null || currentSong.duration === 0 || songDurationSeconds === 0;
                    
                    if (needsUpdate && durationUpdateSentRef.current !== currentSong.song_id) {
                      const actualDurationSeconds = Math.round(durationMs / 1000);
                      if (actualDurationSeconds > 0) {
                        durationUpdateSentRef.current = currentSong.song_id;
                        console.log(`🔄 [PlayerContext] Fallback: Auto-updating duration for song ${currentSong.song_id}: ${actualDurationSeconds}s`);
                        
                        songService.playSong(currentSong.song_id, 0, false, durationMs)
                          .then(() => {
                            console.log(`✅ [PlayerContext] Fallback: Successfully auto-updated duration for song ${currentSong.song_id}: ${actualDurationSeconds}s`);
                          })
                          .catch(err => {
                            console.error('⚠️ [PlayerContext] Fallback: Error auto-updating duration:', err);
                            durationUpdateSentRef.current = null;
                          });
                      }
                    }
                  }
                }
              }).catch(err => {
                console.error('⚠️ [PlayerContext] Error getting player status:', err);
              });
            }
          }, 2000); // Check after 2 seconds
        }
      }, 100);

      if (songList) {
        // Filter out premium songs user doesn't have access to (async, but we'll do it in background)
        // For now, save all songs but check access when playing
        originalPlaylistRef.current = [...songList];
        
        // If shuffle is enabled, create a shuffled copy
        if (isShuffleRef.current) {
          const shuffled = [...songList].sort(() => Math.random() - 0.5);
          const shuffledIndex = shuffled.findIndex(s => s.song_id === song.song_id);
          setPlaylist(shuffled);
          setCurrentIndex(shuffledIndex >= 0 ? shuffledIndex : 0);
        } else {
          setPlaylist(songList);
          setCurrentIndex(index);
        }
      }

      if (playlistData) {
        setCurrentPlaylist(playlistData);
      } else {
        setCurrentPlaylist(null);
      }

      // Refresh song data after a delay to get updated listen_count and rating from backend
      // (Only updates after user has listened >50% of the song)
      setTimeout(() => {
        refreshCurrentSong(song.song_id);
      }, 1500);
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const playNext = async () => {
    // Use playlist from ref to avoid stale state in callbacks
    const currentPlaylist = playlistRef.current.length > 0 ? playlistRef.current : originalPlaylistRef.current;
    if (currentPlaylist.length === 0) {
      console.warn('No playlist available for next song');
      return;
    }
    
    // Use currentIndex from ref
    const idx = currentIndexRef.current >= 0 ? currentIndexRef.current : 0;
    await playNextAccessibleSong(currentPlaylist, idx);
  };

  const toggleRepeat = () => {
    setIsRepeat(prev => {
      const newValue = !prev;
      isRepeatRef.current = newValue;
      return newValue;
    });
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => {
      const newValue = !prev;
      isShuffleRef.current = newValue;
      
      if (playlist.length === 0) return newValue;
      
      // If enabling shuffle, shuffle the current playlist
      if (newValue) {
        // Save original if not already saved
        if (originalPlaylistRef.current.length === 0) {
          originalPlaylistRef.current = [...playlist];
        }
        
        const shuffled = [...playlist].sort(() => Math.random() - 0.5);
        // Find current song in shuffled list
        const currentSongId = currentSong?.song_id;
        const shuffledIndex = shuffled.findIndex(s => s.song_id === currentSongId);
        if (shuffledIndex >= 0) {
          setPlaylist(shuffled);
          setCurrentIndex(shuffledIndex);
        } else {
          setPlaylist(shuffled);
          setCurrentIndex(0);
        }
      } else {
        // If disabling shuffle, restore original order
        if (originalPlaylistRef.current.length > 0) {
          const currentSongId = currentSong?.song_id;
          const originalIndex = originalPlaylistRef.current.findIndex(s => s.song_id === currentSongId);
          setPlaylist(originalPlaylistRef.current);
          setCurrentIndex(originalIndex >= 0 ? originalIndex : 0);
        }
      }
      
      return newValue;
    });
  };

  const playPrevious = async () => {
    const currentPlaylist = playlistRef.current.length > 0 ? playlistRef.current : originalPlaylistRef.current;
    if (currentPlaylist.length === 0) return;
    
    // Stop current song immediately
    await stopCurrentSong();
    
    let attempts = 0;
    const maxAttempts = currentPlaylist.length;
    
    while (attempts < maxAttempts) {
      let prevIndex;
      if (isShuffleRef.current) {
        // Shuffle mode: pick random song
        prevIndex = Math.floor(Math.random() * currentPlaylist.length);
      } else {
        // Normal mode: play previous song in order
        const baseIndex = currentIndexRef.current === 0 ? currentPlaylist.length - 1 : currentIndexRef.current - 1;
        prevIndex = (baseIndex - attempts + currentPlaylist.length) % currentPlaylist.length;
      }
      
      const prevSong = currentPlaylist[prevIndex];
      const accessInfo = await checkSongAccess(prevSong);
      
      if (accessInfo.hasAccess) {
        await playSongInternal(prevSong, currentPlaylist, prevIndex, null, true);
        return;
      }
      
      attempts++;
    }
    
    console.warn('No accessible songs found in playlist');
  };

  const seekTo = async (value) => {
    if (!playerRef.current) return;

    try {
      // expo-audio seekTo uses seconds
      playerRef.current.seekTo(value / 1000);
      setPosition(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  // stopPlayer Function - FIXED with REF usage
  const stopPlayer = async () => {
    try {
      // 1. Pause immediately if playing
      const oldPlayer = playerRef.current;
      if (oldPlayer) {
        try {
          if (typeof oldPlayer.pause === 'function') oldPlayer.pause();
        } catch (e) {}
      }

      // 2. Calculate final duration
      // USE REF to ensure we get the song even if state is cleared/stale
      const oldSong = currentSongRef.current; 
      
      let finalDuration = accumulatedDurationRef.current;
      if (playStartTimeRef.current) {
        finalDuration += (Date.now() - playStartTimeRef.current);
      }
      const finalDurationSeconds = Math.floor(finalDuration / 1000);
      
      // 3. Record listening history IMMEDIATELY
      if (oldSong) {
        const songDurationSeconds = Math.floor((oldSong.duration || 0) / 1000);
        const listenPercentage = songDurationSeconds > 0 ? finalDurationSeconds / songDurationSeconds : 0;
        const isCompleted = listenPercentage >= 0.9;
        
        console.log('🎵 [stopPlayer] Saving history', {
          song: oldSong.title,
          duration: finalDurationSeconds,
          completed: isCompleted
        });
        
        songService.playSong(oldSong.song_id, finalDurationSeconds, isCompleted)
          .catch(err => console.error('❌ Error saving history in stopPlayer:', err));
      }

      // 4. Reset UI and cleanup
      setCurrentSong(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setPlaylist([]);
      setCurrentIndex(-1);
      setCurrentPlaylist(null);
      
      // Reset tracking refs
      playStartTimeRef.current = null;
      accumulatedDurationRef.current = 0;
      lastRecordedSongRef.current = null;
      playerRef.current = null;
      
      // 5. Cleanup player resources
      if (oldPlayer) {
        if (statusSubscriptionRef.current) {
          statusSubscriptionRef.current.remove();
          statusSubscriptionRef.current = null;
        }
        oldPlayer.remove();
      }
      
      // Remove flags
      AsyncStorage.setItem('isPlayingAlbum', '0').catch(() => {});
      AsyncStorage.removeItem('currentAlbumId').catch(() => {});
      AsyncStorage.setItem('isPlayingPlaylist', '0').catch(() => {});
      AsyncStorage.removeItem('currentPlaylistId').catch(() => {});

    } catch (error) {
      console.error('Error stopping player:', error);
    }
  };

  const refreshCurrentSong = async (songId = null) => {
    const idToRefresh = songId || currentSong?.song_id;
    if (!idToRefresh) return;
    
    try {
      const response = await songService.getSongById(idToRefresh);
      if (response.success && response.data) {
        setCurrentSong((prev) => {
          // Only update if this is still the current song
          if (prev?.song_id === idToRefresh) {
            return {
              ...prev,
              ...response.data,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error refreshing song:', error);
    }
  };

  // Move song in playlist to new position
  const moveSongInPlaylist = (fromIndex, toIndex) => {
    if (!playlist || playlist.length === 0) return;
    if (fromIndex < 0 || fromIndex >= playlist.length) return;
    if (toIndex < 0 || toIndex >= playlist.length) return;
    if (fromIndex === toIndex) return;

    const newPlaylist = [...playlist];
    const [movedSong] = newPlaylist.splice(fromIndex, 1);
    newPlaylist.splice(toIndex, 0, movedSong);

    // Update current index if needed
    let newCurrentIndex = currentIndex;
    if (currentIndex === fromIndex) {
      newCurrentIndex = toIndex;
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      newCurrentIndex = currentIndex - 1;
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      newCurrentIndex = currentIndex + 1;
    }

    setPlaylist(newPlaylist);
    setCurrentIndex(newCurrentIndex);
    originalPlaylistRef.current = newPlaylist;
  };

  const handlePurchaseSong = () => {
    setShowPremiumModal(false);
    setPurchaseSong(premiumSong);
    setShowPurchaseModal(true);
  };

  const handleSubscribePremium = () => {
    setShowPremiumModal(false);
    // Navigation will be handled by the modal using useNavigation
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    setPurchaseSong(null);
    // Retry playing the song after purchase
    if (premiumSong) {
      playSongInternal(premiumSong, null, 0, null, true);
      setPremiumSong(null);
    }
  };

  // Optimize Context Values
  // Main player state (excluding fast-changing progress)
  const playerState = React.useMemo(() => ({
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    currentPlaylist,
    isRepeat,
    isShuffle,
    showPremiumModal,
    premiumSong,
    showPurchaseModal,
    purchaseSong,
  }), [
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    currentPlaylist,
    isRepeat,
    isShuffle,
    showPremiumModal,
    premiumSong,
    showPurchaseModal,
    purchaseSong,
  ]);

  // Progress state (updates every second)
  const playerProgress = React.useMemo(() => ({
    position,
    duration,
  }), [position, duration]);

  const playerActions = React.useMemo(() => ({
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    toggleRepeat,
    toggleShuffle,
    stopPlayer,
    refreshCurrentSong,
    moveSongInPlaylist,
    setShowPremiumModal,
    setShowPurchaseModal,
  }), []); // Actions should be stable

  const contextValue = React.useMemo(() => ({
    ...playerState,
    ...playerActions,
  }), [playerState, playerActions]);

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerProgressContext.Provider value={playerProgress}>
        {children}
        <PremiumAccessModal
          visible={showPremiumModal}
          song={premiumSong}
          onClose={() => {
            setShowPremiumModal(false);
            setPremiumSong(null);
          }}
          onPurchaseSong={handlePurchaseSong}
          onSubscribePremium={handleSubscribePremium}
          playSong={playSong}
        />
        <SongPurchaseModal
          visible={showPurchaseModal}
          song={purchaseSong}
          onClose={() => {
            setShowPurchaseModal(false);
            setPurchaseSong(null);
          }}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
};
