import 'dotenv/config';
import {Request, Response} from 'express';
import {v3} from 'node-hue-api';
import Api from 'node-hue-api/lib/api/Api';
import LightState from 'node-hue-api/lib/model/lightstate/LightState';
import {hex2RGB} from './utils';

const {ROBERT_HUE_IP = '', ROBERT_HUE_USERNAME = ''} = process.env;

type Light = {
  id: number;
  name: string;
  isReachable: boolean;
};

let bob: Api;
let lights: Light[] = [];

const fetchLights = async (): Promise<Light[]> =>
  (await bob.lights.getAll()).map(({_data}) => ({
    id: _data.id,
    name: _data.name,
    isReachable: _data.state.reachable,
  }));

const turnOn = (req: Request<{color: string}>, res: Response) => {
  const [r, g, b] = hex2RGB(req.params.color);
  const state = new LightState().on(true).brightness(100).rgb(r, g, b);

  lights.forEach(light => bob.lights.setLightState(light.id, state));

  res.status(204).send();
};

const turnOff = (req: Request<{id?: string}>, res: Response) => {
  const offState = new LightState().off();

  if (req.params.id) {
    bob.lights.setLightState(req.params.id, offState);
  } else {
    lights.forEach(light => bob.lights.setLightState(light.id, offState));
  }

  res.status(204).send();
};

const toggle = async (req: Request<{id: string}>, res: Response) => {
  const currentState = (await bob.lights.getLightState(req.params.id)) as {on: boolean};

  bob.lights.setLightState(req.params.id, currentState.on ? new LightState().off() : new LightState().on(true));

  res.send(!currentState.on);
};

const setBrightness = (req: Request<{ratio: string}>, res: Response) => {
  lights.forEach(light => bob.lights.setLightState(light.id, {bri: Math.round(Number(req.params.ratio) * 2.54)}));

  res.status(204).send();
};

const getLights = async (_: Request, res: Response) => {
  lights = await fetchLights();

  res.send(lights);
};

(async () => {
  bob = await v3.api.createInsecureLocal(ROBERT_HUE_IP).connect(ROBERT_HUE_USERNAME, false);
  lights = await fetchLights();
})();

export {turnOn, turnOff, setBrightness, toggle, getLights};
