import {exec} from 'child_process';
import {Request, Response} from 'express';
import {initResponse} from './utils';

const shell = {
  discover: 'sudo hciconfig hci0 piscan',
  reset: 'sudo hciconfig hci0 reset',
};

const resetBluetooth = (req: Request, res: Response) => {
  exec(shell.reset, (_err, stdout) => {
    const response = initResponse<string>(req.originalUrl);
    response.results.push(stdout);
    res.send(response);
  });
};

const discoverBluetooth = (req: Request, res: Response) => {
  exec(shell.discover, (_err, stdout) => {
    const response = initResponse<string>(req.originalUrl);
    response.results.push(stdout);
    res.send(response);
  });
};

export {resetBluetooth, discoverBluetooth};
