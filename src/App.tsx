import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Code from './Code'
import * as Supa from './Supa'

function App() {
  /**
   * Supabase doesn't return is to correct hash when we come back from github
   * so we have to save it in local storage and then redirect to it
   * using the Navigate component below
   */
  let redirectURL = Supa.getRedirectURL("/edit/Untitled")
  return (
  <HashRouter>
  <Routes>
    <Route path="/edit/:id" element={<Code session={Supa.useSession()}/>}/>
    <Route path="*" element={<Navigate to={redirectURL} replace />} />
  </Routes>
  </HashRouter>
  );
}

export default App;
