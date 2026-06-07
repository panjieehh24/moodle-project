const SVG = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
};

function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) { location.href = "/index.html"; return null; }
  return JSON.parse(atob(token.split(".")[1]));
}

function logout() {
  localStorage.clear();
  location.href = "/index.html";
}

async function initShell() {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;

  if (user.role === "student") {
    try {
      const { count } = await api.notifications.unreadCount();
      const badge = document.getElementById("bell-badge");
      if (count > 0) { badge.textContent = count; badge.classList.add("show"); }
    } catch {}
  }

  const here = location.pathname.split("/").pop() || "dashboard.html";
  const navLinks = [
    { href: "dashboard.html",   icon: SVG.home,      label: "Dashboard" },
    { href: "courses.html",     icon: SVG.book,      label: "Courses" },
    { href: "assignments.html", icon: SVG.clipboard, label: "Assignments" },
  ];
  if (user.role === "student") {
    navLinks.push({ href: "quizzes.html", icon: SVG.help,  label: "Quizzes" });
    navLinks.push({ href: "grades.html",  icon: SVG.chart, label: "Grades" });
  }
  navLinks.push({ href: "notifications.html", icon: SVG.bell,     label: "Notifications" });
  navLinks.push({ href: "profile.html",       icon: SVG.user,     label: "Profile" });
  if (user.role === "admin") {
    navLinks.push({ href: "admin.html", icon: SVG.settings, label: "Admin" });
  }

  const nav = document.querySelector(".sidebar nav");
  if (nav) {
    nav.innerHTML = navLinks.map(l =>
      `<a href="${l.href}"${l.href === here ? ' class="active"' : ''}>` +
      `<span class="nav-icon">${l.icon}</span>${l.label}</a>`
    ).join("");
  }

  return user;
}

window.requireAuth = requireAuth;
window.logout = logout;
window.initShell = initShell;
