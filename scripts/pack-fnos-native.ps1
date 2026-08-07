#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$OutName = "xueji-fnos-native-$Stamp"
$Stage = Join-Path $Root "release\$OutName"
$ZipPath = Join-Path $Root "release\$OutName.zip"
$Template = Join-Path $Root 'deploy\fnos-native'

Write-Host "==> Root: $Root"
Write-Host "==> Output: $ZipPath"

Write-Host '==> Build API...'
Push-Location (Join-Path $Root 'apps\api')
try {
  if (-not (Test-Path 'node_modules')) {
    npm install --registry=https://registry.npmmirror.com
  }
  npm run build
  if (-not (Test-Path 'dist\main.js')) { throw 'API build failed: dist/main.js missing' }
  if (-not (Test-Path 'dist\run-migrations.js')) { throw 'API build failed: dist/run-migrations.js missing' }
}
finally {
  Pop-Location
}

Write-Host '==> Build Web...'
Push-Location (Join-Path $Root 'apps\web')
try {
  if (-not (Test-Path 'node_modules')) {
    npm install --registry=https://registry.npmmirror.com
  }
  npm run build
  if (-not (Test-Path 'dist\index.html')) { throw 'Web build failed: dist/index.html missing' }
}
finally {
  Pop-Location
}

Write-Host '==> Assemble package...'
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'api') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'web') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'data\uploads') | Out-Null
Set-Content -Path (Join-Path $Stage 'data\uploads\.gitkeep') -Value '' -Encoding utf8

Copy-Item (Join-Path $Template 'README.txt') $Stage
Copy-Item (Join-Path $Template 'IMPORT_DB.txt') $Stage
Copy-Item (Join-Path $Template 'schema-blank.sql') $Stage
Copy-Item (Join-Path $Template '.env.example') $Stage
Copy-Item (Join-Path $Template 'install.sh') $Stage
Copy-Item (Join-Path $Template 'start.sh') $Stage
Copy-Item (Join-Path $Template 'stop.sh') $Stage
Copy-Item (Join-Path $Template 'ecosystem.config.cjs') $Stage
Copy-Item (Join-Path $Template 'nginx.xueji.conf') $Stage

Copy-Item -Recurse (Join-Path $Root 'apps\api\dist') (Join-Path $Stage 'api\dist')
Copy-Item (Join-Path $Root 'apps\api\package.json') (Join-Path $Stage 'api\package.json')
Copy-Item (Join-Path $Root 'apps\api\package-lock.json') (Join-Path $Stage 'api\package-lock.json')

Copy-Item -Recurse (Join-Path $Root 'apps\web\dist\*') (Join-Path $Stage 'web')

Write-Host '==> Zip...'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'release') | Out-Null
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path $Stage -DestinationPath $ZipPath -CompressionLevel Optimal

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host ''
Write-Host 'Done.'
Write-Host "  Folder: $Stage"
Write-Host "  Zip: $ZipPath ($sizeMb MB)"
Write-Host '  Upload zip to fnOS, extract, follow README.txt'
