import {useAuth} from "./context/AuthContext";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import BattlePage from "./pages/BattlePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LandingPage from "./pages/LandingPage";
import {AnimatePresence} from "framer-motion";

function ProtectedRoute({children}) {
    const {user, loading} = useAuth();
    if (loading) return <div className="text-center mt-10">Loading...</div>;
    return user ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <Router>
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<RegisterPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot" element={<ForgotPasswordPage />} />
                    <Route path="/landing" element={<LandingPage />} />
                    {/* Updated route to include roomId parameter */}
                    <Route
                        path="/battle/:roomId"
                        element={
                            <ProtectedRoute>
                                <BattlePage />
                            </ProtectedRoute>
                        }
                    />
                    {/* Optional: Redirect /battle to landing or show room selection */}
                    <Route
                        path="/battle"
                        element={<Navigate to="/landing" />}
                    />
                </Routes>
            </AnimatePresence>
        </Router>
    );
}

export default App;