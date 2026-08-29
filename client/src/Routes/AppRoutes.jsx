import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Setup from "../pages/Setup";
import TextInterview from "../pages/TextInterview";
import VideoInterview from "../pages/VedioInterview"; 
import VoiceInterview from "../pages/VoiceInterview";
import CodingSandbox from "../pages/CodingSandbox";
import TimedInterview from "../pages/TimedInterview";
import History from "../pages/History";
import Analytics from "../pages/Analytics";
import Tips from "../pages/Tips";
import Profile from "../pages/Profile";
import McqInterview from "../pages/McqInterview";

export default function AppRoutes({ candidateId }) {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/setup" element={<Setup candidateId={candidateId} />} />

      <Route path="/interview">
        <Route index element={<Navigate to="text" />} />
        <Route path="text" element={<TextInterview candidateId={candidateId} />} />
        <Route path="voice" element={<VoiceInterview candidateId={candidateId} />} />
        <Route path="timed" element={<TimedInterview candidateId={candidateId} />} />
        <Route path="mcq" element={<McqInterview candidateId={candidateId} />} />
      </Route>

<Route path="/videointerview" element={<VideoInterview candidateId={candidateId} />} />
<Route path="/codingsandbox" element={<CodingSandbox candidateId={candidateId} />} />
      <Route path="/history" element={<History />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/tips" element={<Tips />} />
      <Route path="/profile" element={<Profile />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}