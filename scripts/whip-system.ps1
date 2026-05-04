# whip-system.ps1 - Windows 任务计划（鞭策系统）
# 设置：每周一 09:00 执行 check-progress.sh

$Action = New-ScheduledTaskAction -Execute "C:\Program Files\Git\bin\bash.exe" -Argument "F:\worktrees\community\scripts\check-progress.sh"
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "09:00"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$Task = New-ScheduledTask -Action $Action -Trigger $Trigger -Settings $Settings

Register-ScheduledTask -TaskName "AgentSkills-WhipSystem" -Task $Task -Force

Write-Host "✅ 鞭策系统已设置！"
Write-Host "   任务名称：AgentSkills-WhipSystem"
Write-Host "   执行时间：每周一 09:00"
Write-Host "   脚本路径：F:\worktrees\community\scripts\check-progress.sh"
Write-Host ""
Write-Host "手动测试："
Write-Host "  C:\Program Files\Git\bin\bash.exe F:\worktrees\community\scripts\check-progress.sh"
Write-Host ""
Write-Host "查看任务："
Write-Host "  Get-ScheduledTask -TaskName AgentSkills-WhipSystem"
Write-Host ""
Write-Host "删除任务："
Write-Host "  Unregister-ScheduledTask -TaskName AgentSkills-WhipSystem -Confirm:$false"
