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
import {addTrackToOK, getAccessToken, getDevices, authorize, refreshToken} from './spotify';
import {initResponse} from './utils';

const {ALLOWED_ORIGINS, APP_ENV, HTTPS_CERT_FILE, HTTPS_KEY_FILE, PORT} = process.env;

const isProd = 'prod' === APP_ENV;
const app = express();
let server;

if (isProd) {
  server = https.createServer(
    {
      key: fs.readFileSync(HTTPS_KEY_FILE),
      cert: fs.readFileSync(HTTPS_CERT_FILE),
    },
    app
  );
} else {
  server = http.createServer(app);
}

const allowedOrigins = JSON.parse(ALLOWED_ORIGINS);
app.use(
  cors({
    origin: (origin, callback) => {
      origin && -1 === allowedOrigins.indexOf(origin)
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
  const response = initResponse(req.originalUrl);
  response.results.push(io.engine.clientsCount);
  res.send(response);
});

app.get('/spotify/addok/:uri', addTrackToOK);
app.get('/spotify/access-token', getAccessToken);
app.get('/spotify/authorize/:code', authorize);
app.get('/spotify/devices', getDevices);
app.get('/spotify/refresh-token', refreshToken);

app.get('/hue/on/:color', turnOn);
app.get('/hue/off/:id?', turnOff);
app.get('/hue/brightness/:value', setBrightness);

app.get('/bluetooth/reset', resetBluetooth);
app.get('/bluetooth/discover', discoverBluetooth);

export default server;
