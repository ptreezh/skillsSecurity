# prod-supervisor.ps1 — v2.0 生产守护（方案 A：本机持久 + 内网穿透）
#
# 执行层（后台 detached）：
#   1. 停止 dev-supervisor（双层守护互斥：同一后端端口只能有一个主人）
#   2. 端口守卫：清理本仓库后端僵尸（双证据，不盲杀）
#   3. 拉起后端（API_PORT，默认 10002）
#   4. 拉起 cloudflared 快速隧道（HTTPS，公网 URL 每次重启随机变化）
#   5. 守护循环：后端自愈 + 隧道自愈 + **URL 变更自动发布**（api-config.json → commit → push → Pages 自动重部署）
#   6. 发布护栏：仅当工作树只含 public/api-config.json 时自动推送；有其他脏文件则告警跳过（不破坏用户工作）
#
# 监控层：状态 JSON（心跳/健康/当前公网URL）+ 日志
#
# 用法：pwsh -NoProfile -File scripts\prod-supervisor.ps1
#   停止：pwsh -NoProfile -File scripts\prod-stop.ps1
#   开机自启：scripts\register-prod-task.ps1（Task Scheduler AtLogOn）

param(
  [int]$ApiPort = 10002,
  [string]$Repo = 'F:\skillsSecurity',
  [switch]$AutoPublish = $true
)

$ErrorActionPreference = 'Continue'
$baseDir = Join-Path $env:TEMP 'opencode'
$logDir = Join-Path $baseDir 'skillssecurity-prod-logs'
$stopFile = Join-Path $baseDir 'skillssecurity-prod.stop'
$statusFile = Join-Path $baseDir 'skillssecurity-prod-status.json'
$tunnelLog = Join-Path $logDir 'cloudflared.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Remove-Item $stopFile -ErrorAction SilentlyContinue

$tunnelBin = Join-Path $env:LOCALAPPDATA 'agentskills\bin\cloudflared.exe'
$apiConfigFile = Join-Path $Repo 'public\api-config.json'

# Docker 引擎守护（v2.0 盲点修复：链容器依赖本机 Docker daemon，supervisor 须负责拉起引擎与容器）
$dockerDesktopExe = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'
$dockerCli = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
$chainContainers = @('cmc-debug', 'chainmaker-solo')

$script:owned = @{ backend = $null; tunnel = $null }
$script:publishedUrl = $null      # 已写入 api-config.json 的 URL
$script:pushedUrl = $null         # 已成功 push 的 URL（与 publishedUrl 分开：落盘 ≠ 已发布）
$script:lastPushAttempt = [datetime]::MinValue
$script:lastMsg = @{}            # 重复消息抑制：同一 key 的内容变了才记
$script:lastBeat = @{}           # 持续阻塞的周期性心跳
$script:lastStatusSig = ''
$script:lastStatusWrite = [datetime]::MinValue
$startedAt = Get-Date

function Log([string]$msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  $line | Add-Content -Path (Join-Path $logDir 'supervisor.log') -Encoding utf8
}

# 重复消息抑制：内容不变就只记首条，避免同一状态每轮刷一行。
# 实测依据：2026-11-01 supervisor.log 41,993 行里 41,903 行是两条重复消息
# （「工作树含其他改动」35,910 行 + 「容器不存在」5,993 行）= 4.94MB 噪音。
function Log-Once([string]$key, [string]$msg) {
  if ($script:lastMsg[$key] -ne $msg) {
    $script:lastMsg[$key] = $msg
    Log $msg
  }
}

# 持续性阻塞的心跳：默认每小时一条，保证「没变化」也可见（否则首条之后就静默了）。
function Log-Heartbeat([string]$key, [string]$msg, [int]$minutes = 60) {
  $now = Get-Date
  $last = $script:lastBeat[$key]
  if (-not $last -or ($now - $last).TotalMinutes -ge $minutes) {
    $script:lastBeat[$key] = $now
    Log $msg
  }
}

function Write-Status([string]$action, [bool]$apiHealthy, [bool]$tunnelAlive, [string]$publicUrl, [string]$publishState = '') {
  # 状态文件无消费方（实测：除本脚本外无任何读取），故按「状态变化或每 60s」写一次，
  # 不再每 10 秒重写一遍（实测 21.5h 写了 7751 次）。
  $sig = "$apiHealthy|$tunnelAlive|$publicUrl|$publishState"
  $now = Get-Date
  if ($sig -eq $script:lastStatusSig -and ($now - $script:lastStatusWrite).TotalSeconds -lt 60) { return }
  $script:lastStatusSig = $sig
  $script:lastStatusWrite = $now
  [pscustomobject]@{
    heartbeat = (Get-Date -Format s)
    startedAt = $startedAt.ToString('s')
    action = $action
    backend = @{ port = $ApiPort; pid = $script:owned.backend; healthy = $apiHealthy }
    tunnel = @{ pid = $script:owned.tunnel; alive = $tunnelAlive; publicUrl = $publicUrl }
    publish = $publishState
  } | ConvertTo-Json -Depth 4 | Set-Content -Path $statusFile -Encoding utf8
}

