import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };

    return (
        <nav className="navbar">

            <Link to="/dashboard" className="brand">
                <div className="brand-icon">
                    X
                </div>

                <div>
                    <div className="brand-name">
                        X-NIDS
                    </div>

                    <div className="brand-subtitle">
                        Network Intrusion Detection
                    </div>
                </div>
            </Link>

            <div className="nav-right">

                <div className="user-info">
                    <div className="user-avatar">
                        {user.name
                            ? user.name.charAt(0).toUpperCase()
                            : "U"}
                    </div>

                    <div>
                        <div className="user-name">
                            {user.name || "User"}
                        </div>

                        <div className="user-email">
                            {user.email || ""}
                        </div>
                    </div>
                </div>

                <button
                    className="logout-btn"
                    onClick={handleLogout}
                >
                    Logout
                </button>

            </div>

        </nav>
    );
};

export default Navbar;