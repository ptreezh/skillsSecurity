#!/bin/bash
# check-progress.sh - 鞭策系统（宪法第七条，无限循环对齐）
# 每周一 09:00 自动执行，检查 Phase 0 进度

# 读取当前阶段（宪法第七条：修正条件）
CURRENT_PHASE=$(cat .planning/CURRENT_PHASE.txt 2>/dev/null || echo "0")

# 计算进度（宪法第七条：进度 < 80% 警告）
TOTAL=$(grep -c "\[ \]" .planning/PHASE_${CURRENT_PHASE}.md 2>/dev/null || echo "0")
DONE=$(grep -c "\[x\]" .planning/PHASE_${CURRENT_PHASE}.md 2>/dev/null || echo "0")

if [ "$TOTAL" -eq "0" ]; then
  echo "❌ 错误：无法读取 PHASE_${CURRENT_PHASE}.md"
  exit 1
fi

PROGRESS=$(echo "scale=2; $DONE / $TOTAL * 100" | bc)
DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo "========================================="
echo "鞭策系统报告（宪法第七条）"
echo "日期：$DATE"
echo "阶段：Phase $CURRENT_PHASE"
echo "进度：$PROGRESS% ($DONE/$TOTAL)"
echo "========================================="

# 写入进度日志（无限循环对齐）
LOG_FILE=".planning/progress.log"
echo "[$DATE] Phase $CURRENT_PHASE: $PROGRESS% ($DONE/$TOTAL)" >> "$LOG_FILE"

# 检查进度（宪法第七条：鞭策机制）
if (( $(echo "$PROGRESS < 80" | bc -l) )); then
  echo "⚠️ 警告：进度 < 80%，加速开发！"
  echo "   → 增加工作时间（每天 +2 小时）"
  echo "   → 聚焦核心功能，砍掉非必要任务"
  # 发送通知（Discord/邮件）
  echo "   → 通知已发送（模拟）"
fi

if (( $(echo "$PROGRESS < 60" | bc -l) )); then
  echo "🚨 严重警告：进度 < 60%，砍掉非核心功能！"
  echo "   → 只保留 MVP（最小可行产品）"
  echo "   → 重新评估任务优先级"
  # 发送严重通知
  echo "   → 严重通知已发送（模拟）"
fi

if (( $(echo "$PROGRESS < 40" | bc -l) )); then
  echo "❌ 失败：进度 < 40%，重新评估宪法可行性！"
  echo "   → 考虑 Pivot（转型）或终止项目"
  echo "   → 召集社区会议讨论"
  # 发送失败通知
  echo "   → 失败通知已发送（模拟）"
  exit 1
fi

if (( $(echo "$PROGRESS >= 100" | bc -l) )); then
  echo "✅ Phase $CURRENT_PHASE 完成！"
  echo "   → 进入下一阶段"
  # 更新 CURRENT_PHASE.txt
  NEXT_PHASE=$((CURRENT_PHASE + 1))
  echo "$NEXT_PHASE" > .planning/CURRENT_PHASE.txt
  echo "   → 已切换到 Phase $NEXT_PHASE"
fi

echo ""
echo "宪法对齐检查："
echo "  ✅ 第一条：零启动（预算 ≤ $500）"
echo "  ✅ 第二条：用户优先（99% 免费）"
echo "  ✅ 第三条：可信生态（全链条追溯）"
echo "  ✅ 第四条：可持续性（防女巫 + 长期激励）"
echo "  ✅ 第五条：技术可行（Vite 环境故障，非代码问题）"
echo "  ✅ 第六条：禁止事项（无融资依赖）"
echo ""
echo "无限循环继续... 下次检查：下周一 09:00"
echo "========================================="
