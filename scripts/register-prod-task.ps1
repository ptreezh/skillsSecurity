# register-prod-task.ps1 — 注册开机自启任务（Task Scheduler AtLogOn）
#
# 方案 A 持久化要求："重启宿主机后服务自动恢复"。
# 开机链：用户登录 → 本任务运行 prod-supervisor：
#   1. Docker Desktop（用户会话自动启动）拉起 chain 容器（restart=unless-stopped）
#   2. supervisor 拉起后端（端口守卫等待/自愈，天然吞掉 Docker 未就绪的窗口）
#   3. supervisor 拉起 cloudflared → 新 URL → 自动发布 → Pages 自动重部署
#   4. 公网前端恢复正常（全程无人值守）
#
# 用法：pwsh -NoProfile -File scripts\register-prod-task.ps1    # 注册
#   取消：pwsh -NoProfile -File scripts\register-prod-task.ps1 -Unregister

param([switch]$Unregister)

$taskName = 'AgentSkills-Prod-Supervisor'
if ($Unregister) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "已注销任务 $taskName"
  exit 0
}

$scriptPath = 'F:\skillsSecurity\scripts\prod-supervisor.ps1'
$action = New-ScheduledTaskAction -Execute 'pwsh.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Description 'AgentSkills v2.0 生产守护（后端 + cloudflared 隧道 + URL 自动发布）' -Force | Out-Null

$t = Get-ScheduledTask -TaskName $taskName
Write-Output "已注册 $taskName (State=$($t.State), Trigger=AtLogOn)"
Write-Output "下次登录自动启动；手动触发：Start-ScheduledTask -TaskName '$taskName'"