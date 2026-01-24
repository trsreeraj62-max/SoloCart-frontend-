import { apiCall, getAuthToken } from "./main.js";

let messages = [];
let currentMessageId = null;

async function initAdminMessages() {
  // Protect admin route: require token
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
  tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">Loading...</td></tr>`;

  try {
    const data = await apiCall("/admin/contact-messages", {
      requireAuth: true,
    });
    // normalize
    const list = data?.data || data?.messages || data?.items || data || [];
    messages = Array.isArray(list) ? list : [];
    renderMessages(messages);
  } catch (e) {
    console.error("Failed to load messages", e);
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-rose-500">Failed to load messages</td></tr>`;
  }
}

function renderMessages(list) {
  const tbody = document.getElementById("messages-table");
  if (!tbody) return;
  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No messages</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map((m) => {
      const status = m.status || m.is_replied || m.replied ? "Replied" : "New";
      const isNew = status === "New";
      const date = m.created_at || m.date || m.created || "";
      const name = m.name || m.full_name || m.from_name || "Unknown";
      const email = m.email || m.from_email || "";
      const subject = m.subject || m.title || "(no subject)";
      return `
        <tr class="${isNew ? "bg-yellow-50" : ""}">
          <td class="px-4 py-3">${escapeHtml(name)}</td>
          <td class="px-4 py-3">${escapeHtml(email)}</td>
          <td class="px-4 py-3">${escapeHtml(subject)}</td>
          <td class="px-4 py-3 font-bold">${status}</td>
          <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(date)}</td>
          <td class="px-4 py-3 text-right">
            <button data-id="${m.id}" class="view-msg px-3 py-1 bg-[#2874f0] text-white rounded">View / Reply</button>
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

function openMessage(id) {
  const msg = messages.find((m) => String(m.id) === String(id));
  if (!msg) return;
  currentMessageId = msg.id;
  const orig = document.getElementById("original-message");
  if (orig) {
    orig.innerHTML = `<div class="font-bold mb-2">From: ${escapeHtml(msg.name || msg.from_name || "")} &lt;${escapeHtml(msg.email || msg.from_email || "")}&gt;</div><div class="text-xs opacity-80 mb-2">Subject: ${escapeHtml(msg.subject || msg.title || "")}</div><div class="whitespace-pre-wrap">${escapeHtml(msg.message || msg.body || msg.content || "")}</div>`;
  }
  // clear reply textarea
  const ta = document.getElementById("reply-text");
  if (ta) ta.value = "";
  toggleReplyModal(true);
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
    const endpoint = `/admin/contact-messages/${currentMessageId}/reply`;
    const data = await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify({ message: text }),
      requireAuth: true,
    });
    if (data && data.success !== false) {
      if (window.showToast) window.showToast("Reply sent");
      // update local state to mark replied
      const idx = messages.findIndex(
        (m) => String(m.id) === String(currentMessageId),
      );
      if (idx !== -1) {
        messages[idx].status = "replied";
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
