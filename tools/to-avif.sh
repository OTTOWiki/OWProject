#!/data/data/com.termux/files/usr/bin/bash
# JPG/PNG → AVIF（无 fallback 资源链；仅编码工具）
# 用法: bash tools/to-avif.sh <input.jpg|png> <output.avif>
# 或:   tools/to-avif.sh <input> <output>  （需可执行）
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <input.jpg|png> <output.avif>" >&2
  exit 2
fi

src=$1
dst=$2

if [[ ! -f $src ]]; then
  echo "error: input not found: $src" >&2
  exit 1
fi

# 小写扩展名（bash 4+）
ext=${src##*.}
ext_lc=$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')
case $ext_lc in
  jpg|jpeg|png) ;;
  *)
    echo "error: input must be .jpg / .jpeg / .png" >&2
    exit 1
    ;;
esac

mkdir -p -- "$(dirname -- "$dst")"

bytes() { wc -c <"$1" | tr -d ' '; }

if command -v avifenc >/dev/null 2>&1; then
  if avifenc -q 65 -s 4 -y 420 --sharpyuv "$src" "$dst" 2>/dev/null; then
    echo "ok avifenc: $src -> $dst ($(bytes "$src") -> $(bytes "$dst") bytes)"
    exit 0
  fi
fi

if command -v magick >/dev/null 2>&1; then
  magick "$src" -strip -colorspace sRGB -alpha off \
    -define avif:speed=4 -quality 65 "$dst"
  echo "ok magick: $src -> $dst ($(bytes "$src") -> $(bytes "$dst") bytes)"
  exit 0
fi

echo "error: need avifenc or ImageMagick (magick)" >&2
exit 1
