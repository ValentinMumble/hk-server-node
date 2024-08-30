import 'dotenv/config';
import http from 'http';
import https from 'https';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import {Server} from 'socket.io';
import {spotifySocket} from './socket';
import {turnOn, turnOff, setBrightness, toggle, getLights} from './hue';
import {discoverBluetooth, resetBluetooth, restartRaspotify, reboot, getLogs} from './shell';
import {
  addToQueue,
  addTrackToPlaylist,
  authorize,
  getAccessToken,
  getAlbumTracks,
  getArtistTopTracks,
  getCurrentTrack,
  getDevices,
  getPlaylists,
  playCurrentTrackRadio,
  playUri,
  searchTracks,
  setRepeat,
  setShuffle,
  storePalette,
} from './spotify';
import {getTrackLyrics, getCurrentTrackLyrics} from './genius';
import {getEvents, postEvent} from './statva';

const {ALLOWED_ORIGINS, APP_ENV, HTTPS_CERT_FILE = '', HTTPS_KEY_FILE = '', PORT, WS_NAMESPACE = ''} = process.env;

if (!ALLOWED_ORIGINS) {
  throw new Error('Allowed origins must be set in .env');
}

const isProd = 'prod' === APP_ENV;
const app = express();

const server = isProd
  ? https.createServer({key: fs.readFileSync(HTTPS_KEY_FILE), cert: fs.readFileSync(HTTPS_CERT_FILE)}, app)
  : http.createServer(app);

const allowedOrigins: string[] = JSON.parse(ALLOWED_ORIGINS);
// app.set('etag', false); // Disable cache
app.use(
  cors({
    origin: (origin, callback) => {
      origin && !allowedOrigins.includes(origin)
        ? callback(new Error(`Unallowed CORS: ${origin}`), false)
        : callback(null, true);
    },
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
  })
);
app.use(express.urlencoded({extended: true}));
app.use(express.json());

server.listen(PORT);

const hkNamespace = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  },
}).of(WS_NAMESPACE);

hkNamespace.on('connection', spotifySocket);

app.get('/soca/count', (_req, res) => {
  const clientCount = hkNamespace.sockets.size;

  if (0 === clientCount) {
    res.status(204).send();
  } else {
    res.json(clientCount);
  }
});

app.post('/palette', storePalette);

app.get('/spotify/access-token', getAccessToken);
app.get('/spotify/album/:albumId', getAlbumTracks);
app.get('/spotify/artist/:artistId/top/:country?', getArtistTopTracks);
app.get('/spotify/authorize/:code', authorize);
app.get('/spotify/device', getDevices);
app.get('/spotify/play/:uri', playUri);
app.get('/spotify/playlist', getPlaylists);
app.get('/spotify/playlist/add/:uri/:playlistId?', addTrackToPlaylist);
app.get('/spotify/queue/:uri', addToQueue);
app.get('/spotify/radio', playCurrentTrackRadio);
app.get('/spotify/search/:search', searchTracks);
app.get('/spotify/shuffle/:isShuffle', setShuffle);
app.get('/spotify/repeat/:repeatState', setRepeat);
app.get('/spotify/track', getCurrentTrack);

app.get('/hue/on/:color', turnOn);
app.get('/hue/off/:id?', turnOff);
app.get('/hue/toggle/:id', toggle);
app.get('/hue/brightness/:ratio', setBrightness);
app.get('/hue/light', getLights);

app.get('/bluetooth/discover', discoverBluetooth);
app.get('/bluetooth/reset', resetBluetooth);

app.get('/raspotify/restart', restartRaspotify);
app.get('/reboot', reboot);
app.get('/logs', getLogs);

app.get('/lyrics/:artist/:title', getTrackLyrics);
app.get('/lyrics/current', getCurrentTrackLyrics);

app.get('/statva/events', getEvents);
app.post('/statva/events', postEvent);

process.on('SIGINT', () => {
  process.exit();
});
