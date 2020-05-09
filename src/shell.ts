import {exec} from 'child_process';
import {Request, Response} from 'express';
import {initResponse} from './utils';

const shell = {
  discover: 'sudo hciconfig hci0 piscan',
  reset: 'sudo hciconfig hci0 reset',
};

const resetBluetooth = (req: Request, res: Response) => {
  exec(shell.reset, () => {
    const response = initResponse(req.originalUrl);
    response.status = 204;
    res.send(response);
  });
};

const discoverBluetooth = (req: Request, res: Response) => {
  exec(shell.discover, () => {
    const response = initResponse(req.originalUrl);
    response.status = 204;
    res.send(response);
  });
};

export {resetBluetooth, discoverBluetooth};
