import {exec} from 'child_process';

const shell = {
  discover: 'sudo hciconfig hci0 piscan',
  reset: 'sudo hciconfig hci0 reset',
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const resetBluetooth = (req, res) => {
  exec(shell.reset, (_err, stdout) => res.send({uri: req.originalUrl, stdout}));
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const discoverBluetooth = (req, res) => {
  exec(shell.discover, (_err, stdout) =>
    res.send({uri: req.originalUrl, stdout})
  );
};

export {resetBluetooth, discoverBluetooth};
