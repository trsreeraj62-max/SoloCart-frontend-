import { apiCall, getAuthToken } from "./main.js";

let messages = [];

async function initAdminMessages() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  document
    .getElementById("refresh-messages")
    ?.addEventListener("click", fetchMessages);

  await fetchMessages();
}

async function fetchMessages() {
  const tbody = document.getElementById("messages-table");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Messages...</td></tr>`;

  try {
    const data = await apiCall("/admin/contacts", { requireAuth: true });
    
    if (!data || data.success === false) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-rose-500 font-black uppercase tracking-widest text-xs">Error: ${escapeHtml(data?.message || "Failed to load")}</td></tr>`;
      return;
    }

    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.data)) list = data.data;
    else if (Array.isArray(data.contacts)) list = data.contacts;
    else if (Array.isArray(data.items)) list = data.items;
    else list = [];

    messages = list;
    renderMessages(messages);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-rose-500 font-black uppercase tracking-widest text-xs">Connection Error</td></tr>`;
  }
}

function renderMessages(list) {
  const tbody = document.getElementById("messages-table");
  if (!tbody) return;
  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No Messages Found</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map((m) => {
      const name = m.name || m.full_name || m.from_name || "Anonymous";
      const email = m.email || m.from_email || "N/A";
      const rawMsg = m.message || m.body || m.content || "Empty";
      const date = m.created_at || m.date || m.created || "Unknown Time";
      
      return `
        <tr class="hover:bg-slate-50 transition-colors group">
          <td class="px-8 py-5 font-black text-slate-900 italic">${escapeHtml(name)}</td>
          <td class="px-8 py-5 font-bold text-indigo-600">${escapeHtml(email)}</td>
          <td class="px-8 py-5">
            <div class="max-w-md text-slate-500 leading-relaxed">${escapeHtml(rawMsg)}</div>
          </td>
          <td class="px-8 py-5 text-slate-400 font-black text-[10px] uppercase tracking-tighter">${escapeHtml(date)}</td>
        </tr>`;
    })
    .join("");
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

document.addEventListener("DOMContentLoaded", initAdminMessages);
