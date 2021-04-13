import 'dotenv/config';
import {Request, Response} from 'express';
//@ts-ignore TODO DefinitelyTyped
import {getLyrics, searchSong} from 'genius-lyrics-api';
import {getCurrentTrackInternal} from './spotify';
import {sanitize} from './utils';

const {GENIUS_TOKEN = ''} = process.env;

type SearchResult = {
  id: number;
  url: string;
  title: string;
  albumArt: string;
};

type LyricsSearch = {
  results: SearchResult[];
  top: string;
};

const getLyricsInternal = async (artist: string, title: string): Promise<LyricsSearch> => {
  const results = await searchSong({apiKey: GENIUS_TOKEN, artist: sanitize(artist), title: sanitize(title)});

  if (null === results || 0 === Object.values(results).length) {
    throw new Error('No lyrics found');
  }

  const top = await getLyrics(results[0].url);

  return {top, results};
};

const getCurrentTrackLyrics = async (_req: Request, res: Response) => {
  try {
    const track = await getCurrentTrackInternal();
    const results = await getLyricsInternal(track.artists[0].name, track.name);
    res.json(results);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getTrackLyrics = async (req: Request<{title: string; artist: string}>, res: Response) => {
  try {
    const results = await getLyricsInternal(req.params.artist, req.params.title);
    res.json(results);
  } catch (error) {
    res.status(500).send(error);
  }
};

export {getTrackLyrics, getCurrentTrackLyrics};
