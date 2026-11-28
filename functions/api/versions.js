/**
 * GET /api/versions
 *
 * 列出本项目 Cloudflare Pages 的历史部署（每次成功构建 ≈ 一次提交）。
 * 密钥从 Pages 环境变量读取，不会进入前端。
 *
 * 响应按归一化查询（limit/branch/env）缓存在 caches.default（60s），
 * 未命中时按页拉取上游、凑够过滤后的条数即停；上游错误统一为固定文案，
 * 不回显 Cloudflare 原始错误（可能含账号信息）。
 *
 * 环境变量（Dashboard → Settings → Variables and Secrets）：
 *   CF_ACCOUNT_ID      Account ID
 *   CF_API_TOKEN       API Token（权限：Account → Cloudflare Pages → Read）
 *   CF_PAGES_PROJECT   Pages 项目名（如 gunwei-project）
 *
 * 可选查询：
 *   ?limit=50          最多返回条数（默认 40，最大 100）
 *   ?branch=main       只返回某分支（过滤后不足会继续翻页）
 *   ?env=production    只返回 production 或 preview
 */

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const CF_PER_PAGE = 25;
const CACHE_TTL_SECONDS = 60;
/** 缓存 key 的固定前缀；缓存按 Cloudflare 机房隔离，不是公开 URL */
const CACHE_KEY_BASE = 'https://owproject-versions.internal/v1';
/** 上游失败统一文案：不回显原始错误，也不泄露服务端配置 */
const UPSTREAM_ERROR = '历史版本数据暂时不可用，请稍后重试。';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      ...extraHeaders,
    },
  });
}

function shortHash(hash) {
  if (!hash || typeof hash !== 'string') return '';
  return hash.slice(0, 7);
}

function isSuccess(dep) {
  // 仅成功部署；idle/active/failure 等不进 History 列表
  return dep?.latest_stage?.status === 'success';
}

function mapDeployment(dep) {
  const meta = dep?.deployment_trigger?.metadata || {};
  const commit = meta.commit_hash || meta.commit_sha || '';
  const message = (meta.commit_message || '').split('\n')[0].trim();
  return {
    id: dep.id,
    url: dep.url,
    env: dep.environment || 'unknown',
    branch: meta.branch || '',
    commit: shortHash(commit),
    commitFull: commit,
    message: message || '(no message)',
    createdAt: dep.created_on || dep.modified_on || null,
  };
}

/** 拉取上游单页；失败只保留状态码（错误文案统一在上层收敛） */
async function fetchPage(accountId, project, token, page) {
  const url =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
    `/pages/projects/${encodeURIComponent(project)}/deployments` +
    `?page=${page}&per_page=${CF_PER_PAGE}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    const err = new Error(`Cloudflare API HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(body.result) ? body.result : [];
}

/**
 * 逐页拉取成功部署并按 branch/env 过滤，凑够 limit 条即停。
 * 过滤在翻页循环内执行，目标在第 2 页之后也能查到；页数上限防止单次抓取放大。
 */
async function fetchDeployments(accountId, project, token, limit, branchFilter, envFilter) {
  const out = [];
  const maxPages = Math.ceil(limit / CF_PER_PAGE) + 2;

  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(accountId, project, token, page);
    for (const dep of batch) {
      if (!isSuccess(dep)) continue;
      const v = mapDeployment(dep);
      if (!v.url) continue;
      if (branchFilter && v.branch.toLowerCase() !== branchFilter) continue;
      if (envFilter && v.env !== envFilter) continue;
      out.push(v);
      if (out.length >= limit) return out;
    }
    if (batch.length < CF_PER_PAGE) break;
  }
  return out;
}

/** 归一化缓存 key：同一结果的不同写法（大小写 branch / 前导零 limit）共用一份缓存 */
function cacheKey(project, limit, branchFilter, envFilter) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (branchFilter) params.set('branch', branchFilter);
  if (envFilter) params.set('env', envFilter);
  return `${CACHE_KEY_BASE}/${encodeURIComponent(project)}?${params}`;
}

/** caches.default 仅在 Cloudflare 运行时存在；Node/本地测试直接走抓取路径 */
function defaultCache() {
  try {
    return typeof caches !== 'undefined' && caches?.default ? caches.default : null;
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const accountId = env.CF_ACCOUNT_ID;
  const token = env.CF_API_TOKEN;
  const project = env.CF_PAGES_PROJECT;

  if (!accountId || !token || !project) {
    return json(
      {
        ok: false,
        error:
          '服务端未配置环境变量。请在 Cloudflare Pages → Settings → Variables 中设置 CF_ACCOUNT_ID、CF_API_TOKEN、CF_PAGES_PROJECT。',
        versions: [],
      },
      503,
    );
  }

  const url = new URL(request.url);
  let limit = Number(url.searchParams.get('limit') || DEFAULT_LIMIT);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  limit = Math.min(MAX_LIMIT, Math.floor(limit));

  const branchFilter = (url.searchParams.get('branch') || '').trim().toLowerCase();
  const envFilter = (url.searchParams.get('env') || '').trim().toLowerCase();

  const cache = defaultCache();
  const key = cacheKey(project, limit, branchFilter, envFilter);
  const cached = cache ? await cache.match(key) : null;
  if (cached) return cached;

  try {
    const versions = await fetchDeployments(
      accountId,
      project,
      token,
      limit,
      branchFilter,
      envFilter,
    );
    const res = json({
      ok: true,
      project,
      count: versions.length,
      versions,
    });
    if (cache) {
      // 缓存写失败不能影响本次响应（只在日志里留痕）
      try {
        const put = cache.put(key, res.clone());
        if (typeof context.waitUntil === 'function') context.waitUntil(put.catch(() => {}));
        else await put;
      } catch (err) {
        console.warn('[api/versions] cache put failed:', err?.message || err);
      }
    }
    return res;
  } catch (e) {
    console.error('[api/versions] upstream failed:', e?.status || e?.message || e);
    return json({ ok: false, error: UPSTREAM_ERROR, versions: [] }, 502);
  }
}

/** 非 GET 简单拒绝 */
export async function onRequest(context) {
  if (context.request.method === 'GET') {
    return onRequestGet(context);
  }
  return json({ ok: false, error: 'Method Not Allowed', versions: [] }, 405);
}
