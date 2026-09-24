"""Save public GitHub counts and, only with an already logged-in gh, private traffic."""
import argparse
import json
import shutil
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADERS = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10',
           'User-Agent': 'wider-gemini-local-measurement'}


def unavailable(reason):
    return {'status': 'Unavailable', 'reason': reason, 'data': None}


def public_get(endpoint):
    request = urllib.request.Request('https://api.github.com/' + endpoint, headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return {'status': 'Available', 'data': json.load(response)}
    except urllib.error.HTTPError as error:
        return unavailable(f'Public API HTTP {error.code}; no value inferred')
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return unavailable('Public API network or JSON error; no value inferred')


def public_releases(repo):
    releases, page = [], 1
    while True:
        result = public_get(f'repos/{repo}/releases?per_page=100&page={page}')
        if result['status'] != 'Available':
            return result  # Do not present a partial sum as complete.
        for release in result['data']:
            releases.append({
                'id': release['id'], 'tag_name': release['tag_name'],
                'prerelease': release['prerelease'], 'published_at': release['published_at'],
                'assets': [{k: asset[k] for k in ('id', 'name', 'download_count')}
                           for asset in release['assets']],
            })
        if len(result['data']) < 100:
            break
        page += 1
    return {'status': 'Available', 'data': {
        'releases_count': len(releases),
        'asset_downloads_total': sum(a['download_count'] for r in releases for a in r['assets']),
        'releases': releases,
    }}


def traffic_get(gh, endpoint):
    # gh supplies its existing auth internally. Never read, print or save a credential.
    try:
        result = subprocess.run([gh, 'api', '--hostname', 'github.com', '--method', 'GET',
                                 '-H', 'Accept: application/vnd.github+json',
                                 '-H', 'X-GitHub-Api-Version: 2026-03-10', endpoint],
                                capture_output=True, text=True, encoding='utf-8', timeout=40)
        if result.returncode:
            return unavailable('Authenticated gh GET failed (permission, rate limit or network); no value inferred')
        return {'status': 'Available', 'data': json.loads(result.stdout)}
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        return unavailable('Authenticated gh GET timeout or invalid JSON; no value inferred')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default='Planetes1mal/wider-gemini')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to((ROOT / 'archive').resolve()):
        parser.error('--output must be under this repository archive/ (gitignored)')
    metadata = public_get(f'repos/{args.repo}')
    if metadata['status'] == 'Available':
        data = metadata['data']
        metadata['data'] = {k: data.get(k) for k in (
            'full_name', 'html_url', 'stargazers_count', 'forks_count', 'subscribers_count',
            'open_issues_count', 'description', 'homepage', 'topics', 'license', 'pushed_at', 'updated_at')}
    releases = public_releases(args.repo)
    gh = shutil.which('gh')
    auth_reason = 'gh is not on PATH; private traffic was not requested'
    authenticated = False
    if gh:
        try:
            authenticated = subprocess.run([gh, 'auth', 'status', '--hostname', 'github.com'],
                                           capture_output=True, timeout=15).returncode == 0
            auth_reason = 'gh has no usable existing github.com login; private traffic was not requested'
        except subprocess.TimeoutExpired:
            auth_reason = 'gh auth status timed out; private traffic was not requested'
    traffic = {name: traffic_get(gh, f'repos/{args.repo}/traffic/{endpoint}') if authenticated
               else unavailable(auth_reason) for name, endpoint in (
                   ('views', 'views?per=day'), ('clones', 'clones?per=day'),
                   ('referrers', 'popular/referrers'), ('paths', 'popular/paths'))}
    snapshot = {'captured_at_utc': datetime.now(timezone.utc).isoformat(), 'repo': args.repo,
                'public': metadata, 'releases': releases, 'traffic': traffic,
                'traffic_window': 'Last 14 days returned by GitHub, UTC; current day may be incomplete',
                'notes': ['Unavailable means unknown, never zero.',
                          'Traffic windows overlap; do not add snapshot totals or sum daily uniques.',
                          'Downloads count existing release asset download events, not users.',
                          'open_issues_count includes pull requests; stars are a point-in-time stock.']}
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'github.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = ['# GitHub measurement snapshot', '', f"仓库：{args.repo}；UTC 采集时间：{snapshot['captured_at_utc']}", '',
             '| 指标 | 数值/状态 |', '|---|---|']
    data = metadata.get('data') or {}
    for key in ('stargazers_count', 'forks_count', 'subscribers_count', 'open_issues_count'):
        lines.append(f"| {key} | {data.get(key, 'Unavailable')} |")
    for key in ('releases_count', 'asset_downloads_total'):
        lines.append(f"| {key} | {(releases.get('data') or {}).get(key, 'Unavailable')} |")
    for key, result in traffic.items():
        value = json.dumps(result['data'], ensure_ascii=False) if result['status'] == 'Available' else result['reason']
        lines.append(f"| traffic/{key} | {result['status']}: {value} |")
    lines += ['', '公开计数为采集时点；traffic 是滚动 14 天，当前 UTC 日可能未完整。不可用不等于零。',
              '私有流量不公开上传。每日 unique 不相加，重叠快照总数不相加；累计 stars 差值仅为净变化。',
              'Release 下载事件不是用户数，资产删除/替换会影响可见累计值。', '',
              '[Traffic API](https://docs.github.com/en/rest/metrics/traffic)',
              '[Traffic graph](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)', '']
    (args.output / 'github.md').write_text('\n'.join(lines), encoding='utf-8')
    print(f"GitHub public={metadata['status']}; traffic/views={traffic['views']['status']}; output {args.output}")


if __name__ == '__main__':
    main()
