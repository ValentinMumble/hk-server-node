import 'dotenv/config';
import {Request, Response} from 'express';
import {v3} from 'node-hue-api';
import Api, {Light} from 'node-hue-api/lib/api/Api';
import LightState from 'node-hue-api/lib/model/lightstate/LightState';
import {initResponse, hex2RGB} from './utils';

const {ROBERT_HUE_IP = '', ROBERT_HUE_USERNAME = ''} = process.env;

let bob: Api;
let lights: Light[] = [];

(async () => {
  bob = await v3.api.createInsecureLocal(ROBERT_HUE_IP).connect(ROBERT_HUE_USERNAME, false);
  lights = await bob.lights.getAll();
})();

const turnOn = (req: Request<{color: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);
  const [r, g, b] = hex2RGB(req.params.color);
  const state = new LightState().on(true).brightness(100).rgb(r, g, b);

  lights.forEach(light => bob.lights.setLightState(light.id, state));

  res.send(response);
};

const turnOff = (req: Request<{id?: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);
  const offState = new LightState().off();

  if (req.params.id) {
    bob.lights.setLightState(req.params.id, offState);
  } else {
    lights.forEach(light => bob.lights.setLightState(light.id, offState));
  }

  res.send(response);
};

const toggle = async (req: Request<{id: string}>, res: Response) => {
  const response = initResponse<boolean>(req.originalUrl);
  const currentState = (await bob.lights.getLightState(req.params.id)) as {on: boolean};

  bob.lights.setLightState(req.params.id, currentState.on ? new LightState().off() : new LightState().on(true));
  response.results.push(!currentState.on);

  res.send(response);
};

const setBrightness = (req: Request<{ratio: string}>, res: Response) => {
  const response = initResponse(req.originalUrl);

  lights.forEach(light => bob.lights.setLightState(light.id, {bri: Math.round(Number(req.params.ratio) * 2.54)}));

  res.send(response);
};

const getLights = async (req: Request, res: Response) => {
  const response = initResponse(req.originalUrl);
  lights = await bob.lights.getAll();

  response.results = lights.map(({_data}) => ({
    id: _data.id,
    name: _data.name,
    isReachable: _data.state.reachable,
  }));

  res.send(response);
};

export {turnOn, turnOff, setBrightness, toggle, getLights};
