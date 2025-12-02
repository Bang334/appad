import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width, height } = Dimensions.get('window');

const YouTubeBackground = ({ videoUrl, isMuted = false }) => {
  const [playing, setPlaying] = useState(true);

  // Extract video ID from YouTube URL
  const getVideoId = (url) => {
    if (!url) return null;
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const videoId = getVideoId(videoUrl);

  const onStateChange = useCallback((state) => {
    if (state === 'ended') {
      setPlaying(true);
    }
  }, []);

  if (!videoId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoWrapper}>
        <YoutubePlayer
          height={height * 1.5} // Make it bigger to cover as background
          width={width * 1.5}
          videoId={videoId}
          play={playing}
          mute={isMuted}
          onChangeState={onStateChange}
          webViewProps={{
            injectedJavaScript: `
              var element = document.getElementsByClassName('container')[0];
              element.style.position = 'unset';
              element.style.paddingBottom = 'unset';
              true;
            `,
          }}
          initialPlayerParams={{
            loop: true,
            controls: false,
            modestbranding: true,
            rel: false,
            showinfo: false,
            iv_load_policy: 3,
            fs: false,
          }}
        />
      </View>
      {/* Dark overlay to make text readable */}
      <View style={styles.overlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -(width * 1.5) / 2 },
      { translateY: -(height * 1.5) / 2 },
    ],
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none',
  },
});

export default React.memo(YouTubeBackground);

