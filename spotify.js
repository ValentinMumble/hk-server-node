import 'dotenv/config';
import SpotifyWebApi from 'spotify-web-api-node';
import {initResponse} from './utils';

const {SPO_CLIENT_ID, SPO_CLIENT_SECRET, SPO_OK_ID, SPO_SCOPE} = process.env;

const spotify = new SpotifyWebApi({
  clientId: SPO_CLIENT_ID,
  clientSecret: SPO_CLIENT_SECRET,
});
let expiresAt = 0;

const storeToken = (expiration, accessToken, refreshToken = spotify.getRefreshToken()) => {
  spotify.setAccessToken(accessToken);
  spotify.setRefreshToken(refreshToken);
  expiresAt = Date.now() + expiration * 1000;
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const refreshToken = async (req, res) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.refreshAccessToken();
    storeToken(body.expires_in, body.access_token);
    response.results.push(body.access_token);
  } catch (error) {
    response.status = 500;
    response.errors.push({name: error.name, message: error.message});
  }

  res.send(response);
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const authorize = async (req, res) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.authorizationCodeGrant(req.params.code);
    storeToken(body.expires_in, body.access_token, body.refresh_token);
    response.results.push(body.access_token);
  } catch (error) {
    response.status = 500;
    response.errors.push({name: error.name, message: error.message});
  }

  res.send(response);
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const getAccessToken = (req, res) => {
  const response = initResponse(req.originalUrl);

  const accessToken = spotify.getAccessToken();
  if (accessToken) {
    if (Date.now() < expiresAt) {
      response.results.push({accessToken});
    } else {
      // Token expired
      return refreshToken(req, res);
    }
  } else {
    // Unauthorized
    spotify.setRedirectURI(`${req.headers.referer.replace(/\/?$/, '/')}callback/`);
    response.results.push({
      url: spotify.createAuthorizeURL(SPO_SCOPE.split(' '), 'state'),
    });
  }

  res.send(response);
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const addTrackToOK = async (req, res) => {
  const response = initResponse(req.originalUrl);

  try {
    await spotify.removeTracksFromPlaylist(SPO_OK_ID, [{uri: req.params.uri}]);
    await spotify.addTracksToPlaylist(SPO_OK_ID, [req.params.uri]);
    response.status = 204;
  } catch (error) {
    response.status = 500;
    response.errors.push({name: error.name, message: error.message});
  }

  res.send(response);
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const getDevices = async (req, res) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.getMyDevices();
    response.results = body.devices;
  } catch (error) {
    response.status = 500;
    response.errors.push({name: error.name, message: error.message});
  }

  res.send(response);
};

export {addTrackToOK, authorize, getAccessToken, getDevices, refreshToken};
