import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { uiTranslations } from "fumadocs-ui/i18n";
import { i18n } from "./i18n";
import { consoleUrl, siteUrl } from "./shared";

// Fumadocs 无内置中文语言包，界面文案需按键逐条提供（键名含上下文后缀）。
export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    cn: {
      displayName: "简体中文",
      "Search(search trigger)": "搜索",
      "Search(search dialog)": "搜索文档",
      "No results found(search dialog)": "没有找到相关内容",
      "Open Search(search trigger)(aria-label)": "打开搜索",
      "Close Search(search dialog)(aria-label)": "关闭搜索",
      "Choose a language(language switcher)": "选择语言",
      "Choose a language(language switcher)(aria-label)": "选择语言",
      "Toggle Theme(theme switcher)(aria-label)": "切换主题",
      "Light(theme switcher)(aria-label)": "浅色",
      "Dark(theme switcher)(aria-label)": "深色",
      "System(theme switcher)(aria-label)": "跟随系统",
      "On this page(table of contents)": "本页目录",
      "No Headings(table of contents)": "暂无标题",
      "Table of Contents(inline table of contents)": "目录",
      "Next Page(pagination)": "下一篇",
      "Previous Page(pagination)": "上一篇",
      "Last updated on(page footer)": "最后更新于",
      "Copy Markdown(page actions)": "复制 Markdown",
      "View as Markdown(page actions)": "以 Markdown 查看",
      "Open(page actions)": "打开",
      "Copy Text(code block)(aria-label)": "复制代码",
      "Copied Text(code block)(aria-label)": "已复制",
      "Copy Anchor Link(heading anchor)(aria-label)": "复制锚点链接",
      "Copy Link(accordion)(aria-label)": "复制链接",
      "Page Not Found(404 not found page)": "页面不存在",
      "Back to Home(404 not found page)": "返回首页",
      "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 not found page)":
        "你访问的页面可能已被移除、更名或暂时不可用。",
      "Open Sidebar(aria-label)": "打开侧栏",
      "Close Sidebar(aria-label)": "收起侧栏",
      "Open Sidebar(sidebar)(aria-label)": "打开侧栏",
      "Close Sidebar(sidebar)(aria-label)": "收起侧栏",
      "Collapse Sidebar(sidebar)(aria-label)": "收起侧栏",
      "Hide Sidebar(sidebar)": "隐藏侧栏",
      "Show Sidebar(sidebar)": "显示侧栏",
      "Toggle Menu(home layout header)(aria-label)": "切换菜单",
      "Close Banner(banner)(aria-label)": "关闭公告",
    },
    en: { displayName: "English" },
  });

function Brand() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        lineHeight: 1,
      }}
    >
      <svg
        viewBox="0 0 678 496"
        fill="none"
        aria-hidden="true"
        style={{ width: 26, height: 19, flexShrink: 0, display: "block" }}
      >
        <g
          stroke="currentColor"
          strokeWidth="86"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M143 128v182c0 58 39 103 89 103 55 0 100-43 100-100v-60" />
          <path d="M332 253v60c0 57 39 100 89 100s88-43 88-100v-60" />
        </g>
        <circle cx="509" cy="129" r="44" fill="currentColor" />
      </svg>
      <span style={{ fontWeight: 650, whiteSpace: "nowrap" }}>
        UnioAPI <span style={{ fontWeight: 450, opacity: 0.6 }}>Docs</span>
      </span>
    </span>
  );
}

export function baseOptions(locale: string): BaseLayoutProps {
  const isEnglish = locale === "en";

  return {
    nav: {
      title: <Brand />,
    },
    links: [
      { text: isEnglish ? "Website" : "官网", url: siteUrl },
      { text: isEnglish ? "Console" : "工作台", url: consoleUrl },
    ],
  };
}
