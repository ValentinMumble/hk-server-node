import 'dotenv/config';
import {Request, Response} from 'express';
import SpotifyWebApi from 'spotify-web-api-node';

const {SPO_CLIENT_ID, SPO_CLIENT_SECRET, SPO_OK_ID = ''} = process.env;

const SCOPES = [
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-modify-private',
  'playlist-read-private',
];

type SpotifyError = {
  body: {
    error: {
      status: number;
      message: string;
      reason: string;
    };
  };
};

const isSpotifyError = (error: any): error is SpotifyError => undefined !== error?.body?.error;

const spotify = new SpotifyWebApi({
  clientId: SPO_CLIENT_ID,
  clientSecret: SPO_CLIENT_SECRET,
});
let expiresAt: number = 0;
let palette: string[] = [];

const storePalette = ({body}: Request, res: Response) => {
  palette = body;
  res.status(204).send();
};

const storeToken = (expiration: number, accessToken: string, refreshToken?: string) => {
  // console.log('Storing token', `${accessToken.substr(0, 20)}...`);
  spotify.setAccessToken(accessToken);
  if (refreshToken) spotify.setRefreshToken(refreshToken);
  expiresAt = Date.now() + expiration * 1000;
};

const refreshTokenInternal = async () => {
  console.log('Refreshing token');
  const {body} = await spotify.refreshAccessToken();
  storeToken(body.expires_in, body.access_token);
};

const refreshToken = async (_: Request, res: Response) => {
  try {
    await refreshTokenInternal();
    res.json({accessToken: spotify.getAccessToken()});
  } catch (error) {
    res.status(500).send(error);
  }
};

const authorize = async ({params: {code}}: Request<{code: string}>, res: Response) => {
  try {
    const {body} = await spotify.authorizationCodeGrant(code);
    storeToken(body.expires_in, body.access_token, body.refresh_token);
    res.json({accessToken: body.access_token});
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
    data.authorizeUrl = spotify.createAuthorizeURL(SCOPES, 'state');
  }

  res.json(data);
};

const addTrackToPlaylist = async (
  {params: {uri, playlistId = SPO_OK_ID}}: Request<{uri: string; playlistId?: string}>,
  res: Response
) => {
  try {
    await spotify.removeTracksFromPlaylist(playlistId, [{uri}]);
    await spotify.addTracksToPlaylist(playlistId, [uri]);
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
    res.json(devices);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getPlaylists = async (_: Request, res: Response) => {
  try {
    const {
      body: {items},
    } = await spotify.getUserPlaylists();
    res.json(items);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getCurrentTrackInternal = async (): Promise<SpotifyApi.TrackObjectFull> => {
  const {body} = await spotify.getMyCurrentPlayingTrack();

  if (null === body.item) {
    throw Error('No track currently playing');
  }

  return body.item as SpotifyApi.TrackObjectFull;
};

const getCurrentTrack = async (_: Request, res: Response) => {
  try {
    const track = await getCurrentTrackInternal();
    res.json(track);
  } catch (error) {
    res.status(500).send(error);
  }
};

const playUri = async (
  {params: {uri}, query: {withRadio = false}}: Request<{uri: string}, null, null, {withRadio: boolean}>,
  res: Response
) => {
  try {
    const uris = [uri];

    if (withRadio) {
      const [, , id] = uri.split(':');
      const recommendations = await getTrackRecommendationsUris(id);
      uris.push(...recommendations);
    }

    await spotify.play({uris});
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

const getTrackRecommendationsUris = async (trackId: string): Promise<string[]> => {
  const {
    body: {tracks},
  } = await spotify.getRecommendations({seed_tracks: [trackId], limit: 50});

  return tracks.map(({uri}) => uri);
};

const playCurrentTrackRadio = async (_: Request, res: Response) => {
  try {
    const {id} = await getCurrentTrackInternal();
    const uris = await getTrackRecommendationsUris(id);
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
    res.json(tracks?.items ?? []);
  } catch (error) {
    res.status(500).send(error);
  }
};

const addToQueue = async ({params: {uri}}: Request<{uri: string}>, res: Response) => {
  try {
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
    const {body: artist} = await spotify.getArtist(artistId);
    res.json({tracks, artist});
  } catch (error) {
    res.status(500).send(error);
  }
};

const getAlbumTracks = async ({params: {albumId}}: Request<{albumId: string; country?: string}>, res: Response) => {
  try {
    const {
      body: {items},
    } = await spotify.getAlbumTracks(albumId);
    res.json(items);
  } catch (error) {
    res.status(500).send(error);
  }
};

const setShuffle = async ({params: {isShuffle}}: Request<{isShuffle: boolean}>, res: Response) => {
  try {
    await spotify.setShuffle(isShuffle);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

type RepeatState = 'off' | 'track' | 'context'

const setRepeat = async ({params: {repeatState}}: Request<{repeatState: RepeatState}>, res: Response) => {
  try {
    await spotify.setRepeat(repeatState);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
};

export {
  addToQueue,
  addTrackToPlaylist,
  authorize,
  getAccessToken,
  getAlbumTracks,
  getArtistTopTracks,
  getCurrentTrack,
  getCurrentTrackInternal,
  getDevices,
  getPlaylists,
  isSpotifyError,
  playCurrentTrackRadio,
  playUri,
  refreshToken,
  refreshTokenInternal,
  searchTracks,
  setRepeat,
  setShuffle,
  spotify,
  storePalette,
};
export type {SpotifyError};
