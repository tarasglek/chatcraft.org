import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import OpenAI from "openai-api";
import {highlight, languages} from 'prismjs'
import "prismjs/themes/prism.css";
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-python"
import "prismjs/components/prism-sql"
import {
  useParams,
  useNavigate
} from "react-router-dom";
import { get, set } from 'idb-keyval';
// import logo from './logo.svg';
import './App.css';

const defaultCode = `
Javascript code to find all hyperlinks in a page is
\`\`\`javascript

`;

const SETTING_OPENAIKEY = '#openai-api-key'
const SETTING_SAVED_FILES = '#saved_files'
interface State {
  code: string;
  openaiToken: string;
  loaded: boolean;
  savedFiles: Map<string, number>;
}
function Code() {
  const [state, setState] = useState<State>(
    {
      code: '',
      openaiToken: '',
      loaded: false,
      savedFiles: new Map<string, number>(),
    });
  const _navigate = useNavigate();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  let filename = useParams().id!;
  async function flushSavedFiles () {
    return set (SETTING_SAVED_FILES, state.savedFiles)
  }
  // per https://devtrium.com/posts/async-functions-useeffect
  useEffect(() => {
    (async () => {
      let key = await get(SETTING_OPENAIKEY)
      if (key) {
        state.openaiToken = key
      }
      let savedFiles = await get(SETTING_SAVED_FILES)
      if (savedFiles) {
        state.savedFiles = savedFiles
      }
      if (!savedFiles) {
        await flushSavedFiles()
        savedFiles = state.savedFiles
      }
      if (!state.savedFiles.has(filename)) {
        state.savedFiles.set(filename, 0)
        await flushSavedFiles()
      }
      let codeKey = calcCodeKey(filename, state.savedFiles.get(filename)!)
      let code = await get(codeKey)
      if (!code) {
        code = defaultCode
        await set(codeKey, code)
      }
      state.code = code
      state.loaded = true
      setState({...state})
    })()
  }, [filename])

  async function clickChangeAPIKey() {
    promptOpenAIAPIKey()
  }

  async function promptOpenAIAPIKey(msg?: string) {
    let newKey = prompt(msg || "Enter your OpenAI API key", state.openaiToken)
    if (!newKey) {
      return
    }
    state.openaiToken = newKey
    await set(SETTING_OPENAIKEY, newKey)
    setState({...state})
  }
  async function run() {
    setIsWaitingForResponse(true)
    await saveCode(filename, true)
    const openai = new OpenAI(state.openaiToken);
    try {
      const gptResponse = await openai.complete({
        engine: 'text-davinci-002',
        prompt: state.code,
        maxTokens: 256,
        temperature: 0.7,
        topP: 1,
        presencePenalty: 0,
        frequencyPenalty: 0,
        bestOf: 1,
        n: 1,
        stream: false,
        // stop: ['\n', "testing"]
      });
      state.code += gptResponse.data.choices[0].text;
      setState({...state})
    } catch (e) {
      promptOpenAIAPIKey("Rest call to OpenAI failed. You probably need set or change your API key. Please enter your API key.")
    }
    setIsWaitingForResponse(false)
  }

  let calcCodeKey = (filename:string, version:number) => '#code-'+ filename + '-' + version

  /**
   * Todo: optimize if no delta between adjacent vers
   */
  async function saveCode(saveAs?: string, incrementVersion?: boolean) {
    if (!saveAs) {
      saveAs = filename
    }
    console.log("checkpointCode", saveAs)
    let oldVer = state.savedFiles.get(saveAs) || 0
    let nextVer = oldVer + (incrementVersion ? 1 : 0)
    console.log("checkpointCode from", oldVer, nextVer)
    let key = calcCodeKey(saveAs, nextVer)
    await set(key, state.code)
    console.log("checkpointCode saved", key, state.code)
    state.savedFiles.set(saveAs, nextVer)
    await flushSavedFiles()
  }

  function switchFilename(filename: string) {
    _navigate('/' + filename)
  }

  /**
   * save code as new filename, then navigate to new filename
   */
  function promptSaveAs() {
    let newFilename = prompt("Save as", filename)
    if (newFilename) {
      saveCode(newFilename, true)
      switchFilename(newFilename)
    }
  }
  let tokenInstructions = state.openaiToken != '' ? <span/> : (
    <div>
    <p>This tool needs an OpenAI API key, instructions to get OpenAI key are:</p>
    <ol>
    <li>Register to OpenAI.com</li>
    <li>Go to your account settings</li>
    <li>Copy your OpenAI API key</li>
    <li>Click 'Set OpenAI API key' below and paste your key in</li>
    </ol>
    </div>
    )
  let app = (
    <div> 
      { tokenInstructions }
    <div>
      <select value={filename} onChange={e => {saveCode();switchFilename(e.target.value)}}>
        {[...state.savedFiles.keys()].map((filename) => <option value={filename} key={filename}>{filename}</option>)}
      </select>
      <button onClick={promptSaveAs}>Save As</button><button onClick={clickChangeAPIKey}>{state.openaiToken?'Change':'Set'} OpenAI API key</button></div>
    <Editor autoFocus
    value={state.code}
    onValueChange={code => {state.code = code; setState({...state})}}
    highlight={code => highlight(code, languages.markdown, 'markdown')}
    padding={10}
    textareaId="codeArea"
    className="editor"
    style={{
      fontFamily: '"Fira code", "Fira Mono", monospace',
      fontSize: 18,
      outline: 0
    }}
  />
  <div><button onClick={run} disabled={isWaitingForResponse || state.openaiToken == ''}>{isWaitingForResponse ? 'Waiting for openai response...' : 'Run'}</button> Version: {state.savedFiles.get(filename)}</div>
</div>
  );
  return state.loaded ? app : <div>Loading...</div>;
}

export default Code;
