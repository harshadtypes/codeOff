import { createBrowserRouter } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import BattlePage from "./pages/BattlePage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/battle", element: <BattlePage /> },
]);