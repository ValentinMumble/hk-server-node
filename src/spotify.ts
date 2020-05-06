import 'dotenv/config';
import {Request, Response} from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import {initResponse, addError} from './utils';

const {SPO_CLIENT_ID, SPO_CLIENT_SECRET, SPO_OK_ID = '', SPO_SCOPE = ''} = process.env;

const spotify = new SpotifyWebApi({
  clientId: SPO_CLIENT_ID,
  clientSecret: SPO_CLIENT_SECRET,
});
let expiresAt = 0;

const storeToken = (expiration: number, accessToken: string, refreshToken?: string) => {
  spotify.setAccessToken(accessToken);
  if (refreshToken) spotify.setRefreshToken(refreshToken);
  expiresAt = Date.now() + expiration * 1000;
};

const refreshToken = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.refreshAccessToken();
    storeToken(body.expires_in, body.access_token);
    response.results.push(body.access_token);
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const authorize = async (req: Request<{code: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.authorizationCodeGrant(req.params.code);
    storeToken(body.expires_in, body.access_token, body.refresh_token);
    response.results.push(body.access_token);
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const getAccessToken = (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  const accessToken = spotify.getAccessToken();
  if (accessToken) {
    if (Date.now() < expiresAt) {
      response.results.push(accessToken);
    } else {
      // Token expired
      return refreshToken(req, res);
    }
  } else {
    // Unauthorized
    //TODO improve?
    spotify.setRedirectURI(`${req.headers.referer?.replace(/\/?$/, '/')}callback`);
    response.status = 401;
    response.results.push(spotify.createAuthorizeURL(SPO_SCOPE.split(' '), 'state'));
  }

  res.send(response);
};

const addTrackToOK = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    await spotify.removeTracksFromPlaylist(SPO_OK_ID, [{uri: req.params.uri}]);
    await spotify.addTracksToPlaylist(SPO_OK_ID, [req.params.uri]);
    response.status = 204;
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const getDevices = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.getMyDevices();
    response.results = body.devices;
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const getPlaylists = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    const {body} = await spotify.getUserPlaylists();
    response.results = body.items;
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

export {addTrackToOK, authorize, getAccessToken, getDevices, getPlaylists, refreshToken};
