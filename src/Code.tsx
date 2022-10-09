import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import OpenAI from "openai-api";
import {highlight, languages} from 'prismjs'
import "prismjs/themes/prism.css";
import "prismjs/components/prism-markdown"
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
  savedFiles: Set<string>;
}
function Code() {
  const [settings, setSettings] = useState<State>(
    {
      code: defaultCode,
      openaiToken: '',
      loaded: false,
      savedFiles: new Set<string>(),
    });
  const _navigate = useNavigate();
  let filename = useParams().id!;
  async function flushSavedFiles () {
    return set (SETTING_SAVED_FILES, settings.savedFiles)
  }
  // per https://devtrium.com/posts/async-functions-useeffect
  useEffect(() => {
    (async () => {
      let key = await get(SETTING_OPENAIKEY)
      if (key) {
        settings.openaiToken = key
      }
      let savedFiles = await get(SETTING_SAVED_FILES)
      if (savedFiles) {
        settings.savedFiles = savedFiles
      }
      if (!savedFiles) {
        await flushSavedFiles()
        savedFiles = settings.savedFiles
      }
      if (!settings.savedFiles.has(filename)) {
        settings.savedFiles.add(filename)
        await flushSavedFiles()
      }
      settings.loaded = true
      setSettings({...settings})
    })()
  }, [filename])

  async function clickChangeAPIKey() {
    promptOpenAIAPIKey()
  }

  async function promptOpenAIAPIKey(msg?: string) {
    let newKey = prompt(msg || "Enter your OpenAI API key", settings.openaiToken)
    if (!newKey) {
      return
    }
    settings.openaiToken = newKey
    await set(SETTING_OPENAIKEY, newKey)
    setSettings({...settings})
  }
  async function run() {
    const openai = new OpenAI(settings.openaiToken);
    try {
      const gptResponse = await openai.complete({
        engine: 'text-davinci-002',
        prompt: settings.code,
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
      settings.code += gptResponse.data.choices[0].text;
      setSettings({...settings})
    } catch (e) {
      promptOpenAIAPIKey("Rest call to OpenAI failed. You probably need set or change your API key. Please enter your API key.")
    }
  }

  function setFilename(filename: string) {
    _navigate('/' + filename)
  }

  function promptSaveAs() {
    let newFilename = prompt("Save as", filename)
    if (newFilename) {
      setFilename(newFilename)
    }
  }
  let app = (
    <div> 
    <div>
      <select value={filename} onChange={e => setFilename(e.target.value)}>
        {[...settings.savedFiles.values()].map((filename) => <option value={filename} key={filename}>{filename}</option>)}
      </select>
      <button onClick={promptSaveAs}>Save As</button><button onClick={clickChangeAPIKey}>{settings.openaiToken?'Change':'Set'} OpeanAI API key</button></div>
    <Editor autoFocus
    value={settings.code}
    onValueChange={code => {settings.code = code; setSettings({...settings})}}
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
  <div><button onClick={run}>Run</button></div>
</div>
  );
  return settings.loaded ? app : <div>Loading...</div>;
}

export default Code;
