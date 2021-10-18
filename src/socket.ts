import 'dotenv/config';
import {Socket} from 'socket.io';
import {refreshTokenInternal, spotify, SpotifyError, isSpotifyError} from './spotify';
import {restartRaspotify} from './shell';

const {SPO_DEFAULT_ID} = process.env;

if (!SPO_DEFAULT_ID) {
  throw new Error('Missing default device id in .env');
}

const C = {
  HAS_SCRUBBED_THRESHOLD: 1500,
  HAS_FINISHED_THRESHOLD: 2000,
  POLL_RATE: 1000,
};

type SpotifySocket = Socket & {
  hasSentInitialState: boolean;
  hasNotifiedTrackEnd: boolean;
  lastSentError: string;
  pollRate: number;
  playerState?: SpotifyApi.CurrentPlaybackResponse;
  poll: () => void;
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

  type Payload = string | number | boolean | object;

  const emit = (event: string, ...args: Payload[]) => {
    // console.info('emit', event);

    return socket.emit(event, ...args);
  };

  const handleError = async (error: SpotifyError | Error) => {
    const message = isSpotifyError(error) ? error.body.error.message : error.message;
    console.error(message);

    switch (message) {
      case 'The access token expired':
        await refreshTokenInternal().catch(handleError);
        break;
      case 'Device not found':
        console.info('Restarting raspotify');
        restartRaspotify();
        break;
      case 'No active device':
      case 'Player command failed: No active device found':
        const defaultDevice = process.env[SPO_DEFAULT_ID];

        if (!defaultDevice) break;

        console.info('Transfering playback to', defaultDevice);
        await spotify.transferMyPlayback([defaultDevice], {play: false}).catch(handleError);
        break;
    }
  };

  socket.on('disconnect', () => {
    clearTimeout(timeoutId);
    socket.poll = () => {};
  });

  socket.on('initiate', () => {
    if (!spotify.getAccessToken()) {
      emit('no_token');

      return;
    }

    socket.poll = poll;
    socket.poll();
  });

  const poll = async () => {
    try {
      const {body: playerState} = await spotify.getMyCurrentPlaybackState();

      if (!playerState || !playerState.device || !playerState.item || null === playerState.progress_ms) {
        throw new Error('No active device');
      }

      if (!socket.hasSentInitialState || !socket.playerState) {
        emit('initial_state', playerState);
        socket.playerState = playerState;
        socket.hasSentInitialState = true;

        return;
      }

      // reset poll rate if no errors were encountered
      socket.pollRate = C.POLL_RATE;

      if (playerState.item.id !== socket.playerState?.item?.id) {
        // track has changed
        emit('track_change', playerState.item);
        socket.hasNotifiedTrackEnd = false;
      }

      if (socket.playerState.progress_ms) {
        // check if the track has been scrubbed
        const negativeProgress = playerState.progress_ms > socket.playerState.progress_ms + C.HAS_SCRUBBED_THRESHOLD;
        const positiveProgress = playerState.progress_ms < socket.playerState.progress_ms - C.HAS_SCRUBBED_THRESHOLD;
        if (negativeProgress || positiveProgress) {
          emit('seek', playerState.progress_ms, playerState.timestamp);
        }
      }
      if (playerState.is_playing !== socket.playerState.is_playing) {
        // play state has changed
        emit(playerState.is_playing ? 'playback_started' : 'playback_paused');
      }
      if (playerState.shuffle_state !== socket.playerState.shuffle_state) {
        // shuffle state has changed
        emit('shuffle_state', playerState.shuffle_state);
      }
      if (playerState.repeat_state !== socket.playerState.repeat_state) {
        // repeat state has changed
        emit('repeat_state', playerState.repeat_state);
      }
      if (playerState.device.id !== socket.playerState.device.id) {
        // device has changed
        emit('device_change', playerState.device);
      } else {
        // device is the same, check volume
        if (playerState.device.volume_percent !== socket.playerState.device.volume_percent) {
          // volume has changed
          emit('volume_change', Number(playerState.device.volume_percent));
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
      if (error instanceof Error) handleError(error);
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
