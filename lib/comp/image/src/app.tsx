import React from 'react';
import ReactDOM from 'react-dom';
import barleyField from '../assets/img/barley-field.jpg';
import flowerField from '../assets/img/flower-field.png';
import nightSky from '../assets/img/night-sky.gif';
import { Image } from './image';

const App = () => (
  <>
    <Image src={flowerField} style={{ width: 200, height: 150 }} />
    <Image src={barleyField} style={{ width: 200, height: 150 }} />
    <Image src={nightSky} style={{ width: 200, height: 150 }} />
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
