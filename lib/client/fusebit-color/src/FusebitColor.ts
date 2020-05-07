// ------------------
// Internal Constants
// ------------------

const redHsl = [10, 97, 51];
const cyanHsl = [178, 82, 46];
const orangeHsl = [39, 100, 50];
const lightBlueHsl = [212, 100, 97];
const darkHsl = [240, 88, 9];
const lightHsl = [206, 58, 95];
const grayHsl = [240, 21, 70];
const blackHsl = [0, 0, 10];
const whiteHsl = [0, 100, 100];

// ------------------
// Internal Functions
// ------------------

function getHslValuesForColor(color: FusebitColor): number[] {
  switch (color) {
    case FusebitColor.red:
      return redHsl.slice(0);
    case FusebitColor.cyan:
      return cyanHsl.slice(0);
    case FusebitColor.orange:
      return orangeHsl.slice(0);
    case FusebitColor.lightBlue:
      return lightBlueHsl.slice(0);
    case FusebitColor.dark:
      return darkHsl.slice(0);
    case FusebitColor.gray:
      return grayHsl.slice(0);
    case FusebitColor.light:
      return lightHsl.slice(0);
    case FusebitColor.black:
      return blackHsl.slice(0);
    case FusebitColor.white:
      return whiteHsl.slice(0);
    default:
      return [];
  }
}

// -------------
// Exported Enum
// -------------

export enum FusebitColor {
  red = '#FB310A',
  cyan = '#15D6CF',
  orange = '#FFA700',
  lightBlue = '#F0F7FF',
  dark = '#03032D',
  light = '#ECF4FA',
  gray = '#A1A1C2',
  black = '#191919',
  white = '#FFFFFF',
}

// ------------------
// Exported Functions
// ------------------

export function darken(color: FusebitColor, percentage: number = 10): FusebitColor {
  const values = getHslValuesForColor(color);
  if (!values.length) {
    return color;
  }

  values[2] -= percentage;
  values[2] = values[2] > 100 ? 100 : values[2];
  values[2] = values[2] < 0 ? 0 : values[2];

  return `hsla(${values[0]}, ${values[1]}%, ${values[2]}%, 1)` as FusebitColor;
}

export function lighten(color: FusebitColor, percentage: number = 10): FusebitColor {
  return darken(color, -percentage);
}

export function opacity(color: FusebitColor, value: number): FusebitColor {
  const values = getHslValuesForColor(color);
  if (!values.length) {
    return color;
  }

  value = value > 1 ? 1 : value;
  value = value < 0 ? 0 : value;

  return `hsla(${values[0]}, ${values[1]}%, ${values[2]}%, ${value})` as FusebitColor;
}

type HttpCodeKeys = number | string;
const httpCodeColorSet: { [code in HttpCodeKeys]: string } = {
  ['2xx']: FusebitColor.cyan,
  [200]: FusebitColor.cyan,
  ['3xx']: FusebitColor.lightBlue,
  [300]: darken(FusebitColor.cyan),
  [301]: FusebitColor.lightBlue,
  [304]: darken(FusebitColor.lightBlue),
  [307]: darken(FusebitColor.lightBlue, 20),
  ['4xx']: FusebitColor.orange,
  [400]: darken(FusebitColor.orange),
  [401]: darken(FusebitColor.orange, 20),
  [403]: darken(FusebitColor.orange, 40),
  [404]: FusebitColor.orange,
  [410]: FusebitColor.gray,
  ['5xx']: FusebitColor.red,
  [500]: FusebitColor.red,
  [501]: darken(FusebitColor.red),
  [503]: darken(FusebitColor.red, 20),
  [550]: darken(FusebitColor.red, 30),
};

export function httpCodeColorMap(code: number | string) {
  let color = httpCodeColorSet[code];

  if (color == undefined) {
    color = FusebitColor.dark;
  }
  return color;
}
