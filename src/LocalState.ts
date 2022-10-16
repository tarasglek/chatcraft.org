import { get, set } from 'idb-keyval';

const SETTING_SAVED_FILES = '#saved_files'

type SavedFiles = Map<string, number>
export async function loadSavedFiles() {
    let savedFiles = await get(SETTING_SAVED_FILES)
    if (!savedFiles) {
        savedFiles = new Map<string, string>()
    }
    return savedFiles
}

export async function flushSavedFiles (savedFiles: SavedFiles) {
    let oldSavedFiles = await get(SETTING_SAVED_FILES)
    let modified = false
    if (oldSavedFiles) {
        // iterate over state.savedFiles and oldSavedFiles
        // if the key is in both, take the max of the two values
        for (let [key, oldValue] of oldSavedFiles) {
            oldValue = oldValue || 0
            if (savedFiles.get(key) !== oldValue) {
                modified = true
                savedFiles.set(key, Math.max(oldValue, savedFiles.get(key) || 0))
            } else {
                modified = true
                savedFiles.set(key, oldValue)
            }
        }
    }
    await set(SETTING_SAVED_FILES, savedFiles)
    return modified
}

let calcCodeKey = (filename:string, version:number) => '#code-'+ filename + '-' + version
let calcResponseKey = (filename:string, version:number) => '#resp-'+ filename + '-' + version

/**
* Todo: optimize if no delta between adjacent vers
*/
export async function saveCode(savedFiles: SavedFiles, saveAs: string, prompt: string, modelResponse: string, incrementVersion?: boolean) {
    // synchronize (might be other tabs that updated state since)
    await flushSavedFiles(savedFiles)
    let oldVer = savedFiles.get(saveAs) || 0
    let nextVer = oldVer + (incrementVersion ? 1 : 0)
    let codeKey = calcCodeKey(saveAs, nextVer)
    await set(codeKey, prompt)
    savedFiles.set(saveAs, nextVer)
    let modelKey = calcResponseKey(saveAs, nextVer)
    await set(modelKey, modelResponse)
    if (incrementVersion) {
        return flushSavedFiles(savedFiles)
    }
}

export async function loadPromptAndResponse(savedFiles: SavedFiles, name: string, defaultPrompt: string, version?: number) {
    let loadVer = 0
    // either we ask for >= value
    if (version && version >= 0) {
        loadVer = version
    // or we load for the latest
    } else {
        loadVer = savedFiles.get(name) || 0
    }
    let [prompt, response] = await Promise.all([get(calcCodeKey(name, loadVer)), get(calcResponseKey(name, loadVer))])
    return {
        prompt: prompt ?? defaultPrompt as string,
        response: response ?? '' as string
    }
}