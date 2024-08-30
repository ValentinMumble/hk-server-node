import 'dotenv/config';
import {Request, Response} from 'express';
import {promises as fs} from 'fs';
import path from 'path';

const events = [
  {
    type: 'chain',
    date: '2023-11-15',
    chain: '🍍',
    bike: 'b13440652',
  },
  {
    type: 'tire',
    date: '2023-11-15',
    tire: 'Vittoria Rubino Pro 25',
  },
  {
    type: 'tire',
    date: '2023-12-05',
    tire: 'Pirelli P Zero Road 28',
  },
  {
    type: 'tire',
    date: '2024-02-07',
    tire: 'Pirelli P Zero Road 32',
  },
  {
    type: 'chain',
    date: '2024-05-10',
    chain: '🍌',
    bike: 'b13440652',
  },
  {
    type: 'tire',
    date: '2024-05-16',
    tire: 'Continental GP5000 32',
  },
  {
    type: 'chain',
    date: '2024-05-22',
    chain: '🍋',
    bike: 'b13440652',
  },
  {
    type: 'chain',
    date: '2024-05-31',
    chain: '🍌',
    bike: 'b13440652',
  },
  {
    type: 'battery',
    date: '2024-05-31',
  },
  {
    type: 'chain',
    date: '2024-06-10',
    chain: '🍋',
    bike: 'b13440652',
  },
  {
    type: 'battery',
    date: '2024-06-10',
  },
  {
    type: 'chain',
    date: '2024-06-27',
    chain: '🍌',
    bike: 'b13440652',
  },
  {
    type: 'chain',
    date: '2024-07-04',
    chain: '🍋',
    bike: 'b13440652',
  },
  {
    type: 'battery',
    date: '2024-07-04',
  },
  {
    type: 'chain',
    date: '2024-07-10',
    chain: '🍋',
    bike: 'b13440652',
  },
  {
    type: 'chain',
    date: '2024-07-19',
    chain: '🍌',
    bike: 'b13440652',
  },
  {
    type: 'battery',
    date: '2024-07-24',
  },
  {
    type: 'chain',
    date: '2024-07-29',
    chain: '🧄',
    bike: 'b14723430',
  },
  {
    type: 'chain',
    date: '2024-08-07',
    chain: '🍋',
    bike: 'b13440652',
  },
  {
    type: 'chain',
    date: '2024-08-28',
    chain: '🥦',
    bike: 'b14723430',
  },
];

const getEvents = async (_req: Request, res: Response) => {
  try {
    const events = await fs.readFile(path.resolve(__dirname, '../data/events.json'));
    res.json(events);
  } catch (error) {
    if (error instanceof Error) res.status(500).json(error.message);
  }
};

export {getEvents};
