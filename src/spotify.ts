import 'dotenv/config';
import {Request, Response} from 'express';
import SpotifyWebApi from 'spotify-web-api-node';

const {SPO_CLIENT_ID, SPO_CLIENT_SECRET, SPO_OK_ID = '', SPO_SCOPE = ''} = process.env;

const spotify = new SpotifyWebApi({
  clientId: SPO_CLIENT_ID,
  clientSecret: SPO_CLIENT_SECRET,
});
let expiresAt: number = 0;
let palette: string[] = [];

const storePalette = (req: Request) => {
  palette = req.body;
};

const storeToken = (expiration: number, accessToken: string, refreshToken?: string) => {
  spotify.setAccessToken(accessToken);
  if (refreshToken) spotify.setRefreshToken(refreshToken);
  expiresAt = Date.now() + expiration * 1000;
};

const refreshToken = async (_: Request, res: Response) => {
  try {
    const {body} = await spotify.refreshAccessToken();
    storeToken(body.expires_in, body.access_token);
    res.send({accessToken: body.access_token});
  } catch (error) {
    res.status(500).send(error);
  }
};

const authorize = async (req: Request<{code: string}>, res: Response) => {
  try {
    const {body} = await spotify.authorizationCodeGrant(req.params.code);
    storeToken(body.expires_in, body.access_token, body.refresh_token);
    res.send({accessToken: body.access_token});
  } catch (error) {
    res.status(500).send(error);
  }
};

const getAccessToken = (req: Request, res: Response) => {
  const accessToken = spotify.getAccessToken();
  const data = {accessToken: '', authorizeUrl: '', palette};

  if (accessToken) {
    if (Date.now() < expiresAt) {
      data.accessToken = accessToken;
    } else {
      // Token expired
      return refreshToken(req, res);
    }
  } else {
    // Unauthorized
    spotify.setRedirectURI(`${req.get('origin')}/callback`);
    res.status(401);
    data.authorizeUrl = spotify.createAuthorizeURL(SPO_SCOPE.split(' '), 'state');
  }

  res.send(data);
};

const addTrackToOK = async (req: Request<{uri: string}>, res: Response) => {
  try {
    await spotify.removeTracksFromPlaylist(SPO_OK_ID, [{uri: req.params.uri}]);
    await spotify.addTracksToPlaylist(SPO_OK_ID, [req.params.uri]);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

const getDevices = async (_: Request, res: Response) => {
  try {
    const {
      body: {devices},
    } = await spotify.getMyDevices();
    res.send(devices);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getPlaylists = async (_: Request, res: Response) => {
  try {
    const {
      body: {items},
    } = await spotify.getUserPlaylists();
    res.send(items);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getCurrentTrackInternal = async () => {
  const {body} = await spotify.getMyCurrentPlayingTrack();

  if (null === body.item) {
    throw Error('No track currently playing');
  }

  return body.item;
};

const getCurrentTrack = async (_: Request, res: Response) => {
  try {
    const track = await getCurrentTrackInternal();
    res.send(track);
  } catch (error) {
    res.status(500).send(error);
  }
};

const playUri = async (req: Request<{uri: string}>, res: Response) => {
  try {
    spotify.play({uris: [req.params.uri]});
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

const playCurrentTrackRadio = async (_: Request, res: Response) => {
  try {
    const track = await getCurrentTrackInternal();
    const recommandations = await spotify.getRecommendations({seed_tracks: [track.id], limit: 50});
    const uris = recommandations.body.tracks.map(track => track.uri);
    spotify.play({uris});
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

const searchTracks = async ({params: {search}}: Request<{search: string}>, res: Response) => {
  try {
    const {
      body: {tracks},
    } = await spotify.searchTracks(search, {limit: 10});
    res.send(tracks?.items ?? []);
  } catch (error) {
    res.status(500).send(error);
  }
};

const addToQueue = async ({params: {uri}}: Request<{uri: string}>, res: Response) => {
  try {
    //TODO add type def
    //@ts-ignore
    await spotify.addToQueue(uri);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

const getArtistTopTracks = async (
  {params: {artistId, country = 'GB'}}: Request<{artistId: string; country?: string}>,
  res: Response
) => {
  try {
    const {
      body: {tracks},
    } = await spotify.getArtistTopTracks(artistId, country);
    const {body} = await spotify.getArtist(artistId);
    res.send({tracks, artist: body});
  } catch (error) {
    res.status(500).send(error);
  }
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
  storePalette,
  addToQueue,
  getArtistTopTracks,
};
