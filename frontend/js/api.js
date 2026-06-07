// Azure Container Apps backend
const BASE = "https://moodle-backend.politecoast-e22ef216.southeastasia.azurecontainerapps.io/api/v1";
const HEALTH = BASE.replace(/\/api\/v1$/, "/api/health");

function getToken() { return localStorage.getItem("token"); }

async function request(method, path, body, isForm = false, _retry = 0) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  if (!isForm) headers["Content-Type"] = "application/json";

  const opts = { method, headers };
  if (body) opts.body = isForm ? body : JSON.stringify(body);

  // Bound every request so a cold/asleep container can't hang the UI forever.
  // 35s comfortably covers a scale-to-zero cold start (~10-15s) plus the query.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  opts.signal = controller.signal;

  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch (netErr) {
    clearTimeout(timer);
    // Network failure or timeout — the container may be cold-starting. Retry once.
    if (_retry === 0) {
      await new Promise(r => setTimeout(r, 1500));
      return request(method, path, body, isForm, 1);
    }
    throw new Error("Network error — the server may be waking up. Please try again in a moment.");
  }
  clearTimeout(timer);

  if (res.status === 401) {
    localStorage.clear();
    location.href = "/index.html";
    return;
  }

  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
  return data;
}

// Fire-and-forget warm-up: pokes the health endpoint (which now opens a DB
// connection) so a sleeping backend starts spinning up before the user acts.
async function warmUp() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    await fetch(HEALTH, { method: "GET", signal: c.signal });
    clearTimeout(t);
  } catch { /* best-effort */ }
}

const api = {
  warmUp,
  auth: {
    login:    (email, password) => request("POST", "/auth/login", { email, password }),
    me:       ()      => request("GET",  "/auth/me"),
    updateMe: (body)  => request("PATCH", "/auth/me", body),
  },
  courses: {
    list: ()   => request("GET", "/courses"),
    get:  (id) => request("GET", "/courses/" + id),
    // --- classroom ---
    people:         (id)             => request("GET",  `/courses/${id}/people`),
    sections:       (id)             => request("GET",  `/courses/${id}/sections`),
    createSection:  (id, body)       => request("POST", `/courses/${id}/sections`, body),
    addMaterial:    (id, sId, fd)    => request("POST", `/courses/${id}/sections/${sId}/materials`, fd, true),
    materialUrl:    (id, mId)        => request("GET",  `/courses/${id}/materials/${mId}/download`),
    forums:         (id)             => request("GET",  `/courses/${id}/forums`),
    createForum:    (id, body)       => request("POST", `/courses/${id}/forums`, body),
    posts:          (id, fId)        => request("GET",  `/courses/${id}/forums/${fId}/posts`),
    createPost:     (id, fId, body)  => request("POST", `/courses/${id}/forums/${fId}/posts`, body),
    attendance:     (id)             => request("GET",  `/courses/${id}/attendance`),
    createSession:  (id, body)       => request("POST", `/courses/${id}/attendance/sessions`, body),
    markAttendance: (id, sId, recs)  => request("POST", `/courses/${id}/attendance/sessions/${sId}/records`, { records: recs }),
  },
  assignments: {
    list:        ()              => request("GET",   "/assignments"),
    get:         (id)            => request("GET",   "/assignments/" + id),
    create:      (body)          => request("POST",  "/assignments", body),
    submissions: (id)            => request("GET",   "/assignments/" + id + "/submissions"),
    fileUrl:     (aId, sId)      => request("GET",   `/assignments/${aId}/submissions/${sId}/file`),
    submit:      (id, formData)  => request("POST",  "/assignments/" + id + "/submit", formData, true),
    grade:       (aId, sId, grade, feedback) =>
      request("PATCH", `/assignments/${aId}/submissions/${sId}/grade`, { grade, feedback }),
  },
  notifications: {
    list:        ()                        => request("GET",   "/notifications"),
    unreadCount: ()                        => request("GET",   "/notifications/unread-count"),
    create:      (course_id, title, body)  => request("POST",  "/notifications", { course_id, title, body }),
    markRead:    (id)                      => request("PATCH", "/notifications/" + id + "/read"),
  },
  grades: {
    mine: () => request("GET", "/grades"),
  },
  quizzes: {
    list:   ()              => request("GET",  "/quizzes"),
    get:    (id)            => request("GET",  "/quizzes/" + id),
    submit: (id, answers)   => request("POST", "/quizzes/" + id + "/submit", { answers }),
  },
  admin: {
    stats:          ()          => request("GET",    "/admin/stats"),
    listUsers:      ()          => request("GET",    "/admin/users"),
    createUser:     (body)      => request("POST",   "/admin/users", body),
    updateUser:     (id, body)  => request("PATCH",  "/admin/users/" + id, body),
    deleteUser:     (id)        => request("DELETE", "/admin/users/" + id),
    listCourses:    ()          => request("GET",    "/admin/courses"),
    getSettings:    ()          => request("GET",    "/admin/settings"),
    updateSettings: (body)      => request("PATCH",  "/admin/settings", body),
    listAudit:      ()          => request("GET",    "/admin/audit"),
  },
};

window.api = api;
