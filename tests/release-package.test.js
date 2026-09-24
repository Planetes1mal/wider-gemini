const assert = require('assert');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const sourceRoot = path.resolve(__dirname, '..');
const powershell = process.env.WG_POWERSHELL || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wider-gemini release '));
const fixtureRoot = path.join(tempRoot, 'extension source');
const outputRoot = path.join(tempRoot, 'release output');
const externalCwd = path.join(tempRoot, 'external working directory');
const notesPath = path.join(tempRoot, 'release notes.md');
const manifestPath = path.join(fixtureRoot, 'manifest.json');
const changelogPath = path.join(fixtureRoot, 'CHANGELOG.md');
const runnerPath = path.join(tempRoot, 'run-package.ps1');
const files = [
    'manifest.json', 'popup.html', 'popup.js', 'popup.css', 'settings-utils.js',
    'help.html', 'help.css', 'help.js',
    'gemini-content.js', 'gemini-content.css', 'background.js', 'LICENSE',
    'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
    '_locales/en/messages.json', '_locales/zh_CN/messages.json', '_locales/zh_TW/messages.json',
    '_locales/ko/messages.json', '_locales/ja/messages.json', '_locales/es/messages.json'
];
const baseManifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
const noteBodies = {
    '2.6.0-rc.10': 'RC ten: must not be selected for rc.1.',
    '2.6.0-rc.1': '### Fixes\n\nRC one: 中文测试说明。',
    '2.6.0-rc.2': '### Fixes\n\nRC two: follow-up verification.',
    '2.6.0': '### Fixes\n\nStable release only.'
};
const changelog = '# Changelog\n\n' + Object.entries(noteBodies)
    .map(([version, body]) => `## ${version} (2026-09-08)\n\n${body}\n\n`).join('');
let checks = 0;

function writeManifest(overrides = {}) {
    const manifest = { ...baseManifest, version: '2.6.0', version_name: '2.6.0-rc.1', ...overrides };
    if (manifest.version_name === undefined) delete manifest.version_name;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
}

