#!/usr/bin/env bash
# =============================================================================
# OWProject — 关卡背景素材加工：11 面 scene plate / 11 面 backdrop / 8 材质
#
# 输入：.scratch/bg-assets/sources/ 的 10 张 PD/CC0 博物馆源图
#        （由 tools/bg-assets/fetch-sources.sh 下载并核验许可证）
# 输出：assets/bg/scene/<stage>.avif   900x1200  中心 60%x60% HSV V 均值 <=14%
#       assets/bg/backdrop/<stage>.avif 1600x1000 整体 V 均值 <=18%，左右各 22% 再压暗
#       assets/bg/mat/<key>.avif        512 不透明 tile / 1024x512 RGBA 透明带
# 中间件 & 复核：.scratch/bg-assets/work/auto/ 与 .scratch/bg-assets/processed/
#
# 处理基调：绘画裁切取景 -> 灰度色阶 -> 多段双色调 CLUT 映射到该面主色
#           -> （可选）第二源叠加：火焰/月光/花火/雨丝/鸟居剪影/浪带
#           -> 和纸纤维 + 中心低频化 + 中心压暗 + 暗角 + 颗粒 -> AVIF
#
# 运行：bash tools/bg-assets/build-assets.sh
#       （全量、可重跑；约 3-6 分钟；不依赖网络）
# 依赖：ImageMagick 7（magick）、avifenc、python3（仅做门禁统计）
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
S=.scratch/bg-assets
SRC=$S/sources
TMP=$S/work/auto
TEX=$S/work/tex
PROC=$S/processed
OUT=assets/bg
for d in "$TMP" "$TEX" "$S/work/masters" "$S/work/plates" "$S/work/backdrops" "$PROC" \
         "$OUT/scene" "$OUT/backdrop" "$OUT/mat"; do mkdir -p "$d"; done
