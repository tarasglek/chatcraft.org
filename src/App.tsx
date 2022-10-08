import React, { useState } from "react";
import Editor from "react-simple-code-editor";
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

console.log(languages)

function App() {
  const [filename, _setFilename] = useState('')
  const [codeValue, setCodeValue] = useState(defaultCode);

  window.addEventListener("hashchange", function(e){
    _setFilename(window.location.hash.substring(1))
  });
  
  function setFilename(filename: string) {
    filename.replaceAll('#', '')
    window.location.hash = filename
    _setFilename(filename)
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
      <div><strong style={{paddingRight:'1em'}}>{filename}</strong><button onClick={promptSaveAs}>Save As</button></div>
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
  </div>
  );
}

export default App;
