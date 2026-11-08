#!/usr/bin/env python3
"""TH20 ECL 开火提取 v3：单函数、内联打点、自检。"""
import re, json, glob, os

_HERE = os.path.dirname(os.path.abspath(__file__))
# 路径可用 CLI 覆盖：--ecl / --out
import sys as _sys
def _arg(flag, default):
    return _sys.argv[_sys.argv.index(flag) + 1] if flag in _sys.argv else default
ECL = _arg('--ecl', os.path.expanduser('~/Touhou20/scripts/recovered/ecl'))
NUM = re.compile(r'^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?f?$')
SPAWN = {300, 301, 304, 305, 309, 310, 311, 312, 321}


def fnum(t):
    t = (t or '').strip()
    if not NUM.match(t):
        return None
    return float(t[:-1]) if t.endswith('f') else float(t)


def call(line):
    m = re.search(r'ins_(\d+)\s*\(', line)
    if not m:
        return None, None
    d, cur, out = 1, '', []
    for ch in line[m.end():]:
        if ch in '([':
            d += 1
        elif ch in ')]':
            d -= 1
            if d == 0:
                out.append(cur)
                return int(m.group(1)), [x.strip() for x in out]
            if d < 0:
                d = 0
        if ch == ',' and d == 1:
            out.append(cur); cur = ''
            continue
        cur += ch
    return None, None


def extract(path):
    st = {'raw601': 0, 'spawn': 0, 'events': [], 'n601': 0, 'appended': 0, 'hdr': 0}
    q, pend, sub = {}, None, None
    for ln, raw in enumerate(open(path, encoding='utf-8', errors='replace'), 1):
        line = raw.rstrip('\n')
        if 'ins_601(' in line:
            st['raw601'] += 1
        m = re.match(r'^(?:void|int)\s+(\w+)\s*\(', line)
        if m:
            st['hdr'] += 1
            # 注意：**不要**在这里重置 pend——否则每个子程序的首条 ins_601 会被丢掉
            sub = m.group(1); q = {}
            continue
        op, a = call(line)
        if op is None:
            continue
        if op == 601:
            st['n601'] += 1
            if pend is not None:
                st['events'].append(pend); st['appended'] += 1
            k = int(fnum(a[0]) or 0) if a else 0
            p = q.get(k, {})
            pend = {'sub': sub, 'line': ln, 'q': k,
                    'count': p.get('count'), 'rows': p.get('rows'), 'type': p.get('type'),
                    'speed': p.get('speed'), 'speed_step': p.get('speed_step'),
                    'angle': p.get('angle'), 'angle_step': p.get('angle_step'),
                    'wait_after': None}
        elif op in SPAWN:
            st['spawn'] += 1
        elif op == 606 and len(a) >= 3:
            k = int(fnum(a[0]) or 0); q.setdefault(k, {})
            q[k]['count'] = fnum(a[1]); q[k]['rows'] = fnum(a[2])
        elif op == 607 and len(a) >= 2:
            k = int(fnum(a[0]) or 0); q.setdefault(k, {}); q[k]['type'] = fnum(a[1])
        elif op == 605 and len(a) >= 3:
            k = int(fnum(a[0]) or 0); q.setdefault(k, {})
            q[k]['speed'] = fnum(a[1]); q[k]['speed_step'] = fnum(a[2])
        elif op == 604 and len(a) >= 3:
            k = int(fnum(a[0]) or 0); q.setdefault(k, {})
            q[k]['angle'] = fnum(a[1]); q[k]['angle_step'] = fnum(a[2])
        elif op in (23, 24) and pend is not None and pend['wait_after'] is None:
            n = fnum(a[0]) if a else None
            if n and n > 0:
                pend['wait_after'] = n
    if pend is not None:
        st['events'].append(pend)
    return st


def main():
    tot = {'raw601': 0, 'n601': 0, 'appended': 0, 'events': 0, 'spawn': 0, 'hdr': 0}
    all_ev = []
    print('%-20s %6s %6s %6s %7s %6s' % ('file', 'raw601', 'n601', 'append', 'events', 'hdr'))
    for f in sorted(glob.glob(os.path.join(ECL, '*.ecl.txt'))):
        st = extract(f)
        for k in tot:
            tot[k] += st[k] if k != 'events' else len(st['events'])
        for e in st['events']:
            all_ev.append(dict(e, file=os.path.basename(f)))
        print('%-20s %6d %6d %6d %7d %6d' % (os.path.basename(f), st['raw601'], st['n601'],
                                             st['appended'], len(st['events']), st['hdr']))
    print('%-20s %6d %6d %6d %7d %6d' % ('合计', tot['raw601'], tot['n601'], tot['appended'],
                                         tot['events'], tot['hdr']))
    print()
    ok = tot['n601'] == tot['raw601']
    print('自检 n601 == raw601:', '通过' if ok else '失败')

    # ---- 分布统计（v2 原先承担的部分，合并进来以保持单一权威实现）
    radii_path = _arg('--radii', os.path.join(_HERE, 'th20-bullet-radii.json'))
    radii = json.load(open(radii_path)) if os.path.exists(radii_path) else {}

    def dist(vals):
        v = sorted(x for x in vals if x is not None)
        if not v:
            return {'n': 0}
        return {'n': len(v), 'min': round(v[0], 3), 'p25': round(v[len(v) // 4], 3),
                'median': round(v[len(v) // 2], 3), 'p75': round(v[3 * len(v) // 4], 3),
                'max': round(v[-1], 3), 'unique': len(set(v))}

    speeds = [e['speed'] for e in all_ev if e['speed'] and e['speed'] > 0]
    counts = [(e['count'] or 0) * (e['rows'] or 0) for e in all_ev if e['count'] and e['rows']]
    waits = [e['wait_after'] for e in all_ev if e['wait_after']]
    rads = [radii[str(int(e['type']))]['radius'] for e in all_ev
            if e['type'] is not None and str(int(e['type'])) in radii]
    print()
    print('字面量 speed 分布:', dist(speeds))
    print('每次开火弹数(count*rows) 分布:', dist(counts))
    print('开火后等待帧数 分布:', dist(waits))
    print('弹型半径 分布:', dist(rads))
    print('覆盖: speed %d/%d, count*rows %d/%d, wait %d/%d, radius %d/%d'
          % (len(speeds), len(all_ev), len(counts), len(all_ev),
             len(waits), len(all_ev), len(rads), len(all_ev)))
    json.dump({'events': all_ev}, open(_arg('--out', os.path.join(_HERE, 'th20-ecl-shots.json')), 'w'))
    print('已写', _arg('--out', os.path.join(_HERE, 'th20-ecl-shots.json')))


if __name__ == '__main__':
    main()
