import CONFIG from "./config.js";
import { apiCall, safeJSONParse } from "./main.js";

async function initAdminDashboard() {
  const token = localStorage.getItem("auth_token");
  const user = safeJSONParse(localStorage.getItem("user_data"), {});

  // Robust Admin Check matching auth.js
  if (
    !token ||
    !(
      user.role === "admin" ||
      user.role === "Admin" ||
      user.is_admin === true ||
      user.is_admin === 1
    )
  ) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const nameEl = document.getElementById("admin-name");
  if (nameEl) nameEl.innerText = user.name || "Admin";

  await fetchDashboardStats();
  // Start polling every 20 seconds for near-real-time updates
  startDashboardPolling(20000);
  // Wire manual refresh
  document
    .getElementById("refresh-stats")
    ?.addEventListener("click", () => fetchDashboardStats());
}

async function fetchDashboardStats() {
  try {
    const data = await apiCall("/admin/dashboard-stats");

    // Allow rendering if data is partial, but data must exist
    if (!data || data.success === false) {
      console.warn("Dashboard stats failed/empty:", data?.message);
      // Use 0 values if failed
    }

    const validData = data || {};

    const revEl = document.getElementById("stat-revenue");
    const ordEl = document.getElementById("stat-orders");
    const usrEl = document.getElementById("stat-users");
    const prdEl = document.getElementById("stat-products");

    if (revEl)
      revEl.innerText = `₹${Number(validData.total_revenue || 0).toLocaleString()}`;
    if (ordEl) ordEl.innerText = validData.total_orders || 0;
    if (usrEl) usrEl.innerText = validData.total_users || 0;
    if (prdEl)
      prdEl.innerText =
        (validData.active_products ?? validData.total_products) || 0;

    if (validData.recent_orders) {
      renderRecentOrders(validData.recent_orders);
    }

    // Pass real data to charts.
    // Expecting { revenue_chart: { labels:[], data:[] }, category_chart: { labels:[], data:[] } }
    if (window.Chart) {
      initCharts(validData);
    }
    // Update last-updated timestamp
    try {
      setLastUpdated(validData.updated_at || Date.now());
    } catch (e) {}
  } catch (e) {
    console.error("Stats fetch error", e);
  }
}

let _dashboardPollTimer = null;
function startDashboardPolling(intervalMs = 20000) {
  if (_dashboardPollTimer) return;
  _dashboardPollTimer = setInterval(() => {
    fetchDashboardStats().catch(() => {});
  }, intervalMs);
}

function stopDashboardPolling() {
  if (_dashboardPollTimer) {
    clearInterval(_dashboardPollTimer);
    _dashboardPollTimer = null;
  }
}

function setLastUpdated(ts) {
  const el = document.getElementById("stats-last-updated");
  if (!el) return;
  const d = ts ? new Date(ts) : new Date();
  el.innerText = d.toLocaleTimeString();
}

function renderRecentOrders(orders) {
  const table = document.getElementById("recent-orders-table");
  if (!table || !Array.isArray(orders)) return;

  if (orders.length === 0) {
    table.innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-slate-400">No recent orders found</td></tr>';
    return;
  }

  table.innerHTML = orders
    .map(
      (o) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black text-slate-900 italic">#${o.order_number || o.id}</td>
            <td class="px-6 py-4">${o.user?.name || "Customer"}</td>
            <td class="px-6 py-4 font-bold">₹${Number(o.total_amount || 0).toLocaleString()}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${getStatusStyle(o.status)}">
                    ${o.status || "PENDING"}
                </span>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
        </tr>
    `,
    )
    .join("");
}

function getStatusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return "bg-green-100 text-green-600";
  if (s === "pending") return "bg-orange-100 text-orange-600";
  if (s === "cancelled") return "bg-red-100 text-red-600";
  return "bg-blue-100 text-blue-600";
}

function initCharts(data) {
  const revCtx = document.getElementById("revenueChart");
  if (revCtx) {
    const chartData = data.revenue_chart || {};
    const labels = chartData.labels || [];
    const values = chartData.data || [];

    const existingChart = Chart.getChart(revCtx);
    if (existingChart) existingChart.destroy();

    const ctx = revCtx.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length ? labels : ["No Data"],
        datasets: [
          {
            label: "Revenue Growth",
            data: values.length ? values : [0], // Default 0 to show empty graph instead of mock
            borderColor: "#2874f0",
            backgroundColor: "rgba(40, 116, 240, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  const catCtx = document.getElementById("categoryChart");
  if (catCtx) {
    const chartData = data.category_chart || {};
    const labels = chartData.labels || [];
    const values = chartData.data || [];

    const existingChart = Chart.getChart(catCtx);
    if (existingChart) existingChart.destroy();

    const ctx2 = catCtx.getContext("2d");
    new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No Data"],
        datasets: [
          {
            data: values.length ? values : [1], // Default 1 so ring appears but gray
            backgroundColor: values.length
              ? ["#2874f0", "#fb641b", "#ff9f00", "#eee", "#333"]
              : ["#e2e8f0"],
          },
        ],
      },
    });
  }
}

document.getElementById("admin-logout")?.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  window.location.href = "/index.html";
});

document.addEventListener("DOMContentLoaded", initAdminDashboard);
