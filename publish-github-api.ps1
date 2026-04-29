$ErrorActionPreference = "Stop"

$Repo = "TaotaoByte/tao-personal-nexus"
$Gh = "C:\Program Files\GitHub CLI\gh.exe"
$Root = $PSScriptRoot

Set-Location $Root

if (-not (Test-Path $Gh)) {
  throw "GitHub CLI not found at $Gh"
}

Write-Host "Checking GitHub CLI login..."
& $Gh auth status
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated."
}

function Invoke-NativeQuiet {
  param(
    [Parameter(Mandatory = $true)]
    [string] $FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
  )

  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $FilePath @Arguments 2>$null | Out-Null
    return $LASTEXITCODE
  } catch {
    return 1
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
}

function Invoke-GhApiGet {
  param(
    [Parameter(Mandatory = $true)]
    [string] $ApiPath,
    [string] $Jq = "",
    [int] $MaxAttempts = 6
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt += 1) {
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      if ([string]::IsNullOrWhiteSpace($Jq)) {
        $output = & $Gh api $ApiPath 2>&1
      } else {
        $output = & $Gh api $ApiPath --jq $Jq 2>&1
      }
      $exitCode = $LASTEXITCODE
    } catch {
      $output = $_.Exception.Message
      $exitCode = 1
    } finally {
      $ErrorActionPreference = $previousErrorAction
    }

    if ($exitCode -eq 0) {
      return ($output -join "`n")
    }

    Write-Host "GitHub API GET failed, attempt $attempt/$MaxAttempts`: $ApiPath"
    if ($attempt -lt $MaxAttempts) {
      Start-Sleep -Seconds ([Math]::Min(20, 2 * $attempt))
    }
  }

  throw "GitHub API GET failed after $MaxAttempts attempts: $ApiPath"
}

function Invoke-GhApiWithBody {
  param(
    [Parameter(Mandatory = $true)]
    [string] $ApiPath,
    [Parameter(Mandatory = $true)]
    [string] $Method,
    [Parameter(Mandatory = $true)]
    [object] $Body,
    [string] $Jq = "",
    [int] $MaxAttempts = 6
  )

  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    $json = $Body | ConvertTo-Json -Depth 30
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tmp, $json, $utf8NoBom)

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt += 1) {
      $previousErrorAction = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      try {
        if ([string]::IsNullOrWhiteSpace($Jq)) {
          $output = & $Gh api $ApiPath --method $Method --input $tmp 2>&1
        } else {
          $output = & $Gh api $ApiPath --method $Method --input $tmp --jq $Jq 2>&1
        }
        $exitCode = $LASTEXITCODE
      } catch {
        $output = $_.Exception.Message
        $exitCode = 1
      } finally {
        $ErrorActionPreference = $previousErrorAction
      }

      if ($exitCode -eq 0) {
        return ($output -join "`n")
      }

      Write-Host "GitHub API $Method failed, attempt $attempt/$MaxAttempts`: $ApiPath"
      if ($attempt -lt $MaxAttempts) {
        Start-Sleep -Seconds ([Math]::Min(20, 2 * $attempt))
      }
    }

    throw "GitHub API $Method failed after $MaxAttempts attempts: $ApiPath"
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Checking repository: $Repo"
$repoStatus = Invoke-NativeQuiet $Gh repo view $Repo
if ($repoStatus -ne 0) {
  Write-Host "Repository does not exist. Creating..."
  & $Gh repo create $Repo --public
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create repository."
  }
}

