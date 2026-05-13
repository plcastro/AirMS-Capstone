import * as SecureStore from "expo-secure-store";
// ... other imports

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // REFRESH SESSION (The "Stay Logged In" Engine)
  // =========================
  const refreshSession = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");

      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        await SecureStore.setItemAsync("accessToken", data.accessToken);
        if (data.refreshToken)
          await SecureStore.setItemAsync("refreshToken", data.refreshToken);

        setToken(data.accessToken);
        return data.accessToken;
      } else {
        throw new Error("Refresh failed");
      }
    } catch (err) {
      logoutUser(); // If refresh fails, session is dead
      return null;
    }
  };

  // =========================
  // BOOTSTRAP (On App Load)
  // =========================
  useEffect(() => {
    const loadPersistedAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("currentUser");
        const accessToken = await SecureStore.getItemAsync("accessToken");
        const refreshToken = await SecureStore.getItemAsync("refreshToken");

        if (storedUser && refreshToken) {
          setUser(JSON.parse(storedUser));
          setToken(accessToken);

          // Background check: attempt refresh to ensure session is still valid
          refreshSession();
        }
      } catch (err) {
        console.error("Bootstrap failed", err);
      } finally {
        setLoading(false);
      }
    };
    loadPersistedAuth();
  }, []);

  // =========================
  // LOGIN & LOGOUT
  // =========================
  const loginUser = async ({ user, accessToken, refreshToken }) => {
    setUser(user);
    setToken(accessToken);
    await AsyncStorage.setItem("currentUser", JSON.stringify(user));
    await SecureStore.setItemAsync("accessToken", accessToken);
    if (refreshToken)
      await SecureStore.setItemAsync("refreshToken", refreshToken);
  };

  const logoutUser = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loginUser, logoutUser, loading, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};
