import 'dotenv/config';
import {Request, Response} from 'express';
import {v3} from 'node-hue-api';
import {Api} from 'node-hue-api/dist/esm/api/Api';
import {hex2XY} from './utils';
const LightState = v3.lightStates.LightState;

const {ROBERT_HUE_IP = '', ROBERT_HUE_USERNAME = ''} = process.env;

type Light = {
  id: string;
  name: string;
  isReachable: boolean;
  hasColor: boolean;
};

let bob: Api;
let lights: Light[] = [];

const fetchLights = async (): Promise<Light[]> =>
  (await bob.lights.getAll()).map(light => ({
    id: light.id.toString(),
    name: light.name,
    //@ts-ignore fucking sloppy typing
    isReachable: light.state.reachable ?? false,
    hasColor: light.state.hasOwnProperty('hue'),
  }));

const turnOn = ({params: {color}}: Request<{color: string}>, res: Response) => {
  const onState = new LightState().on().brightness(100);
  const colorState = new LightState().on().brightness(100).xy(hex2XY(color));

  lights.forEach(async ({id, hasColor}) => {
    try {
      await bob.lights.setLightState(id, hasColor ? colorState : onState);
    } catch (error) {
      console.error(error);
    }
  });

  res.status(204).send();
};

const turnOff = ({params: {id}}: Request<{id?: string}>, res: Response) => {
  const offState = new LightState().off();

  if (id) {
    bob.lights.setLightState(id, offState);
  } else {
    lights.forEach(light => bob.lights.setLightState(light.id, offState));
  }

  res.status(204).send();
};

const toggle = async ({params: {id}}: Request<{id: string}>, res: Response) => {
  const {on} = (await bob.lights.getLightState(id)) as {on: boolean};

  bob.lights.setLightState(id, on ? new LightState().off() : new LightState().on());

  res.json(!on);
};

const setBrightness = ({params: {ratio}}: Request<{ratio: number}>, res: Response) => {
  const brightnessState = new LightState().brightness(ratio);

  lights.forEach(async light => {
    try {
      await bob.lights.setLightState(light.id, brightnessState);
    } catch (error) {
      console.error(error);
    }
  });

  res.status(204).send();
};

const getLights = async (_req: Request, res: Response) => {
  lights = await fetchLights();
  res.json(lights);
};

(async () => {
  bob = await v3.api.createInsecureLocal(ROBERT_HUE_IP).connect(ROBERT_HUE_USERNAME);
  lights = await fetchLights();
})();

export {turnOn, turnOff, setBrightness, toggle, getLights};
