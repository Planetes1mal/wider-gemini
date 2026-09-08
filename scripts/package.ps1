# Builds the same extension ZIP locally and in CI. Requires Windows PowerShell 5.1 or PowerShell 7.
[CmdletBinding()]
param(
    [string]$OutputDirectory,
    [string]$Tag,
    [string]$ReleaseNotesPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
$part = '(0|[1-9][0-9]{0,4})'
if ($version -isnot [string] -or $version -notmatch "\A$part\.$part\.$part\z" -or $version -eq '0.0.0') {
    throw 'manifest.version must be a nonzero x.y.z Chrome version without leading zeros.'
}
foreach ($number in $version.Split('.')) {
    if ([int]$number -gt 65535) { throw 'Chrome version components must be at most 65535.' }
}

$releaseVersion = $version
$versionName = $manifest.PSObject.Properties['version_name']
if ($null -ne $versionName) {
    $releaseVersion = $versionName.Value
    $candidatePattern = '\A' + [regex]::Escape($version) + '-(alpha|beta|rc)\.[1-9][0-9]*\z'
    if ($releaseVersion -isnot [string] -or
        ($releaseVersion -cne $version -and $releaseVersion -cnotmatch $candidatePattern)) {
        throw 'version_name must match version or append -alpha.N, -beta.N, or -rc.N (N >= 1).'
    }
}
$isPrerelease = $releaseVersion -cne $version
if ($Tag -and $Tag -cne "v$releaseVersion") {
    throw "Tag '$Tag' does not match release version 'v$releaseVersion'."
}

# Match a whole dated heading: 2.6.0 must never select 2.6.0-rc.1, nor rc.1 select rc.10.
$changelog = Get-Content -LiteralPath (Join-Path $repoRoot 'CHANGELOG.md') -Raw -Encoding UTF8
$heading = '(?ms)^## ' + [regex]::Escape($releaseVersion) + ' \([0-9]{4}-[0-9]{2}-[0-9]{2}\)\r?\n(.*?)(?=^## |\z)'
$sections = [regex]::Matches($changelog, $heading)
if ($sections.Count -ne 1 -or [string]::IsNullOrWhiteSpace($sections[0].Groups[1].Value)) {
    throw "Expected exactly one nonempty dated CHANGELOG section for $releaseVersion."
}
$releaseNotes = $sections[0].Groups[1].Value.Trim()

# Explicit allowlist: source docs, tests, scripts, and promotional images stay outside the ZIP.
$files = @(
    'manifest.json', 'popup.html', 'popup.js', 'popup.css', 'settings-utils.js',
    'gemini-content.js', 'gemini-content.css', 'background.js', 'LICENSE',
    'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
    '_locales/en/messages.json', '_locales/zh_CN/messages.json'
)
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $file) -PathType Leaf)) {
        throw "Missing package file: $file"
    }
}
if (-not $OutputDirectory) { $OutputDirectory = $repoRoot }
$outputRoot = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory)
[void][System.IO.Directory]::CreateDirectory($outputRoot)
$archivePath = Join-Path $outputRoot "wider-gemini-$releaseVersion.zip"
$temporaryZip = Join-Path $outputRoot ('.wider-gemini-' + [guid]::NewGuid().ToString('N') + '.zip')

Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
try {
    $archive = [System.IO.Compression.ZipFile]::Open($temporaryZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, (Join-Path $repoRoot $file), $file, [System.IO.Compression.CompressionLevel]::Optimal
            )
        }
    } finally {
        $archive.Dispose()
    }
    if ($ReleaseNotesPath) {
        $notesPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ReleaseNotesPath)
        [System.IO.File]::WriteAllText($notesPath, $releaseNotes, [System.Text.UTF8Encoding]::new($false))
    }
    Move-Item -LiteralPath $temporaryZip -Destination $archivePath -Force
} finally {
    # Both paths are direct children of the resolved output directory; only remove our temporary file.
    if (Test-Path -LiteralPath $temporaryZip -PathType Leaf) {
        Remove-Item -LiteralPath $temporaryZip -Force
    }
}

Write-Host "Built $archivePath"
[pscustomobject]@{
    Version = $releaseVersion
    ManifestVersion = $version
    Prerelease = $isPrerelease
    ArchivePath = $archivePath
}
