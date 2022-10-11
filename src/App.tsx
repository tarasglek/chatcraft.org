import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Code from './Code'

function App() {
  return (
  <HashRouter>
  <Routes>
    <Route path="/:id" element={<Code/>}/>
    <Route path="*" element={<Navigate to="/Untitled" replace />} />
  </Routes>
  </HashRouter>
  );
}

export default App;
