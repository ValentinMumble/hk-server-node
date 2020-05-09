import 'dotenv/config';
import {Request, Response} from 'express';
import {HueApi, lightState, ILight} from 'node-hue-api';
import {initResponse, hex2RGB} from './utils';

const {ROBERT_HUE_IP = '', ROBERT_HUE_USERNAME = ''} = process.env;

const bob = new HueApi(ROBERT_HUE_IP, ROBERT_HUE_USERNAME);
let lights: ILight[] = [];

(async () => {
  const response = await bob.lights();
  lights = response.lights;
})();

const turnOn = (req: Request<{color: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);
  const [r, g, b] = hex2RGB(req.params.color);
  const state = lightState.create().turnOn().brightness(100).rgb(r, g, b);

  lights.forEach(light => light.id && bob.setLightState(light.id, state));

  res.send(response);
};

const turnOff = async (req: Request<{id: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);
  const offState = lightState.create().turnOff();

  if (req.params.id) {
    await bob.setLightState(req.params.id, offState);
  } else {
    await bob.setGroupLightState(0, offState);
  }

  res.send(response);
};

const setBrightness = async (req: Request<{ratio: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);

  lights.forEach(light => light.id && bob.setLightState(light.id, {bri: Math.round(Number(req.params.ratio) * 2.54)}));

  res.send(response);
};

export {turnOn, turnOff, setBrightness};
