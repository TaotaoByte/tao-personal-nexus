const collections = [
  { key: "site", title: "站点配置", endpoint: "/api/site", type: "object" },
  { key: "blogs", title: "博客文章", endpoint: "/api/blogs", type: "array" },
  { key: "projects", title: "个人项目", endpoint: "/api/projects", type: "array" },
  { key: "tools", title: "工具站合集", endpoint: "/api/tools", type: "array" },
  { key: "recommendations", title: "工具推荐", endpoint: "/api/recommendations", type: "array" },
  { key: "messages", title: "联系消息", endpoint: "/api/messages", type: "readonly" }
];

const templates = {
  blogs: {
    id: "blog-new-post",
    slug: "new-post",
    title: "新文章标题",
    source: "站内",
    date: new Date().toISOString().slice(0, 10),
    tags: ["标签"],
    excerpt: "文章摘要。",
    content: "## 小标题\n\n正文内容。"
  },
  projects: {
    id: "project-new",
    title: "新项目",
    summary: "项目简介。",
    status: "开发中",
    tags: ["Web"],
    repo: "https://github.com/TaotaoByte",
    demo: "",
    order: 99
  },
  tools: {
    id: "tool-new",
    slug: "tool-new",
    name: "新工具",
    category: "站内工具",
    description: "工具简介。",
    url: "",
    repo: "",
    icon: "wrench",
    status: "预留",
    publicData: false,
    maxRecords: 100,
    order: 99
  },
  recommendations: {
    id: "rec-new",
    title: "新推荐",
    category: "效率工具",
    url: "https://example.com",
    reason: "推荐理由。",
    tags: ["工具"],
    order: 99
  }
};

let active = collections[0];

const $ = (selector) => document.querySelector(selector);

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function setTheme(theme) {
  const nextTheme = theme || localStorage.getItem("theme") || "dark";
  document.documentElement.classList.toggle("light", nextTheme === "light");
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
  localStorage.setItem("theme", nextTheme);
  $("#themeToggle").innerHTML = `<i data-lucide="${nextTheme === "dark" ? "moon" : "sun"}" class="h-5 w-5"></i>`;
  refreshIcons();
}

function token() {
  return localStorage.getItem("adminToken") || "";
}

function headers() {
  return {
    "content-type": "application/json",
    "x-admin-token": token()
  };
}

function setStatus(message, isError = false) {
  const status = $("#statusText");
  status.textContent = message;
  status.classList.toggle("text-red-500", isError);
}

function pretty(data) {
  return JSON.stringify(data, null, 2);
}

async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function renderTabs() {
  $("#tabs").innerHTML = collections
    .map(
      (item) => `
        <button class="command-button justify-start ${item.key === active.key ? "command-button-primary" : ""}" type="button" data-tab="${item.key}">
          <i data-lucide="${item.type === "readonly" ? "inbox" : "database"}" class="h-4 w-4"></i>
          ${item.title}
        </button>
      `
    )
    .join("");
  refreshIcons();
}

async function loadActive() {
  $("#activeType").textContent = active.type === "readonly" ? "Read Only" : active.type.toUpperCase();
  $("#activeTitle").textContent = active.title;
  $("#saveButton").disabled = active.type === "readonly";
  $("#templateButton").disabled = !templates[active.key];
  setStatus("加载中...");

  try {
    const options = active.type === "readonly" ? { headers: headers() } : {};
    const data = await request(active.endpoint, options);
    $("#jsonEditor").value = pretty(data);
    setStatus("已加载。");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function saveActive() {
  if (active.type === "readonly") return;
  try {
    const data = JSON.parse($("#jsonEditor").value);
    if (active.type === "array" && !Array.isArray(data)) throw new Error("当前集合必须保存为 JSON 数组。");
    if (active.type === "object" && (Array.isArray(data) || typeof data !== "object")) throw new Error("当前配置必须保存为 JSON 对象。");
    setStatus("保存中...");
    await request(active.endpoint, {
      method: "PUT",
      headers: headers(),
      body: pretty(data)
    });
    setStatus("已保存，刷新主站即可看到更新。");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function insertTemplate() {
  const sample = templates[active.key];
  if (!sample) return;

  try {
    const data = JSON.parse($("#jsonEditor").value || "[]");
    if (!Array.isArray(data)) throw new Error("模板只能插入数组集合。");
    $("#jsonEditor").value = pretty([sample, ...data]);
    setStatus("模板已插入，确认内容后保存。");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadRecords() {
  const toolId = $("#toolIdInput").value.trim();
  if (!toolId) return;
  $("#recordOutput").textContent = "加载中...";

  try {
    const data = await request(`/api/tools/${encodeURIComponent(toolId)}/records`, {
      headers: headers()
    });
    $("#recordOutput").textContent = pretty(data);
  } catch (error) {
    $("#recordOutput").textContent = error.message;
  }
}

async function addRecord() {
  const toolId = $("#toolIdInput").value.trim();
  if (!toolId) return;

  try {
    const payload = JSON.parse($("#recordPayload").value);
    await request(`/api/tools/${encodeURIComponent(toolId)}/records`, {
      method: "POST",
      headers: headers(),
      body: pretty({ payload })
    });
    await loadRecords();
  } catch (error) {
    $("#recordOutput").textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#tokenInput").value = token();
  setTheme();
  renderTabs();
  loadActive();

  $("#themeToggle").addEventListener("click", () => {
    setTheme(document.documentElement.classList.contains("light") ? "dark" : "light");
  });

  $("#saveToken").addEventListener("click", () => {
    localStorage.setItem("adminToken", $("#tokenInput").value.trim());
    setStatus("Token 已保存到本机浏览器。");
  });

  $("#tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    active = collections.find((item) => item.key === button.dataset.tab);
    renderTabs();
    loadActive();
  });

  $("#reloadButton").addEventListener("click", loadActive);
  $("#saveButton").addEventListener("click", saveActive);
  $("#templateButton").addEventListener("click", insertTemplate);
  $("#loadRecords").addEventListener("click", loadRecords);
  $("#addRecord").addEventListener("click", addRecord);
});