function ConvertTo-RepoPath {
  param([string] $FullName)
  $rootPath = (Resolve-Path $Root).Path.TrimEnd("\", "/")
  $filePath = (Resolve-Path $FullName).Path
  if (-not $filePath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "File is outside repository root: $FullName"
  }
  $relative = $filePath.Substring($rootPath.Length).TrimStart("\", "/")
  return ($relative -replace "\\", "/")
}

function Test-SkipFile {
  param([System.IO.FileInfo] $File)
  $repoPath = ConvertTo-RepoPath $File.FullName
  if ($repoPath -match "^\.git/") { return $true }
  if ($repoPath -match "^node_modules/") { return $true }
  if ($repoPath -eq ".env") { return $true }
  if ($repoPath -match "\.log$") { return $true }
  if ($repoPath -match "\.tmp$") { return $true }
  return $false
}

function Ensure-RepositoryInitialized {
  Write-Host "Checking main branch..."
  $refStatus = Invoke-NativeQuiet $Gh api "repos/$Repo/git/ref/heads/main"
  if ($refStatus -eq 0) {
    return
  }

  Write-Host "Repository is empty. Creating initial README commit..."
  $seedContent = [System.Text.Encoding]::UTF8.GetBytes("# Tao Personal Nexus`n")
  $seedBase64 = [Convert]::ToBase64String($seedContent)
  $seedPayload = @{
    message = "Initialize repository"
    content = $seedBase64
    branch = "main"
  }

  Invoke-GhApiWithBody "repos/$Repo/contents/README.md" "PUT" $seedPayload | Out-Null
}

Ensure-RepositoryInitialized

Write-Host "Collecting files..."
$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object { -not (Test-SkipFile $_) }
if ($files.Count -eq 0) {
  throw "No files to publish."
}

$tree = New-Object System.Collections.Generic.List[object]
$index = 0

foreach ($file in $files) {
  $index += 1
  $repoPath = ConvertTo-RepoPath $file.FullName
  Write-Host "[$index/$($files.Count)] Uploading blob: $repoPath"
  $base64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($file.FullName))
  $payload = @{
    content = $base64
    encoding = "base64"
  }

  $blob = Invoke-GhApiWithBody "repos/$Repo/git/blobs" "POST" $payload ".sha"

  $tree.Add([ordered]@{
    path = $repoPath
    mode = "100644"
    type = "blob"
    sha = $blob.Trim()
  })
}

$baseCommit = $null
$baseTree = $null
$refExists = $false

Write-Host "Checking main branch..."
$baseCommit = Invoke-GhApiGet "repos/$Repo/git/ref/heads/main" ".object.sha"
if (-not [string]::IsNullOrWhiteSpace($baseCommit)) {
  $refExists = $true
  $baseCommit = $baseCommit.Trim()
  $baseTree = Invoke-GhApiGet "repos/$Repo/git/commits/$baseCommit" ".tree.sha"
  $baseTree = $baseTree.Trim()
}

Write-Host "Creating tree..."
$treePayload = @{
  tree = $tree
}
if ($baseTree) {
  $treePayload.base_tree = $baseTree
}

$treeSha = Invoke-GhApiWithBody "repos/$Repo/git/trees" "POST" $treePayload ".sha"
$treeSha = $treeSha.Trim()

Write-Host "Creating commit..."
$commitPayload = @{
  message = "Publish personal site"
  tree = $treeSha
}
if ($refExists) {
  $commitPayload.parents = @($baseCommit)
}

$commitSha = Invoke-GhApiWithBody "repos/$Repo/git/commits" "POST" $commitPayload ".sha"
$commitSha = $commitSha.Trim()

if ($refExists) {
  Write-Host "Updating main branch..."
  $refPayload = @{
    sha = $commitSha
    force = $true
  }

  Invoke-GhApiWithBody "repos/$Repo/git/refs/heads/main" "PATCH" $refPayload | Out-Null
} else {
  Write-Host "Creating main branch..."
  $refPayload = @{
    ref = "refs/heads/main"
    sha = $commitSha
  }

  Invoke-GhApiWithBody "repos/$Repo/git/refs" "POST" $refPayload | Out-Null
}

Write-Host "Setting default branch..."
Invoke-GhApiWithBody "repos/$Repo" "PATCH" @{ default_branch = "main" } | Out-Null

Write-Host "Done: https://github.com/$Repo"
