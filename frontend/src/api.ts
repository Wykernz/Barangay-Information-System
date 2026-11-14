import axios from "axios";

// Same-origin requests let Django enforce session cookies and CSRF protection.
export const api = axios.create({
  baseURL: "/api/v1/",
  timeout: 15000,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

export type StaffSession = { username: string };

export async function getSession(): Promise<StaffSession | null> {
  try {
    return (await api.get<StaffSession>("session/")).data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      [401, 403].includes(error.response?.status ?? 0)
    ) {
      // Only authentication failures should send the user to the login screen.
      return null;
    }
    throw error;
  }
}

export async function signIn(username: string, password: string) {
  // Obtain Django's CSRF cookie before posting credentials.
  await api.get("auth/csrf/");
  await api.post("auth/login/", { username, password });
}
