import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Setup from "../pages/Setup";
import TextInterview from "../pages/TextInterview";
import VideoInterview from "../pages/VedioInterview";
import VoiceInterview from "../pages/VoiceInterview"
import CodingSandbox from "../pages/CodingSandbox";
import History from "../pages/History";
import Analytics from "../pages/Analytics";
import Tips from "../pages/Tips";
import Profile from "../pages/Profile";

export default function AppRoutes({ candidateId }) {
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<Home />} />

      {/* Setup */}
      <Route path="/setup" element={<Setup candidateId={candidateId} />} />

      {/* Interview Routes */}
      <Route path="/interview">
        <Route index element={<Navigate to="text" />} />
        <Route path="text" element={<TextInterview />} />
        <Route path="voice" element={<VoiceInterview/>} />
        {/* <Route path="video" element={<VideoInterview />} /> */}
        {/* <Route path="coding" element={<CodingSandbox />} /> */}
      </Route>

      {/* Other pages */}
      <Route path="/history" element={<History />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/tips" element={<Tips />} />
      <Route path="/profile" element={<Profile />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}