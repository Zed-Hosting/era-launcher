# Generates resources/modlist.example.json from the three base mods staged by
# Vortex at C:\Users\adame\AppData\Roaming\Vortex\skyrimse\mods. Re-run after
# updating the source folders to refresh hashes.
param(
  [string]$VortexRoot = 'C:\Users\adame\AppData\Roaming\Vortex\skyrimse\mods',
  [string]$Out = (Join-Path $PSScriptRoot '..\resources\modlist.example.json')
)

$ErrorActionPreference = 'Stop'

function Hash-Mod {
  param(
    [string]$Folder,
    [string]$DataPrefix = '',     # prepend to every file's install path
    [string[]]$Skip = @()         # path regex patterns to skip
  )
  $base = Join-Path $VortexRoot $Folder
  if (-not (Test-Path -LiteralPath $base)) { throw "Missing folder: $base" }
  $files = @()
  Get-ChildItem -LiteralPath $base -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1) -replace '\\','/'
    foreach ($s in $Skip) { if ($rel -match $s) { return } }
    $h = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
    $installPath = if ($DataPrefix) { "$DataPrefix/$rel" } else { $rel }
    $files += [ordered]@{
      path   = $installPath
      sha256 = $h
      size   = [int64]$_.Length
    }
  }
  return ,$files
}

$skseFiles    = Hash-Mod -Folder 'Skyrim Script Extender (SKSE64)-30379-2-2-6-1705522967' -Skip @('^src/')
$addrlibFiles = Hash-Mod -Folder 'All in one (all game versions)-32444-11-1770897704'     -DataPrefix 'Data'
$strFiles     = Hash-Mod -Folder 'Skyrim Together Reborn-69993-1-8-0-1762551509'           -DataPrefix 'Data'

$manifest = [ordered]@{
  schemaVersion = 1
  name          = 'ERA Base'
  version       = '1.0.0'
  gameVersion   = '1.6.1170'
  strVersion    = '1.8.0'
  publishedAt   = (Get-Date).ToString('o')
  mods = @(
    [ordered]@{
      id             = 'skse64'
      displayName    = 'Skyrim Script Extender (SKSE64)'
      source         = 'url'
      sourceRef      = 'REPLACE_ME: https://your-host/skse64_2_02_06.zip'
      files          = $skseFiles
      loadOrderIndex = 10
      notes          = 'SKSE 2.2.6 for Skyrim SE 1.6.1170. No .esp. Distribute the zip of your Vortex staging folder OR point at https://skse.silverlock.org/beta/skse64_2_02_06.7z (note: archive layout differs slightly; launcher uses basename-match so it still resolves).'
    }
    [ordered]@{
      id             = 'addrlib-aio'
      displayName    = 'Address Library for SKSE Plugins (All-In-One)'
      source         = 'nexus'
      sourceRef      = '32444/REPLACE_ME_FILE_ID'
      files          = $addrlibFiles
      loadOrderIndex = 20
      notes          = 'Nexus mod 32444 file 11 (AIO). Requires Nexus Premium API key (Settings tab). Or repackage as zip and use source=url.'
    }
    [ordered]@{
      id             = 'skyrim-together-reborn'
      displayName    = 'Skyrim Together Reborn'
      source         = 'nexus'
      sourceRef      = '69993/REPLACE_ME_FILE_ID'
      files          = $strFiles
      plugin         = 'SkyrimTogether.esp'
      loadOrderIndex = 30
      notes          = 'Nexus mod 69993 v1.8.0. Or use source=github with sourceRef "tiltedphoques/TiltedEvolution@<tag>/<asset.zip>". Or repackage and use source=url.'
    }
  )
}

# Use Depth 99 so files[] arrays don't get truncated.
$json = $manifest | ConvertTo-Json -Depth 99
[System.IO.File]::WriteAllText($Out, $json, [System.Text.UTF8Encoding]::new($false))
"Wrote $Out"
"  skse:    $($skseFiles.Count) files"
"  addrlib: $($addrlibFiles.Count) files"
"  str:     $($strFiles.Count) files"
