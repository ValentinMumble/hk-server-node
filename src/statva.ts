import 'dotenv/config';
import {Request, Response} from 'express';
import {promises as fs} from 'fs';
import path from 'path';

const EVENTS_PATH = path.resolve(__dirname, '../data/events.json');

const readEvents = async () => {
  const buffer = await fs.readFile(EVENTS_PATH);

  return JSON.parse(buffer.toString());
};

const getEvents = async (_req: Request, res: Response) => {
  try {
    const events = await readEvents();

    res.json(events);
  } catch (error) {
    if (error instanceof Error) res.status(500).json(error.message);
  }
};

const postEvent = async ({body}: Request, res: Response) => {
  try {
    const events = await readEvents();

    await fs.writeFile(EVENTS_PATH, JSON.stringify([...events, body]));

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) res.status(500).json(error.message);
  }
};

export {getEvents, postEvent};
