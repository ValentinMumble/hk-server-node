import 'dotenv/config';
import {refreshTokenInternal, spotify} from './spotify';
import {restartRaspotify} from './shell';
import {Socket} from 'socket.io';

const {SPO_PI_ID} = process.env;

if (!SPO_PI_ID) {
  throw new Error('Missing PI id in .env');
}

const C = {
  CONNECT_ERROR: 'spo_connect_error',
  HAS_SCRUBBED_THRESHOLD: 1500,
  HAS_FINISHED_THRESHOLD: 2000,
  POLL_RATE: 1000,
};

type SpotifySocket = Socket & {
  hasSentInitialState: boolean;
  hasNotifiedTrackEnd: boolean;
  lastSentError: string;
  pollRate: number;
  playerState: any;
  poll: () => void;
};

type SpotifyError = {
  body: {
    error: {
      status: number;
      message: string;
      reason: string;
    };
  };
};

const isSpotifyError = (error: any): error is SpotifyError => undefined !== error.body.error;

const getMessage = (error: SpotifyError | Error | string) => {
  if ('string' === typeof error) {
    return error;
  }

  if (isSpotifyError(error)) {
    return error.body.error.message;
  }

  return error.message;
};

const spotifySocket = (ogSocket: Socket) => {
  let timeoutId: NodeJS.Timeout;
  let socket: SpotifySocket = Object.assign(ogSocket, {
    hasSentInitialState: false,
    hasNotifiedTrackEnd: false,
    lastSentError: '',
    pollRate: C.POLL_RATE,
    playerState: undefined,
    poll: () => {},
  });

  const emit = (event: string, ...args: any) => {
    // console.log('emit', event);

    return socket.emit(event, ...args);
  };

  const handleError = async (error: SpotifyError | Error | string) => {
    const message = getMessage(error);
    console.error('Error:', message);
    if (message !== socket.lastSentError) {
      if ('The access token expired' === message) {
        try {
          await refreshTokenInternal();
        } catch (error) {
          handleError(error);
        }
      } else if ('Device not found' === message) {
        console.log('Restarting raspotify');
        restartRaspotify();
      } else if ('No active device' === message || 'Player command failed: No active device found' === message) {
        console.log('Transfering playback to Pi');
        spotify.transferMyPlayback([SPO_PI_ID], {play: false}).catch(handleError);
      } else {
        emit(C.CONNECT_ERROR, message);
      }
      socket.lastSentError = message;
    } else {
      socket.pollRate = socket.pollRate < 5000 ? socket.pollRate + 1000 : 5000;
    }
  };

  socket.on('disconnect', () => {
    clearTimeout(timeoutId);
    socket.poll = () => {};
  });

  socket.on('initiate', () => {
    if (!spotify.getAccessToken()) {
      return emit(C.CONNECT_ERROR, 'Access token required');
    }

    //Useless?
    socket.pollRate = C.POLL_RATE;
    socket.poll = poll;

    socket.poll();
  });

  const poll = async () => {
    try {
      const {body: playerState} = await spotify.getMyCurrentPlaybackState();

      if (!playerState || !playerState.device || !playerState.item || !playerState.progress_ms) {
        handleError('No active device');
        socket.hasSentInitialState = false;
        return;
      }

      if (!socket.hasSentInitialState) {
        emit('initial_state', playerState);
        socket.playerState = playerState;
        socket.hasSentInitialState = true;
        return;
      }

      // reset poll rate if no errors were encountered
      socket.pollRate = C.POLL_RATE;

      if (playerState.item.id !== socket.playerState.item.id) {
        // track has changed
        emit('track_change', playerState.item);
        socket.hasNotifiedTrackEnd = false;
      }

      // check if the track has been scrubbed
      const negativeProgress = playerState.progress_ms > socket.playerState.progress_ms + C.HAS_SCRUBBED_THRESHOLD;
      const positiveProgress = playerState.progress_ms < socket.playerState.progress_ms - C.HAS_SCRUBBED_THRESHOLD;
      if (negativeProgress || positiveProgress) {
        emit('seek', playerState.progress_ms, playerState.timestamp);
      }
      if (playerState.is_playing !== socket.playerState.is_playing) {
        // play state has changed
        emit(playerState.is_playing ? 'playback_started' : 'playback_paused');
      }
      if (playerState.device.id !== socket.playerState.device.id) {
        // device has changed
        emit('device_change', playerState.device);
      } else {
        // device is the same, check volume
        if (playerState.device.volume_percent !== socket.playerState.device.volume_percent) {
          // volume has changed
          emit('volume_change', playerState.device.volume_percent);
        }
      }

      if (
        !socket.hasNotifiedTrackEnd &&
        playerState.progress_ms + C.HAS_FINISHED_THRESHOLD > playerState.item.duration_ms
      ) {
        emit('track_end', playerState.item);
        socket.hasNotifiedTrackEnd = true;
      }

      socket.playerState = playerState;
    } catch (error) {
      handleError(error);
    } finally {
      timeoutId = setTimeout(socket.poll, socket.pollRate);
    }
  };

  socket.on('play', (track?: {context_uri?: string; uris?: string[]}) => {
    spotify.play(track).catch(handleError);
  });

  socket.on('pause', () => {
    spotify.pause().catch(handleError);
  });

  socket.on('seek', (positionMs: number) => {
    spotify.seek(positionMs).catch(handleError);
  });

  socket.on('set_volume', (volumePercent: number) => {
    spotify.setVolume(volumePercent).catch(handleError);
  });

  socket.on('next_track', () => {
    spotify.skipToNext().catch(handleError);
  });

  socket.on('previous_track', () => {
    spotify.skipToPrevious().catch(handleError);
  });

  socket.on('transfer_playback', ({id, play}: {id: string; play: boolean}) => {
    spotify.transferMyPlayback([id], {play}).catch(handleError);
  });
};

export {spotifySocket};
