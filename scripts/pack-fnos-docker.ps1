#Requires -Version 5.1
<#
  学迹 · 飞牛预编译 Docker 部署包
  产物可覆盖生产目录 /vol1/1000/www/xueji （保留 .env 与 data/uploads）

  用法：
    powershell -ExecutionPolicy Bypass -File scripts/pack-fnos-docker.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$OutName = "xueji-fnos-docker-$Stamp"
$Stage = Join-Path $Root "release\$OutName"
$ZipPath = Join-Path $Root "release\$OutName.zip"
$Tpl = Join-Path $Root 'deploy\fnos-prebuilt-docker'

Write-Host "==> Root: $Root"
Write-Host "==> Output: $ZipPath"

Write-Host '==> Build API...'
Push-Location (Join-Path $Root 'apps\api')
try {
  if (-not (Test-Path 'node_modules')) {
    npm install --registry=https://registry.npmmirror.com
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "API build failed with exit code $LASTEXITCODE" }
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
  if ($LASTEXITCODE -ne 0) { throw "Web build failed with exit code $LASTEXITCODE" }
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

Copy-Item (Join-Path $Root 'docker-compose.fnos.yml') (Join-Path $Stage 'docker-compose.fnos.yml')
# 整份 nginx.conf（含 limit_req_zone）；勿只打 nginx-web.conf
Copy-Item (Join-Path $Tpl 'nginx.conf') (Join-Path $Stage 'nginx.conf')
Copy-Item (Join-Path $Tpl 'docker-start.sh') (Join-Path $Stage 'api\docker-start.sh')
Copy-Item (Join-Path $Tpl '.env.example') (Join-Path $Stage '.env.example')
Copy-Item (Join-Path $Tpl 'OVERWRITE.txt') (Join-Path $Stage 'OVERWRITE.txt')
Copy-Item (Join-Path $Tpl 'DOCKER-DEPLOY.txt') (Join-Path $Stage 'DOCKER-DEPLOY.txt')

if (Test-Path (Join-Path $Tpl 'Dockerfile')) {
  Copy-Item (Join-Path $Tpl 'Dockerfile') (Join-Path $Stage 'api\Dockerfile')
}
if (Test-Path (Join-Path $Tpl 'docker-entrypoint.sh')) {
  Copy-Item (Join-Path $Tpl 'docker-entrypoint.sh') (Join-Path $Stage 'api\docker-entrypoint.sh')
}

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
Write-Host '  Upload zip, follow OVERWRITE.txt to cover /vol1/1000/www/xueji'
