import { CodepointsMap } from '../utils/codepoints.js';
import {
  FontAssetType,
  OtherAssetType,
  AssetType,
  GetIconIdFn
} from './misc.js';
import { FormatOptions } from './format.js';

export interface Asset {
  name: string;
  fileName: string;
  filePath: string;
}

export interface InputDirectory {
  src: string;
  filter?: (asset: Asset) => boolean;
  prefix?: string;
}

export type InputDir = string | InputDirectory | (InputDirectory | string)[]

export interface RunnerMandatoryOptions {
  inputDir: InputDir,
  outputDir: string;
}

export type RunnerOptionalOptions = {
  name: string;
  fontTypes: FontAssetType[];
  assetTypes: OtherAssetType[];
  formatOptions: FormatOptions;
  pathOptions: { [key in AssetType]?: string };
  codepoints: CodepointsMap;
  fontHeight: number;
  descent: number;
  normalize: boolean;
  round: number;
  selector: string;
  tag: string;
  templates: { [key in OtherAssetType]?: string };
  prefix: string;
  fontsUrl: string;
  getIconId: GetIconIdFn;
  ligatures: {
    transform?:(name:string) => string;
  }
};

export type RunnerOptionsInput = RunnerMandatoryOptions &
  Partial<RunnerOptionalOptions>;

export type RunnerOptions = RunnerMandatoryOptions &
  Partial<RunnerOptionalOptions>;