function Test-Port([int]$port) {
  $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Get-PortOwnerPid([int]$port) {
  $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { [int]$c.OwningProcess } else { $null }
}

function Test-ApiHealth() {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$ApiPort/api/health" -TimeoutSec 5 -UseBasicParsing
    return $r.StatusCode -eq 200
  } catch { return $false }
}

function Test-DockerReady() {
  if (-not (Test-Path $dockerCli)) { return $false }
  try {
    $null = & $dockerCli info --format '{{.ServerVersion}}' 2>$null
    return $LASTEXITCODE -eq 0
  } catch { return $false }
}

function Start-DockerEngine() {
  if (Test-DockerReady) { return $true }
  if (-not (Test-Path $dockerDesktopExe)) {
    Log "Docker: 未找到 Docker Desktop ($dockerDesktopExe) → 无法拉起引擎，链将不可用"
    return $false
  }
  Log "Docker: daemon 不可用 → 拉起 Docker Desktop"
  $null = Start-Process -FilePath $dockerDesktopExe
  $deadline = (Get-Date).AddSeconds(180)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    if (Test-DockerReady) {
      $v = & $dockerCli info --format '{{.ServerVersion}}' 2>$null
      Log "Docker: daemon 就绪 (server v$v)"
      return $true
    }
  }
  Log "Docker: 180 秒内未就绪 → 本轮放弃（下轮重试）"
  return $false
}

function Ensure-ChainContainers() {
  if (-not (Test-DockerReady)) { return }
  foreach ($c in $chainContainers) {
    $running = & $dockerCli inspect -f '{{.State.Running}}' $c 2>$null
    if ($LASTEXITCODE -ne 0) {
      # 同一「容器缺失」每分钟重复一次 → 只在状态变化时记 + 每小时心跳
      $m = "Docker: 容器 $c 不存在 → 需人工重建（docker run 参数见迁移清单）"
      Log-Once "docker-missing-$c" $m
      Log-Heartbeat "docker-missing-$c" "$m （持续中，每小时提醒一次）"
      continue
    }
    if ($running -ne 'true') {
      Log "Docker: 容器 $c 未运行 → docker start"
      & $dockerCli start $c 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) { Log "Docker: $c 已启动" } else { Log "Docker: $c 启动失败" }
    }
  }
}

# 与 dev-supervisor 互斥：杀掉仍在跑的开发守护（避免两侧争抢同一后端/端口守卫打架）
function Stop-DevSupervisor() {
  Get-CimInstance Win32_Process -Filter "Name='pwsh.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CommandLine -and $_.CommandLine -match 'dev-supervisor\.ps1') {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Log "生产守护: 已停止 dev-supervisor PID=$($_.ProcessId)" } catch {}
    }
  }
  # 兜底：dev 停止文件信号
  Remove-Item "$baseDir\skillssecurity-dev.stop" -ErrorAction SilentlyContinue
}

# 端口守卫（同 dev-supervisor 双证据逻辑，只保后端）
function Stop-Zombies() {
  $exclude = @($script:owned.backend) | Where-Object { $_ }
  $targets = @()
  $ownerPid = Get-PortOwnerPid $ApiPort
  if ($ownerPid) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
    if ($proc -and $proc.CommandLine -and $proc.CommandLine -match 'server[\/\\]index\.js') {
      $targets += $proc
    } else {
      Log "端口守卫: :$ApiPort 被 PID=$ownerPid 占用但非本仓库后端 → 不杀（如为 360tray 则属预期外，仅记录）"
    }
  }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CommandLine -and $_.CommandLine -match [regex]::Escape($Repo) -and $_.CommandLine -match 'server[\/\\]index\.js') {
      $targets += $_
    }
  }
  $targets | Sort-Object ProcessId -Unique | ForEach-Object {
    $proc = $_
    if ($exclude -contains $proc.ProcessId) { return }
    try { Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop; Log "端口守卫: 清理 PID=$($proc.ProcessId)" } catch {}
  }
}

