#!/usr/bin/env bash
# =============================================================================
# OWProject — 关卡背景素材：公有领域/CC0 源图 + 许可证证据 下载记录（可复现）
#
# 用途：为 docs/level-background-redesign.md §4/§5 的 11 面绘卷 plate / 外围
#       backdrop / 8 个材质，取得 PD/CC0 日本绘画源图与博物馆 API 许可证证据。
#
# 输出（全部位于 .scratch/bg-assets/，不入库）：
#   sources/<key>-source.jpg    10 张源图原图（≈30MB；再跑不会重复下载）
#   licenses/<key>.json         10 份「博物馆 API 原始对象 JSON / Commons imageinfo JSON」
#                               —— 这就是许可证证据本体，勿改
#   evidence/search/*.json      发现阶段的 API 原始返回（Met v1.1 / CMA / Commons）
#   evidence/source-hashes.txt  下载后 sha256 + 字节 + 像素尺寸清单
#
# 授权规则（硬性）：只用 Public Domain / CC0，且以博物馆 API 对象记录或
#   Wikimedia Commons extmetadata 为证据；不接受聚合站 / Stock / 「免费商用」说辞。
#   6 张既有源（2026-11-15 由 asset-candidates 管线核过）在本轮复用；
#   4 张新增源（2026-11-22 搜索）覆盖：雨夜桥（b5）、花火游园（a6）、
#   神社/寺院聚落与鸟居（s1/a4）、地狱草纸火焰（patrol/b4）。
#
# 运行：bash tools/bg-assets/fetch-sources.sh          （已存在的文件跳过）
#       FORCE=1 bash tools/bg-assets/fetch-sources.sh  （强制重新下载全部）
# 依赖：curl、python3（仅做许可证断言）；magick 可选（记录像素尺寸）
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
S=.scratch/bg-assets
mkdir -p "$S/sources" "$S/licenses" "$S/evidence/search"

UA='OWProject-bg-assets/1.0 (public-domain art research for a free fan game; repo maintainer contact)'
CURL=(curl -sS -L --fail --retry 3 --retry-delay 2 -m 180 -A "$UA")
FETCH=0; [[ "${FORCE:-0}" == "1" ]] && FETCH=1

get() { # get <url> <out>  —— 已存在则跳过（FORCE=1 时强制重下）
  local url=$1 out=$2
  if [[ $FETCH != 1 && -s $out ]]; then echo "skip  $out"; return; fi
  "${CURL[@]}" "$url" -o "$out.tmp" && mv "$out.tmp" "$out"
  echo "ok    $out"
}
api() { # api <url> <out> —— API JSON 总是重新取（很小，保证证据最新）
  "${CURL[@]}" "$1" -o "$2.tmp" && mv "$2.tmp" "$2"
  echo "api   $2"
}

# ---------------------------------------------------------------------------
# 1. 发现阶段 API 调用（原始返回留档；最终采用哪张见 sources.json/README）
# ---------------------------------------------------------------------------
# Met v1.1 搜索（v1 已于 2026-10 下线）：hasImages=true，候选再逐对象拉取过滤 isPublicDomain
api "https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=Ohashi%20Atake%20rain&hasImages=true" \
    "$S/evidence/search/met-ohashi-atake-rain.json"
api "https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=fireworks%20Ryogoku&hasImages=true" \
    "$S/evidence/search/met-fireworks-ryogoku.json"
api "https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=temple%20gate%20japan&hasImages=true" \
    "$S/evidence/search/met-temple-gate-japan.json"
# Cleveland 开放获取搜索（cc0=1 只返回 CC0 且带图的记录）
api "https://openaccess-api.clevelandart.org/api/artworks/?q=temple&cc0=1&has_img=true&limit=20" \
    "$S/evidence/search/cma-temple.json"
api "https://openaccess-api.clevelandart.org/api/artworks/?q=pagoda&cc0=1&has_img=true&limit=20" \
    "$S/evidence/search/cma-pagoda.json"
