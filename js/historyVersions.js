/**
 * 拉取 Cloudflare Pages 历史部署列表（经 /api/versions 代理）。
 * 本地 serve 没有 Functions，会失败并返回可读错误。
 */

const API_URL = '/api/versions?limit=50';

/**
 * @returns {Promise<{ ok: boolean, versions: Array, error?: string, project?: string }>}
 */
export async function fetchHistoryVersions() {
  try {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });
    const data = await res.json().catch(() => null);
    if (!data) {
      return {
        ok: false,
        versions: [],
        error: `接口返回非 JSON（HTTP ${res.status}）。本地预览没有 Pages Function，请在 Cloudflare 部署后查看。`,
      };
    }
    if (!data.ok) {
      return {
        ok: false,
        versions: data.versions || [],
        error: data.error || `加载失败（HTTP ${res.status}）`,
        project: data.project,
      };
    }
    return {
      ok: true,
      versions: data.versions || [],
      project: data.project,
      count: data.count,
    };
  } catch (e) {
    return {
      ok: false,
      versions: [],
      error:
        e?.message ||
        '网络错误：无法请求 /api/versions（本地 HTTP 服务没有此接口）。',
    };
  }
}

/** 当前页面是否就是某条部署（用于标「当前」） */
export function isCurrentDeployment(versionUrl) {
  if (!versionUrl || typeof window === 'undefined') return false;
  try {
    const a = new URL(versionUrl);
    const b = new URL(window.location.href);
    return a.hostname === b.hostname;
  } catch {
    return false;
  }
}

export function formatDeployTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  } catch {
    return iso;
  }
}
