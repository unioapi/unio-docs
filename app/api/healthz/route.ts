// 容器健康检查用的探活端点（compose healthcheck 请求它），不做任何依赖检查。
// proxy.ts 的 matcher 排除了 /api，所以不会被语言重定向拦截。
export function GET() {
  return new Response('ok\n', {
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
  });
}
