import {
  BrowserRouter as Router,
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import './App.css';
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
