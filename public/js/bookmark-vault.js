const TOOL_ID = "bookmark-vault";
let records = [];

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setTheme(theme) {
  const nextTheme = theme || localStorage.getItem("theme") || "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
  $("#themeToggle").textContent = nextTheme === "dark" ? "☀" : "☾";
}

function setStatus(message, isError = false) {
  const status = $("#toolStatus");
  status.textContent = message;
  status.classList.toggle("text-red-500", isError);
}

async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function loadRecords() {
  setStatus("加载中...");
  try {
    records = await request(`/api/tools/${TOOL_ID}/records`);
    renderRecords();
    setStatus(`已加载 ${records.length} 条。`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function renderRecords() {
  const keyword = $("#searchInput").value.trim().toLowerCase();
  const filtered = records.filter((record) => {
    const text = JSON.stringify(record.payload || {}).toLowerCase();
    return !keyword || text.includes(keyword);
  });

  $("#bookmarkList").innerHTML = filtered.length
    ? filtered
        .map((record) => {
          const item = record.payload || {};
          return `
            <article class="card">
              <div class="meta"><span class="status">${escapeHtml(item.category || "收藏")}</span><span>LINK</span></div>
              <h3>${escapeHtml(item.title || "未命名链接")}</h3>
              <p>${escapeHtml(item.note || "")}</p>
              <div class="card-footer">
                <a class="btn primary" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">打开</a>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="card">暂无记录。</div>`;
}

async function addRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    setStatus("保存中...");
    await request(`/api/tools/${TOOL_ID}/records`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload })
    });
    form.reset();
    form.elements.category.value = "收藏";
    await loadRecords();
  } catch (error) {
    setStatus(error.message, true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTheme();
  $("#themeToggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  $("#bookmarkForm").addEventListener("submit", addRecord);
  $("#reloadButton").addEventListener("click", loadRecords);
  $("#searchInput").addEventListener("input", renderRecords);
  loadRecords();
});
