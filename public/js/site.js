const state = {
  site: {},
  blogs: [],
  projects: [],
  tools: [],
  recommendations: []
};

const fallbackContent = {
  site: {
    brand: "Tao",
    subtitle: "数据科学探索者 / 轻量工具制造者 / ACGN 同好",
    intro: "用数据理解世界，用代码整理日常。这里收纳我的介绍、文章、项目、工具和长期收藏。",
    avatarUrl: "https://github.com/TaotaoByte.png",
    heroBadges: ["Python", "数据分析", "Web 工具", "机器学习", "ACGN"],
    about: {
      headline: "你好，我是 Tao",
      paragraphs: [
        "我关注数据科学、机器学习、健康数据分析和轻量 Web 工具。这个网站会作为我的公开资料库，沉淀文章、项目、工具和长期收藏。",
        "我更喜欢能解决真实问题、后期也容易维护的小而稳方案。这个站点先保证清晰、好看、可用，然后再逐步扩展。"
      ],
      stats: [
        { label: "方向", value: "Data + Web" },
        { label: "结构", value: "Light Site" },
        { label: "维护", value: "JSON / API" }
      ],
      skills: ["Python", "SQL", "JavaScript", "数据分析", "机器学习", "可视化"]
    },
    socials: [
      { label: "GitHub", url: "https://github.com/TaotaoByte" },
      { label: "Bilibili", url: "https://space.bilibili.com/516531193?spm_id_from=333.1007.0.0" }
    ],
    contact: {
      headline: "保持联系",
      description: "项目合作、文章交流、工具建议都可以从这里发来。"
    }
  },
  blogs: [
    {
      id: "fallback-blog",
      slug: "fallback-blog",
      title: "当推荐系统遇见番剧评分：一次轻量实践",
      source: "站内",
      date: "2026-02-09",
      tags: ["推荐系统", "数据分析", "ACGN"],
      excerpt: "用一个小型评分数据集演示从清洗、特征构造到推荐结果解释的完整流程。",
      content: "## 为什么做这个实验\n\n推荐系统不是只有大型平台才值得研究。用小数据也可以练习数据清洗、相似度计算、召回排序和结果解释。"
    },
    {
      title: "GitHub 项目与代码记录",
      source: "GitHub",
      date: "2026-02-08",
      tags: ["GitHub", "项目"],
      excerpt: "外部平台文章或项目可以直接显示在博客区。",
      url: "https://github.com/TaotaoByte"
    }
  ],
  projects: [
    {
      title: "个人轻量工具集",
      summary: "把常用的小工具沉淀到个人站内，优先保证加载快、可维护、数据能独立更新。",
      status: "持续开发",
      tags: ["Web", "Node.js", "工具站"],
      repo: "https://github.com/TaotaoByte",
      demo: "tools/bookmark-vault.html"
    },
    {
      title: "全球健康风险因素分析",
      summary: "面向多源公共数据的疾病负担归因分析模板，包含数据清洗、指标解释和结果可视化。",
      status: "整理中",
      tags: ["公共健康", "数据分析", "可视化"],
      repo: "https://github.com/TaotaoByte"
    }
  ],
  tools: [
    {
      name: "轻量链接收藏夹",
      category: "站内工具",
      description: "一个示例自制工具，用于保存链接、分类和备注。",
      status: "可用",
      url: "tools/bookmark-vault.html"
    },
    {
      name: "JSON 格式化器",
      category: "开发效率",
      description: "预留站内工具位，后续可以接入格式化、校验和字段搜索能力。",
      status: "预留"
    }
  ],
  recommendations: [
    {
      title: "Excalidraw",
      category: "图示表达",
      url: "https://excalidraw.com/",
      reason: "适合快速画流程图、架构图和课程笔记，风格轻但表达清楚。"
    },
    {
      title: "Carbon",
      category: "代码展示",
      url: "https://carbon.now.sh/",
      reason: "把代码片段生成适合博客、封面和分享的图片。"
    }
  ]
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function chips(items = []) {
  return toList(items).map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");
}

function tags(items = []) {
  return `<div class="tags">${toList(items).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function link(url, label, className = "text-link") {
  if (!url) return "";
  const external = url.startsWith("http");
  return `<a class="${className}" href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${escapeHtml(label)}</a>`;
}

async function loadContent() {
  if (window.location.protocol === "file:") {
    Object.assign(state, fallbackContent);
    return;
  }

  const response = await fetch("api/content");
  if (!response.ok) throw new Error("内容加载失败");
  Object.assign(state, await response.json());
}

function renderSite() {
  const { site } = state;
  document.title = `${site.brand || "Tao"} - Personal Site`;
  $$("[data-brand]").forEach((item) => {
    item.textContent = site.brand || "Tao";
  });
  $("#heroSubtitle").textContent = site.subtitle || "";
  $("#heroIntro").textContent = site.intro || "";
  if (site.avatarUrl) $("#avatarImage").src = site.avatarUrl;
  $("#heroBadges").innerHTML = chips(site.heroBadges);

  const stats = site.about?.stats || [];
  $("#heroMetrics").innerHTML = stats.slice(0, 3).map((stat) => `
    <div class="metric">
      <strong>${escapeHtml(stat.value)}</strong>
      <span>${escapeHtml(stat.label)}</span>
    </div>
  `).join("");

  $("#aboutHeadline").textContent = site.about?.headline || "关于我";
  $("#aboutParagraphs").innerHTML = (site.about?.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join("");
  $("#skillList").innerHTML = chips(site.about?.skills);
  $("#contactHeadline").textContent = site.contact?.headline || "保持联系";
  $("#contactDescription").textContent = site.contact?.description || "";
  $("#socialLinks").innerHTML = (site.socials || []).map((social) => link(social.url, social.label, "btn")).join("");
}

function renderBlogs() {
  const posts = state.blogs.slice(0, 3);
  $("#blogList").innerHTML = posts.map((post, index) => {
    const action = post.url
      ? link(post.url, "打开原文", "btn primary")
      : `<button class="btn primary" type="button" data-open-blog="${escapeHtml(post.slug || post.id)}">阅读文章</button>`;
    return `
      <article class="feature-card reveal">
        <div class="meta"><span>${escapeHtml(post.source || "站内")}</span><time>${escapeHtml(post.date || "")}</time></div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt || "")}</p>
        ${tags(post.tags)}
        <div class="card-footer">${action}</div>
      </article>
    `;
  }).join("");
}

function renderProjects() {
  $("#projectList").innerHTML = state.projects.map((project) => `
    <article class="card reveal">
      <div class="meta"><span class="status">${escapeHtml(project.status || "项目")}</span><span>${escapeHtml((project.tags || [])[0] || "")}</span></div>
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.summary || "")}</p>
      ${tags(project.tags)}
      <div class="card-footer">
        <div class="link-row">
          ${link(project.demo, "演示")}
          ${link(project.repo, "GitHub")}
        </div>
      </div>
    </article>
  `).join("");
}

function renderTools() {
  $("#toolList").innerHTML = state.tools.map((tool) => `
    <article class="tool-card reveal">
      <div class="meta"><span>${escapeHtml(tool.category || "工具")}</span><span class="status">${escapeHtml(tool.status || "")}</span></div>
      <h3>${escapeHtml(tool.name)}</h3>
      <p>${escapeHtml(tool.description || "")}</p>
      <div class="card-footer">
        <div class="link-row">
          ${link(tool.url, "进入")}
          ${link(tool.repo, "源码")}
        </div>
      </div>
    </article>
  `).join("");
}

function renderRecommendations() {
  $("#recommendationList").innerHTML = state.recommendations.map((item) => `
    <article class="recommend-item reveal">
      <div>
        <span class="category">${escapeHtml(item.category || "推荐")}</span>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <p>${escapeHtml(item.reason || "")}</p>
      ${link(item.url, "访问", "btn")}
    </article>
  `).join("");
}

function markdownToHtml(markdown = "") {
  const lines = String(markdown).split(/\r?\n/);
  const html = [];
  let inList = false;

  for (const line of lines) {
    const text = line.trim();
    if (!text) {
      if (inList) {
        html.push("</ol>");
        inList = false;
      }
      continue;
    }
    if (text.startsWith("## ")) {
      if (inList) {
        html.push("</ol>");
        inList = false;
      }
      html.push(`<h2>${escapeHtml(text.slice(3))}</h2>`);
      continue;
    }
    const list = text.match(/^\d+\.\s+(.+)$/);
    if (list) {
      if (!inList) {
        html.push("<ol>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(list[1])}</li>`);
      continue;
    }
    if (inList) {
      html.push("</ol>");
      inList = false;
    }
    html.push(`<p>${escapeHtml(text)}</p>`);
  }
  if (inList) html.push("</ol>");
  return html.join("");
}