api "https://openaccess-api.clevelandart.org/api/artworks/?q=gate&cc0=1&has_img=true&limit=20" \
    "$S/evidence/search/cma-gate.json"
# Wikimedia Commons：namespace 6 = File；iiurlwidth=2000 取 2000px 缩略图 URL
api "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=Hell%20Scroll%20%E5%9C%B0%E7%8D%84%E8%8D%89%E7%B4%99&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=2000" \
    "$S/evidence/search/commons-hell-scroll.json"
api "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=Japanese%20temple%20gate%20painting&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=2000" \
    "$S/evidence/search/commons-temple-gate-painting.json"

# ---------------------------------------------------------------------------
# 2. 许可证证据 = 博物馆 API 原始对象 JSON（Met objects/<id> / CMA artworks/<id>）
#    以及 Commons 文件 imageinfo JSON（extmetadata.LicenseShortName）
# ---------------------------------------------------------------------------
# 既有 6 源（2026-11-15 核验，本轮复用）
api "https://openaccess-api.clevelandart.org/api/artworks/135182"                    "$S/licenses/korin-chrysanthemums.json"
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/48923"          "$S/licenses/sotatsu-moon-grasses.json"
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/53228"          "$S/licenses/bokusho-ink-landscape.json"
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/53408"          "$S/licenses/jakuchu-plum-moon.json"
api "https://openaccess-api.clevelandart.org/api/artworks/163546"                    "$S/licenses/raijin-thunder.json"
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/44918"          "$S/licenses/korin-rough-waves.json"
# 新增 4 源（2026-11-22 搜索）
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/55433"          "$S/licenses/hiroshige-ohashi-rain.json"
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/37093"          "$S/licenses/hiroshige-fireworks-ryogoku.json"
api "https://collectionapi.metmuseum.org/public/collection/v1/objects/45095"          "$S/licenses/gion-shrine-torii-screen.json"
api "https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File%3AHell%20Scroll%20%E7%81%AB%E8%B1%A1%E5%9C%B0%E7%8D%84.jpg&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=2000" \
    "$S/licenses/hell-scroll-fire.json"

# ---------------------------------------------------------------------------
# 3. 源图下载（原图；基层处理见 build-assets.sh）
#    画像 URL 全部取自上面各馆 API 的 primaryImage / images.print / Commons url 字段。
#    Met 用 original 大图（约 2–7MB/张），CMA 用 CC0 print.jpg，Commons 用原图（1.3MB）。
# ---------------------------------------------------------------------------
get "https://openaccess-cdn.clevelandart.org/1958.206.2/1958.206.2_print.jpg"          "$S/sources/korin-chrysanthemums-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DT1603.jpg"                     "$S/sources/sotatsu-moon-grasses-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DP-12232-043.jpg"               "$S/sources/bokusho-ink-landscape-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DP-12232-273.jpg"               "$S/sources/jakuchu-plum-moon-source.jpg"
get "https://openaccess-cdn.clevelandart.org/2004.86/2004.86_print.jpg"                 "$S/sources/raijin-thunder-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DT1615.jpg"                     "$S/sources/korin-rough-waves-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DP130156.jpg"                   "$S/sources/hiroshige-ohashi-rain-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DP121524.jpg"                   "$S/sources/hiroshige-fireworks-ryogoku-source.jpg"
get "https://images.metmuseum.org/CRDImages/as/original/DP-20413-001.jpg"               "$S/sources/gion-shrine-torii-screen-source.jpg"
get "https://upload.wikimedia.org/wikipedia/commons/7/77/Hell_Scroll_%E7%81%AB%E8%B1%A1%E5%9C%B0%E7%8D%84.jpg" \
    "$S/sources/hell-scroll-fire-source.jpg"

