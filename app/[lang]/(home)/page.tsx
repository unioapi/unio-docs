import { redirect } from "next/navigation";

// 文档站不设独立首页，按语言直接进入文档。
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(lang === "en" ? "/en/docs" : "/docs");
}