function bindArticleDialog() {
  const dialog = $("#articleDialog");
  $("#articleClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-blog]");
    if (!button) return;
    const post = state.blogs.find((item) => item.slug === button.dataset.openBlog || item.id === button.dataset.openBlog);
    if (!post) return;
    $("#articleMeta").textContent = `${post.source || "站内"} / ${post.date || ""}`;
    $("#articleTitle").textContent = post.title || "";
    $("#articleBody").innerHTML = markdownToHtml(post.content || post.excerpt || "");
    dialog.showModal();
  });
}

function bindUi() {
  $("#year").textContent = new Date().getFullYear();

  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.dataset.theme = savedTheme;
  $("#themeToggle").textContent = savedTheme === "dark" ? "☀" : "☾";
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    $("#themeToggle").textContent = next === "dark" ? "☀" : "☾";
  });

  $("#menuToggle").addEventListener("click", () => {
    $("#mobileNav").classList.toggle("is-open");
  });
  $$("#mobileNav a").forEach((item) => item.addEventListener("click", () => $("#mobileNav").classList.remove("is-open")));

  const progress = $("#scrollProgress");
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max <= 0 ? 0 : (window.scrollY / max) * 100}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const sections = ["about", "blog", "projects", "tools", "recommend", "contact"].map((id) => $(`#${id}`));
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      $$(".desktop-nav a").forEach((linkEl) => linkEl.classList.toggle("is-active", linkEl.hash === `#${current.target.id}`));
    }, { threshold: [0.25, 0.45], rootMargin: "-30% 0px -55% 0px" });
    sections.filter(Boolean).forEach((section) => sectionObserver.observe(section));
  }
}

function reveal() {
  if (!("IntersectionObserver" in window)) {
    $$(".reveal").forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });
  $$(".reveal").forEach((item) => observer.observe(item));
}

function bindContact() {
  $("#contactForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $("#contactStatus");
    status.textContent = "发送中...";
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      });
      if (!response.ok) throw new Error("failed");
      form.reset();
      status.textContent = "已收到，后台可以查看。";
    } catch {
      status.textContent = "发送失败，请稍后再试。";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindUi();
  bindArticleDialog();
  bindContact();
  try {
    await loadContent();
  } catch (error) {
    console.error(error);
    Object.assign(state, fallbackContent);
  }

  renderSite();
  renderBlogs();
  renderProjects();
  renderTools();
  renderRecommendations();
  reveal();
});
