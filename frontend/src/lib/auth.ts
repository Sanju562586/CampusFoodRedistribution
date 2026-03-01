type User = {
  id: number;
  role: "student" | "admin" | "donor";
  token: string;
  points?: number;
  name?: string;
};

const AUTH_KEY = "campus_food_auth";

export function saveAuth(user: User, remember: boolean = false) {
  if (typeof window === "undefined") return;

  // Clear any existing session in the other storage to avoid conflict
  if (remember) {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }
}

export function getAuth(): User | null {
  if (typeof window === "undefined") return null;
  // Check sessionStorage first (tab specific), then localStorage (persistent)
  const sessionData = sessionStorage.getItem(AUTH_KEY);
  if (sessionData) return JSON.parse(sessionData);

  const localData = localStorage.getItem(AUTH_KEY);
  return localData ? JSON.parse(localData) : null;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn() {
  return !!getAuth();
}

export function getRole(): "student" | "admin" | "donor" | null {
  return getAuth()?.role ?? null;
}