function hashFile(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function outputSnapshot() {
    return fs.readdirSync(outputRoot).sort().map(name => [name, hashFile(path.join(outputRoot, name))]);
}

function runPackage(tag = 'v2.6.0-rc.1') {
    const result = spawnSync(powershell, [
        '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', runnerPath,
        '-RepoRoot', fixtureRoot, '-OutputDirectory', outputRoot, '-Tag', tag, '-NotesPath', notesPath
    ], { cwd: externalCwd, encoding: 'utf8', timeout: 30000 });
    assert.ifError(result.error);
    return result;
}

function expectSuccess(version, prerelease) {
    const result = runPackage(`v${version}`);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const jsonLine = result.stdout.split(/\r?\n/).find(line => line.startsWith('RESULT:'));
    assert.ok(jsonLine, `Missing runner output: ${result.stdout}`);
    const report = JSON.parse(jsonLine.slice('RESULT:'.length));
    assert.strictEqual(report.Package.Version, version);
    assert.strictEqual(report.Package.ManifestVersion, '2.6.0');
    assert.strictEqual(report.Package.Prerelease, prerelease);
    assert.strictEqual(report.Package.ArchivePath, path.join(outputRoot, `wider-gemini-${version}.zip`));
    assert.strictEqual(fs.readFileSync(notesPath, 'utf8'), noteBodies[version]);
    assert.deepStrictEqual(report.Entries.map(entry => entry.Name).sort(), [...files].sort());
    for (const entry of report.Entries) {
        assert.strictEqual(entry.Hash, hashFile(path.join(fixtureRoot, entry.Name)), entry.Name);
    }
    assert.ok(!fs.readdirSync(outputRoot).some(name => name.startsWith('.wider-gemini-')));
    checks++;
}

function expectFailure(message, tag) {
    const before = outputSnapshot();
    const result = runPackage(tag);
    assert.notStrictEqual(result.status, 0, `Packaging unexpectedly succeeded: ${result.stdout}`);
    assert.match(result.stderr + result.stdout, message);
    assert.deepStrictEqual(outputSnapshot(), before, 'Failed packaging must preserve existing ZIPs and leave no temp ZIP');
    checks++;
}

try {
    for (const directory of [fixtureRoot, outputRoot, externalCwd, path.join(fixtureRoot, 'scripts')]) {
        fs.mkdirSync(directory, { recursive: true });
    }
    for (const file of files) {
        const destination = path.join(fixtureRoot, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(sourceRoot, file), destination);
    }
    fs.copyFileSync(path.join(sourceRoot, 'scripts/package.ps1'), path.join(fixtureRoot, 'scripts/package.ps1'));
    for (const file of ['README.md', '.env', 'tests/local.test.js', 'icons/promotion/unwanted.png']) {
        const destination = path.join(fixtureRoot, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, 'This file must never enter the release ZIP.');
    }
    fs.writeFileSync(changelogPath, changelog);
    // Load ZIP inspection assemblies only after invoking the real packager so its own dependencies are tested.
    fs.writeFileSync(runnerPath, `param([string]$RepoRoot, [string]$OutputDirectory, [string]$Tag, [string]$NotesPath)
$ErrorActionPreference = 'Stop'
$package = & (Join-Path $RepoRoot 'scripts/package.ps1') -OutputDirectory $OutputDirectory -Tag $Tag -ReleaseNotesPath $NotesPath
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($package.ArchivePath)
try {
    $entries = @(foreach ($entry in $archive.Entries) {
        $stream = $entry.Open()
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
            [pscustomobject]@{
                Name = $entry.FullName
                Hash = [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
            }
        } finally { $stream.Dispose(); $sha.Dispose() }
    })
} finally { $archive.Dispose() }
$report = [pscustomobject]@{ Package = $package; Entries = $entries }
Write-Output ('RESULT:' + ($report | ConvertTo-Json -Depth 5 -Compress))
`);

    writeManifest();
    expectSuccess('2.6.0-rc.1', true);
    writeManifest({ version_name: '2.6.0-rc.2' });
    expectSuccess('2.6.0-rc.2', true);
    writeManifest({ version_name: undefined });
    expectSuccess('2.6.0', false);

    writeManifest();
    expectFailure(/does not match release version/, 'v2.6.0');
    for (const version of ['02.6.0', '65536.0.0', '2.6.0-rc.1', '2.6.0\n']) {
        writeManifest({ version });
        expectFailure(/manifest\.version must|Chrome version components/);
    }
    for (const versionName of ['2.7.0-rc.1', '2.6.0-rc.1\n']) {
        writeManifest({ version_name: versionName });
        expectFailure(/version_name must/);
    }

    writeManifest();
    const missingFile = path.join(fixtureRoot, 'background.js');
    fs.unlinkSync(missingFile);
    expectFailure(/Missing package file/);
    fs.copyFileSync(path.join(sourceRoot, 'background.js'), missingFile);

    fs.writeFileSync(changelogPath, '## 2.6.0-rc.10 (2026-09-08)\n\nOnly rc.10 exists.\n');
    expectFailure(/Expected exactly one nonempty dated CHANGELOG section/);
    fs.writeFileSync(changelogPath, changelog + '## 2.6.0-rc.1 (2026-09-08)\n\nDuplicate.\n');
    expectFailure(/Expected exactly one nonempty dated CHANGELOG section/);
    fs.writeFileSync(changelogPath, '## 2.6.0-rc.1 (2026-09-08)\n\n');
    expectFailure(/Expected exactly one nonempty dated CHANGELOG section/);
    fs.unlinkSync(changelogPath);
    expectFailure(/CHANGELOG\.md/);

    console.log(`release-package: ${checks} checks passed (${powershell})`);
} finally {
    // Resolve and verify the one temporary fixture root before deleting it recursively.
    const cleanupPath = path.resolve(tempRoot);
    assert.strictEqual(path.dirname(cleanupPath), path.resolve(os.tmpdir()));
    assert.ok(path.basename(cleanupPath).startsWith('wider-gemini release '));
    fs.rmSync(cleanupPath, { recursive: true, force: true });
}
