import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import barleyField from '../assets/img/barley-field.jpg';
import flowerField from '../assets/img/flower-field.png';
import nightSky from '../assets/img/night-sky.gif';
import { Image } from './image';

const App = () => (
  <Box gap={20}>
    <Image src={flowerField} width={200} height={150} borderRadius={10} />
    <Image src={barleyField} width={200} height={150} />
    <Image src={nightSky} width={200} height={150} />
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
