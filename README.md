# Unio Docs

UnioAPI 的公开文档站，基于 Next.js + Fumadocs 构建。

目标域名为 `docs.unioapi.com`，官网通过 `NEXT_PUBLIC_DOCS_URL` 环境变量引用文档站地址，两者解耦。

## 本地开发

```bash
bun install
bun run dev   # 固定端口 18520
```

环境文件：`.env.example` 进版本库，`.env` 只服务本机 `bun dev`（不进 git），由 Next.js 原生加载。
没有 `.env.test` / `.env.prod`：部署环境的地址在 [unio-deploy](../unio-deploy) 仓库里。

与官网联调：`unio-website/.env` 中已设置 `NEXT_PUBLIC_DOCS_URL=http://127.0.0.1:18520`。

## 部署

打成容器镜像运行。烤进产物的公开地址来自 `unio-deploy/environments/<env>/<role>/env/docs-web.env`，
由 `unio-deploy/scripts/build.sh <env> <role>` 构建时传给本仓库的 `deploy/build-image.sh --env-file`；
版本在 `deploy/VERSION`，编排与发布在 unio-deploy。

## 目录结构

```text
content/docs/   全部文档内容（MDX），按 get-started / clients / sdk / api 分组
lib/            source 加载器、布局配置与站点常量
app/            Next.js App Router（文档页、搜索接口、llms.txt 等）
```

## 多语言

- 简体中文为默认语言（`/cn/docs/...`），英文在 `/en/docs/...`。旧无前缀链接按语言偏好重定向；正文内部链接直接带当前语言前缀。
- 内容文件约定：默认语言为 `page.mdx`，英文为 `page.en.mdx`；分组标题在 `meta.en.json`。
- 英文缺失的页面自动回退中文内容。
- 搜索按语言分词：中文使用 mandarin 分词器（`@orama/tokenizers`）。

## 内容约定

- 正文默认简体中文；产品专名、代码标识符与文件路径保留英文。
- API 行为、端点、错误语义必须与 `unio-blueprint` 中 Gateway 的公开契约一致，
  不写未实现能力。
- 客户端接入页的配置必须与对应工具的官方文档核对后再更新。

## 校验

```bash
bun run types:check
bun run test:unit
bun run build
```

## SEO

每篇文档输出独立标题、描述、canonical、双语 hreflang、Open Graph/Twitter 分享信息与 TechArticle/BreadcrumbList 结构化数据。
`/sitemap.xml` 从实际文档源生成，只包含正文页，不填造 lastModified。缺译的回退正文 canonical 指向来源语言，不冒充英文翻译。
`/robots.txt` 不参与语言重定向。仅 `docs.unioapi.com` 允许收录，测试和本地域名阻止抓取且正文响应附带 `X-Robots-Tag: noindex, nofollow`。
Markdown 和 llms 导出仍可供工具读取，但用 `noindex` 避免与正文重复收录；HTML/Markdown 内容协商使用 `Vary: Accept`。