function Start-Backend() {
  $out = Join-Path $logDir 'backend-out.log'; $err = Join-Path $logDir 'backend-err.log'
  $p = Start-Process -FilePath node -ArgumentList 'server/index.js' -WorkingDirectory $Repo `
    -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden `
    -Environment @{ PORT = "$ApiPort" }
  $script:owned.backend = $p.Id
  Log "执行层: 后端已拉起 PID=$($p.Id) :$ApiPort"
}

function Stop-StaleTunnels() {
  # 清理「同一后端端口」的残留隧道。
  # 判据 = 同一 tunnel 二进制 + 同一 --url 目标（而不是"我记住的 PID"：
  # supervisor 自身重启后那个 PID 就失效了，旧的 cloudflared 会活过它的自愈）。
  # 实测依据：2026-11-01 观察到 3 个 cloudflared 并存（PID 35176/15772/11440），
  # 因为原 Stop-Owned 用 taskkill 2>$null | Out-Null 吞掉了失败。
  $stale = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match [regex]::Escape($tunnelBin) -and
      $_.CommandLine -match [regex]::Escape("http://localhost:$ApiPort")
    }
  foreach ($s in $stale) {
    $out = taskkill /PID $s.ProcessId /T /F 2>&1
    if ($LASTEXITCODE -eq 0) {
      Log "隧道: 清理残留实例 PID=$($s.ProcessId)（同一 --url 目标）"
    } else {
      Log "隧道: 清理残留实例 PID=$($s.ProcessId) 失败(exit=$LASTEXITCODE): $($out -join ' ')"
    }
  }
}

function Start-Tunnel() {
  if (-not (Test-Path $tunnelBin)) { Log "隧道: 未找到 $tunnelBin → 跳过（后端仍本地可用）"; return $null }
  Stop-StaleTunnels
  $p = Start-Process -FilePath $tunnelBin -ArgumentList 'tunnel', '--url', "http://localhost:$ApiPort", '--no-autoupdate' `
    -RedirectStandardOutput $tunnelLog -RedirectStandardError (Join-Path $logDir 'cloudflared-err.log') `
    -PassThru -WindowStyle Hidden
  $script:owned.tunnel = $p.Id
  Log "执行层: cloudflared 已拉起 PID=$($p.Id)"
  return $p
}

