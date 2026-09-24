import { DEFAULT_START_CODEPOINT } from '../constants.js';
import {AssetsMap, IconAssets} from './assets.js';

export type CodepointsMap = { [key: string]: number };

export const getCodepoints = (
  assets: IconAssets,
  predefined: CodepointsMap = {},
  start = DEFAULT_START_CODEPOINT
): CodepointsMap => {
  const out: CodepointsMap = {};
  const used = Object.values(predefined);
  let current: number = start;

  const getNextCodepoint = () => {
    while (used.includes(current)) {
      current++;
    }

    const res = current;
    current++;
    return res;
  };

  for (const id of assets.keys) {
    if (!predefined[id]) {
      out[id] = getNextCodepoint();
    }
  }

  return { ...predefined, ...out };
};

export const getHexCodepoint = (decimalCodepoint: number): string =>
  decimalCodepoint.toString(16);
