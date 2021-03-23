import {exec} from 'child_process';
import {Request, Response} from 'express';

const shell = {
  discover: 'sudo hciconfig hci0 piscan',
  reset: 'sudo hciconfig hci0 reset',
  raspotify: {
    restart: 'sudo systemctl restart raspotify',
  },
  reboot: 'sudo reboot',
};

const execShell = (command: string, _?: Request, res?: Response) => {
  exec(command, () => {
    if (res) res.status(204).send();
  });
};

const resetBluetooth = (req: Request, res: Response) => {
  execShell(shell.reset, req, res);
};

const discoverBluetooth = (req: Request, res: Response) => {
  execShell(shell.discover, req, res);
};

const restartRaspotify = (req?: Request, res?: Response) => {
  execShell(shell.raspotify.restart, req, res);
};

const reboot = (req: Request, res: Response) => {
  execShell(shell.reboot, req, res);
};

export {resetBluetooth, discoverBluetooth, restartRaspotify, reboot};
