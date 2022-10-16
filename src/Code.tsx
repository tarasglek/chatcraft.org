import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import OpenAI from "openai-api";
import Prism  from 'prismjs'
import "prismjs/themes/prism.css";
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-python"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-css"
import "prismjs/components/prism-graphql"
import "prismjs/components/prism-json"
import "prismjs/components/prism-yaml"
import "prismjs/components/prism-typescript"
import {
  useParams,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { Button, Col, Pagination, Row, Select } from 'antd';
import { get, set } from 'idb-keyval';

// import logo from './logo.svg';
import 'antd/dist/antd.css'
import './App.css';
import * as Supa from './Supa'

const { Option } = Select;

const defaultCode = `
Javascript code to find all hyperlinks in a page is
\`\`\`javascript

`;

const SETTING_OPENAIKEY = '#openai-api-key'
const SETTING_SAVED_FILES = '#saved_files'
interface State {
  code: string;
  modelResponse: string;
  openaiToken: string;
  loaded: boolean;
  savedFiles: Map<string, number>;
  showingVersion: number;
}

function removeBadAntDesignCSS() {
  for (let i = 0; i < document.styleSheets.length; i++) {
    let sheet = document.styleSheets[i]
    for (let j = 0; j < sheet.cssRules.length; j++) {
      let rule = sheet.cssRules[j]
      if ((rule as any).selectorText === '::selection') {
        sheet.deleteRule(j)
      }
    }
  }
}

type CodeProps = {
  session: Supa.Session;
};

function currentHashState() {
  return window.location.hash.substring(1)
}

function Code({ session }: CodeProps) {
  const [state, setState] = useState<State>(
    {
      code: '',
      modelResponse: '',
      openaiToken: '',
      loaded: false,
      savedFiles: new Map<string, number>(),
      showingVersion: -1
    });
  const _navigate = useNavigate();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  let [searchParams, setSearchParams] = useSearchParams();

  let filename = useParams().id!;
  window.document.title = filename + ' ' + window.location.hostname
  async function flushSavedFiles () {
    let oldSavedFiles = await get(SETTING_SAVED_FILES)
    if (oldSavedFiles) {
      // iterate over state.savedFiles and oldSavedFiles
      // if the key is in both, take the max of the two values
      let modified = false
      for (let [key, oldValue] of oldSavedFiles) {
        oldValue = oldValue || 0
        if (state.savedFiles.get(key) !== oldValue) {
          modified = true
          state.savedFiles.set(key, Math.max(oldValue, state.savedFiles.get(key) || 0))
        } else {
          modified = true
          state.savedFiles.set(key, oldValue)
        }
      }
      if (modified) {
        setState({...state})
      }
    }
    return set (SETTING_SAVED_FILES, state.savedFiles)
  }
  // per https://devtrium.com/posts/async-functions-useeffect
  useEffect(() => {
    (async () => {
      Supa.clearRedirectURL(currentHashState())
      state.showingVersion = -1
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
      let codeVer = getMaxFileVersion()
      let codeKey = calcCodeKey(filename, codeVer)
      let code = await get(codeKey)
      if (!code) {
        code = defaultCode
        await set(codeKey, code)
      }
      state.code = code
      // same as above but for modelResponse
      let modelResponseKey = calcResponseKey(filename, codeVer)
      let modelResponse = await get(modelResponseKey)
      if (!modelResponse) {
        modelResponse = ''
      }
      state.modelResponse = modelResponse
      state.loaded = true
      setState({...state})
      removeBadAntDesignCSS()
    })()
  }, [filename])

  // save code as it changes
  // delay saving by 1 second
  useEffect(() => {
    let timeout: any
    if (state.loaded) {
      timeout = setTimeout(async () => {
        saveCode()
      }, 1000)
    }
    return () => {
      clearTimeout(timeout)
    }
  }, [state.code])


  async function clickChangeAPIKey() {
    promptOpenAIAPIKey()
  }

  function highlightWithModelResponse(code: string): string {
    let _highlight = (s: string) => Prism.highlight(s, Prism.languages.markdown, 'markdown')
    let highlighted = _highlight(code)
    //compute prior dom
    if (state.modelResponse.length) {
      let priorHighlighted = _highlight(state.code)
      let commonLength = 0
      for (commonLength = 0; highlighted[commonLength] === priorHighlighted[commonLength]; commonLength++);
      return highlighted.slice(0, commonLength) + "<span style='background-color: #d2f4d3'>" + highlighted.slice(commonLength) + "</span>"
    }
    return highlighted
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
    // flatten the code
    if (state.modelResponse.length) {
      onCodeChange(state.code + state.modelResponse)
    }
    state.code = state.code.trim()
    // save prompt
    await saveCode()
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
        // stop: ['```']
      });
      state.modelResponse = gptResponse.data.choices[0].text;
      setState({...state})
      // save code in same record
      saveCode()
    } catch (e) {
      promptOpenAIAPIKey("Rest call to OpenAI failed. You probably need set or change your API key. Please enter your API key.")
    }
    setIsWaitingForResponse(false)
  }

  let calcCodeKey = (filename:string, version:number) => '#code-'+ filename + '-' + version
  let calcResponseKey = (filename:string, version:number) => '#resp-'+ filename + '-' + version

  /**
   * Todo: optimize if no delta between adjacent vers
   */
  async function saveCode(saveAs?: string, incrementVersion?: boolean) {
    if (!saveAs) {
      saveAs = filename
      // !saveAs && showingVersion !== -1 means we are showing an old version, nothing to save
      if (state.showingVersion !== -1) {
        return
      }
    }
    // synchronize (might be other tabs that updated state since)
    await flushSavedFiles()
    state.showingVersion = -1
    let oldVer = state.savedFiles.get(saveAs) || 0
    let nextVer = oldVer + (incrementVersion ? 1 : 0)
    let codeKey = calcCodeKey(saveAs, nextVer)
    await set(codeKey, state.code)
    state.savedFiles.set(saveAs, nextVer)
    let modelKey = calcResponseKey(saveAs, nextVer)
    await set(modelKey, state.modelResponse)
    // console.log('saved code', codeKey, modelKey)
  }

  function switchFilename(filename: string) {
    _navigate('/edit/' + filename)
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

  function onCodeChange(code: string) {
    state.showingVersion = -1
    state.code = code
    // editing code with a response merges the model response
    if (state.modelResponse.length) {
      state.modelResponse = ''
      // bumping version here, saves model response in history view
      saveCode(filename, true)
    }

    setState({...state})
  }

  function getMaxFileVersion() {
    let ret = state.savedFiles.get(filename) || 0
    return ret
  }

  function getHistoricVersionShown() {
    return state.showingVersion === -1 ? getMaxFileVersion() : state.showingVersion
  }

  function showingLatestVersion() {
    return state.showingVersion === -1 || state.showingVersion === getMaxFileVersion()
  }

  async function showHistoricVersion(version: number) {
    state.showingVersion = version

    if (showingLatestVersion()) {
      searchParams.delete('version')
    } else {
      searchParams.set('version', String(version))
    }
    setSearchParams(searchParams, {replace: true})

    // todo refactor this code to happen in setEffect elsewhere
    let codeKey = calcCodeKey(filename, version)
    let code = await get(codeKey)
    if (!code) {
      code = defaultCode
    }
    state.code = code
    // same as above but for modelResponse
    let modelResponseKey = calcResponseKey(filename, version)
    let modelResponse = await get(modelResponseKey)
    if (!modelResponse) {
      modelResponse = ''
    }
    state.modelResponse = modelResponse
    setState({...state})
  }

  async function share() {
    let {data, error} = await Supa.supabase.from('shared')
      .insert({
        prompt: state.code,
        model_response: state.modelResponse,
        name: filename,
        user_uuid: session.userId,
      })
      .select()
    if (error) {
      console.log('error:', error)
      return
    }
    if (!data) {
      return
    }
    let uuid = data[0].uuid
    let url = window.location.origin + '/#/shared/' + uuid
    prompt("Share link", url)
  }

  let tokenInstructions = state.openaiToken !== '' ? <span/> : (
    <div>
    <p>This tool needs an OpenAI API key, instructions to get OpenAI key are:</p>
    <ol>
    <li>Register at OpenAI.com</li>
    <li>Go to your account settings, "View API Keys"</li>
    <li>Copy your OpenAI API key</li>
    <li>Click 'Set OpenAI API key' below and paste your key in</li>
    </ol>
    </div>
    )
    let app = (
      <>
        { tokenInstructions }
        <Row justify="space-around" align="middle">
          <Col>
            <Select dropdownMatchSelectWidth={false} value={filename} onChange={value => {saveCode();switchFilename(value)}}>
            {[...state.savedFiles.keys()].map((filename) => <Option key={filename} value={filename}>{filename}</Option>)}
            </Select>
          </Col>
          <Col>
            <Button onClick={promptSaveAs}>Save As</Button>
          </Col>
          <Col>
            <Button onClick={share} disabled={!!!session.username}>Share</Button>
          </Col>
          <Col span={18}>
          <Pagination
            defaultPageSize={1}
            size="small"
            current={getHistoricVersionShown()}
            total={getMaxFileVersion()}
            onChange={(page, pageNumber)=>showHistoricVersion(page)}/>
          </Col>
          <Col>
            <Button type={state.openaiToken.length ? "default":"primary"} onClick={clickChangeAPIKey}>{state.openaiToken?'Change':'Set'} OpenAI API key</Button>
          </Col>
          <Col>
            {
              session.username ?<Button onClick={Supa.logout}>Logout</Button>: <Button onClick={_ => Supa.login(currentHashState())}>Login</Button>
            }
          </Col>
        </Row>
      <Editor
      id="editor"
      autoFocus
      value={state.code + state.modelResponse}
      onValueChange={onCodeChange}
      highlight={highlightWithModelResponse}
      padding={10}
      className="editor"
      textareaId="txtCodeArea"
      style={{
        fontFamily: '"Fira code", "Fira Mono", monospace',
        outline: 0
      }}
      />
      <div><Button type="primary" onClick={run} disabled={isWaitingForResponse || state.openaiToken === ''}>{isWaitingForResponse ? 'Waiting for openai response...' : 'Run'}</Button>
      </div>
      </>
      );
      return state.loaded ? app : <div>Loading...</div>;
    }

    export default Code;
