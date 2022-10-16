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
import * as LocalState from "./LocalState";
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
interface State {
  code: string;
  modelResponse: string;
  openaiToken: string;
  loaded: boolean;
  savedFiles: Map<string, number>;
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
    });
  const _navigate = useNavigate();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  let [searchParams, setSearchParams] = useSearchParams();

  let filename = useParams().id!;
  window.document.title = filename + ' ' + window.location.hostname
  async function flushSavedFiles () {
    let modified = await LocalState.flushSavedFiles(state.savedFiles)
    if (modified) {
      setState({...state})
    }
  }

  function getVersionToDisplay() {
    let paramVersion = searchParams.get('version')
    if (paramVersion) {
      return parseInt(paramVersion)
    }
    return getMaxFileVersion()
  }

  // per https://devtrium.com/posts/async-functions-useeffect
  useEffect(() => {
    (async () => {
      Supa.clearRedirectURL(currentHashState())
      state.savedFiles = await LocalState.loadSavedFiles()

      state.openaiToken = await get(SETTING_OPENAIKEY) ?? ''
      if (!state.savedFiles.has(filename)) {
        state.savedFiles.set(filename, 0)
        await flushSavedFiles()
      }
      let saved = await LocalState.loadPromptAndResponse(state.savedFiles, filename, defaultCode, getVersionToDisplay())
      state.code = saved.prompt
      state.modelResponse = saved.response
      state.loaded = true
      setState({...state})
      // todo move this so it only happens once
      removeBadAntDesignCSS()
    })()
  }, [filename, searchParams])

  // save code as it changes
  // delay saving by 1 second
  useEffect(() => {
    let timeout: any
    if (showingLatestVersion()) {
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

  /**
   * Todo: optimize if no delta between adjacent vers
   */
  async function saveCode(saveAs?: string, incrementVersion?: boolean) {
    if (!saveAs) {
      saveAs = filename
      // !saveAs && we are showing an old version, nothing to save
      if (!showingLatestVersion()) {
        return
      }
    }
    if (filename == saveAs && !showingLatestVersion()) {
      console.error('saving old version!')
    }
    setLatestVersion()
    // synchronize (might be other tabs that updated state since)
    await flushSavedFiles()
    return LocalState.saveCode(state.savedFiles, saveAs, state.code, state.modelResponse, incrementVersion)
  }

  function switchFilename(filename: string) {
    _navigate('/edit/' + filename)
  }

  /**
   * save code as new filename, then navigate to new filename
   */
  async function promptSaveAs() {
    let newFilename = prompt("Save as", filename)
    if (newFilename) {
      await saveCode(newFilename, true)
      switchFilename(newFilename)
    }
  }

  function onCodeChange(code: string) {
    setLatestVersion()
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

  function showingLatestVersion() {
    return getVersionToDisplay() == getMaxFileVersion()
  }

  function setLatestVersion() {
    showVersion(getMaxFileVersion())
  }

  // this trigers a re-render
  async function showVersion(version: number) {
    if (version == getMaxFileVersion()) {
      searchParams.delete('version')
    } else {
      searchParams.set('version', String(version))
    }
    setSearchParams(searchParams, {replace: true})
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

  async function saveCurrentThenOpenFile(newFilename: string) {
    console.log('saveCurrentThenOpenFile', newFilename)
    if (showingLatestVersion()) {
      await saveCode();
    }
    switchFilename(newFilename)
  }

  let tokenInstructions = state.openaiToken !== '' ? <span/> : (
    <div>
    <p>This tool needs an OpenAI API key, instructions to get OpenAI key are:</p>
    <ol>
    <li>Register at OpenAI.com</li>
    <li>Go to your account settings, "View API Keys"</li>
    <li>Copy your OpenAI API key</li>
    <li>Click <Button onClick={clickChangeAPIKey} type="primary">Set OpenAI API key</Button> and paste your key in</li>
    </ol>
    </div>
    )
    let app = (
      <>
        <Row justify="space-around" align="middle">
          <Col>
            <Select dropdownMatchSelectWidth={false} value={filename} onChange={value => { saveCurrentThenOpenFile(value) }}>
            {[...state.savedFiles.keys()].map((filename) => <Option key={filename} value={filename}>{filename}</Option>)}
            </Select>
          </Col>
          <Col>
            <Button onClick={promptSaveAs}>Save As</Button>
          </Col>
          <Col>
            <Button onClick={share} disabled={!!!session.username}>Share</Button>
          </Col>
          <Col span={10}>
          {
            getMaxFileVersion() <= 1 ? <></> : (
          <Pagination
            defaultPageSize={1}
            size="small"
            current={getVersionToDisplay()}
            total={getMaxFileVersion()}
            onChange={(page, _)=>showVersion(page)}/> )
          }
          </Col>
          {/* <Col>
            <Button type={state.openaiToken.length ? "default":"primary"} onClick={clickChangeAPIKey}>{state.openaiToken?'Change':'Set'} OpenAI API key</Button>
          </Col> */}
          <Col>
            {
              session.username ?<Button onClick={Supa.logout}>Logout</Button>: <Button onClick={_ => Supa.login(currentHashState())}>Login</Button>
            }
          </Col>
        </Row>
        <Row>
        { tokenInstructions }
        </Row>
        <Row>
          <Col span={24}>
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
      </Col>
      </Row>
      <Row>
        <Button type="primary" onClick={run} disabled={isWaitingForResponse || state.openaiToken === ''}>{isWaitingForResponse ? 'Waiting for openai response...' : 'Run'}</Button>
      </Row>
      </>
      );
      return state.loaded ? app : <div>Loading...</div>;
    }

    export default Code;
