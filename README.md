# Unio Docs

UnioAPI 的公开文档站，基于 Next.js + Fumadocs 构建。

当前阶段仅在本地运行，暂不部署；目标域名为 `docs.unioapi.com`，官网通过
`NEXT_PUBLIC_DOCS_URL` 环境变量引用文档站地址，两者解耦。

## 本地开发

```bash
bun install
bun run dev   # 固定端口 18520（读取 .env.dev）
```

环境文件：`.env.example` 进版本库，`.env.dev` / `.env.test` / `.env.prod`
分别对应本地、测试、生产，由 `dotenv -e` 显式加载。

与官网联调：`unio-website/.env.dev` 中已设置
`NEXT_PUBLIC_DOCS_URL=http://127.0.0.1:18520`。

## 目录结构

```text
content/docs/   全部文档内容（MDX），按 get-started / clients / sdk / api 分组
lib/            source 加载器、布局配置与站点常量
app/            Next.js App Router（文档页、搜索接口、llms.txt 等）
```

## 多语言

- 简体中文为默认语言（URL 无前缀，`/docs/...`），英文在 `/en/docs/...`。
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
bun run build
```