rm -f "$TMP"/*.png "$TMP"/*.jpg 2>/dev/null || true
if [[ ${REUSE:-0} != 1 ]]; then rm -f "$S/work/masters/"*.png; fi
rm -f "$S/work/plates/"*.png "$S/work/backdrops/"*.png 2>/dev/null || true
: # 共享纹理/叠加层缓存在 $TEX，FORCE_TEX=1 可强制重建

KORIN=$SRC/korin-chrysanthemums-source.jpg
SOTATSU=$SRC/sotatsu-moon-grasses-source.jpg
BOKUSHO=$SRC/bokusho-ink-landscape-source.jpg
JAKUCHU=$SRC/jakuchu-plum-moon-source.jpg
RAIJIN=$SRC/raijin-thunder-source.jpg
WAVES=$SRC/korin-rough-waves-source.jpg
OHASHI=$SRC/hiroshige-ohashi-rain-source.jpg
FIREWORKS=$SRC/hiroshige-fireworks-ryogoku-source.jpg
GION=$SRC/gion-shrine-torii-screen-source.jpg
HELL=$SRC/hell-scroll-fire-source.jpg

STAGES=(s1 s2 s3 patrol a4 a5 a6 b4 b5 b6 ex)
if [[ -n ${ONLY:-} ]]; then
  FILTERED=()
  for st in "${STAGES[@]}"; do
    for want in $ONLY; do [[ $st == "$want" ]] && FILTERED+=("$st") && break; done
  done
  STAGES=("${FILTERED[@]}")
  echo "ONLY filter -> ${STAGES[*]}"
fi
if [[ ${MATS_ONLY:-0} == 1 ]]; then STAGES=(); fi
MW=1800; MH=1125          # master 空间（1.6:1）
PW=844                    # master 中 plate 裁切宽（0.75 aspect: 844x1125 -> 900x1200）

# ---------------------------------------------------------------------------
# 0. 通用函数
# ---------------------------------------------------------------------------
# 多段 CLUT（1x256 双色调色带）：make_clut out "color:pct" ...
make_clut() {
  local out=$1; shift
  local segs=() prev="" prevpct=0 spec c p d
  for spec in "$@"; do
    c=${spec%:*}; p=${spec##*:}
    if [[ -n $prev ]]; then
      d=$(( p - prevpct )); [[ $d -lt 1 ]] && d=1
      segs+=( \( -size "1x$d" gradient:"$prev-$c" \) )
    fi
    prev=$c; prevpct=$p
  done
  magick "${segs[@]}" -append -resize '1x256!' "$out"
}

# 灰度 master：crop -> 1800x1125 -> 去金箔噪点/折缝(可关) -> 色阶 -> CLUT -> 纤维
# 用法：grade_master <name> <src> <crop WxH+X+Y> <clut> [smooth=1]
grade_master() {
  local name=$1 src=$2 crop=$3 clut=$4 smooth=${5:-1}
  local sm=()
  [[ $smooth == 1 ]] && sm=(-blur 0x0.7 -statistic median 5x1)
  magick "$src" -crop "$crop" +repage -resize "${MW}x${MH}!" \
    -colorspace Gray "${sm[@]}" -auto-level -level 4%,96% "$TMP/$name-gray.png"
  magick "$TMP/$name-gray.png" "$clut" -clut -colorspace sRGB "$TMP/$name-tone.png"
  magick "$TMP/$name-tone.png" "$FIB" -compose blend -define compose:args=5 -composite \
    "$S/work/masters/$name.png"
}

# 双色（左右分色）master：左 CLUT / 右 CLUT，split_pct 处 20% 宽度羽化
# 用法：grade_master_split <name> <src> <crop> <clutL> <clutR> <split_pct>
grade_master_split() {
  local name=$1 src=$2 crop=$3 clutL=$4 clutR=$5 split=${6:-50}
  magick "$src" -crop "$crop" +repage -resize "${MW}x${MH}!" \
    -colorspace Gray -blur 0x0.7 -statistic median 5x1 -auto-level -level 4%,96% "$TMP/$name-gray.png"
  magick "$TMP/$name-gray.png" "$clutL" -clut -colorspace sRGB "$TMP/$name-l.png"
  magick "$TMP/$name-gray.png" "$clutR" -clut -colorspace sRGB "$TMP/$name-r.png"
  local lo=$(( split - 10 )); local hi=$(( split + 10 ))
  magick -size "${MW}x1" gradient:'#ffffff-#000000' -resize "${MW}x${MH}!" \
    -level "${lo}%,${hi}%" "$TMP/$name-mask.png"
  magick "$TMP/$name-l.png" "$TMP/$name-r.png" "$TMP/$name-mask.png" -compose over -composite \
    "$TMP/$name-tone.png"
  magick "$TMP/$name-tone.png" "$FIB" -compose blend -define compose:args=5 -composite \
    "$S/work/masters/$name.png"
}

screen_add() { # screen_add <base.png> <layer.png> <opacity%> <out.png>
  magick "$1" \( "$1" "$2" -compose screen -composite \) \
    -compose blend -define compose:args="$3" -composite "$4"
}
multiply_add() { # multiply_add <base.png> <layer.png> <out.png>
  magick "$1" "$2" -compose multiply -composite "$3"
}

# 剪影图层：source crop -> 反相（深形->白）-> alpha 形状 -> 着色 -> transparent PNG
make_silhouette() { # make_silhouette <src> <crop> <out> <color> <w> <level-lo> <level-hi>
  magick "$1" -crop "$2" +repage -resize "${5}x" -colorspace Gray \
    -auto-level -negate -level "$6","$7" -blur 0x1.0 "$TMP/sil-alpha.png"
  magick -size "$(magick identify -format '%wx%h' "$TMP/sil-alpha.png")" xc:"$4" \
    "$TMP/sil-alpha.png" -alpha off -compose copy_opacity -composite "$3"
}

# 中心低频（模糊）掩膜：中心 60% 白、向外羽化
make_centre_blur_mask() {
  magick -size 900x1200 xc:black -fill white \
    -draw 'rectangle 150,190 750,1010' -blur 0x55 "$TEX/mask-centre-blur.png"
}
make_plate_dim_mask() { # make_plate_dim_mask <plateau-pct>  （白=不压暗，灰=压暗）
  magick -size 900x1200 xc:white -fill "gray($1%)" \
    -draw 'rectangle 120,160 780,1040' -blur 0x80 "$TEX/mask-plate-dim.png"
}
make_plate_vignette() {
  [[ -f $TEX/vig-plate.png ]] || magick -size 900x1200 xc:white -fill '#c8c8c8' \
    -draw 'rectangle 60,70 840,1130' -blur 0x150 "$TEX/vig-plate.png"
}
make_backdrop_masks() { # 1600x1000（一次生成后缓存）
  [[ -f $TEX/side-dim.png ]] && return 0
  # 整体暗角（中心 100%，四角 ~55%）
  magick -size 1600x1000 xc:white -fill '#8e8e8e' \
    -draw 'rectangle 180,110 1420,890' -blur 0x160 "$TEX/vig-backdrop.png"
  # 左右各 22%（352px）再压暗：边缘 45% -> 22% 处 100%
  magick -size 352x1 gradient:'#737373-#ffffff' -resize '352x1000!' "$TEX/bd-left.png"
  magick "$TEX/bd-left.png" -flop "$TEX/bd-right.png"
  magick -size 896x1000 xc:white "$TEX/bd-mid.png"
  magick "$TEX/bd-left.png" "$TEX/bd-mid.png" "$TEX/bd-right.png" +append "$TEX/side-dim.png"
}

centre_v() { magick "$1" -crop 60%x60%+20%+20% +repage -colorspace HSB \
  -channel B -separate +channel -format '%[fx:mean*100]' info:; }
std_v() { magick "$1" -colorspace HSB -channel B -separate +channel \
  -format '%[fx:standard_deviation*100]' info:; }
cstd_v() { magick "$1" -crop 60%x60%+20%+20% +repage -colorspace HSB \
  -channel B -separate +channel -format '%[fx:standard_deviation*100]' info:; }
all_v()    { magick "$1" -colorspace HSB -channel B -separate +channel \
  -format '%[fx:mean*100]' info:; }
side_v()   { local f=$1 s=$2; local g=$(( (s-1)*78 )); magick "$f" -crop "22%x100%+${g}%+0" +repage \
  -colorspace HSB -channel B -separate +channel -format '%[fx:mean*100]' info:; }

# plate 完成：crop -> 900x1200 -> 中心低频 -> 中心压暗 -> 暗角 -> 颗粒 -> 门禁校正
plate_finish() { # plate_finish <name> [dx=478]
  # 目标（billboard 可读绘卷）：整体 V 12-19.5%，中心 60% V 8-13.5%，保留动态范围与母题
  local name=$1
  local dx=${2:-478}
  local o=$S/work/plates/$name.png
  local C A k pct c a i
  make_centre_blur_mask
  make_plate_vignette
  magick "$S/work/masters/$name.png" -crop "${PW}x${MH}+${dx}+0" +repage \
    -resize '900x1200!' -depth 8 "$TMP/$name-plate-base.png"
  A=$(all_v "$TMP/$name-plate-base.png")
  k=$(python3 -c "print(round(max(0.55,min(1.70,30.0/max($A,0.5))),4))")
  magick "$TMP/$name-plate-base.png" -evaluate multiply "$k" -depth 8 "$TMP/$name-plate-n.png"
  C=$(centre_v "$TMP/$name-plate-n.png")
  pct=$(python3 -c "print(round(max(30.0,min(92.0,11.5/max($C,0.5)*100)),1))")
  make_plate_dim_mask "$pct"
  # 一次链式合成：中心低频 -> 中心压暗 -> 暗角 -> 颗粒
  magick "$TMP/$name-plate-n.png" \
    \( +clone -blur 0x6 \) "$TEX/mask-centre-blur.png" -compose over -composite \
    "$TEX/mask-plate-dim.png" -compose multiply -composite \
    "$TEX/vig-plate.png" -compose multiply -composite \
    -brightness-contrast 0x6 \
    "$GRAIN900" -compose blend -define compose:args=3 -composite \
    -depth 8 "$o"
  # 门禁校正：整体 12-19.5%，中心 8-13.5%
  for i in 1 2 3; do
    c=$(centre_v "$o"); a=$(all_v "$o"); local sd
    sd=$(std_v "$o")
    # 动态范围不足时提对比，再按亮度目标回正
    if awk -v x="$sd" 'BEGIN{exit !(x<8.0)}'; then
      magick "$o" -brightness-contrast 0x12 -depth 8 "$o"
      local na; na=$(all_v "$o")
      k=$(python3 -c "print(round(15.0/max($na,0.5),4))")
      magick "$o" -evaluate multiply "$k" -depth 8 "$o"
      a=$(all_v "$o"); c=$(centre_v "$o")
    fi
    local act=0
    if awk -v x="$a" 'BEGIN{exit !(x>19.5)}'; then
      k=$(python3 -c "print(round(18.0/$a,4))"); act=1
    elif awk -v x="$a" 'BEGIN{exit !(x<12.0)}'; then
      k=$(python3 -c "print(round(14.0/$a,4))"); act=1
    fi
    if [[ $act == 1 ]]; then
      magick "$o" -evaluate multiply "$k" -depth 8 "$o"
      c=$(centre_v "$o")
    fi
    if awk -v x="$c" 'BEGIN{exit !(x>13.4)}'; then
      local pp
      pp=$(python3 -c "print(round(max(40.0,min(96.0,11.8/max($c,0.5)*100)),1))")
      make_plate_dim_mask "$pp"
      magick "$o" "$TEX/mask-plate-dim.png" -compose multiply -composite -depth 8 "$o"
    elif awk -v x="$c" 'BEGIN{exit !(x<8.0)}'; then
      magick "$o" -evaluate multiply 1.15 -depth 8 "$o"
    fi
  done
  # 动态范围兜底：整体 V std < 8.2 时补一次对比并回正亮度
  local sd sd2
  sd=$(std_v "$o")
  if awk -v x="$sd" 'BEGIN{exit !(x<8.2)}'; then
    local na
    magick "$o" -brightness-contrast 0x10 -depth 8 "$o"
    na=$(all_v "$o")
    local kk; kk=$(python3 -c "print(round(15.0/max($na,0.5),4))")
    magick "$o" -evaluate multiply "$kk" -depth 8 "$o"
    sd2=$(std_v "$o")
    echo "  std-fix $name: ${sd}% -> ${sd2}%"
  fi
  plate_size_check "$name" "$o"
}

backdrop_finish() { # backdrop_finish <name>
  local name=$1
  local src=$S/work/masters/$name.png
  local o=$S/work/backdrops/$name.png
  local v k i
  make_backdrop_masks
  magick "$src" -resize '1600x1000!' \
    "$TEX/vig-backdrop.png" -compose multiply -composite \
    "$TEX/side-dim.png" -compose multiply -composite \
    "$GRAIN1600" -compose blend -define compose:args=4 -composite \
    -depth 8 "$o"
  # 门禁：整体 V <=17.5%（直接按比例校正）
  for i in 1 2 3; do
    v=$(all_v "$o")
    awk -v x="$v" 'BEGIN{exit !(x>17.5)}' || break
    k=$(python3 -c "print(round(16.8/max($v,0.5),4))")
    magick "$o" -evaluate multiply "$k" -depth 8 "$o"
  done
  backdrop_size_check "$name" "$o"
}

# AVIF 导出：质检循环降到尺寸上限内
avif_fit() { # avif_fit <in> <out> <max-bytes> <yuv> <qcolor> [qalpha]
  local in=$1 out=$2 lim=$3 yuv=$4 q=$5 qa=${6:-60} tmp=$TMP/enc.avif
  local qs=("$q" 58 54 50 46 42 38)
  for cand in "${qs[@]}"; do
    avifenc --min 0 --max 63 --speed 4 --jobs 2 --yuv "$yuv" \
      --qcolor "$cand" --qalpha "$qa" "$in" "$tmp" >/dev/null 2>&1
    if [[ $(stat -c%s "$tmp") -le $lim ]]; then mv "$tmp" "$out"; return 0; fi
  done
  mv "$tmp" "$out"   # 极致兜底：取最后一档（仍尽量保证可解码）
}
plate_size_check() { # <name> <final.png> -> assets/bg/scene/<name>.avif (<=120KB)
  avif_fit "$2" "$OUT/scene/$1.avif" 122880 420 60
}
backdrop_size_check() { # <name> <final.png> -> assets/bg/backdrop/<name>.avif (<=220KB)
  avif_fit "$2" "$OUT/backdrop/$1.avif" 225280 420 62
}

if [[ ! -f $TEX/.ready || ${FORCE_TEX:-0} == 1 ]]; then
# ---------------------------------------------------------------------------
# 1. 共享纹理 / 掩膜
# ---------------------------------------------------------------------------
# 和纸纤维（1800x1125）与颗粒
magick -size 2400x1500 xc:gray50 +noise Gaussian -colorspace Gray -blur 0x0.6 \
  -motion-blur 0x7+0 -auto-level -level 44%,56% -resize '1800x1125!' "$TEX/fib-1800.png"
FIB=$TEX/fib-1800.png
magick -size 2400x1500 xc:gray50 +noise Random -colorspace Gray -blur 0x2.4 \
  -auto-level -level 41%,59% -resize '1800x1125!' "$TEX/mottle-1800.png"
magick "$TEX/fib-1800.png" "$TEX/mottle-1800.png" -compose blend -define compose:args=40 \
  -composite "$FIB"
magick -size 900x1200 xc:gray50 +noise Gaussian -colorspace Gray -blur 0x0.35 \
  -auto-level -level 43%,57% "$TEX/grain-900.png"
GRAIN900=$TEX/grain-900.png
magick -size 1600x1000 xc:gray50 +noise Gaussian -colorspace Gray -blur 0x0.35 \
  -auto-level -level 43%,57% "$TEX/grain-1600.png"
GRAIN1600=$TEX/grain-1600.png
make_plate_vignette
make_backdrop_masks

# ---------------------------------------------------------------------------
# 2. 第二源叠加图层（透明 PNG，供各面 master 使用）
# ---------------------------------------------------------------------------
# a. 鸟居 + 神社聚落远景剪影（gion screen 右下红鸟居；人群缩小+模糊到不可辨）
make_silhouette "$GION" '860x700+2110+1720' "$TEX/sil-torii.png" '#0a140d' 640 30 92
# b. 地狱草纸火焰（顶部纯火焰区；避开鬼面/受苦者）
magick "$HELL" -crop 620x290+650+200 +repage -resize 700x -colorspace Gray \
  -auto-level -negate -level 35%,95% -blur 0x1.2 "$TEX/fire-alpha.png"
magick -size "$(magick identify -format '%wx%h' "$TEX/fire-alpha.png")" xc:'#ff5a33' \
  "$TEX/fire-alpha.png" -alpha off -compose copy_opacity -composite "$TEX/fire-red.png"
# c. 花火天幕（hiroshige 花火；避开右上题签/左侧印章）
magick "$FIREWORKS" -crop 1580x1000+300+200 +repage -resize '1200x760!' \
  -colorspace Gray -auto-level -level 12%,99% -negate "$TEX/fw-alpha.png"
magick -size 1200x760 xc:'#f2a6c0' "$TEX/fw-alpha.png" -alpha off \
  -compose copy_opacity -composite "$TEX/fireworks-glow.png"
# d. 雨丝天幕（ohashi 上部雨/水面；避开题签）
magick "$OHASHI" -crop 1780x1080+260+820 +repage -resize '1600x970!' \
  -colorspace Gray -auto-level -level 30%,99% -negate "$TEX/rain-alpha.png"
magick -size 1600x970 xc:'#a8c8d8' "$TEX/rain-alpha.png" -alpha off \
  -compose copy_opacity -composite "$TEX/rain-glow.png"
# e. 金云带（gion 屏风金云暗边；顶部云形）
magick "$GION" -crop 900x520+240+80 +repage -resize '900x520!' -colorspace Gray \
  -auto-level -negate -level 45%,92% -blur 0x0.8 "$TEX/cloud-alpha.png"
magick -size 900x520 xc:'#c9b06a' "$TEX/cloud-alpha.png" -alpha off \
  -compose copy_opacity -composite "$TEX/cloud-gold.png"
# f. 浪带（光琳浪；水平镜像成 1800 宽）
magick "$WAVES" -crop 1500x900+500+500 +repage -resize '900x540!' -colorspace Gray \
  -auto-level -level 25%,92% -negate "$TEX/wave-alpha.png"
magick -size 900x540 xc:'#9fc4c8' "$TEX/wave-alpha.png" -alpha off \
  -compose copy_opacity -composite "$TEX/wave-band-half.png"
magick "$TEX/wave-band-half.png" \( "$TEX/wave-band-half.png" -flop \) +append "$TEX/wave-band.png"


touch $TEX/.ready
fi
FIB=$TEX/fib-1800.png
GRAIN900=$TEX/grain-900.png
GRAIN1600=$TEX/grain-1600.png

# ---------------------------------------------------------------------------
# 3. 11 面 master（裁切 + 主色 CLUT + 第二源叠加）
#    REUSE=1 且 master 已存在时跳过本段（迭代 plate/backdrop 时省时）
# ---------------------------------------------------------------------------
if [[ ${REUSE:-0} != 1 || ! -f $S/work/masters/ex.png ]]; then
# s1 月下荒野：宗达金屏风 -> 深松绿；暗月/金箔田；远景鸟居剪影
make_clut "$TMP/clut-s1.png" '#040b07:0' '#0a1e14:34' '#1c3d2b:62' '#57755c:82' '#a9c5a7:93' '#dae5d1:100'
grade_master s1 "$SOTATSU" '1408x880+400+20' "$TMP/clut-s1.png"
magick -size "${MW}x${MH}" xc:black \( -size 700x700 radial-gradient:'#ffffff-#000000' \
  -resize 1100x1100! \) -geometry +20-180 -compose screen -composite \
  -fill '#9fc4a3' -colorize 100 "$TEX/glow-s1.png"
screen_add "$S/work/masters/s1.png" "$TEX/glow-s1.png" 20 "$TMP/s1-l1.png"
screen_add "$TMP/s1-l1.png" "$TEX/wave-band.png" 10 "$S/work/masters/s1.png"

# s2 冰封审核：雷神屏风右半（避开雷神面部；只取飘带/金云）-> 夜蓝冰青
make_clut "$TMP/clut-s2.png" '#02040a:0' '#061224:32' '#123a5c:62' '#3f7ea8:84' '#8ccdf2:94' '#e2f4ff:100'
grade_master s2 "$RAIJIN" '1930x1206+1400+30' "$TMP/clut-s2.png"
magick "$RAIJIN" -crop 1930x1206+1400+30 +repage -resize "${MW}x${MH}!" -colorspace Gray \
  -auto-level -negate -level 60%,99% -blur 0x2 -fill '#7cc7f0' -colorize 100 "$TEX/s2-ribbon.png"
screen_add "$S/work/masters/s2.png" "$TEX/s2-ribbon.png" 12 "$TMP/s2-l1.png"
# 冷雾带
screen_add "$TMP/s2-l1.png" "$TEX/cloud-gold.png" 8 "$S/work/masters/s2.png"

# s3 分歧十字：光琳菊屏风 左冷右暖分色 + 中央墨断带 + 双鸟居剪影
make_clut "$TMP/clut-s3l.png" '#05080d:0' '#101a24:34' '#26404f:62' '#6d879b:84' '#a8bcca:94' '#e6eef3:100'
make_clut "$TMP/clut-s3r.png" '#0d0602:0' '#2a1209:34' '#6b3615:62' '#b8621f:84' '#e5a057:94' '#f8e2bd:100'
grade_master_split s3 "$KORIN" '2240x1400+380+40' "$TMP/clut-s3l.png" "$TMP/clut-s3r.png" 50
# 中央墨断带（乘以暗带）
magick -size "${MW}x${MH}" xc:white -fill '#242024' -draw 'rectangle 760,0 1040,1125' \
  -blur 0x110 "$TMP/s3-fault.png"
multiply_add "$S/work/masters/s3.png" "$TMP/s3-fault.png" "$S/work/masters/s3.png"

# patrol 404 荒原：雷神屏风金地（全空区）-> 黑红；地狱火焰叠加 + 扫描带
make_clut "$TMP/clut-patrol.png" '#0b0203:0' '#22050a:30' '#540b16:58' '#a01b2c:80' '#ff3b4e:93' '#ffd166:100'
grade_master patrol "$RAIJIN" '1700x1063+1250+80' "$TMP/clut-patrol.png"
magick -size "${MW}x${MH}" xc:black "$TEX/fire-red.png" -resize 900x -geometry +500+620 \
  -compose screen -composite "$TMP/patrol-firel.png"
screen_add "$S/work/masters/patrol.png" "$TMP/patrol-firel.png" 34 "$TMP/patrol-l1.png"
# 故障扫描带
magick -size "${MW}x${MH}" xc:white -fill '#5a2a38' -draw 'rectangle 0,0 1800,6' \
  -draw 'rectangle 0,210 1800,3' -draw 'rectangle 0,430 1800,5' -draw 'rectangle 0,700 1800,2' \
  -draw 'rectangle 0,930 1800,6' -blur 0x1.2 "$TMP/patrol-scan.png"
multiply_add "$TMP/patrol-l1.png" "$TMP/patrol-scan.png" "$TMP/patrol-l2.png"
screen_add "$TMP/patrol-l2.png" "$TEX/fire-red.png" 8 "$S/work/masters/patrol.png"

# a4 金箔集市：光琳屏风金箔田 + 菊花 -> 暗金（暖金主色）
make_clut "$TMP/clut-a4.png" '#120c04:0' '#2c2010:32' '#5a4214:60' '#b08a33:84' '#e3b64d:94' '#f7e9c4:100'
grade_master a4 "$KORIN" '2240x1400+900+40' "$TMP/clut-a4.png"
# 金尘光斑（噪声阈值）
magick -size "${MW}x${MH}" xc:black +noise Random -colorspace Gray -auto-level -level 78%,99% \
  -fill '#e3b64d' -colorize 100 "$TMP/a4-dust.png"
screen_add "$S/work/masters/a4.png" "$TMP/a4-dust.png" 8 "$TMP/a4-l1.png"
screen_add "$TMP/a4-l1.png" "$TEX/cloud-gold.png" 10 "$S/work/masters/a4.png"

# a5 署名争夺：光琳菊 左蓝右粉分色 + 浪带
make_clut "$TMP/clut-a5l.png" '#03060f:0' '#0a1626:32' '#1e3a5e:60' '#4d76ae:82' '#8fb4e6:93' '#e8f0fa:100'
make_clut "$TMP/clut-a5r.png" '#12040c:0' '#2a0f1e:32' '#63263d:60' '#b05a7c:82' '#e89ab8:93' '#fbeaf1:100'
grade_master_split a5 "$KORIN" '2000x1250+1240+90' "$TMP/clut-a5l.png" "$TMP/clut-a5r.png" 50
screen_add "$S/work/masters/a5.png" "$TEX/wave-band.png" 18 "$TMP/a5-l1.png"
screen_add "$TMP/a5-l1.png" "$TEX/cloud-gold.png" 6 "$S/work/masters/a5.png"

# a6 崩坏乐园：若冲白梅金月 -> 糖粉；花火天幕叠加
make_clut "$TMP/clut-a6.png" '#180a12:0' '#331726:30' '#7a3a3c:58' '#c9798f:80' '#f2a6c0:92' '#fbe6ec:100'
grade_master a6 "$JAKUCHU" '1820x1137+470+300' "$TMP/clut-a6.png"
screen_add "$S/work/masters/a6.png" "$TEX/fireworks-glow.png" 22 "$TMP/a6-l1.png"
# 薄荷色点缀（花火冷色反射）
magick "$TMP/a6-l1.png" -fill '#9fe0c8' -colorize 8 "$S/work/masters/a6.png"

# b4 血色螺旋：光琳浪 -> 血；地狱火焰 + 车轮状强浪
make_clut "$TMP/clut-b4.png" '#0e0304:0' '#26060a:28' '#66101c:56' '#b02438:80' '#ff6b35:94' '#ffd7c0:100'
grade_master b4 "$WAVES" '2560x1600+150+880' "$TMP/clut-b4.png"
screen_add "$S/work/masters/b4.png" "$TEX/fire-red.png" 18 "$TMP/b4-l1.png"
screen_add "$TMP/b4-l1.png" "$TEX/wave-band.png" 8 "$S/work/masters/b4.png"

# b5 雨夜暗巷：广重大桥夜雨 -> 靛蓝；雨丝 + 暖灯/霓虹辉光
make_clut "$TMP/clut-b5.png" '#03060d:0' '#0a1020:32' '#1a2f46:60' '#2f6474:82' '#54d6d0:92' '#ffb15c:100'
grade_master b5 "$OHASHI" '2240x1400+250+1250' "$TMP/clut-b5.png" 0
screen_add "$S/work/masters/b5.png" "$TEX/rain-glow.png" 20 "$TMP/b5-l1.png"
# 灯笼/霓虹光斑
magick -size "${MW}x${MH}" xc:black -fill '#ff8a3d' \
  -draw 'circle 420,760 420,820' -draw 'circle 1420,640 1420,700' \
  -draw 'circle 900,980 900,1030' -fill '#54d6d0' -draw 'circle 1500,930 1500,975' \
  -blur 0x45 "$TMP/b5-glow.png"
screen_add "$TMP/b5-l1.png" "$TMP/b5-glow.png" 30 "$S/work/masters/b5.png"

# b6 毒雾王座：墨笑泼墨山水 -> 毒绿；浪带 + 毒雾
make_clut "$TMP/clut-b6.png" '#080d05:0' '#16220a:30' '#33480f:58' '#6a9422:80' '#a6cc55:92' '#dff0b4:100'
grade_master b6 "$BOKUSHO" '1504x940+710+1380' "$TMP/clut-b6.png"
screen_add "$S/work/masters/b6.png" "$TEX/wave-band.png" 12 "$TMP/b6-l1.png"
magick -size "${MW}x${MH}" plasma:fractal -colorspace Gray -blur 0x6 -auto-level \
  -fill '#7fb52e' -colorize 100 "$TMP/b6-fog.png"
screen_add "$TMP/b6-l1.png" "$TMP/b6-fog.png" 22 "$S/work/masters/b6.png"

# ex 键政覆写：光琳浪 -> 洋红紫；雷神飘带青 + 故障数据带
make_clut "$TMP/clut-ex.png" '#060309:0' '#180a2c:30' '#3e1668:58' '#7a2fb0:78' '#d94fd0:91' '#5ad4e0:100'
grade_master ex "$WAVES" '2560x1600+700+600' "$TMP/clut-ex.png"
magick "$RAIJIN" -crop 1930x1206+1400+30 +repage -resize "${MW}x${MH}!" -colorspace Gray \
  -auto-level -negate -level 65%,99% -blur 0x2 -fill '#5ad4e0' -colorize 100 "$TEX/ex-ribbon.png"
screen_add "$S/work/masters/ex.png" "$TEX/ex-ribbon.png" 16 "$TMP/ex-l1.png"
# 二进制/故障带
magick -size "${MW}x${MH}" xc:black -fill '#d94fd0' \
  -draw 'rectangle 0,140 1800,4' -draw 'rectangle 0,320 1800,2' -draw 'rectangle 0,520 1800,6' \
  -draw 'rectangle 0,760 1800,2' -draw 'rectangle 0,990 1800,4' -blur 0x1 \
  -fill '#5ad4e0' -draw 'rectangle 300,140 900,2' -draw 'rectangle 1200,520 1700,3' \
  "$TMP/ex-glitch.png"
screen_add "$TMP/ex-l1.png" "$TMP/ex-glitch.png" 26 "$S/work/masters/ex.png"

fi
# ---------------------------------------------------------------------------
# 4. plate / backdrop（11 + 11）
# ---------------------------------------------------------------------------
if [[ ${#STAGES[@]} -gt 0 ]]; then
for st in "${STAGES[@]}"; do
  dx=478
  case $st in
    s1) dx=478 ;;
    s2) dx=478 ;;
    s3) dx=478 ;;
    patrol) dx=478 ;;
  esac
  plate_finish "$st" "$dx"
  backdrop_finish "$st"
done
fi

# ---------------------------------------------------------------------------
# 5. 8 个材质
# ---------------------------------------------------------------------------
if [[ ${SKIP_MATS:-0} != 1 ]]; then
# 5.1 gold 512x512 不透明金箔 tile（宗达金地；低对比、可平铺）
magick "$SOTATSU" -crop 420x420+760+50 +repage -resize '256x256!' -colorspace Gray \
  -blur 0x1.4 -auto-level -level 30%,82% "$TMP/gold-g.png"
make_clut "$TMP/clut-gold.png" '#2a1c08:0' '#5a4118:38' '#96721f:70' '#c19938:88' '#e3c069:100'
magick "$TMP/gold-g.png" "$TMP/clut-gold.png" -clut -colorspace sRGB "$TMP/gold-256.png"
magick "$TMP/gold-256.png" \( +clone -flop \) +append "$TMP/gold-top.png"
magick "$TMP/gold-top.png" \( "$TMP/gold-top.png" -flip \) -append "$TMP/gold-tile.png"
_gg=$(magick "$TMP/gold-tile.png" -colorspace HSB -channel B -separate +channel -format '%[fx:mean*100]' info:)
_gk=$(python3 -c "print(round(50.0/max($_gg,1),4))")
magick "$TMP/gold-tile.png" -evaluate multiply "$_gk" -gravity center -extent 512x512 \
  -depth 8 "$PROC/mat-gold.png"
avif_fit "$PROC/mat-gold.png" "$OUT/mat/gold.avif" 61440 420 60

# 5.2 washi 512x512 不透明和纸纤维（低对比、均值 ~55%、可平铺）
magick -size 512x512 xc:gray50 +noise Gaussian -colorspace Gray -blur 0.45 \
  -motion-blur 0x6+0 -auto-level -level 46%,54% "$TMP/washi-a.png"
magick -size 512x512 xc:gray50 +noise Random -colorspace Gray -blur 2.2 \
  -auto-level -level 45%,55% "$TMP/washi-b.png"
magick "$TMP/washi-a.png" "$TMP/washi-b.png" -compose blend -define compose:args=50 \
  -composite -colorspace sRGB -fill '#b3a88d' -colorize 42% \
  -modulate 100,16,100 "$TMP/washi-base.png"
magick "$TMP/washi-base.png" -resize 256x256! "$TMP/washi-half.png"
magick "$TMP/washi-half.png" \( +clone -flop \) +append "$TMP/washi-top.png"
magick "$TMP/washi-top.png" \( "$TMP/washi-top.png" -flip \) -append "$TMP/washi-tile.png"
# 亮度校准到均值 55%
_wv=$(magick "$TMP/washi-tile.png" -colorspace HSB -channel B -separate +channel -format '%[fx:mean*100]' info:)
_wk=$(python3 -c "print(round(55.0/max($_wv,1),4))")
magick "$TMP/washi-tile.png" -evaluate multiply "$_wk" -depth 8 "$PROC/mat-washi.png"
avif_fit "$PROC/mat-washi.png" "$OUT/mat/washi.avif" 40960 420 58

# 5.3 ink 512x512 不透明墨晕（均值 ~20%、低对比可平铺）
magick "$BOKUSHO" -crop 900x700+820+520 +repage -resize '256x256!' -colorspace Gray \
  -blur 0x3.5 -auto-level -level 45%,92% "$TMP/ink-half.png"
magick "$TMP/ink-half.png" \( +clone -flop \) +append "$TMP/ink-top.png"
magick "$TMP/ink-top.png" \( "$TMP/ink-top.png" -flip \) -append "$TMP/ink-tile.png"
magick "$TMP/ink-tile.png" -colorspace sRGB -fill '#17140f' -colorize 60% \
  -evaluate multiply 0.42 -depth 8 "$PROC/mat-ink.png"
_iv=$(magick "$PROC/mat-ink.png" -colorspace HSB -channel B -separate +channel -format '%[fx:mean*100]' info:)
_ik=$(python3 -c "print(round(20.0/max($_iv,1),4))")
magick "$PROC/mat-ink.png" -evaluate multiply "$_ik" -depth 8 "$PROC/mat-ink.png"
avif_fit "$PROC/mat-ink.png" "$OUT/mat/ink.avif" 40960 420 58

# 5.4-5.8 1024x512 RGBA 灰度透明带：灰度 RGB + alpha（白=不透明），水平镜像接缝
make_band() { # make_band <half.png> <out.png> <taper> <alpha-gamma> [alpha-gain]
  local half=$1 out=$2 taper=$3 gam=$4 gain=${5:-1.0}
  magick "$half" \( +clone -flop \) +append "$TMP/band-top.png"
  case $taper in
    vb)     magick \( -size 1024x256 gradient:'#000000-#ffffff' \) \
              \( -size 1024x256 gradient:'#ffffff-#000000' \) -append -gamma "$gam" \
              "$TMP/band-vmask.png" ;;
    bottom) magick -size 1024x512 gradient:'#000000-#ffffff' -gamma "$gam" "$TMP/band-vmask.png" ;;
    none)   magick -size 1024x512 xc:white "$TMP/band-vmask.png" ;;
  esac
  # 保留形状 alpha，再乘以上下/贴边渐变（不是覆盖）
  magick "$TMP/band-top.png" -alpha extract "$TMP/band-a0.png"
  magick "$TMP/band-a0.png" "$TMP/band-vmask.png" -compose multiply -composite "$TMP/band-a1.png"
  magick "$TMP/band-top.png" "$TMP/band-a1.png" -alpha off -compose copy_opacity -composite \
    -depth 8 "$out"
  if [[ $gain != 1.0 ]]; then
    magick "$out" -channel A -evaluate multiply "$gain" +channel -depth 8 "$out"
  fi
}

# wave：浪/云带（光琳浪，亮部=不透明）
magick "$WAVES" -crop 1200x900+300+600 +repage -resize '512x512!' -colorspace Gray \
  -auto-level -level 8%,96% "$TMP/wave-g.png"
magick "$TMP/wave-g.png" -auto-level -level 30%,92% \
  -evaluate pow 1.25 "$TMP/wave-half-a.png"
magick -size 512x512 xc:gray -fill 'gray(72%)' -colorize 0 "$TMP/wave-rgb.png"
magick "$TMP/wave-rgb.png" "$TMP/wave-half-a.png" -alpha off -compose copy_opacity -composite \
  "$TMP/wave-half.png"
make_band "$TMP/wave-half.png" "$PROC/mat-wave.png" vb 0.9 1.8
avif_fit "$PROC/mat-wave.png" "$OUT/mat/wave.avif" 49152 444 58 62

# mist：雾带（分形噪声，中央浓两端淡）
magick -size 512x512 xc:black +noise Random -colorspace Gray -blur 0x9 -auto-level \
  -level 20%,85% "$TMP/mist-a.png"
magick -size 512x512 plasma:fractal -colorspace Gray -blur 0x5 -auto-level \
  -level 25%,90% "$TMP/mist-b.png"
magick "$TMP/mist-a.png" "$TMP/mist-b.png" -compose screen -composite \
  -fill 'gray(74%)' -colorize 100 "$TMP/mist-half-rgb.png"
magick "$TMP/mist-a.png" "$TMP/mist-b.png" -compose screen -composite \
  -auto-level -level 10%,80% "$TMP/mist-half-a.png"
magick "$TMP/mist-half-rgb.png" "$TMP/mist-half-a.png" -alpha off -compose copy_opacity -composite \
  "$TMP/mist-half.png"
make_band "$TMP/mist-half.png" "$PROC/mat-mist.png" vb 1.4 1.0
avif_fit "$PROC/mat-mist.png" "$OUT/mat/mist.avif" 49152 444 58 62

# cloud：金屏风云带（gion 屏风金云形）
magick "$GION" -crop 900x700+180+120 +repage -resize '512x512!' -colorspace Gray \
  -auto-level -negate -level 42%,93% -blur 0x1.4 -evaluate pow 1.2 "$TMP/cloud-half-a.png"
magick -size 512x512 xc:'gray(76%)' "$TMP/cloud-half-a.png" -alpha off \
  -compose copy_opacity -composite "$TMP/cloud-half.png"
make_band "$TMP/cloud-half.png" "$PROC/mat-cloud.png" vb 1.6 1.7
avif_fit "$PROC/mat-cloud.png" "$OUT/mat/cloud.avif" 49152 444 58 62

# grass：秋草/芦苇剪影（宗达秋草屏风下缘）
magick "$SOTATSU" -crop 900x620+340+270 +repage -resize '512x512!' -colorspace Gray \
  -auto-level -negate -level 45%,94% -blur 0x0.9 "$TMP/grass-half-a.png"
magick -size 512x512 xc:'gray(70%)' "$TMP/grass-half-a.png" -alpha off \
  -compose copy_opacity -composite "$TMP/grass-half.png"
make_band "$TMP/grass-half.png" "$PROC/mat-grass.png" bottom 1.1 2.4
avif_fit "$PROC/mat-grass.png" "$OUT/mat/grass.avif" 61440 444 58 62

# plum：梅枝剪影（若冲白梅；避开题签）
magick "$JAKUCHU" -crop 900x700+480+2500 +repage -resize '512x512!' -colorspace Gray \
  -auto-level -negate -level 40%,93% -blur 0x0.8 "$TMP/plum-half-a.png"
magick -size 512x512 xc:'gray(70%)' "$TMP/plum-half-a.png" -alpha off \
  -compose copy_opacity -composite "$TMP/plum-half.png"
make_band "$TMP/plum-half.png" "$PROC/mat-plum.png" vb 1.2 1.25
avif_fit "$PROC/mat-plum.png" "$OUT/mat/plum.avif" 61440 444 58 62

fi  # SKIP_MATS
# ---------------------------------------------------------------------------
# 6. 门禁统计 + contact sheet（证据）
# ---------------------------------------------------------------------------
python3 - "$OUT" "$PROC" <<'PY'
import glob, os, subprocess, sys, json
out, proc = sys.argv[1], sys.argv[2]

def magick(*a):
    return subprocess.check_output(['magick', *a], stderr=subprocess.DEVNULL).decode()

def dims(f):
    return magick('identify', '-format', '%wx%h', f)

def vmean(f, crop=None):
    a = [f]
    if crop: a += ['-crop', crop, '+repage']
    a += ['-colorspace', 'HSB', '-channel', 'B', '-separate', '+channel', '-format', '%[fx:mean*100]', 'info:']
    return float(magick(*a))

rows = []
fail = []
for kind, pat, lim, centre in (('scene', 'scene/*.avif', 122880, True),
                              ('backdrop', 'backdrop/*.avif', 225280, False)):
    for f in sorted(glob.glob(os.path.join(out, pat))):
        name = os.path.basename(f)[:-5]
        b = os.path.getsize(f); d = dims(f + '[0]')
        cv = vmean(f + '[0]', '60%x60%+20%+20%')
        av = vmean(f + '[0]')
        lv = vmean(f + '[0]', '22%x100%+0+0'); rv = vmean(f + '[0]', '22%x100%+78%+0')
        ch = magick('identify', '-format', '%[channels]', f + '[0]')
        ok = b <= lim and d == ('900x1200' if kind == 'scene' else '1600x1000')
        if kind == 'scene': ok = ok and 8.0 <= cv <= 14.0 and 12.0 <= av <= 20.0
        else: ok = ok and av <= 18.0
        rows.append(dict(kind=kind, name=name, bytes=b, dims=d, centreV=round(cv, 2),
                         allV=round(av, 2), sideL=round(lv, 2), sideR=round(rv, 2), channels=ch))
        if not ok: fail.append((kind, name, b, d, cv, av))
for f in sorted(glob.glob(os.path.join(out, 'mat/*.avif'))):
    name = os.path.basename(f)[:-5]
    b = os.path.getsize(f); d = dims(f + '[0]')
    ch = magick('identify', '-format', '%[channels]', f + '[0]')
    av = vmean(f + '[0]')
    rows.append(dict(kind='mat', name=name, bytes=b, dims=d, allV=round(av, 2), channels=ch))
    alpha_ok = ('a' in ch) if name in ('wave', 'mist', 'cloud', 'grass', 'plum') else ('a' not in ch)
    if not alpha_ok: fail.append(('mat', name, b, d, ch, ''))
rep = {'generated': 'tools/bg-assets/build-assets.sh', 'files': rows, 'gates_failed': fail}
open(os.path.join(proc, 'asset-report.json'), 'w').write(json.dumps(rep, ensure_ascii=False, indent=2))
lines = ['# OWProject bg-assets 加工报表（tools/bg-assets/build-assets.sh 自动生成）', '',
         '| kind | name | dims | bytes | centreV% | allV% | sideL% | sideR% | channels |',
         '|---|---|---|---|---|---|---|---|---|']
for r in rows:
    lines.append('| {kind} | {name} | {dims} | {bytes} | {centreV} | {allV} | {sideL} | {sideR} | {channels} |'.format(
        kind=r['kind'], name=r['name'], dims=r['dims'], bytes=r['bytes'],
        centreV=r.get('centreV', '-'), allV=r.get('allV', '-'),
        sideL=r.get('sideL', '-'), sideR=r.get('sideR', '-'), channels=r['channels']))
lines += ['', f'gates_failed: {len(fail)}']
open(os.path.join(proc, 'asset-report.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
print('\nFAIL:', fail)
sys.exit(1 if fail else 0)
PY

echo
echo "done: scenes -> $OUT/scene ; backdrops -> $OUT/backdrop ; mats -> $OUT/mat"
