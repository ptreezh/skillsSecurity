name: social-media-poster
description: Create and schedule posts across multiple social media platforms 
trigger: "post to {platform} saying {content}" or "schedule post for {time}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["social", "marketing", "automation"]
  riskLevel: "MEDIUM"
scripts:
  - name: "post"
    language: "python"
    code: |
      import json
      
      def create_post(platform, content, schedule_time=None):
          post = {
              "platform": platform,
              "content": content,
              "scheduled": schedule_time,
              "status": "ready" if not schedule_time else "scheduled"
          }
          return post
    |
resources: []
