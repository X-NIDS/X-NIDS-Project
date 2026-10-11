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


                {/* Analysis */}
                <Route
                    path="/analysis/:id"
                    element={
                        <ProtectedRoute>
                            <AnalysisDetails />
                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
};


export default App;