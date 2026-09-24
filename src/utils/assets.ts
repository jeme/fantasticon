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

export const loadPaths = async (dir: string): Promise<string[]> => {
    const globPath = join(dir, `**/*.${ASSETS_EXTENSION}`);
    const files = await Array.fromAsync(glob(globPath));

    if (!files.length) {
        throw new Error(`No SVGs found in ${dir}`);
    }

    // Keep icon generation deterministic across platforms/glob versions.
    return files.sort((a, b) => a.localeCompare(b));
};

const failForConflictingId = (
    {relativePath: pathA, id}: IconAsset,
    {relativePath: pathB}: IconAsset
): void => {
    throw new Error(
        `Conflicting result from 'getIconId': '${id}' - conflicting input files:\n` +
        [pathA, pathB].map(fpath => `  - ${fpath}`).join('\n')
    );
};

export const loadAssets = async ({
                                     inputDir,
                                     getIconId
                                 }: RunnerOptions): Promise<AssetsMap> => {
    if (!inputDir) {
        throw new Error('inputDir is required');
    }
    if (!getIconId) {
        throw new Error('getIconId is required');
    }

    const assetMap: AssetsMap = {};

    if (Array.isArray(inputDir)) {
        for (const input of inputDir) {
            await loadInput(input);
        }
    } else {
        await loadInput(inputDir);
    }

    async function loadInput(value: string | InputDirectory) {
        if (typeof value === 'string') {
            await loadForDir({src: value, filter: () => true}, assetMap);
        } else {
            await loadForDir(value, assetMap);
        }
    }

    return assetMap;

    async function loadForDir(input: InputDirectory, assetMap: AssetsMap): Promise<void> {
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
            if (assetMap[iconId]) {
                failForConflictingId(assetMap[iconId], result);
            }

            assetMap[iconId] = result;
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
