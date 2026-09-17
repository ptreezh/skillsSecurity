# dev-stop.ps1 — 停止 dev-supervisor 并回收其管理的全部进程
# 用法: pwsh -NoProfile -File scripts\dev-stop.ps1

$baseDir = Join-Path $env:TEMP 'opencode'
$stopFile = Join-Path $baseDir 'skillssecurity-dev.stop'
$supLog = Join-Path $baseDir 'skillssecurity-dev-logs\supervisor.log'

New-Item -ItemType File -Path $stopFile -Force | Out-Null
Write-Output '停止信号已发出，等待 supervisor 回收（最多 15s）...'

$deadline = (Get-Date).AddSeconds(15)
while ((Get-Date) -lt $deadline) {
  $sup = Get-CimInstance Win32_Process -Filter "Name='pwsh.exe'" | Where-Object {
    $_.CommandLine -match 'dev-supervisor\.ps1'
  }
  if (-not $sup) { break }
  Start-Sleep -Milliseconds 500
}

# 兜底：若 supervisor 已不在但端口还被本项目进程占着，双证据清理
foreach ($port in 5173, 10002) {
  $l = netstat -ano | Select-String ":$port\s" | Select-String 'LISTENING' | Select-Object -First 1
  if ($l -and $l.Line -match '(\d+)\s*$') {
    $ownerPid = [int]$Matches[1]
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
    if ($proc -and $proc.CommandLine -and $proc.CommandLine -match 'vite|server[\/\\]index\.js') {
      Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
      Write-Output "兜底清理 :$port PID=$ownerPid"
    }
  }
}

Write-Output '完成。端口状态：'
netstat -ano | Select-String ':5173|:10002' | Select-String 'LISTENING' | ForEach-Object { $_.Line.Trim() }
if (-not (netstat -ano | Select-String ':5173|:10002' | Select-String 'LISTENING')) { Write-Output '(5173/10002 均已释放)' }
