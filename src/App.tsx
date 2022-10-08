import React, { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import OpenAI from "openai-api";
import {highlight, languages} from 'prismjs'
import "prismjs/themes/prism.css";
import "prismjs/components/prism-markdown"
import { get, set } from 'idb-keyval';

// import logo from './logo.svg';
import './App.css';

const defaultCode = `
Javascript code to find all hyperlinks in a page is
\`\`\`javascript

`;

// console.log(languages)
const SETTING_OPENAIKEY = '#openai-api-key'

function App() {
  const [filename, _setFilename] = useState('')
  const [codeValue, setCodeValue] = useState(defaultCode);
  const [openaiKey, setOpenaiKey] = useState('')
  // per https://devtrium.com/posts/async-functions-useeffect
  useEffect(() => {
    (async () => {
      if (openaiKey)
        return
      let key = await get(SETTING_OPENAIKEY)
      if (key) {
        setOpenaiKey(key)
      }
    })()
  }, [])
  console.log("key", openaiKey)
  window.addEventListener("hashchange", function(e){
    _setFilename(window.location.hash.substring(1))
  });
  
  function setFilename(filename: string) {
    filename.replaceAll('#', '')
    window.location.hash = filename
    _setFilename(filename)
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
      setCodeValue(codeValue + gptResponse.data.choices[0].text);
    } catch (e) {
      promptOpenAIAPIKey("Rest call to OpenAI failed. You probably need set or change your API key. Please enter your API key.")
      console.log(e)
    }
  }
  function promptSaveAs() {
    let newHash = prompt('How would you like to name you workspace', 'workspace')
    if (newHash)
      setFilename(newHash)
  }

  if (filename === '') {
    setFilename('Untitled')
  }

  return (
    <div> 
      <div><strong style={{paddingRight:'1em'}}>{filename}</strong><button onClick={promptSaveAs}>Save As</button><button onClick={clickChangeAPIKey}>{openaiKey?'Change':'Set'} OpeanAI API key</button></div>
      <Editor autoFocus
      value={codeValue}
      onValueChange={code => setCodeValue(code)}
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
}

export default App;
