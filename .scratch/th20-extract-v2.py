#!/usr/bin/env python3
"""TH20 ECL 弹幕参数与节奏提取（分析工具；自带一致性自检）

设计原则：
  - 单一 pass、单一函数，避免多次改写引入的隐性不一致。
  - 自检：解析出的 ins_601 次数必须等于原始文本里 ins_601( 的出现次数。
  - 只取字面量；`[-1]` / `%A` / `$B` 这类变量记 None，不猜。
  - ECL 标签形如 `Name_1234:`，不能与子程序头 `void Name(...)` 混淆。
"""
import re, json, glob, os

ECL_DIR = os.path.expanduser('~/Touhou20/scripts/recovered/ecl')
OUT = os.path.expanduser('~/OWProject/.scratch/th20-ecl-shots.json')
RADII_PATH = os.path.expanduser('~/OWProject/.scratch/th20-bullet-radii.json')
SPAWN_OPS = {300, 301, 304, 305, 309, 310, 311, 312, 321}
NUM_RE = re.compile(r'^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?f?$')


def to_num(tok):
    if tok is None:
        return None
    t = tok.strip()
    if not NUM_RE.match(t):
        return None
    return float(t[:-1]) if t.endswith('f') else float(t)


def parse_call(line):
    """返回 (opcode, [args]) 或 (None, None)。括号配平；`[`/`]` 参与但不允许 depth 变负。"""
    m = re.search(r'ins_(\d+)\s*\(', line)
    if not m:
        return None, None
    depth, cur, args = 1, '', []
    for ch in line[m.end():]:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
            if depth == 0:
                args.append(cur)
                return int(m.group(1)), [a.strip() for a in args]
            if depth < 0:
                depth = 0
        if ch == ',' and depth == 1:
            args.append(cur)
            cur = ''
            continue
        cur += ch
    return None, None


def extract_file(path):
    res = {'spawns': 0, 'events': [], 'raw_fires': 0, 'unparsed': 0}
    queue, pending, sub = {}, None, None
    for lineno, raw in enumerate(open(path, encoding='utf-8', errors='replace'), 1):
        line = raw.rstrip('\n')
        if 'ins_601(' in line:
            res['raw_fires'] += 1
        m = re.match(r'^(?:void|int)\s+(\w+)\s*\(', line)
        if m:
            sub = m.group(1)
            queue, pending = {}, None
            continue
        op, a = parse_call(line)
        if op is None or a is None:
            if 'ins_' in line:
                res['unparsed'] += 1
            continue
        if op in SPAWN_OPS:
            res['spawns'] += 1
        elif op == 606 and len(a) >= 3:
            q = int(to_num(a[0]) or 0); queue.setdefault(q, {})
            queue[q]['count'] = to_num(a[1]); queue[q]['rows'] = to_num(a[2])
        elif op == 607 and len(a) >= 2:
            q = int(to_num(a[0]) or 0); queue.setdefault(q, {})
            queue[q]['type'] = to_num(a[1])
        elif op == 605 and len(a) >= 3:
            q = int(to_num(a[0]) or 0); queue.setdefault(q, {})
            queue[q]['speed'] = to_num(a[1]); queue[q]['speed_step'] = to_num(a[2])
        elif op == 604 and len(a) >= 3:
            q = int(to_num(a[0]) or 0); queue.setdefault(q, {})
            queue[q]['angle'] = to_num(a[1]); queue[q]['angle_step'] = to_num(a[2])
        elif op == 601:
            if pending is not None:
                res['events'].append(pending)
            q = int(to_num(a[0]) or 0) if a else 0
            p = queue.get(q, {})
            pending = {'sub': sub, 'line': lineno, 'q': q,
                       'count': p.get('count'), 'rows': p.get('rows'),
                       'type': p.get('type'), 'speed': p.get('speed'),
                       'speed_step': p.get('speed_step'),
                       'angle': p.get('angle'), 'angle_step': p.get('angle_step'),
                       'wait_after': None}
        elif op in (23, 24):
            n = to_num(a[0]) if a else None
            if pending is not None and pending['wait_after'] is None and n is not None and n > 0:
                pending['wait_after'] = n
    if pending is not None:
        res['events'].append(pending)
    return res


def dist(v):
    v = sorted(x for x in v if x is not None)
    if not v:
        return {'n': 0}
    return {'n': len(v), 'min': round(v[0], 3), 'p25': round(v[len(v) // 4], 3),
            'median': round(v[len(v) // 2], 3), 'p75': round(v[3 * len(v) // 4], 3),
            'max': round(v[-1], 3), 'unique': len(set(v))}


def main():
    rows, all_events, ok = [], [], True
    for f in sorted(glob.glob(os.path.join(ECL_DIR, '*.ecl.txt'))):
        r = extract_file(f)
        name = os.path.basename(f)
        if len(r['events']) != r['raw_fires']:
            ok = False
            print('!! 自检失败 %s: events=%d raw_fires=%d' % (name, len(r['events']), r['raw_fires']))
        bullets = sum((e['count'] or 0) * (e['rows'] or 0) for e in r['events']
                      if e['count'] and e['rows'])
        rows.append({'file': name, 'spawns': r['spawns'], 'fires': len(r['events']),
                     'bullets': bullets, 'unparsed': r['unparsed']})
        for e in r['events']:
            all_events.append(dict(e, file=name))

    print('自检（每文件 events == raw ins_601 计数）:', '通过' if ok else '失败')
    print()
    print('%-20s %7s %8s %9s %9s' % ('file', '出怪', '开火', '弹数', '未解析'))
    for r in rows:
        print('%-20s %7d %8d %9d %9d' % (r['file'], r['spawns'], r['fires'], r['bullets'], r['unparsed']))
    print('%-20s %7d %8d %9d %9d' % ('合计', sum(r['spawns'] for r in rows),
                                     sum(r['fires'] for r in rows),
                                     sum(r['bullets'] for r in rows),
                                     sum(r['unparsed'] for r in rows)))

    speeds = [e['speed'] for e in all_events if e['speed'] and e['speed'] > 0]
    waits = [e['wait_after'] for e in all_events if e['wait_after']]
    counts = [(e['count'] or 0) * (e['rows'] or 0) for e in all_events if e['count'] and e['rows']]
    radii = []
    if os.path.exists(RADII_PATH):
        rm = json.load(open(RADII_PATH))
        for e in all_events:
            t = e['type']
            if t is not None and str(int(t)) in rm:
                radii.append(rm[str(int(t))]['radius'])
    print()
    print('字面量 speed 分布:', dist(speeds))
    print('每次开火弹数(count*rows) 分布:', dist(counts))
    print('开火后等待帧数 分布:', dist(waits))
    print('弹型半径 分布:', dist(radii))
    print('有字面量 speed 的开火占比: %d/%d' % (len(speeds), len(all_events)))
    json.dump({'rows': rows, 'events': all_events}, open(OUT, 'w'))
    print()
    print('已写', OUT)


if __name__ == '__main__':
    main()
