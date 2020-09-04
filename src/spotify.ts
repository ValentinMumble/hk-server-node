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
    spotify.setRedirectURI(`${req.get('origin')}/callback`);
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

const getCurrentTrackInternal = async () => {
  const {body} = await spotify.getMyCurrentPlayingTrack();

  if (null === body.item) {
    throw Error('No track currently playing');
  }

  return body.item;
};

const getCurrentTrack = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    response.results.push(await getCurrentTrackInternal());
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const playUri = async (req: Request<{uri: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    spotify.play({uris: [req.params.uri]});
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const playCurrentTrackRadio = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    const track = await getCurrentTrackInternal();
    const recommandations = await spotify.getRecommendations({seed_tracks: [track.id], limit: 50});
    const uris = recommandations.body.tracks.map(track => track.uri);
    spotify.play({uris});
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const searchTracks = async (req: Request<{search: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);

  try {
    const result = await spotify.searchTracks(req.params.search, {limit: 10});
    response.results = result.body.tracks?.items || [];
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

export {
  addTrackToOK,
  authorize,
  getAccessToken,
  getCurrentTrack,
  getCurrentTrackInternal,
  getDevices,
  getPlaylists,
  refreshToken,
  playCurrentTrackRadio,
  playUri,
  searchTracks,
};
