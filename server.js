import https from 'https';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import socketio from 'socket.io';
import connectSocket from 'spotify-connect-ws';
import SpotifyWebApi from 'spotify-web-api-node';
import { HueApi, lightState } from 'node-hue-api';
import { exec } from 'child_process';
import 'dotenv/config';

const hex2RGB = str => {
  const [, short, long] = String(str).match(/^#?(?:([\da-f]{3})[\da-f]?|([\da-f]{6})(?:[\da-f]{2})?)$/i) || [];
  if (long) {
    const value = Number.parseInt(long, 16);
    return [value >> 16, (value >> 8) & 0xff, value & 0xff];
  } else if (short) {
    return Array.from(short, s => Number.parseInt(s, 16)).map(n => (n << 4) | n);
  }
};

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const server = https
  .createServer(
    {
      key: fs.readFileSync(process.env.HTTPS_KEY_FILE),
      cert: fs.readFileSync(process.env.HTTPS_CERT_FILE)
    },
    app
  )
  .listen(process.env.SOCKET_PORT);

const io = socketio(server);
io.of('connect').on('connection', connectSocket);

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPO_CLIENT_ID,
  clientSecret: process.env.SPO_CLIENT_SECRET
});
var expiresAt = 0;

const bobApi = new HueApi(process.env.ROBERT_HUE_IP, process.env.ROBERT_HUE_USERNAME);
var bobLights = [];
bobApi.lights().then(results => (bobLights = results.lights));

const storeAndSendToken = ({ accessToken, refreshToken = spotifyApi.getRefreshToken(), expiration }, res) => {
  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);
  expiresAt = Date.now() + expiration * 1000;
  res.send({ accessToken });
};

const refreshToken = (req, res) => {
  console.info('Refreshing token...');
  spotifyApi.refreshAccessToken().then(
    data =>
      storeAndSendToken(
        {
          accessToken: data.body.access_token,
          expiration: data.body.expires_in
        },
        res
      ),
    error => res.send({ error })
  );
};

app.get('/soca/count', (req, res) => {
  res.send({ uri: req.originalUrl, clientsCount: io.engine.clientsCount });
});

app.get('/spotify/authorize/:code', (req, res) => {
  spotifyApi.authorizationCodeGrant(req.params.code).then(
    data =>
      storeAndSendToken(
        {
          accessToken: data.body.access_token,
          refreshToken: data.body.refresh_token,
          expiration: data.body.expires_in
        },
        res
      ),
    error => res.send({ error })
  );
});

app.get('/spotify/access-token', (req, res) => {
  const accessToken = spotifyApi.getAccessToken();
  if (accessToken) {
    if (Date.now() < expiresAt) {
      res.send({ accessToken });
    } else {
      // Token expired
      refreshToken(req, res);
    }
  } else {
    // Unauthorized
    spotifyApi.setRedirectURI(req.headers.referer + 'callback/');
    res.send({ url: spotifyApi.createAuthorizeURL(process.env.SPO_SCOPE.split(' '), 'state') });
  }
});

app.get('/spotify/refresh-token', refreshToken);

app.get('/spotify/addok/:uri', (req, res) => {
  spotifyApi
    .removeTracksFromPlaylist(process.env.SPO_OK_ID, [{ uri: req.params.uri }])
    .then(
      () =>
        spotifyApi
          .addTracksToPlaylist(process.env.SPO_OK_ID, [req.params.uri])
          .then(
            data => res.send({ uri: req.originalUrl, data: data.body, message: 'Track added to OK!' }),
            error => res.send({ error })
          ),
      error => res.send({ error })
    );
});

app.get('/spotify/devices', (req, res) => {
  spotifyApi
    .getMyDevices()
    .then(data => res.send({ uri: req.originalUrl, data: data.body }), error => res.send({ error }));
});

app.get('/hue/on/:color', (req, res) => {
  const state = lightState
    .create()
    .turnOn()
    .brightness(100)
    .rgb(hex2RGB(req.params.color));
  bobLights.forEach(l => bobApi.setLightState(l.id, state));
  res.send({ uri: req.originalUrl });
});

app.get('/hue/off', (req, res) => {
  bobApi
    .setGroupLightState(0, lightState.create().turnOff())
    .then(result => res.send({ uri: req.originalUrl, result }));
});

app.get('/bluetooth/reset', (req, res) => {
  exec(process.env.SHELL_BLUETOOTH_RESET, (err, stdout, stderr) => res.send({ uri: req.originalUrl, stdout }));
});

app.get('/bluetooth/discover', (req, res) => {
  exec(process.env.SHELL_BLUETOOTH_DISCOVER, (err, stdout, stderr) => res.send({ uri: req.originalUrl, stdout }));
});

export default server;
