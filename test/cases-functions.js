/**
 * functions/api/versions.js：Node 下可导入，/api/versions 返回 History 前端可消费的形状。
 * mock 全局 fetch；只断言状态码与 JSON 契约，不锁上游错误文案（缓存/通用文案属并行批次）。
 * 浏览器 /test/ 页不加载 functions（仅 Node 运行本用例）。
 */
import { test, assert, assertEqual } from './assert.js';

const isBrowser = typeof document !== 'undefined' && typeof window !== 'undefined';

if (!isBrowser) {
  test('functions/api/versions：正常列表 / 上游失败 / 缺配置的响应契约', async () => {
    const { onRequestGet, onRequest } = await import('../functions/api/versions.js');
    const env = { CF_ACCOUNT_ID: 'acct', CF_API_TOKEN: 'token-xyz', CF_PAGES_PROJECT: 'proj' };
    const respond = (status, body) => new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
    const realFetch = globalThis.fetch;
    const calls = [];
    let upstream = null;
    globalThis.fetch = async (url, opts) => {
      calls.push({ url: String(url), authorization: opts?.headers?.Authorization });
      return upstream();
    };
    try {
      // 1) 正常：一页部署；仅 success 进列表，字段映射成 History 可消费形状
      upstream = () => respond(200, {
        success: true,
        result: [
          {
            id: 'dep-1',
            url: 'https://p1.pages.dev',
            environment: 'production',
            deployment_trigger: {
              metadata: {
                branch: 'main',
                commit_hash: 'abcdef0123456789',
                commit_message: 'feat: x\nbody',
              },
            },
            latest_stage: { status: 'success' },
            created_on: '2026-01-01T00:00:00Z',
          },
          {
            id: 'dep-2',
            url: 'https://p2.pages.dev',
            environment: 'preview',
            deployment_trigger: { metadata: {} },
            latest_stage: { status: 'failure' },
          },
        ],
      });
      let res = await onRequestGet({
        env,
        request: new Request('https://example.test/api/versions?limit=5'),
      });
      assertEqual(res.status, 200);
      const body = await res.json();
      assertEqual(body.ok, true);
      assertEqual(body.count, 1, '仅成功部署进列表');
      const v = body.versions[0];
      assertEqual(v.id, 'dep-1');
      assertEqual(v.commit, 'abcdef0', '短哈希 7 位');
      assertEqual(v.message, 'feat: x', '多行提交信息只取首行');
      assert(calls[0].authorization.includes('token-xyz'), '服务端 token 只进上游请求头');
      assert(!JSON.stringify(body).includes('token-xyz'), '响应不得回显 token');

      // 2) 上游失败：不抛异常，返回错误状态码与可解析 JSON（不锁文案）
      upstream = () => respond(500, { success: false, errors: [{ message: 'upstream boom' }] });
      res = await onRequestGet({ env, request: new Request('https://example.test/api/versions') });
      assert(res.status >= 400, `上游失败应返回错误状态，实际 ${res.status}`);
      assertEqual((await res.json()).ok, false);

      // 3) 缺配置：503，且不请求上游
      const before = calls.length;
      res = await onRequestGet({ env: {}, request: new Request('https://example.test/api/versions') });
      assertEqual(res.status, 503);
      assertEqual(calls.length, before, '缺配置不得请求上游');

      // 4) 非 GET：405
      res = await onRequest({
        env,
        request: new Request('https://example.test/api/versions', { method: 'POST' }),
      });
      assertEqual(res.status, 405);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
}
