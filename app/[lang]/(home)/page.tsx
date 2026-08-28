import { redirect } from "next/navigation";

// 文档站不设独立首页，按语言直接进入文档。
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // 两种语言都带前缀，直接按 lang 拼即可。
  redirect(`/${lang}/docs`);
}
