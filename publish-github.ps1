$ErrorActionPreference = "Stop"

$Repo = "TaotaoByte/tao-personal-nexus"
$RepoUrl = "https://github.com/$Repo.git"
$Gh = "C:\Program Files\GitHub CLI\gh.exe"

Set-Location $PSScriptRoot

if (-not (Test-Path $Gh)) {
  throw "GitHub CLI not found at $Gh"
}

Write-Host "Checking GitHub CLI login..."
& $Gh auth status

Write-Host "Checking local repository..."
git status --short --branch

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

$repoExists = (Invoke-NativeQuiet $Gh repo view $Repo) -eq 0

if ($repoExists) {
  Write-Host "Repository exists: $Repo"
  Invoke-NativeQuiet git remote remove origin | Out-Null
  git remote add origin $RepoUrl
  git push -u origin main
  if ($LASTEXITCODE -ne 0) {
    throw "git push failed. The repository may exist but still be empty. Please check your network and rerun this script or run: git push -u origin main"
  }
} else {
  Write-Host "Creating repository: $Repo"
  Invoke-NativeQuiet git remote remove origin | Out-Null
  & $Gh repo create $Repo --public --source "." --remote origin --push
  if ($LASTEXITCODE -ne 0) {
    throw "Repository creation or push failed. If the repository was created, rerun this script or run: git push -u origin main"
  }
}

Write-Host "Done: https://github.com/$Repo"
