import {exec} from 'child_process';
import {initResponse} from './utils';

const shell = {
  discover: 'sudo hciconfig hci0 piscan',
  reset: 'sudo hciconfig hci0 reset',
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const resetBluetooth = (req, res) => {
  exec(shell.reset, (_err, stdout) => {
    const response = initResponse(req.originalUrl);
    response.results.push(stdout);
    res.send(response);
  });
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const discoverBluetooth = (req, res) => {
  exec(shell.discover, (_err, stdout) => {
    const response = initResponse(req.originalUrl);
    response.results.push(stdout);
    res.send(response);
  });
};

export {resetBluetooth, discoverBluetooth};
