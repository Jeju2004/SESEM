<#
.SYNOPSIS
  Two-way sync between the Obsidian TroDes folder and the SESEM working folder.

.DESCRIPTION
  Primary : C:\Users\Chester\Documents\Jeju_Data\TroDes - Elderly Monitoring   (Obsidian vault bf3d9a0782ad4ea4)
  Mirror  : C:\Users\Chester\Documents\AA_Electronics Design (SESEM)

  The two folders use different layouts (numbered folders in Obsidian), so each
  file is mapped between them. For every pair, the newer file wins. Before a file
  is overwritten, the old copy is saved under <Mirror>\_sync_backup\<timestamp>\.
  Deletions are NOT propagated — delete in both places by hand.

  Code is not synced here; it lives in the GitHub repo (Jeju2004/SESEM).

.EXAMPLE
  pwsh -File Sync-TroDesVault.ps1 -WhatIf     # dry run, shows what would copy
  pwsh -File Sync-TroDesVault.ps1
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Primary = 'C:\Users\Chester\Documents\Jeju_Data\TroDes - Elderly Monitoring',
    [string]$Mirror  = 'C:\Users\Chester\Documents\AA_Electronics Design (SESEM)'
)

$ErrorActionPreference = 'Stop'

# Mirror top-level folder -> Primary top-level folder
$FolderMap = [ordered]@{
    'Current Design'   = '01 Current Design'
    'Archive'          = '02 Archive'
    'Reference'        = '04 Reference'
    'Attachments'      = '05 Attachments'
    'Progress Reports' = '06 Progress Reports'
    'Billing Form'     = '07 Billing Form'
    'Documentation'    = '08 Documentation'
}
# Mirror root files that live in Primary\03 Firmware
$FirmwareRootFiles = @('Phase 1 BLE POC.md', 'beacon.ino', 'wearable_phase1.ino', 'rssi_calibrate.py')

$Extensions = @('.md', '.canvas', '.docx', '.xlsx', '.pdf', '.png', '.jpg', '.ino', '.py')
# Mirror-side folders never synced (code is in GitHub; the rest is scratch/archive)
$MirrorExclude = @('_to_delete', '_sync_backup', 'Firmware', 'AA_Electronics Design (SESEM) - Compiled')

function ConvertTo-PrimaryRel([string]$rel) {
    $parts = $rel -split '\\', 2
    if ($parts.Count -eq 1) {
        if ($FirmwareRootFiles -contains $rel) { return "03 Firmware\$rel" }
        return $rel
    }
    if ($FolderMap.Contains($parts[0])) { return "$($FolderMap[$parts[0]])\$($parts[1])" }
    return $null
}

function ConvertTo-MirrorRel([string]$rel) {
    $parts = $rel -split '\\', 2
    if ($parts.Count -eq 1) { return $rel }
    if ($parts[0] -eq '03 Firmware') {
        if ($parts[1] -notmatch '\\') { return $parts[1] }
        return $null
    }
    foreach ($k in $FolderMap.Keys) {
        if ($FolderMap[$k] -eq $parts[0]) { return "$k\$($parts[1])" }
    }
    return $null
}

function Get-SyncFiles([string]$root, [string[]]$exclude) {
    Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        Where-Object {
            $rel = $_.FullName.Substring($root.Length + 1)
            $top = ($rel -split '\\')[0]
            ($Extensions -contains $_.Extension.ToLower()) -and
            -not $top.StartsWith('.') -and
            ($exclude -notcontains $top)
        } |
        ForEach-Object { $_.FullName.Substring($root.Length + 1) }
}

# Build the set of pairs from both sides
$pairs = @{}
foreach ($rel in Get-SyncFiles $Primary @()) {
    $m = ConvertTo-MirrorRel $rel
    if ($m) { $pairs[$rel.ToLower()] = @{ P = $rel; M = $m } }
}
foreach ($rel in Get-SyncFiles $Mirror $MirrorExclude) {
    $p = ConvertTo-PrimaryRel $rel
    if ($p -and -not $pairs.ContainsKey($p.ToLower())) { $pairs[$p.ToLower()] = @{ P = $p; M = $rel } }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $Mirror "_sync_backup\$stamp"
$copied = 0

function Copy-Synced([string]$src, [string]$dst, [string]$label) {
    if (Test-Path -LiteralPath $dst) {
        $bk = Join-Path $backupRoot $label
        New-Item -ItemType Directory -Force -Path (Split-Path $bk) | Out-Null
        Copy-Item -LiteralPath $dst -Destination $bk -Force
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
}

foreach ($pair in $pairs.Values | Sort-Object { $_.P }) {
    $pf = Join-Path $Primary $pair.P
    $mf = Join-Path $Mirror  $pair.M
    $pe = Test-Path -LiteralPath $pf
    $me = Test-Path -LiteralPath $mf

    if ($pe -and $me) {
        if ((Get-FileHash -LiteralPath $pf).Hash -eq (Get-FileHash -LiteralPath $mf).Hash) { continue }
        $pt = (Get-Item -LiteralPath $pf).LastWriteTimeUtc
        $mt = (Get-Item -LiteralPath $mf).LastWriteTimeUtc
        if ($pt -ge $mt) { $dir = 'P->M' } else { $dir = 'M->P' }
    } elseif ($pe) { $dir = 'P->M' } else { $dir = 'M->P' }

    if ($dir -eq 'P->M') {
        if ($PSCmdlet.ShouldProcess($pair.M, "Obsidian -> SESEM")) { Copy-Synced $pf $mf "SESEM\$($pair.M)" }
        Write-Host "  Obsidian -> SESEM : $($pair.P)"
    } else {
        if ($PSCmdlet.ShouldProcess($pair.P, "SESEM -> Obsidian")) { Copy-Synced $mf $pf "Obsidian\$($pair.P)" }
        Write-Host "  SESEM -> Obsidian : $($pair.M)"
    }
    $copied++
}

Write-Host "Sync complete: $copied file(s) updated, $($pairs.Count) tracked."
if ((Test-Path $backupRoot)) { Write-Host "Overwritten copies saved in $backupRoot" }
