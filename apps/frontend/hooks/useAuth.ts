export function useAuth() {
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const setToken = (token: string) => {
    localStorage.setItem("token", token);
  };

  const clearToken = () => {
    localStorage.removeItem("token");
  };

  const isLoggedIn = () => !!getToken();

  const getUserId = () => {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.userId || null;
    } catch {
      return null;
    }
  };

  return { getToken, setToken, clearToken, isLoggedIn, getUserId };
}