# 从 cloudflared 日志提取当前公网 URL（quick tunnel 每次重启随机）
# 注意：cloudflared 的 URL 提示行输出到 **stderr**，stdout 为空 → 两个日志都读
function Get-TunnelUrl() {
  $content = ''
  foreach ($f in @($tunnelLog, (Join-Path $logDir 'cloudflared-err.log'))) {
    if (Test-Path $f) { $content += (Get-Content $f -Raw -ErrorAction SilentlyContinue) }
  }
  if (-not $content) { return $null }
  $m = [regex]::Match($content, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
  if ($m.Success) { return $m.Value }
  return $null
}

# URL 变更 → 更新 api-config.json → 安全推送（护栏：工作树只含该文件才推）
function Publish-TunnelUrl([string]$url) {
  if (-not $AutoPublish) { return 'auto-publish-off' }
  if ($script:pushedUrl -eq $url) { return "published:$url" } # 已推完，无需重复推
  $urlChanged = ($script:publishedUrl -ne $url)
  # URL 没变但还没推出去（如工作树当时有其它改动）→ 10 分钟节流重试，
  # 不再每轮（10s）都写盘 + spawn git + 记一行日志（实测曾刷出 35,910 行同文）。
  if ((-not $urlChanged) -and ((Get-Date) - $script:lastPushAttempt).TotalMinutes -lt 10) {
    return 'push-deferred'
  }
  $script:lastPushAttempt = Get-Date
  try {
    if ($urlChanged) {
      $json = @{ apiUrl = $url; _note = '由 prod-supervisor 自动维护；push 触发 Pages 自动重部署' } | ConvertTo-Json
      Set-Content -Path $apiConfigFile -Value $json -Encoding utf8
      $script:publishedUrl = $url
    }

    Push-Location $Repo
    try {
      $env:GIT_TERMINAL_PROMPT = '0'; $env:GIT_PAGER = 'cat'; $env:GIT_EDITOR = ':'
      $dirty = git status --porcelain
      $allowed = @($dirty) | Where-Object { $_ -match '^\s*M public/api-config\.json$|^\?\? public/api-config\.json$' }
      $blockers = @($dirty) | Where-Object { $_ -and $_ -notmatch 'public/api-config\.json' }
      if ($blockers.Count -gt 0) {
        $m = "发布: 工作树含其他改动($($blockers.Count) 项) → 跳过自动推送，URL 已落盘待手动 push"
        Log-Once 'publish-blocked' $m
        Log-Heartbeat 'publish-blocked' "$m （持续中，每小时提醒一次）"
        return 'blocked-other-dirty-files'
      }
      git add public/api-config.json
      git commit -q -m "chore(config): update public API tunnel URL to $url" -m "Auto-published by prod-supervisor on tunnel restart. deploy-frontend.yml (on push) redeploys Pages."
      git push -q origin main
      $script:pushedUrl = $url
      Log "发布: 已推送新 URL $url → Pages 自动重部署中"
      return 'pushed'
    } finally { Pop-Location }
  } catch {
    Log "发布: 失败 $($_.Exception.Message)"
    return 'publish-failed'
  }
}

function Stop-Owned() {
  foreach ($k in 'backend', 'tunnel') {
    if ($script:owned[$k]) {
      $target = $script:owned[$k]
      # 不吞错误：taskkill 失败必须可见。
      # 实测依据：原实现 `2>$null | Out-Null` 把失败吞成静默 → 旧隧道活过自愈 →
      # 2026-11-01 出现 3 个 cloudflared 并存。
      $out = taskkill /PID $target /T /F 2>&1
      if ($LASTEXITCODE -eq 0) {
        Log "回收 $k PID=$target"
      } else {
        Log "回收 $k PID=$target 失败(exit=$LASTEXITCODE): $($out -join ' ')"
      }
      $script:owned[$k] = $null
    }
  }
}

# ── 主流程 ──
Log '===== prod-supervisor 启动（方案A：本机持久+内网穿透） ====='
Log "配置: Repo=$Repo ApiPort=$ApiPort AutoPublish=$AutoPublish TunnelBin=$tunnelBin"

Stop-DevSupervisor
Stop-Zombies
Start-Sleep -Seconds 2

# Docker 引擎守护（盲点修复：链容器依赖本机 Docker daemon，先于后端拉起）
Start-DockerEngine | Out-Null
Start-Sleep -Seconds 3
Ensure-ChainContainers

if (-not (Test-ApiHealth)) { Start-Backend }
if (-not (Test-Path $tunnelBin)) { Log "隧道: cloudflared 缺失 → 仅后端守护（公网不可达）" }
elseif (-not $script:owned.tunnel) { Start-Tunnel }

# 首次发布：若隧道 URL 已就绪则立即注册
Start-Sleep -Seconds 8
$firstUrl = Get-TunnelUrl
if ($firstUrl) {
  Log "隧道: 首轮探测到 URL $firstUrl"
  $ps = Publish-TunnelUrl $firstUrl
  Write-Status 'started' (Test-ApiHealth) $true $firstUrl $ps
} else {
  Write-Status 'started' (Test-ApiHealth) $false $null 'waiting-url'
}

$round = 0
while ($true) {
  if (Test-Path $stopFile) {
    Log '收到停止信号 → 回收全部受管进程，退出'
    Stop-Owned
    Write-Status 'stopped' $false $false $null 'stopped'
    break
  }
$round++
  if ($round % 6 -eq 1) {
    # Docker 引擎每 ~1 分钟探活一次（不每轮打日志刷屏）：引擎退去拉起，容器停则启动
    if (-not (Test-DockerReady)) {
      Log "监测: Docker daemon 不可达 (第 $round 轮) → 拉起引擎"
      Start-DockerEngine | Out-Null
    }
    Ensure-ChainContainers
  }

  # 后端自愈
  $apiOk = Test-ApiHealth
  if (-not $apiOk) {
    Log "监测: 后端不可达 (第 $round 轮) → 自愈重启"
    Stop-Owned
    Start-Sleep -Seconds 1
    Start-Backend
    if ($script:owned.tunnel) { Start-Tunnel }
    $apiOk = Test-ApiHealth
  }

  # 隧道自愈 + URL 变更发布
  $tunnelAlive = $false; $publicUrl = $null
  if ($script:owned.tunnel) {
    $tunnelAlive = $null -ne (Get-Process -Id $script:owned.tunnel -ErrorAction SilentlyContinue)
  }
  if (-not $tunnelAlive) {
    if (Test-Path $tunnelBin) {
      Log "监测: 隧道进程不在 (第 $round 轮) → 自愈重启"
      Start-Tunnel
      Start-Sleep -Seconds 6
    }
  }
  $publicUrl = Get-TunnelUrl
  if ($publicUrl) { $tunnelAlive = $true } else { $tunnelAlive = $false }

  $publishState = ''
  if ($publicUrl) {
    $publishState = Publish-TunnelUrl $publicUrl
  } elseif ($script:publishedUrl) {
    $publishState = 'url-lost'
  }

  Write-Status "round-$round" $apiOk $tunnelAlive $publicUrl $publishState
  Start-Sleep -Seconds 10
}