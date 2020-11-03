import 'dotenv/config';
import http from 'http';
import https from 'https';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import socketio from 'socket.io';
import connectSocket from 'spotify-connect-ws';
import {turnOn, turnOff, setBrightness, toggle, getLights} from './hue';
import {discoverBluetooth, resetBluetooth, restartRaspotify, reboot} from './shell';
import {
  addTrackToOK,
  getAccessToken,
  getDevices,
  getPlaylists,
  authorize,
  refreshToken,
  getCurrentTrack,
  playUri,
  playCurrentTrackRadio,
  searchTracks,
  storePalette,
  addToQueue,
} from './spotify';
import {getTrackLyrics, getCurrentTrackLyrics} from './genius';

const {ALLOWED_ORIGINS = '[]', APP_ENV, HTTPS_CERT_FILE = '', HTTPS_KEY_FILE = '', PORT} = process.env;

const isProd = 'prod' === APP_ENV;
const app = express();
let server;

if (isProd) {
  server = https.createServer({key: fs.readFileSync(HTTPS_KEY_FILE), cert: fs.readFileSync(HTTPS_CERT_FILE)}, app);
} else {
  server = http.createServer(app);
}

const allowedOrigins: string[] = JSON.parse(ALLOWED_ORIGINS);
app.use(
  cors({
    origin: (origin, callback) => {
      origin && !allowedOrigins.includes(origin)
        ? callback(new Error(`Unallowed CORS: ${origin}`), false)
        : callback(null, true);
    },
  })
);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

server.listen(PORT);

const io = socketio(server);
io.of('connect').on('connection', connectSocket);

app.get('/soca/count', (_, res) => {
  const clientCount = Object.keys(io.sockets.sockets).length;

  if (0 === clientCount) {
    res.status(204).send();
  } else {
    res.send({result: clientCount});
  }
});

app.post('/palette', storePalette);

app.get('/spotify/addok/:uri', addTrackToOK);
app.get('/spotify/access-token', getAccessToken);
app.get('/spotify/authorize/:code', authorize);
app.get('/spotify/devices', getDevices);
app.get('/spotify/play/:uri', playUri);
app.get('/spotify/playlists', getPlaylists);
app.get('/spotify/radio', playCurrentTrackRadio);
app.get('/spotify/refresh-token', refreshToken);
app.get('/spotify/track', getCurrentTrack);
app.get('/spotify/search/:search', searchTracks);
app.get('/spotify/queue/:uri', addToQueue);

app.get('/hue/on/:color', turnOn);
app.get('/hue/off/:id?', turnOff);
app.get('/hue/toggle/:id', toggle);
app.get('/hue/brightness/:ratio', setBrightness);
app.get('/hue/lights', getLights);

app.get('/bluetooth/reset', resetBluetooth);
app.get('/bluetooth/discover', discoverBluetooth);

app.get('/raspotify/restart', restartRaspotify);
app.get('/reboot', reboot);

app.get('/lyrics/:artist/:title', getTrackLyrics);
app.get('/lyrics/current', getCurrentTrackLyrics);
