"""Append a local weekly ledger row from existing CWS and GitHub snapshots; no network."""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def value_or_unavailable(value):
    return 'Unavailable' if value is None else value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path, help='Directory containing cws.json and github.json')
    parser.add_argument('--ledger', type=Path, default=ROOT / 'archive/measurement/weekly.csv')
    parser.add_argument('--github-traffic-json', type=Path, help='Explicit, sourced manual UI traffic observation')
    parser.add_argument('--note', default='')
    args = parser.parse_args()
    if not args.ledger.resolve().is_relative_to((ROOT / 'archive').resolve()):
        parser.error('--ledger must be under this repository archive/ (gitignored)')
    cws = json.loads((args.snapshot / 'cws.json').read_text(encoding='utf-8'))
    github = json.loads((args.snapshot / 'github.json').read_text(encoding='utf-8'))
    traffic_ui = (json.loads(args.github_traffic_json.read_text(encoding='utf-8'))
                  if args.github_traffic_json else None)
    row = {'github_captured_at_utc': github['captured_at_utc'], 'cws_as_of': cws['as_of'],
           'cws_window_end': cws['window_end']}
    for days in (7, 28):
        window = cws['windows'][f'last{days}']
        for key in ('installs', 'uninstalls', 'views', 'impressions', 'weekly_users'):
            row[f'cws_{key}_{days}d'] = value_or_unavailable(window[key])
        row[f'cws_suspected_zero_days_{days}d'] = len(window['suspected_zero_dates'])
        row[f'cws_missing_core_days_{days}d'] = len(window['missing_core_dates'])
    public = github['public']['data'] or {}
    for key in ('stargazers_count', 'forks_count'):
        row[key] = value_or_unavailable(public.get(key))
    row['asset_downloads_total'] = value_or_unavailable((github['releases']['data'] or {}).get('asset_downloads_total'))
    for key in ('views', 'clones'):
        traffic = github['traffic'][key]
        row[f'github_{key}_api_status'] = traffic['status']
        measured = traffic_ui['traffic'][key] if traffic_ui else traffic['data'] or {}
        row[f'github_{key}_measurement_source'] = 'ObservedUI' if traffic_ui else traffic['status']
        for metric in ('count', 'uniques'):
            row[f'github_{key}_{metric}_14d'] = value_or_unavailable(measured.get(metric))
    row['github_traffic_source_url'] = (traffic_ui['source_url'] if traffic_ui
                                       else f"https://api.github.com/repos/{github['repo']}/traffic")
    row['github_traffic_observed_utc_date'] = (traffic_ui['observed_utc_date'] if traffic_ui
                                             else github['captured_at_utc'][:10])
    row['github_traffic_displayed_start'] = traffic_ui['displayed_window']['start'] if traffic_ui else 'API rolling 14d'
    row['github_traffic_displayed_end'] = traffic_ui['displayed_window']['end'] if traffic_ui else 'API rolling 14d'
    previous = []
    if args.ledger.exists():
        with args.ledger.open(encoding='utf-8-sig', newline='') as stream:
            previous = list(csv.DictReader(stream))
    if any(r['github_captured_at_utc'] == row['github_captured_at_utc'] and
           r['cws_window_end'] == row['cws_window_end'] for r in previous):
        print('Snapshot already recorded; ledger unchanged')
        return
    prior = previous[-1] if previous else {}
    row['previous_github_captured_at_utc'] = prior.get('github_captured_at_utc', 'Unavailable')
    row['cws_days_since_previous_end'] = 'Unavailable'
    if prior:
        from datetime import date
        row['cws_days_since_previous_end'] = (
            date.fromisoformat(row['cws_window_end']) - date.fromisoformat(prior['cws_window_end'])).days
    for key in ('stargazers_count', 'forks_count', 'asset_downloads_total'):
        before, after = prior.get(key, 'Unavailable'), row[key]
        row[f'{key}_delta_since_previous'] = (float(after) - float(before)
                                             if 'Unavailable' not in (before, after) else 'Unavailable')
    row['snapshot_directory'] = str(args.snapshot)
    row['note'] = args.note
    args.ledger.parent.mkdir(parents=True, exist_ok=True)
    with args.ledger.open('a', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(row))
        if not previous:
            writer.writeheader()
        writer.writerow(row)
    print(f'Ledger row appended: {args.ledger}')


if __name__ == '__main__':
    main()
