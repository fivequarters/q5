import { ensureArray } from '@5qtrs/type';
import WebFont from 'webfontloader';

// ------------------
// Internal Constants
// ------------------

const defaultWeight = '400';
const defaultTimeout = 5000;
const fontKey = 'fonts';
const fontDelimiter = ';';
const fontAndWeightDelimiter = ':';
const weightDelimiter = ',';

// --------------
// Internal Types
// --------------

interface IFontData {
  [index: string]: Array<string>;
}

// ------------------
// Internal Functions
// ------------------

function getKey(keyPrefix?: string) {
  return keyPrefix ? `${keyPrefix}-${fontKey}` : fontKey;
}

function hasFontWeight(weights: Array<string>, weight: string) {
  return weights.findIndex(item => item === weight) >= 0;
}

function parseFont(font: string): [string, Array<string>] {
  const nameWeight = font.split(fontAndWeightDelimiter);
  const name = nameWeight[0];
  const weights = nameWeight[1] ? nameWeight[1].split(weightDelimiter) : [defaultWeight];
  return [name, weights];
}

function stringifyFont(font: string, weights: Array<string>) {
  let result = font;
  for (let i = 0; i < weights.length; i++) {
    const delimiter = i ? weightDelimiter : fontAndWeightDelimiter;
    result += delimiter + weights[i];
  }
  return result;
}

function parseFontData(data: string) {
  const segments = data.split(fontDelimiter);
  const fonts: IFontData = {};
  for (const segment of segments) {
    const [font, weights] = parseFont(segment);
    fonts[font] = fonts[font] || [];
    fonts[font].push(...weights);
  }
  return fonts;
}

function getFontData(keyPrefix?: string) {
  const key = getKey(keyPrefix);
  const value = localStorage.getItem(key);
  return value ? parseFontData(value) : {};
}

function setFontData(data: IFontData, keyPrefix?: string) {
  const fonts = [];
  for (const font in data) {
    if (font) {
      fonts.push(stringifyFont(font, data[font]));
    }
  }
  const key = getKey(keyPrefix);
  localStorage.setItem(key, fonts.join(fontDelimiter));
}

function setFontLoaded(font: string, weights: Array<string>, keyPrefix?: string) {
  const data = getFontData(keyPrefix);
  const weightsData = (data[font] = data[font] || []);
  for (const weight of weights) {
    if (!hasFontWeight(weightsData, weight)) {
      weightsData.push(weight);
    }
  }
  setFontData(data, keyPrefix);
}

function areFontsLoaded(fonts: IFontData, keyPrefix?: string) {
  const data = getFontData(keyPrefix);
  for (const font in fonts) {
    if (font) {
      const weights = data[font];
      if (!weights) {
        return false;
      }
      for (const weight of weights) {
        if (!weights && hasFontWeight(weights, weight)) {
          return false;
        }
      }
    }
  }
  return true;
}

// ------------------
// Exported Functions
// ------------------

export async function loadFonts(fonts: string | Array<string>, prefix?: string) {
  const fontData = parseFontData(ensureArray(fonts).join(fontDelimiter));

  const families: Array<string> = [];
  for (const font in fontData) {
    if (font) {
      families.push(stringifyFont(font, fontData[font]));
    }
  }

  return new Promise((resolve, reject) => {
    const allLoaded = areFontsLoaded(fontData, prefix);
    WebFont.load({
      google: {
        families,
      },
      timeout: defaultTimeout,
      fontactive: font => {
        setFontLoaded(font, fontData[font], prefix);
      },
      active: () => {
        if (!allLoaded) {
          resolve();
        }
      },
      inactive: resolve,
    });

    if (allLoaded) {
      resolve();
    }
  });
}
