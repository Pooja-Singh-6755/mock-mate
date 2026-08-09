import Sidebar from "./components/layout/Sidebar";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

function App() {
  const candidateId = '507f1f77bcf86cd799439011';   //dummy id because user is does'nt exits 

  return (
    <div id="shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <main id="main" style={{ flex: 1, minWidth: 0, padding: "24px" }}>
        <AppRoutes candidateId={candidateId}/>
      </main>
    </div>
  );
}

export default App;