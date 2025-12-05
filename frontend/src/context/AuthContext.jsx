/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(localStorage.getItem("token"));
	const navigate = useNavigate();

	const logout = useCallback(() => {
		localStorage.removeItem("token");
		setToken(null);
		setUser(null);
		navigate("/login");
	}, [navigate]);

	useEffect(() => {
		const checkAuth = async () => {
			if (!token) {
				setLoading(false);
				return;
			}

			try {
				// Check if user is authenticated by making a GraphQL request
				const response = await axios.post(
					import.meta.env.VITE_GRAPHQL_URL ||
						"http://localhost:4000/graphql",
					{
						query: `query Me { me { id email role profile_pic is_admin } }`,
					},
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				);

				if (response.data.data?.me) {
					setUser(response.data.data.me);
				} else if (response.data.errors) {
					// Token is invalid
					logout();
				}
			} catch (error) {
				console.error("Auth check error:", error);
				// Don't logout on network errors, just log the error
				if (error.response?.status === 401) {
					logout();
				}
			} finally {
				setLoading(false);
			}
		};

		checkAuth();
	}, [token, logout]);

	const login = (newToken, userData) => {
		localStorage.setItem("token", newToken);
		setToken(newToken);
		setUser(userData);
		setLoading(false);
	};

	const value = {
		user,
		token,
		loading,
		login,
		logout,
		isAuthenticated: !!user,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
};
