import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Code from './Code'
import Shared from './Shared'
import * as Supa from './Supa'

function App() {
  /**
   * Supabase doesn't return is to correct hash when we come back from github
   * so we have to save it in local storage and then redirect to it
   * using the Navigate component below
   */

  let redirectURL = Supa.getRedirectURL("/edit/Untitled")
  let redirect = <Navigate to={redirectURL} replace />

  // console.log(window.location.href)
  if (window.location.pathname != "/") {
    redirect = <>Redirect</>
    window.location.href = window.location.href.replace('/shared/','#/shared/')
  }
  return (
  <HashRouter>
  <Routes>
    <Route path="/shared/:id" element={<Shared/>}/>
    <Route path="/edit/:id" element={<Code session={Supa.useSession()}/>}/>
    <Route path="*" element={redirect} />
  </Routes>
  </HashRouter>
  );
}

export default App;
