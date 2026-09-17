# dev-supervisor.ps1 — 双层开发环境守护（执行层 + 监控层）
#
# 执行层（本脚本，后台 detached 运行）：
#   1. 端口守卫：按命令行证据识别并清理"本仓库"的 vite/hardhat/server 僵尸进程（不盲杀、不碰其他项目）
#   2. 拉起后端（API_PORT，默认 10002）与前端 dev（5173，strictPort，注入 VITE_API_URL）
#   3. 健康循环：每 10s 检查后端 /api/health 与 5173 监听，挂了自动重启（自愈）
#   4. PID 登记落盘，退出时回收（配合 dev-stop.ps1）
#
# 监控层（前台随时查询）：
#   - 状态 JSON：$env:TEMP\opencode\skillssecurity-dev-status.json（心跳/健康/最近动作）
#   - 日志：     $env:TEMP\opencode\skillssecurity-dev-logs\supervisor.log
#
# 用法：  pwsh -NoProfile -File scripts\dev-supervisor.ps1            # 启动守护
#   停止：  pwsh -NoProfile -File scripts\dev-stop.ps1                # 干净回收

param(
  [int]$ApiPort = 10002,
  [int]$FrontPort = 5173,
  [string]$Repo = 'F:\skillsSecurity'
)

$ErrorActionPreference = 'Continue'
$baseDir = Join-Path $env:TEMP 'opencode'
$logDir = Join-Path $baseDir 'skillssecurity-dev-logs'
$stopFile = Join-Path $baseDir 'skillssecurity-dev.stop'
$statusFile = Join-Path $baseDir 'skillssecurity-dev-status.json'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Remove-Item $stopFile -ErrorAction SilentlyContinue

$script:owned = @{ backend = $null; vite = $null }
$startedAt = Get-Date

function Log([string]$msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  $line | Add-Content -Path (Join-Path $logDir 'supervisor.log') -Encoding utf8
}

function Write-Status([string]$action, [bool]$apiHealthy, [bool]$frontHealthy) {
  [pscustomobject]@{
    heartbeat = (Get-Date -Format s)
    startedAt = $startedAt.ToString('s')
    action = $action
    backend = @{ port = $ApiPort; pid = $script:owned.backend; healthy = $apiHealthy }
    frontend = @{ port = $FrontPort; pid = $script:owned.vite; healthy = $frontHealthy; api = "http://localhost:$ApiPort" }
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

# 端口守卫：双证据识别本仓库开发服务僵尸，绝不盲杀
#   证据A：监听我们的端口（5173/10002）且命令行含 vite/server/hardhat 特征
#   证据B：命令行含本仓库绝对路径 + vite/hardhat 特征（npx/npm 链会展开绝对路径）
#   排除：supervisor 自己登记的受管进程
function Stop-ProjectZombies() {
  $exclude = @($script:owned.backend, $script:owned.vite) | Where-Object { $_ }
  $targets = @()

  # 证据A：端口占用者
  foreach ($port in $FrontPort, $ApiPort) {
    $ownerPid = Get-PortOwnerPid $port
    if ($ownerPid) {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
      if ($proc -and $proc.CommandLine -and $proc.CommandLine -match 'vite|server[\/\\]index\.js|hardhat') {
        $targets += $proc
      } else {
        Log "端口守卫: :$port 被 PID=$ownerPid 占用但非本仓库服务特征 → 不杀，仅记录"
      }
    }
  }

  # 证据B：绝对路径特征
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CommandLine -and
        $_.CommandLine -match [regex]::Escape($Repo) -and
        $_.CommandLine -match 'vite|hardhat') {
      $targets += $_
    }
  }

  # 去重后逐个清理（$proc 显式变量：catch 里 $_ 是 ErrorRecord，不能用）
  $targets | Sort-Object ProcessId -Unique | ForEach-Object {
    $proc = $_
    if ($exclude -contains $proc.ProcessId) { return }
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      $short = ($proc.CommandLine -replace '\s+', ' ')
      $short = $short.Substring(0, [Math]::Min(100, $short.Length))
      Log "端口守卫: 清理 PID=$($proc.ProcessId) :: $short"
    } catch {
      Log "端口守卫: PID=$($proc.ProcessId) 清理失败: $($_.Exception.Message)"
    }
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

function Start-Frontend() {
  $out = Join-Path $logDir 'vite-out.log'; $err = Join-Path $logDir 'vite-err.log'
  # VITE_API_URL 必须显式注入（教训：默认值会打到 10001=被 360tray 占用的端口）
  $env:VITE_API_URL = "http://localhost:$ApiPort"
  $p = Start-Process -FilePath cmd -ArgumentList '/c', 'npm run dev' -WorkingDirectory $Repo `
    -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden
  $script:owned.vite = $p.Id
  Log "执行层: 前端已拉起 PID=$($p.Id) :$FrontPort (VITE_API_URL=$env:VITE_API_URL)"
}

function Stop-Owned() {
  foreach ($k in 'backend', 'vite') {
    if ($script:owned[$k]) {
      # vite 经 cmd→npm→node 链，杀树
      try { taskkill /PID $script:owned[$k] /T /F 2>$null | Out-Null } catch {}
      $script:owned[$k] = $null
    }
  }
}

# ── 主流程 ──
Log '===== dev-supervisor 启动（执行层+监控层） ====='
Log "配置: Repo=$Repo ApiPort=$ApiPort FrontPort=$FrontPort"

# 1) 端口守卫（清干净再拉起，避免占用/漂移）
Stop-ProjectZombies
Start-Sleep -Seconds 2

# 2) 若端口仍被非本项目进程占用 → strictPort 会失败；记录并持续重试（不退出）
foreach ($port in $FrontPort, $ApiPort) {
  $owner = Get-PortOwnerPid $port
  if ($owner) { Log "警告: :$port 仍被 PID=$owner 占用（非本仓库进程，不杀）——等待其释放" }
}

# 3) 拉起双服务
if (-not (Test-ApiHealth)) { Start-Backend }
if (-not (Test-Port $FrontPort)) { Start-Frontend }

# 4) 守护循环（自愈 + 心跳）
$round = 0
while ($true) {
  if (Test-Path $stopFile) {
    Log '收到停止信号 → 回收全部受管进程，退出'
    Stop-Owned
    Write-Status 'stopped' $false $false
    break
  }
  $round++

  $apiOk = Test-ApiHealth
  if (-not $apiOk) {
    Log "监测: 后端不可达 (第 $round 轮) → 自愈重启"
    Stop-Owned # 后端重启前整体回收，避免半死状态
    Start-Sleep -Seconds 1
    Start-Backend
    Start-Frontend
    $apiOk = Test-ApiHealth
  }

  $frontOk = Test-Port $FrontPort
  if (-not $frontOk -and $apiOk) {
    Log "监测: 前端 :$FrontPort 不在监听 (第 $round 轮) → 自愈重启"
    Start-Frontend
    $frontOk = Test-Port $FrontPort
  }

  Write-Status "round-$round" $apiOk $frontOk
  Start-Sleep -Seconds 10
}
