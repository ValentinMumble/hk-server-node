import 'dotenv/config';
import {Request, Response} from 'express';
import {promises as fs} from 'fs';
import path from 'path';
import {uuid} from './utils';

const EVENTS_PATH = path.resolve(__dirname, '../data/events.json');

type Event = {
  id: string;
};

const readEvents = async (): Promise<Event[]> => {
  const buffer = await fs.readFile(EVENTS_PATH);

  return JSON.parse(buffer.toString());
};

const writeEvents = async (events: Event[]) => await fs.writeFile(EVENTS_PATH, JSON.stringify(events));

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

    await writeEvents([...events, {...body, id: uuid()}]);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) res.status(500).json(error.message);
  }
};

const deleteEvent = async ({params: {id}}: Request, res: Response) => {
  try {
    const events = await readEvents();

    await writeEvents(events.filter(event => event.id !== id));

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) res.status(500).json(error.message);
  }
};

export {getEvents, postEvent, deleteEvent};
