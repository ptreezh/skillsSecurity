name: calendar-helper
description: Manage calendar events, schedule meetings, and send reminders via AI 
trigger: "schedule {event} for {time}" or "check my calendar"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["calendar", "productivity", "scheduling"]
  riskLevel: "LOW"
scripts:
  - name: "schedule-event"
    language: "python"
    code: |
      from datetime import datetime
      import json
      
      def schedule_event(name, time_str, duration_min=60):
          event = {
              "name": name,
              "time": time_str,
              "duration": duration_min,
              "created": datetime.now().isoformat()
          }
          # Save to calendar (simulated)
          return {"status": "scheduled", "event": event}
    |
resources: []
