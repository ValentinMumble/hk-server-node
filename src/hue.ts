import 'dotenv/config';
import {Request, Response} from 'express';
import {HueApi, lightState, ILight} from 'node-hue-api';
import {hex2RGB} from './utils';

const {ROBERT_HUE_IP = '', ROBERT_HUE_USERNAME = ''} = process.env;

const bob = new HueApi(ROBERT_HUE_IP, ROBERT_HUE_USERNAME);
let lights: ILight[] = [];

(async () => {
  const response = await bob.lights();
  lights = response.lights;
})();

const turnOn = (req: Request<{color: string}>, res: Response) => {
  const [r, g, b] = hex2RGB(req.params.color);
  const state = lightState.create().turnOn().brightness(100).rgb(r, g, b);

  lights.forEach(light => light.id && bob.setLightState(light.id, state));

  res.send({uri: req.originalUrl});
};

const turnOff = async (req: Request<{id: string}>, res: Response) => {
  const offState = lightState.create().turnOff();
  let result;

  if (req.params.id) {
    result = await bob.setLightState(req.params.id, offState);
  } else {
    result = await bob.setGroupLightState(0, offState);
  }

  res.send({uri: req.originalUrl, result});
};

const setBrightness = async (req: Request<{value: string}>, res: Response) => {
  lights.forEach(
    light => light.id && bob.setLightState(light.id, {bri: Math.round((Number(req.params.value) * 254) / 100)})
  );

  res.send({uri: req.originalUrl});
};

export {turnOn, turnOff, setBrightness};
