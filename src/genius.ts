import 'dotenv/config';
import {Request, Response} from 'express';
//@ts-ignore TODO DefinitelyTyped
import {getLyrics} from 'genius-lyrics-api';
import {getCurrentTrackInternal} from './spotify';
import {sanitize} from './utils';

const {GENIUS_TOKEN = ''} = process.env;

const getLyricsInternal = async (artist: string, title: string): Promise<string> => {
  const lyrics = await getLyrics({apiKey: GENIUS_TOKEN, artist: sanitize(artist), title: sanitize(title)});

  if (null === lyrics) {
    throw new Error('No lyrics found');
  }

  return JSON.stringify(lyrics);
};

const getCurrentTrackLyrics = async (_: Request, res: Response) => {
  try {
    const track = await getCurrentTrackInternal();
    const lyrics = await getLyricsInternal(track.artists[0].name, track.name);
    res.send(lyrics);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getTrackLyrics = async (req: Request<{title: string; artist: string}>, res: Response) => {
  try {
    const lyrics = await getLyricsInternal(req.params.artist, req.params.title);
    res.send(lyrics);
  } catch (error) {
    res.status(500).send(error);
  }
};

export {getTrackLyrics, getCurrentTrackLyrics};
