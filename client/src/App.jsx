import { Routes, Route } from "react-router";
import Sidebar from "./components/layout/Sidebar";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import VideoInterview from "./pages/VedioInterview";
import CodingSandbox from "./pages/CodingSandbox";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Tips from "./pages/Tips";
import Profile from "./pages/Profile";
import "./App.css";

function App() {
  return (
    <div id="shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main id="main" style={{ flex: 1, minWidth: 0, padding: "24px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/videointerview" element={<VideoInterview />} />
          <Route path="/codingsandbox" element={<CodingSandbox />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/tips" element={<Tips />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;