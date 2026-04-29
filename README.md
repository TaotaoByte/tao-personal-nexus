# Tao Personal Nexus

一个面向个人展示、文章沉淀、项目整理和工具收藏的轻量个人网站。

它不是复杂的前端工程，也不依赖重型框架。主站使用原生 HTML、CSS 和 JavaScript 编写，后端使用原生 Node.js 提供 API，内容存放在 JSON 文件中，方便后续直接编辑、后台维护或部署到轻量服务器。

## 在线定位

这个网站适合用来做：

- 个人介绍页：展示个人方向、技能栈、社交链接和联系方式。
- 博客聚合页：既可以放站内文章，也可以跳转到 CSDN、知乎、B 站、GitHub 等平台内容。
- 项目展示页：整理 GitHub 项目、在线演示、研究或课程作品。
- 工具站合集：预留自制在线工具入口和工具数据接口。
- 工具推荐：记录常用开发、学习、设计、数据处理工具。

## 功能特点

- 本地 CSS 和原生 JavaScript，无 CDN 依赖，直接打开也能看到完整页面。
- 响应式布局，适配桌面端和移动端。
- 支持深浅色切换、滚动进度条、导航高亮、卡片悬浮、滚动渐入。
- 内容从 `data/*.json` 读取，修改文案不需要改前端结构。
- `/admin` 提供简易 JSON 内容后台。
- 联系表单消息保存到 `data/messages.json`。
- 自制工具可通过 `/api/tools/:toolId/records` 存储数据。
- 示例工具：轻量链接收藏夹。

## 项目结构

```text
lite-personal-site/
  server.js                    # 原生 Node.js 后端和 API
  package.json                 # 启动脚本
  publish-github.ps1           # GitHub 发布脚本
  public/
    index.html                 # 主站页面
    admin.html                 # 内容后台
    css/styles.css             # 主站样式
    js/site.js                 # 主站交互和数据渲染
    js/admin.js                # 后台交互
    js/bookmark-vault.js       # 示例工具逻辑
    tools/bookmark-vault.html  # 示例工具页面
  data/
    site.json                  # 站点基础信息
    blogs.json                 # 博客内容
    projects.json              # 项目内容
    tools.json                 # 工具站合集
    recommendations.json       # 工具推荐
    tool-records.json          # 工具数据记录
    messages.json              # 联系表单消息
```

## 本地预览

### 方式一：直接打开静态页面

直接打开：

```text
public/index.html
```

这种方式会使用页面内置的备用展示数据，适合快速预览页面是否正常渲染。

### 方式二：启动 Node 服务

```powershell
cd "G:\A_Person\个人网站\lite-personal-site"
$env:ADMIN_TOKEN="local-dev-token"
node server.js
```

然后访问：

```text
http://localhost:3000
```

常用入口：

- 主站：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`
- 示例工具：`http://localhost:3000/tools/bookmark-vault.html`
- 健康检查：`http://localhost:3000/api/health`

## 内容维护

内容主要存放在 `data/` 目录：

- 修改个人资料：编辑 `data/site.json`
- 修改博客：编辑 `data/blogs.json`
- 修改项目：编辑 `data/projects.json`
- 修改工具：编辑 `data/tools.json`
- 修改工具推荐：编辑 `data/recommendations.json`

也可以启动 Node 服务后访问 `/admin`，输入运行服务时设置的 `ADMIN_TOKEN`，直接在线编辑 JSON。

## 博客写法

站内文章示例：

```json
{
  "id": "my-post",
  "slug": "my-post",
  "title": "文章标题",
  "source": "站内",
  "date": "2026-04-29",
  "tags": ["Web", "记录"],
  "excerpt": "文章摘要。",
  "content": "## 小标题\n\n正文内容。"
}
```

外部文章示例：

```json
{
  "id": "github-notes",
  "title": "GitHub 项目记录",
  "source": "GitHub",
  "date": "2026-04-29",
  "tags": ["GitHub"],
  "excerpt": "跳转到外部平台查看。",
  "url": "https://github.com/TaotaoByte"
}
```

## 自制工具接口

新增工具时，先在 `data/tools.json` 添加工具定义：

```json
{
  "id": "my-tool",
  "slug": "my-tool",
  "name": "我的工具",
  "category": "站内工具",
  "description": "工具说明。",
  "url": "/tools/my-tool.html",
  "status": "开发中",
  "publicData": false,
  "maxRecords": 100,
  "order": 99
}
```

工具保存数据：

```js
await fetch("/api/tools/my-tool/records", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    payload: {
      value: "hello"
    }
  })
});
```

工具读取数据：

```js
const records = await fetch("/api/tools/my-tool/records").then((res) => res.json());
```

## 常用 API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/content` | 获取主站公开内容 |
| `GET` | `/api/blogs` | 获取博客列表 |
| `POST` | `/api/blogs` | 新增博客，需要 `x-admin-token` |
| `PUT` | `/api/blogs/:id` | 更新博客，需要 `x-admin-token` |
| `DELETE` | `/api/blogs/:id` | 删除博客，需要 `x-admin-token` |
| `PUT` | `/api/site` | 更新站点配置，需要 `x-admin-token` |
| `POST` | `/api/messages` | 提交联系消息 |
| `GET` | `/api/messages` | 查看联系消息，需要 `x-admin-token` |
| `GET` | `/api/tools/:toolId/records` | 读取工具数据 |
| `POST` | `/api/tools/:toolId/records` | 写入工具数据 |

## 发布到 GitHub

已经提供发布脚本：

```powershell
cd "G:\A_Person\个人网站\lite-personal-site"
powershell -ExecutionPolicy Bypass -File .\publish-github.ps1
```

如果网络波动导致 push 失败，仓库可能已经创建成功但没有代码。此时重新运行脚本即可，或者手动执行：

```powershell
git push -u origin main
```

目标仓库：

```text
https://github.com/TaotaoByte/tao-personal-nexus
```

## 部署建议

这个项目使用 JSON 文件作为轻量存储。要长期在线编辑内容，建议部署到有持久磁盘的服务器或云主机。

推荐方案：

- Oracle Cloud Always Free VM
- 个人 VPS
- 局域网 NAS 或轻量服务器

可用于展示但不适合长期保存 JSON 写入的方案：

- Render 免费 Web Service
- 其他会重置文件系统的免费 Serverless 平台

## 安全提醒

- 部署前一定要设置新的 `ADMIN_TOKEN`。
- 不要把 `.env` 或任何真实 Token 提交到公开仓库。
- 定期备份 `data/` 目录。
- 对外部署时建议启用 HTTPS。

## License

MIT
