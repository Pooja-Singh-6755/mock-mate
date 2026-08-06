import Sidebar from "./components/layout/Sidebar";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

function App() {
  return (
    <div id="shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <main id="main" style={{ flex: 1, minWidth: 0, padding: "24px" }}>
        <AppRoutes/>
      </main>
    </div>
  );
}

export default App;