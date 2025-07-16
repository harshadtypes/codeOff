import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import BattlePage from "./pages/BattlePage";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/battle" element={<BattlePage />} />
      </Routes>
    </div>
  );
}