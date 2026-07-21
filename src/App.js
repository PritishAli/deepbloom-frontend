import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import V1Page from "./V1Page";
import V2Page from "./V2Page";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">

        <div className="nav">
          <Link to="/">DeepBloom</Link>
          <Link to="/v2">DeepBloom Version 2</Link>
        </div>

        <Routes>
          <Route path="/" element={<V1Page />} />
          <Route path="/v2" element={<V2Page />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;