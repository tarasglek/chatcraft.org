import React, { useState } from "react";
import Editor from "react-simple-code-editor";
import {highlight, languages} from 'prismjs'
import "prismjs/themes/prism.css";
import "prismjs/components/prism-markdown"
// import logo from './logo.svg';
import './App.css';

const code = `function add(a, b) {
  return a + b;
}

const a = 123;
`;

console.log(languages)

function App() {
  const [codeValue, setCodeValue] = useState(code);
  return (
    <div> 
    <Editor
    value={codeValue}
    onValueChange={code => setCodeValue(code)}
    highlight={code => {
      let x = highlight(code, languages.markdown, 'markdown');
      return x;
      }
   }
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
