import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Code from './Code'
import * as Supa from './Supa'

function App() {
  return (
  <HashRouter>
  <Routes>
    <Route path="/:id" element={<Code session={Supa.useSession()}/>}/>
    <Route path="*" element={<Navigate to="/Untitled" replace />} />
  </Routes>
  </HashRouter>
  );
}

export default App;
