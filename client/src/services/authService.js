const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";

async function sendRequest(path, payload) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export function signupUser(payload) {
  return sendRequest("/signup", payload);
}

export function loginUser(payload) {
  return sendRequest("/login", payload);
}

export function loginWithGoogle(payload) {
  return sendRequest("/google-login", payload);
}