# ---------------------------------------------------------------------------
# 4. 许可证断言 + 源图清单（sha256/字节/像素）
# ---------------------------------------------------------------------------
python3 - "$S" <<'PY'
import glob, json, hashlib, os, subprocess, sys
S = sys.argv[1]
EXPECT = {
 'korin-chrysanthemums':          ('CMA', 'CC0',  '1958.206.2'),
 'sotatsu-moon-grasses':          ('MET', 'PD',   '48923'),
 'bokusho-ink-landscape':         ('MET', 'PD',   '53228'),
 'jakuchu-plum-moon':             ('MET', 'PD',   '53408'),
 'raijin-thunder':                ('CMA', 'CC0',  '2004.86'),
 'korin-rough-waves':             ('MET', 'PD',   '44918'),
 'hiroshige-ohashi-rain':         ('MET', 'PD',   '55433'),
 'hiroshige-fireworks-ryogoku':   ('MET', 'PD',   '37093'),
 'gion-shrine-torii-screen':      ('MET', 'PD',   '45095'),
 'hell-scroll-fire':              ('COMMONS', 'CC0', 'File:Hell Scroll 火象地獄.jpg'),
}
bad = 0
rows = []
for key, (kind, want, ident) in EXPECT.items():
    p = f'{S}/licenses/{key}.json'
    try:
        d = json.load(open(p))
    except Exception as e:
        print(f'FAIL {key}: no license json: {e}'); bad += 1; continue
    if kind == 'MET':
        lic = 'PD' if d.get('isPublicDomain') is True and d.get('primaryImage') else 'FAIL'
        got_id = str(d.get('objectID'))
        img = d.get('primaryImage')
    elif kind == 'CMA':
        x = d.get('data') or {}
        lic = 'CC0' if x.get('share_license_status') == 'CC0' and x.get('images') else 'FAIL'
        got_id = str(x.get('accession_number') or x.get('id'))
        img = ((x.get('images') or {}).get('print') or {}).get('url')
    else:  # COMMONS
        pages = (d.get('query') or {}).get('pages') or {}
        page = next(iter(pages.values()), {})
        ii = (page.get('imageinfo') or [{}])[0]
        em = ii.get('extmetadata') or {}
        licname = (em.get('LicenseShortName') or {}).get('value', '')
        lic = 'CC0' if 'CC0' in licname or 'Public domain' in licname or 'PD' in licname else 'FAIL'
        got_id = page.get('title')
        img = ii.get('url')
    if lic == 'FAIL' or want == 'FAIL':
        bad += 1
    rows.append((key, kind, lic, want, got_id, ident, img or ''))
    print(f'{"OK " if lic != "FAIL" else "FAIL"} {key:30s} {kind:8s} {lic:4s} id={got_id}')

# 源图清单
lines = ['# OWProject bg-assets source downloads  (sha256  bytes  dimensions  file)', '']
total = 0
for p in sorted(glob.glob(f'{S}/sources/*-source.jpg')):
    b = os.path.getsize(p); total += b
    h = hashlib.sha256(open(p,'rb').read()).hexdigest()
    dim = ''
    try:
        dim = subprocess.check_output(['magick','identify','-format','%wx%h',p], stderr=subprocess.DEVNULL).decode()
    except Exception:
        pass
    lines.append(f'{h}  {b:>9d}  {dim:>11s}  {p}')
lines += ['', f'total sources: {total} bytes = {total/1048576:.1f} MiB', f'budget: 180 MiB (download cap)']
open(f'{S}/evidence/source-hashes.txt','w').write('\n'.join(lines)+'\n')
print('\n'.join(lines[-3:]))
if bad:
    sys.exit(f'LICENSE CHECK FAILED for {bad} source(s)')
print('all 10 sources: PD/CC0 license evidence present')
PY

echo
echo "done. sources -> $S/sources/ ; licenses -> $S/licenses/ ; then run:"
echo "  bash tools/bg-assets/build-assets.sh"
