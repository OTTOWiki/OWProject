/**
 * GET /api/versions
 *
 * 列出本项目 Cloudflare Pages 的历史部署（每次成功构建 ≈ 一次提交）。
 * 密钥从 Pages 环境变量读取，不会进入前端。
 *
 * 环境变量（Dashboard → Settings → Variables and Secrets）：
 *   CF_ACCOUNT_ID      Account ID
 *   CF_API_TOKEN       API Token（权限：Account → Cloudflare Pages → Read）
 *   CF_PAGES_PROJECT   Pages 项目名（如 gunwei-project）
 *
 * 可选查询：
 *   ?limit=50          最多返回条数（默认 40，最大 100）
 *   ?branch=main       只返回某分支
 *   ?env=production    只返回 production 或 preview
 */

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const CF_PER_PAGE = 25;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      ...extraHeaders,
    },
  });
}

function shortHash(hash) {
  if (!hash || typeof hash !== 'string') return '';
  return hash.slice(0, 7);
}

function isSuccess(dep) {
  const status = dep?.latest_stage?.status;
  // success | idle | active | canceled | failure 等
  return status === 'success' || !status;
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

async function fetchAllDeployments(accountId, project, token, maxNeeded) {
  const out = [];
  let page = 1;
  const maxPages = Math.ceil(maxNeeded / CF_PER_PAGE) + 2;

  while (out.length < maxNeeded * 2 && page <= maxPages) {
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
      const errMsg =
        body?.errors?.[0]?.message ||
        `Cloudflare API HTTP ${res.status}`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.details = body?.errors || null;
      throw err;
    }

    const batch = body.result || [];
    out.push(...batch);
    if (batch.length < CF_PER_PAGE) break;
    page += 1;
  }

  return out;
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

  const branchFilter = (url.searchParams.get('branch') || '').trim();
  const envFilter = (url.searchParams.get('env') || '').trim().toLowerCase();

  try {
    const raw = await fetchAllDeployments(accountId, project, token, limit);
    let versions = raw
      .filter(isSuccess)
      .map(mapDeployment)
      .filter((v) => v.url);

    if (branchFilter) {
      versions = versions.filter(
        (v) => v.branch.toLowerCase() === branchFilter.toLowerCase(),
      );
    }
    if (envFilter === 'production' || envFilter === 'preview') {
      versions = versions.filter((v) => v.env === envFilter);
    }

    versions = versions.slice(0, limit);

    return json({
      ok: true,
      project,
      count: versions.length,
      versions,
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: e?.message || String(e),
        versions: [],
      },
      e?.status && e.status >= 400 && e.status < 600 ? e.status : 502,
    );
  }
}

/** 非 GET 简单拒绝 */
export async function onRequest(context) {
  if (context.request.method === 'GET') {
    return onRequestGet(context);
  }
  return json({ ok: false, error: 'Method Not Allowed', versions: [] }, 405);
}
