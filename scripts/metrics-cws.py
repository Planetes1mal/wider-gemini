"""Recompute Chinese Chrome Web Store CSV exports using only Python's standard library."""
import argparse
import csv
import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = {
    'installs': '安装次数', 'uninstalls': '卸载次数', 'views': '网页浏览量',
    'impressions': 'Chrome 应用商店中的总展示次数', 'weekly_users': '一段时间内的每周用户数',
}
SEGMENTS = ['安装量（按区域）', '安装量（按语言）', '安装量（按操作系统）',
            '卸载次数（按地区）', '卸载次数（按语言）', '卸载量（按操作系统）']
SOURCES = ['按来源统计的网页浏览量', '按媒介统计的网页浏览量', '按广告系列统计的网页浏览量']
SNAPSHOTS = ['一段时间内的每周用户数', '每周用户数（按地区）', '每周用户数（按语言）',
             '每周用户数（按操作系统）', '每日用户数（按产品版本）', '已启用与已停用']
RATINGS = '评分（按时段显示）'


def read_export(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        title = next(csv.reader(stream))[0].strip()
        reader = csv.DictReader(stream)
        if not reader.fieldnames or reader.fieldnames[0] != '日期':
            raise ValueError(f'{path.name}: expected Chinese export header 日期 on line 2')
        if len(set(reader.fieldnames)) != len(reader.fieldnames):
            raise ValueError(f'{path.name}: duplicate columns')
        rows = []
        for row in reader:
            if None in row:
                raise ValueError(f'{path.name}: extra CSV cells')
            day = datetime.strptime(row.pop('日期'), '%Y/%m/%d').date().isoformat()
            values = {k: None if v is None or v.strip() in ('', '-', '—', 'N/A')
                      else int(v.replace(',', '')) for k, v in row.items()}
            rows.append({'date': day, **values})
    days = [r['date'] for r in rows]
    if not days or days != sorted(set(days)):
        raise ValueError(f'{path.name}: empty, duplicated or unordered dates')
    return title, rows


def strict_sum(values):
    values = list(values)
    return sum(values) if values and all(v is not None for v in values) else None


def total(row):
    return strict_sum(v for k, v in row.items() if k != 'date')


def aggregate(rows, start='0000', end='9999'):
    selected = [r for r in rows if start <= r['date'] <= end]
    return {k: strict_sum(r[k] for r in selected) for k in rows[0] if k != 'date'}


def ratio(numerator, denominator):
    return numerator / denominator if numerator is not None and denominator not in (None, 0) else None


def change(current, prior):
    return (current - prior) / prior if current is not None and prior not in (None, 0) else None


def summarize(directory, as_of):
    tables, inventory = {}, []
    for path in sorted(directory.glob('*.csv')):
        title, rows = read_export(path)
        if title in tables:
            raise ValueError(f'duplicate report title: {title}')
        tables[title] = rows
        inventory.append({'file': path.name, 'title': title, 'rows': len(rows),
                          'start': rows[0]['date'], 'end': rows[-1]['date'],
                          'missing_cells': sum(v is None for r in rows for v in r.values()),
                          'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    required = set(CORE.values()) | set(SEGMENTS + SOURCES + SNAPSHOTS + [RATINGS])
    if required - tables.keys():
        raise ValueError('missing export reports: ' + ', '.join(sorted(required - tables.keys())))
    series = {key: {r['date']: total(r) for r in tables[title]} for key, title in CORE.items()}
    common = set.intersection(*(set(s) for s in series.values()))
    complete_dates = sorted(d for d in common if d < as_of.isoformat())
    if not complete_dates:
        raise ValueError('no common date before --as-of')
    end = complete_dates[-1]
    first_nonzero = next((d for d in sorted(common) if any((s[d] or 0) > 0 for s in series.values())), None)
    anomalies = [d for d in sorted(common) if first_nonzero and d >= first_nonzero
                 and all(s[d] == 0 for s in series.values())]
    windows = {}
    for name, days, offset in [('last7', 7, 0), ('prior7', 7, 7), ('last28', 28, 0),
                               ('prior28', 28, 28), ('last90', 90, 0)]:
        last = date.fromisoformat(end) - timedelta(days=offset)
        dates = [(last - timedelta(days=i)).isoformat() for i in reversed(range(days))]
        start, stop = dates[0], dates[-1]
        missing = [d for d in dates if any(d not in s or s[d] is None for s in series.values())]
        zero_days = [d for d in dates if d in anomalies]
        row = {'start': start, 'end': stop, 'days': days, 'missing_core_dates': missing,
               'suspected_zero_dates': zero_days, 'calendar_rows_complete': not missing}
        for key, data in series.items():
            row[key] = data.get(stop) if key == 'weekly_users' else strict_sum(data.get(d) for d in dates)
        row['net_installs'] = (row['installs'] - row['uninstalls']
                               if row['installs'] is not None and row['uninstalls'] is not None else None)
        row['installs_per_view'] = ratio(row['installs'], row['views'])
        row['views_per_impression'] = ratio(row['views'], row['impressions'])
        usable = [d for d in dates if d not in missing and d not in zero_days]
        row['non_anomalous_reporting_days'] = len(usable)
        row['installs_per_non_anomalous_reporting_day'] = ratio(
            strict_sum(series['installs'][d] for d in usable), len(usable))
        row['segments'] = {t: aggregate(tables[t], start, stop) for t in SEGMENTS + SOURCES}
        windows[name] = row
    months = []
    for month in sorted({d[:7] for d in common if d <= end}):
        days = sorted(d for d in common if d.startswith(month) and d <= end)
        row = {'month': month, 'days': len(days)}
        for key, data in series.items():
            row[key] = data[days[-1]] if key == 'weekly_users' else strict_sum(data[d] for d in days)
        row['net_installs'] = (row['installs'] - row['uninstalls']
                               if row['installs'] is not None and row['uninstalls'] is not None else None)
        months.append(row)
    snapshots = {}
    for title in SNAPSHOTS:
        row = next((r for r in tables[title] if r['date'] == end), None)
        values = {k: v for k, v in row.items() if k != 'date'} if row else {}
        snapshots[title] = {'date': end, 'values': values, 'total': total(row) if row else None}
    users = snapshots['一段时间内的每周用户数']['total']
    for title in ['每周用户数（按地区）', '每周用户数（按语言）', '每周用户数（按操作系统）']:
        row = snapshots[title]
        row['uncovered_difference'] = users - row['total'] if users is not None and row['total'] is not None else None
        row['shares_of_headline_total'] = {k: ratio(v, users) for k, v in row['values'].items()}
    all_totals = {k: strict_sum(v.values()) for k, v in series.items() if k != 'weekly_users'}
    source_coverage = {}
    for name, start, stop in [('all_export_dates', '0000', '9999'),
                              ('last7', windows['last7']['start'], end),
                              ('last28', windows['last28']['start'], end)]:
        views = strict_sum(v for d, v in series['views'].items() if start <= d <= stop)
        source_coverage[name] = {}
        for title in SOURCES:
            values = aggregate(tables[title], start, stop)
            covered = strict_sum(values.values())
            source_coverage[name][title] = {
                'tagged_views': covered, 'headline_views': views,
                'coverage_ratio': ratio(covered, views),
                'uncovered_difference': views - covered if views is not None and covered is not None else None,
                'labels': values,
            }
    return {'generated_at_utc': datetime.now(timezone.utc).isoformat(), 'as_of': as_of.isoformat(),
            'window_end': end, 'inventory': inventory, 'first_nonzero_core_date': first_nonzero,
            'all_zero_core_days': anomalies, 'all_totals': all_totals, 'monthly': months,
            'windows': windows, 'snapshots': snapshots, 'source_coverage': source_coverage,
            'all_segments': {t: aggregate(tables[t]) for t in SEGMENTS},
            'utm_all': {t: aggregate(tables[t]) for t in SOURCES},
            'rating_totals': aggregate(tables[RATINGS]), 'series': series,
            'trends': {str(n): {k: change(windows[f'last{n}'][k], windows[f'prior{n}'][k])
                                for k in CORE} for n in (7, 28)}}


def check_baseline(result, path):
    """One acceptance check against the original twenty-file analysis, not a test framework."""
    baseline = json.loads(path.read_text(encoding='utf-8'))
    checks = 0
    for key in ['all_totals', 'monthly', 'all_zero_core_days', 'rating_totals', 'utm_all', 'series']:
        assert result[key] == baseline[key], f'baseline mismatch: {key}'
        checks += 1
    for name, original in baseline['windows'].items():
        for key in ['start', 'end', 'days', *CORE, 'net_installs', 'segments']:
            assert result['windows'][name][key] == original[key], f'baseline mismatch: {name}.{key}'
            checks += 1
    for title in SNAPSHOTS:
        for key in ('date', 'values', 'total'):
            assert result['snapshots'][title][key] == baseline['snapshots'][title][key], title
            checks += 1
    assert len(result['inventory']) == len(baseline['inventory']), 'baseline file count'
    return {'status': 'Passed', 'checks': checks + 1, 'file': str(path)}


def fmt(value, places=0):
    return 'Unavailable' if value is None else f'{value:,.{places}f}'


def pct(value):
    return 'Unavailable' if value is None else f'{value:.1%}'


def markdown(data):
    lines = ['# Chrome Web Store measurement snapshot', '',
             f"导出文件：{len(data['inventory'])}；分析日：{data['as_of']}；共同窗口截止：{data['window_end']}。", '',
             '窗口排除分析日及未来日期。“完整”仅指日历与记录齐全，不保证后台已经定稿。零值保留，不插补。', '',
             '安装/卸载为包含返回用户的事件；周用户是安装相关统计，不是实际使用 WAU。',
             '安装/浏览、浏览/展示仅为汇总比值；不能作为逐用户转化率、留存率或因果证据。', '',
             '指标定义：[CWS metrics](https://developer.chrome.com/docs/webstore/metrics)。', '',
             '## 最近完整日历窗口', '',
             '| 窗口 | 安装事件 | 卸载事件 | 浏览 | 展示 | 末日商店周用户 | 疑似零日/缺行日 |',
             '|---|---:|---:|---:|---:|---:|---|']
    for name in ('prior7', 'last7', 'prior28', 'last28'):
        row = data['windows'][name]
        lines.append(f"| {name}: {row['start']}–{row['end']} | " + ' | '.join(
            fmt(row[k]) for k in CORE) + f" | {len(row['suspected_zero_dates'])}/{len(row['missing_core_dates'])} |")
    for days in (7, 28):
        current, prior = data['windows'][f'last{days}'], data['windows'][f'prior{days}']
        lines += ['', f"最近 {days} 天原始安装事件变化：{pct(data['trends'][str(days)]['installs'])}。"
                  f"非异常报告日安装均值：{fmt(prior['installs_per_non_anomalous_reporting_day'], 1)} → "
                  f"{fmt(current['installs_per_non_anomalous_reporting_day'], 1)}；仅作敏感性对照，不估补缺报。"]
    lines += ['', '| 原始总量/快照变化 | 最近7天 vs 前7天 | 最近28天 vs 前28天 |', '|---|---:|---:|']
    for key, label in CORE.items():
        lines.append(f"| {label} | {pct(data['trends']['7'][key])} | {pct(data['trends']['28'][key])} |")
    lines += ['', '疑似缺报日期（首个非零记录后，五项核心指标同时为零）：' +
              ('、'.join(data['all_zero_core_days']) or '无'), '', '## 末日用户结构', '']
    for title in ['每周用户数（按语言）', '每周用户数（按地区）', '每周用户数（按操作系统）']:
        row = data['snapshots'][title]
        lines += [f'### {title}', '', '| 标签 | 数量 | 占总周用户 |', '|---|---:|---:|']
        for key, value in sorted(row['values'].items(), key=lambda p: p[1] or 0, reverse=True)[:15]:
            lines.append(f"| {key} | {fmt(value)} | {pct(row['shares_of_headline_total'][key])} |")
        lines += [f"| 未覆盖差额 | {fmt(row['uncovered_difference'])} | "
                  f"{pct(ratio(row['uncovered_difference'], data['snapshots'][CORE['weekly_users']]['total']))} |", '']
    lines += ['## 来源覆盖', '', '维度分别计算，不能相加；未覆盖差额不等于自然搜索。标签文本不证明真实推荐渠道。', '',
              '| 窗口/维度 | 带标签浏览 | 全部浏览 | 比值 | 未覆盖差额 |', '|---|---:|---:|---:|---:|']
    for name, groups in data['source_coverage'].items():
        for title, row in groups.items():
            lines.append(f"| {name}/{title} | {fmt(row['tagged_views'])} | {fmt(row['headline_views'])} | "
                         f"{pct(row['coverage_ratio'])} | {fmt(row['uncovered_difference'])} |")
    lines += ['', '完整语言/地区/OS安装分项、月表、原始日序列、文件哈希和缺值数量见同目录 cws.json。',
              '来源缺失、末尾回填或分项未覆盖均保留；不把未知值写成 0。', '']
    if 'baseline_acceptance' in data:
        lines.append(f"历史汇总验收：{data['baseline_acceptance']['status']}，{data['baseline_acceptance']['checks']} 项比较。")
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='Directory containing the 20 Chinese CWS CSV reports')
    parser.add_argument('--output', type=Path, required=True, help='Snapshot directory under archive/')
    parser.add_argument('--as-of', type=date.fromisoformat, default=date.today(), help='Exclude this date and later')
    parser.add_argument('--compare-baseline', type=Path, help='Optional original analysis.json acceptance check')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to((ROOT / 'archive').resolve()):
        parser.error('--output must be under this repository archive/ (gitignored)')
    data = summarize(args.input, args.as_of)
    if args.compare_baseline:
        data['baseline_acceptance'] = check_baseline(data, args.compare_baseline)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'cws.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (args.output / 'cws.md').write_text(markdown(data), encoding='utf-8')
    print(f"{len(data['inventory'])} CSV files; window end {data['window_end']}; output {args.output}")
    if 'baseline_acceptance' in data:
        print(json.dumps(data['baseline_acceptance'], ensure_ascii=False))


if __name__ == '__main__':
    main()
