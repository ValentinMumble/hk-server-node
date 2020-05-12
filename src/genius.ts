import 'dotenv/config';
import {Request, Response} from 'express';
//@ts-ignore TODO DefinitelyTyped
import {getLyrics} from 'genius-lyrics-api';
import {getCurrentTrackInternal} from './spotify';
import {initResponse, addError, sanitize} from './utils';

const {GENIUS_TOKEN = ''} = process.env;

const getLyricsInternal = async (artist: string, title: string) => {
  const lyrics = await getLyrics({apiKey: GENIUS_TOKEN, artist: sanitize(artist), title: sanitize(title)});

  if (null === lyrics) {
    throw Error('No lyrics found');
  }

  return lyrics;
};

const getCurrentTrackLyrics = async (req: Request, res: Response) => {
  const response = initResponse<string>(req.originalUrl);

  try {
    const track = await getCurrentTrackInternal();
    response.results.push(await getLyricsInternal(track.artists[0].name, track.name));
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

const getTrackLyrics = async (req: Request<{title: string; artist: string}>, res: Response) => {
  const response = initResponse<string>(req.originalUrl);

  try {
    response.results.push(await getLyricsInternal(req.params.artist, req.params.title));
  } catch (error) {
    addError(response, error);
  }

  res.send(response);
};

export {getTrackLyrics, getCurrentTrackLyrics};
