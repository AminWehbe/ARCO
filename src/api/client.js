// All AWS API Gateway calls live here. Search "AWS_WIRE" to find every stub.

const BASE = import.meta.env.VITE_API_BASE_URL;

// Attach Cognito JWT from session storage to every request
function authHeaders() {
  // AWS_WIRE: Cognito — swap localStorage key with real Cognito idToken key once configured
  // e.g. `CognitoIdentityServiceProvider.<userPoolClientId>.<username>.idToken`
  const token = localStorage.getItem("arco_id_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  return res.json();
}

const get  = (path)       => request("GET",  path);
const post = (path, body) => request("POST", path, body);

// ── Leaderboard ────────────────────────────────────────────────────────────
// AWS_WIRE: GET /scores?game={game}&period={today|week|all}  → DynamoDB via Lambda
export async function fetchLeaderboard(game = "SNAKE", period = "today") {
  return get(`/scores?game=${game}&period=${period}`);
}

// AWS_WIRE: POST /scores  body: { game, score, durationMs }  → Lambda → DynamoDB
export async function submitScore(game, score, durationMs) {
  return post("/scores", { game, score, durationMs });
}

// ── Profile ────────────────────────────────────────────────────────────────
// AWS_WIRE: GET /users/{userId}/stats  → DynamoDB user record
export async function fetchUserStats(userId) {
  return get(`/users/${userId}/stats`);
}

// AWS_WIRE: PATCH /users/{userId}  body: { displayName }  → DynamoDB update
export async function updateProfile(userId, fields) {
  return request("PATCH", `/users/${userId}`, fields);
}

// ── Admin ──────────────────────────────────────────────────────────────────
// AWS_WIRE: GET /admin/metrics  → CloudWatch GetMetricData via Lambda (IAM-protected)
export async function fetchAdminMetrics() {
  return get("/admin/metrics");
}

// AWS_WIRE: GET /admin/alerts  → CloudWatch alarms list via Lambda (IAM-protected)
export async function fetchAdminAlerts() {
  return get("/admin/alerts");
}

// ── Auth stubs (Cognito) ───────────────────────────────────────────────────
// AWS_WIRE: Replace these 3 functions with `aws-amplify/auth` calls once Cognito is set up.
// Amplify docs: https://docs.amplify.aws/react/build-a-backend/auth/
//
//   import { signIn, signUp, signOut, getCurrentUser } from "aws-amplify/auth";
//
// All three currently return mocked data so the UI is fully navigable.

export async function cognitoSignIn(username, password) {
  // AWS_WIRE: await signIn({ username, password });
  // On success Amplify stores tokens automatically — remove the localStorage line below.
  console.warn("[AUTH STUB] cognitoSignIn called — not wired to Cognito yet");
  if (!username || !password) throw new Error("Username and password required");
  const fakeToken = btoa(`${username}:${Date.now()}`);
  localStorage.setItem("arco_id_token", fakeToken);
  return { userId: "u_stub_001", username, displayName: username.toUpperCase() };
}

export async function cognitoSignUp(username, password, email) {
  // AWS_WIRE: await signUp({ username, password, options: { userAttributes: { email } } });
  console.warn("[AUTH STUB] cognitoSignUp called — not wired to Cognito yet");
  if (!username || !password || !email) throw new Error("All fields required");
  return { userId: "u_stub_new", username, email };
}

export async function cognitoSignOut() {
  // AWS_WIRE: await signOut();
  console.warn("[AUTH STUB] cognitoSignOut called — not wired to Cognito yet");
  localStorage.removeItem("arco_id_token");
}
