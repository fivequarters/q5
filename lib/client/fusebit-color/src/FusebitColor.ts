// ------------------
// Internal Constants
// ------------------

const redHsl = [10, 97, 51];
const cyanHsl = [178, 82, 46];
const orangeHsl = [39, 100, 50];
const lightBlueHsl = [212, 100, 97];
const grayHsl = [240, 21, 70];
const blackHsl = [240, 88, 9];
const whiteHsl = [0, 100, 100];
const systemSuccessHsl = [123, 41, 45];
const systemNormalHsl = [223, 81, 61];
const systemWarningHsl = [38, 100, 50];
const systemErrorHsl = [349, 100, 35];

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
    case FusebitColor.gray:
      return grayHsl.slice(0);
    case FusebitColor.black:
      return blackHsl.slice(0);
    case FusebitColor.white:
      return whiteHsl.slice(0);
    case FusebitColor.systemSuccess:
      return systemSuccessHsl.slice(0);
    case FusebitColor.systemNormal:
      return systemNormalHsl.slice(0);
    case FusebitColor.systemWarning:
      return systemWarningHsl.slice(0);
    case FusebitColor.systemError:
      return systemErrorHsl.slice(0);
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
  gray = '#A1A1C2',
  black = '#03032D',
  white = '#FFFFFF',
  systemSuccess = '#43A047',
  systemNormal = '#4C79EC',
  systemWarning = '#FFA000',
  systemError = '#B00020',
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
  ['2xx']: FusebitColor.systemSuccess,
  [200]: FusebitColor.systemSuccess,
  ['3xx']: FusebitColor.systemNormal,
  [300]: FusebitColor.systemNormal,
  [301]: FusebitColor.systemNormal,
  [304]: darken(FusebitColor.systemNormal),
  [307]: darken(FusebitColor.systemNormal, 20),
  ['4xx']: FusebitColor.systemWarning,
  [400]: darken(FusebitColor.systemWarning),
  [401]: darken(FusebitColor.systemWarning, 20),
  [403]: darken(FusebitColor.systemWarning, 40),
  [404]: FusebitColor.systemWarning,
  [410]: FusebitColor.gray,
  ['5xx']: FusebitColor.systemError,
  [500]: FusebitColor.systemError,
  [501]: darken(FusebitColor.systemError),
  [503]: darken(FusebitColor.systemError, 20),
  [550]: darken(FusebitColor.systemError, 30),
};

export function httpCodeColorMap(code: number | string) {
  let color = httpCodeColorSet[code];

  if (color == undefined) {
    color = FusebitColor.black;
  }
  return color;
}
