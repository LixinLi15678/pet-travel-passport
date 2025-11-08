import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Hello from "./routes/Hello.jsx";
import StyleGuide from "./routes/StyleGuide.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 16 }}>
        <nav style={{ marginBottom: 16, display: "flex", gap: 12 }}>
          <Link to="/">Hello</Link>
          <Link to="/styleguide">Style Guide</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Hello />} />
          <Route path="/styleguide" element={<StyleGuide />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
