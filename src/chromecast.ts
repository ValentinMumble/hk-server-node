//@ts-ignore TODO add types
import ChromecastAPI from 'chromecast-api';

const client = new ChromecastAPI();

const discover = () => {
  client.on('device', function (device: any) {
    console.log('Found Chromecast device:', device);
  });
};

export {discover};
