#!/usr/bin/env python3
"""TH20 ECL 开火提取 v3：单函数、内联打点、自检。"""
import re, json, glob, os

ECL = os.path.expanduser('~/Touhou20/scripts/recovered/ecl')
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
    print('自检 n601 == raw601:', '通过' if tot['n601'] == tot['raw601'] else '失败')
    json.dump({'events': all_ev}, open(os.path.expanduser(
        '~/OWProject/.scratch/th20-ecl-shots.json'), 'w'))


if __name__ == '__main__':
    main()
