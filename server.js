const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT_DIR, "data");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change-this-token";
const MAX_BODY_BYTES = 1024 * 1024;

const COLLECTIONS = {
  blogs: "blogs.json",
  projects: "projects.json",
  tools: "tools.json",
  recommendations: "recommendations.json"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function jsonHeaders(extra = {}) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extra
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, jsonHeaders());
  res.end(JSON.stringify(payload, null, 2));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile(fileName, fallback) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeJsonFile(fileName, fallback);
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(fileName, data) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

function isAuthorized(req) {
  const token = req.headers["x-admin-token"] || "";
  const expected = ADMIN_TOKEN || "";
  if (!token || !expected || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function requireAdmin(req, res) {
  if (isAuthorized(req)) return true;
  sendError(res, 401, "需要管理员 Token。");
  return false;
}

function splitPath(pathname) {
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

function createId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function slugify(text) {
  const slug = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || createId("post");
}

function normalizeItem(collection, rawItem, previous = {}) {
  const now = new Date().toISOString();
  const item = {
    ...previous,
    ...rawItem,
    id: rawItem.id || previous.id || createId(collection.slice(0, -1) || "item"),
    updatedAt: now
  };

  if (!item.createdAt) item.createdAt = previous.createdAt || now;
  if (collection === "blogs") {
    item.slug = item.slug || previous.slug || slugify(item.title || item.id);
    item.date = item.date || previous.date || now.slice(0, 10);
  }
  return item;
}

async function parseBody(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error("请求内容过大。"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("请求体必须是合法 JSON。"), { statusCode: 400 });
  }
}

function sortItems(collection, items) {
  const copy = [...items];
  if (collection === "blogs") {
    return copy.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }
  return copy.sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

async function handleCollection(req, res, collection, itemKey) {
  const fileName = COLLECTIONS[collection];
  if (!fileName) return false;

  const items = await readJsonFile(fileName, []);

  if (req.method === "GET" && !itemKey) {
    sendJson(res, 200, sortItems(collection, items));
    return true;
  }

  if (req.method === "GET" && itemKey) {
    const item = items.find((entry) => entry.id === itemKey || entry.slug === itemKey);
    if (!item) return sendError(res, 404, "内容不存在。");
    sendJson(res, 200, item);
    return true;
  }

  if (!requireAdmin(req, res)) return true;

  if (req.method === "PUT" && !itemKey) {
    const body = await parseBody(req);
    if (!Array.isArray(body)) return sendError(res, 400, "集合内容必须是数组。");
    const normalized = body.map((item) => normalizeItem(collection, item));
    await writeJsonFile(fileName, sortItems(collection, normalized));
    sendJson(res, 200, { ok: true, count: normalized.length });
    return true;
  }

  if (req.method === "POST" && !itemKey) {
    const body = await parseBody(req);
    const nextItem = normalizeItem(collection, body);
    const nextItems = sortItems(collection, [nextItem, ...items]);
    await writeJsonFile(fileName, nextItems);
    sendJson(res, 201, nextItem);
    return true;
  }

  const index = items.findIndex((entry) => entry.id === itemKey || entry.slug === itemKey);
  if (index === -1) return sendError(res, 404, "内容不存在。");

  if (req.method === "PUT") {
    const body = await parseBody(req);
    const nextItem = normalizeItem(collection, body, items[index]);
    items[index] = nextItem;
    await writeJsonFile(fileName, sortItems(collection, items));
    sendJson(res, 200, nextItem);
    return true;
  }

  if (req.method === "DELETE") {
    const [deleted] = items.splice(index, 1);
    await writeJsonFile(fileName, sortItems(collection, items));
    sendJson(res, 200, { ok: true, deleted });
    return true;
  }

  return false;
}

async function getAllContent() {
  const [site, blogs, projects, tools, recommendations] = await Promise.all([
    readJsonFile("site.json", {}),
    readJsonFile("blogs.json", []),
    readJsonFile("projects.json", []),
    readJsonFile("tools.json", []),
    readJsonFile("recommendations.json", [])
  ]);

  return {
    site,
    blogs: sortItems("blogs", blogs),
    projects: sortItems("projects", projects),
    tools: sortItems("tools", tools),
    recommendations: sortItems("recommendations", recommendations)
  };
}

async function handleToolRecords(req, res, parts) {
  const toolId = parts[2];
  const recordId = parts[4];
  if (!toolId || parts[3] !== "records") return false;

  const tools = await readJsonFile("tools.json", []);
  const tool = tools.find((entry) => entry.id === toolId || entry.slug === toolId);
  if (!tool) return sendError(res, 404, "工具不存在。");

  const recordsByTool = await readJsonFile("tool-records.json", {});
  const records = recordsByTool[tool.id] || [];
  const publicAllowed = Boolean(tool.publicData);

  if (req.method === "GET") {
    if (!publicAllowed && !isAuthorized(req)) return sendError(res, 401, "该工具数据需要管理员 Token。");
    sendJson(res, 200, records);
    return true;
  }

  if (req.method === "POST") {
    if (!publicAllowed && !requireAdmin(req, res)) return true;
    const body = await parseBody(req);
    const now = new Date().toISOString();
    const record = {
      id: createId("record"),
      toolId: tool.id,
      payload: body.payload ?? body,
      createdAt: now,
      updatedAt: now
    };
    recordsByTool[tool.id] = [record, ...records].slice(0, Number(tool.maxRecords || 200));
    await writeJsonFile("tool-records.json", recordsByTool);
    sendJson(res, 201, record);
    return true;
  }

  if (req.method === "DELETE" && recordId) {
    if (!requireAdmin(req, res)) return true;
    recordsByTool[tool.id] = records.filter((record) => record.id !== recordId);
    await writeJsonFile("tool-records.json", recordsByTool);
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

async function handleApi(req, res, url) {
  const parts = splitPath(url.pathname);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "lite-personal-site", time: new Date().toISOString() });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/content") {
    sendJson(res, 200, await getAllContent());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/export") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, await getAllContent());
    return true;
  }

  if (parts[0] === "api" && parts[1] === "tools" && parts[3] === "records") {
    return handleToolRecords(req, res, parts);
  }

  if (url.pathname === "/api/site") {
    if (req.method === "GET") {
      sendJson(res, 200, await readJsonFile("site.json", {}));
      return true;
    }
    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return true;
      const body = await parseBody(req);
      if (Array.isArray(body) || typeof body !== "object") return sendError(res, 400, "站点配置必须是对象。");
      await writeJsonFile("site.json", body);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/messages") {
    if (!requireAdmin(req, res)) return true;
    sendJson(res, 200, await readJsonFile("messages.json", []));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/messages") {
    const body = await parseBody(req);
    const messages = await readJsonFile("messages.json", []);
    const message = {
      id: createId("message"),
      name: String(body.name || "").slice(0, 80),
      email: String(body.email || "").slice(0, 120),
      message: String(body.message || "").slice(0, 2000),
      createdAt: new Date().toISOString()
    };
    await writeJsonFile("messages.json", [message, ...messages].slice(0, 300));
    sendJson(res, 201, { ok: true });
    return true;
  }

  if (parts[0] === "api" && COLLECTIONS[parts[1]]) {
    return handleCollection(req, res, parts[1], parts[2]);
  }

  return false;
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";

  const safePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!safePath.startsWith(PUBLIC_DIR)) {
    return sendError(res, 403, "禁止访问该路径。");
  }

  try {
    const stat = await fs.stat(safePath);
    const filePath = stat.isDirectory() ? path.join(safePath, "index.html") : safePath;
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath);
    const isHtml = ext === ".html";
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": isHtml ? "no-cache" : "public, max-age=3600"
    });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return sendError(res, 404, "页面不存在。");
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) sendError(res, 404, "接口不存在。");
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendError(res, statusCode, statusCode === 500 ? "服务器内部错误。" : error.message);
    if (statusCode === 500) console.error(error);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Lite personal site is running at http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
