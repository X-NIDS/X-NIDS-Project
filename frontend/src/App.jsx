import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AnalysisDetails from "./pages/AnalysisDetails";
import TrafficPrediction from "./pages/TrafficPrediction";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
    return (
        <BrowserRouter>
            <Routes>

                {/* Default */}
                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

                {/* Login */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* Registration */}
                <Route
                    path="/register"
                    element={<Register />}
                />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Analysis Details */}
                <Route
                    path="/analysis/:id"
                    element={
                        <ProtectedRoute>
                            <AnalysisDetails />
                        </ProtectedRoute>
                    }
                />

                {/* Traffic Prediction */}
                <Route
                    path="/predict"
                    element={
                        <ProtectedRoute>
                            <TrafficPrediction />
                        </ProtectedRoute>
                    }
                />

                {/* Forgot Password */}
                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                {/* Reset Password */}
                <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                />

            </Routes>
        </BrowserRouter>
    );
};

export default App;