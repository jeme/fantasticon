import {glob} from 'node:fs/promises';
import {resolve, relative, join, basename} from 'path';
import {removeExtension, splitSegments} from '../utils/path.js';
import {writeFile} from './fs-async.js';
import {InputDirectory, RunnerOptions} from '../types/runner.js';
import {GeneratedAssets} from '../generators/generate-assets.js';

export type WriteResult = { content: string | Buffer; writePath: string };

export type WriteResults = WriteResult[];

export interface IconAsset {
    id: string;
    absolutePath: string;
    relativePath: string;
}

export interface AssetsMap {
    [key: string]: IconAsset;
}

export const ASSETS_EXTENSION = 'svg';

export class IconAssets {
    private assets: { [key: string]: IconAsset } = {};

    public get keys() {
        return Object.keys(this.assets);
    }

    public set(key: string, value: IconAsset) {
        if(this.assets.hasOwnProperty(key)) {
            throw new Error(
                `Conflicting result from 'getIconId': '${key}' - conflicting input files:\n`
                + `  - ${this.get(key).relativePath}\n`
                + `  - ${value.relativePath}`
            );
        }
        this.assets[key] = value;
    }

    public get(key: string): IconAsset {
        return this.assets[key];
    };

    public ordered(forLigatures: boolean):IconAsset[] {
        const keys = Object.keys(this.assets);
        if(forLigatures) keys.sort().reverse();
        return keys.map(key => this.get(key));
    }
}

export const loadPaths = async (dir: string): Promise<string[]> => {
    const globPath = join(dir, `**/*.${ASSETS_EXTENSION}`);
    const files = await Array.fromAsync(glob(globPath));

    if (!files.length) {
        throw new Error(`No SVGs found in ${dir}`);
    }

    // Keep icon generation deterministic across platforms/glob versions.
    return files.sort((a, b) => a.localeCompare(b));
};

export const loadAssets = async ({
                                     inputDir,
                                     getIconId
                                 }: RunnerOptions): Promise<IconAssets> => {
    if (!inputDir) {
        throw new Error('inputDir is required');
    }
    if (!getIconId) {
        throw new Error('getIconId is required');
    }

    const assets = new IconAssets();
    if (Array.isArray(inputDir)) {
        for (const input of inputDir) {
            await loadInput(input);
        }
    } else {
        await loadInput(inputDir);
    }

    async function loadInput(value: string | InputDirectory) {
        if (typeof value === 'string') {
            await loadForDir({src: value, filter: () => true}, assets);
        } else {
            await loadForDir(value, assets);
        }
    }

    return assets;

    async function loadForDir(input: InputDirectory, assetMap: IconAssets): Promise<void> {
        const paths = await loadPaths(input.src);
        let index = 0;

        for (const path of paths) {
            const relativePath = relative(resolve(input.src), resolve(path));
            const parts = splitSegments(relativePath);
            const lastPart = parts.pop();
            if (!lastPart) {
                throw new Error(`Invalid path: ${path}`);
            }
            const basename = removeExtension(lastPart);
            const absolutePath = resolve(path);
            if(!input.filter!({
              name: basename,
              fileName: lastPart,
              filePath: absolutePath
            })){
              continue;
            }

            const iconId = getIconId!({
                basename,
                relativeDirPath: join(...parts),
                absoluteFilePath: absolutePath,
                relativeFilePath: relativePath,
                index
            });

            const result: IconAsset = {id: iconId, relativePath, absolutePath};
            assetMap.set(iconId, result);
            index++;
        }
    }

};

export const writeAssets = async (
    assets: GeneratedAssets,
    {name, pathOptions = {}, outputDir}: RunnerOptions
) => {
    if (!name) {
        throw new Error('name is required');
    }
    if (!outputDir) {
        throw new Error('outputDir is required');
    }

    const results: WriteResults = [];

    for (const ext of Object.keys(assets)) {
        const filename = [name, ext].join('.');
        const assetType = ext as keyof typeof pathOptions;
        const writePath = pathOptions[assetType] || join(outputDir, filename);
        const content = assets[ext as keyof GeneratedAssets];
        if (content) {
            results.push({content, writePath});
            await writeFile(writePath, content);
        }
    }

    return results;
};
