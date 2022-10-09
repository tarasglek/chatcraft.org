import React, { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import OpenAI from "openai-api";
import {highlight, languages} from 'prismjs'
import "prismjs/themes/prism.css";
import "prismjs/components/prism-markdown"
import {
  BrowserRouter as Router,
  useParams
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

function Code() {
  let { slug } = useParams();
  console.log(slug)
  const [filename, _setFilename] = useState('')  
  const [codeValue, _setCodeValue] = useState(defaultCode);
  const [openaiKey, setOpenaiKey] = useState('')
  const [loadedSettings, setLoadedSettings] = useState(false)
  const [savedFiles, setSavedFiles] = useState(new Set<string>())
  // per https://devtrium.com/posts/async-functions-useeffect
  useEffect(() => {
    (async () => {
      let key = await get(SETTING_OPENAIKEY)
      if (key) {
        setOpenaiKey(key)
      }
      let savedFiles = await get(SETTING_SAVED_FILES)
      if (savedFiles) {
        setSavedFiles(savedFiles)
      }
      let filename = window.location.hash.substring(1)
      if (filename == "") {
        filename = "Untitled"
      }
      setFilename(filename)
    })()
  }, [loadedSettings])

  function setFilename(filename: string) {
    console.log(["setFilename", filename])
    filename.replaceAll('#', '')
    window.location.hash = filename
    _setFilename(filename)
    if (savedFiles.has(filename)) {
      return
    }
    savedFiles.add(filename)
    return set(SETTING_SAVED_FILES, savedFiles)
  }

  async function clickChangeAPIKey() {
    promptOpenAIAPIKey()
  }

  async function promptOpenAIAPIKey(msg?: string) {
    let newKey = prompt(msg || "Enter your OpenAI API key", openaiKey)
    if (!newKey)
      return
    set(SETTING_OPENAIKEY, newKey)
    setOpenaiKey(newKey)
  }
  async function run() {
    const openai = new OpenAI(openaiKey);
    try {
      const gptResponse = await openai.complete({
        engine: 'text-davinci-002',
        prompt: codeValue,
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
      _setCodeValue(codeValue + gptResponse.data.choices[0].text);
    } catch (e) {
      promptOpenAIAPIKey("Rest call to OpenAI failed. You probably need set or change your API key. Please enter your API key.")
    }
  }
  async function promptSaveAs() {
    let newFilename = prompt('How would you like to name you workspace', 'workspace')
    if (!newFilename)
      return
    setFilename(newFilename)
  }

  let app = (
    <div> 
    <div>
      <select value={filename} onChange={e => setFilename(e.target.value)}>
        {[...savedFiles.values()].map((filename) => <option value={filename} key={filename}>{filename}</option>)}
      </select>
      <button onClick={promptSaveAs}>Save As</button><button onClick={clickChangeAPIKey}>{openaiKey?'Change':'Set'} OpeanAI API key</button></div>
    <Editor autoFocus
    value={codeValue}
    onValueChange={code => _setCodeValue(code)}
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
  return app;
}

export default Code;
