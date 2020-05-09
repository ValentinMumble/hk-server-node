import 'dotenv/config';
import http from 'http';
import https from 'https';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import socketio from 'socket.io';
import connectSocket from 'spotify-connect-ws';
import {turnOn, turnOff, setBrightness} from './hue';
import {discoverBluetooth, resetBluetooth} from './shell';
import {addTrackToOK, getAccessToken, getDevices, getPlaylists, authorize, refreshToken} from './spotify';
import {initResponse} from './utils';

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

app.get('/soca/count', (req, res) => {
  const response = initResponse<number>(req.originalUrl);
  const clientCount = Object.keys(io.sockets.sockets).length;

  if (0 === clientCount) {
    response.status = 204;
  } else {
    response.results.push(clientCount);
  }

  res.send(response);
});

app.get('/spotify/addok/:uri', addTrackToOK);
app.get('/spotify/access-token', getAccessToken);
app.get('/spotify/authorize/:code', authorize);
app.get('/spotify/devices', getDevices);
app.get('/spotify/playlists', getPlaylists);
app.get('/spotify/refresh-token', refreshToken);

app.get('/hue/on/:color', turnOn);
app.get('/hue/off/:id?', turnOff);
app.get('/hue/brightness/:value', setBrightness);

app.get('/bluetooth/reset', resetBluetooth);
app.get('/bluetooth/discover', discoverBluetooth);
