import 'dotenv/config';
import {HueApi, lightState} from 'node-hue-api';
import {hex2RGB} from './utils';

const {ROBERT_HUE_IP, ROBERT_HUE_USERNAME} = process.env;

const bob = new HueApi(ROBERT_HUE_IP, ROBERT_HUE_USERNAME);
let lights = [];

(async () => {
  const response = await bob.lights();
  lights = response.lights;
})();

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const turnOn = (req, res) => {
  const state = lightState.create().turnOn().brightness(100).rgb(hex2RGB(req.params.color));

  lights.forEach(light => bob.setLightState(light.id, state));

  res.send({uri: req.originalUrl});
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const turnOff = async (req, res) => {
  const offState = lightState.create().turnOff();
  let result;

  if (req.params.id) {
    result = await bob.setLightState(req.params.id, offState);
  } else {
    result = await bob.setGroupLightState(0, offState);
  }

  res.send({uri: req.originalUrl, result});
};

/**
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
const setBrightness = async (req, res) => {
  const {
    _values: {bri},
  } = lightState.create().brightness(Number(req.params.value));

  lights.forEach(light => bob.setLightState(light.id, {bri}));

  res.send({uri: req.originalUrl});
};

export {turnOn, turnOff, setBrightness};
