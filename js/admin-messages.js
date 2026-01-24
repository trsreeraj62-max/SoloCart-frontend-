import { apiCall, getAuthToken } from "./main.js";

let messages = [];
let currentMessageId = null;

async function initAdminMessages() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  document
    .getElementById("refresh-messages")
    ?.addEventListener("click", fetchMessages);
  document
    .querySelectorAll(".close-reply")
    .forEach((b) => b.addEventListener("click", () => toggleReplyModal(false)));
  document
    .getElementById("reply-form")
    ?.addEventListener("submit", handleSendReply);

  await fetchMessages();
}

async function fetchMessages() {
  const tbody = document.getElementById("messages-table");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Loading...</td></tr>`;

  try {
    const data = await apiCall("/admin/contacts", { requireAuth: true });

    // Handle common apiCall error shapes
    if (data && data.success === false) {
      if (data.statusCode === 401) {
        // unauthorized — redirect to login
        if (window.showToast)
          window.showToast("Session expired. Please login.", "error");
        setTimeout(() => (window.location.href = "/login.html"), 400);
        return;
      }
      tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500">${escapeHtml(data.message || "Failed to load messages")}</td></tr>`;
      return;
    }

    const list = Array.isArray(data)
      ? data
      : data?.data || data?.contacts || data?.items || [];
    messages = Array.isArray(list) ? list : [];
    renderMessages(messages);
  } catch (e) {
    console.error("Failed to load messages", e);
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500">Failed to load messages</td></tr>`;
  }
}

function renderMessages(list) {
  const tbody = document.getElementById("messages-table");
  if (!tbody) return;
  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">No messages</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map((m) => {
      const name = m.name || m.full_name || m.from_name || "Unknown";
      const email = m.email || m.from_email || "";
      const rawMsg = m.message || m.body || m.content || "";
      const preview =
        rawMsg.length > 50
          ? `${escapeHtml(rawMsg.slice(0, 50))}…`
          : escapeHtml(rawMsg);
      const date = m.created_at || m.date || m.created || "";
      return `
        <tr>
          <td class="px-4 py-3">${escapeHtml(name)}</td>
          <td class="px-4 py-3">${escapeHtml(email)}</td>
          <td class="px-4 py-3 text-sm text-slate-700">${preview}</td>
          <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(date)}</td>
          <td class="px-4 py-3 text-right">
            <button data-id="${m.id}" class="view-msg px-3 py-1 bg-[#2874f0] text-white rounded">View</button>
          </td>
        </tr>`;
    })
    .join("");

  tbody.querySelectorAll(".view-msg").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const id = btn.dataset.id;
      openMessage(id);
    });
  });
}

function toggleReplyModal(show = true) {
  const modal = document.getElementById("replyModal");
  if (!modal) return;
  if (show) modal.classList.remove("hidden");
  else modal.classList.add("hidden");
}

async function openMessage(id) {
  const tbody = document.getElementById("messages-table");
  try {
    const data = await apiCall(`/admin/contacts/${id}`, { requireAuth: true });
    const msg = data?.data || data?.contact || data || null;
    if (!msg) {
      if (window.showToast) window.showToast("Failed to load message", "error");
      return;
    }

    currentMessageId = msg.id || id;
    const orig = document.getElementById("original-message");
    if (orig) {
      orig.innerHTML = `
        <div class="font-bold mb-2">From: ${escapeHtml(msg.name || msg.from_name || "")} &lt;${escapeHtml(msg.email || msg.from_email || "")}&gt;</div>
        <div class="text-xs opacity-80 mb-2">Date: ${escapeHtml(msg.created_at || msg.date || "")}</div>
        <div class="whitespace-pre-wrap">${escapeHtml(msg.message || msg.body || msg.content || "")}</div>`;
    }
    const ta = document.getElementById("reply-text");
    if (ta) ta.value = "";
    toggleReplyModal(true);
  } catch (err) {
    console.error("Failed to fetch message", err);
    if (window.showToast)
      window.showToast("Failed to load message details", "error");
  }
}

async function handleSendReply(e) {
  e.preventDefault();
  if (!currentMessageId) return;
  const ta = document.getElementById("reply-text");
  if (!ta) return;
  const text = (ta.value || "").trim();
  if (!text) {
    if (window.showToast) window.showToast("Reply cannot be empty", "error");
    return;
  }

  const btn = document.getElementById("send-reply-btn");
  const origText = btn ? btn.innerText : null;
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Sending...";
  }

  try {
    const endpoint = `/admin/contacts/${currentMessageId}/reply`;
    const data = await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify({ message: text }),
      requireAuth: true,
    });
    if (data && data.success !== false) {
      if (window.showToast) window.showToast("Reply sent");
      // update local state to mark replied if present
      const idx = messages.findIndex(
        (m) => String(m.id) === String(currentMessageId),
      );
      if (idx !== -1) {
        messages[idx].replied = true;
      }
      renderMessages(messages);
      toggleReplyModal(false);
    } else {
      const msg = data?.message || "Failed to send reply";
      if (window.showToast) window.showToast(msg, "error");
    }
  } catch (err) {
    console.error("Reply send failed", err);
    if (window.showToast)
      window.showToast("Network error: failed to send reply", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = origText;
    }
  }
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

document.addEventListener("DOMContentLoaded", initAdminMessages);
