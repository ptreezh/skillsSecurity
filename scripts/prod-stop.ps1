# prod-stop.ps1 — 干净回收生产守护（配合 prod-supervisor.ps1）
param([int]$ApiPort = 10002)

$baseDir = Join-Path $env:TEMP 'opencode'
$stopFile = Join-Path $baseDir 'skillssecurity-prod.stop'
# 停止信号由 supervisor 循环消费（幂等：重复执行无副作用）
Set-Content -Path $stopFile -Value (Get-Date -Format s) -Encoding utf8
Start-Sleep -Seconds 3

# 兜底：守护进程若未退出则强制杀（仅限 prod-supervisor.ps1 本体）
Get-CimInstance Win32_Process -Filter "Name='pwsh.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.CommandLine -and $_.CommandLine -match 'prod-supervisor\.ps1') {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output "已停止 prod-supervisor PID=$($_.ProcessId)" } catch {}
  }
}

# 兜底：清理受管进程（后端 node + cloudflared）
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.CommandLine -and $_.CommandLine -match 'server[\/\\]index\.js' -and $_.CommandLine -match 'skillsSecurity') {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output "已停止后端 PID=$($_.ProcessId)" } catch {}
  }
}
Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output "已停止 cloudflared PID=$($_.ProcessId)" } catch {}
}
Remove-Item $stopFile -ErrorAction SilentlyContinue
Write-Output '生产守护已回收'