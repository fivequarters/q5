import { default as ports } from './ports.json';

interface IPorts {
  [index: string]: number;
}

export default <IPorts>ports;
