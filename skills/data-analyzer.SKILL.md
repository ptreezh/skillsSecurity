name: data-analyzer
description: Analyze datasets, generate statistics, and create visualizations 
trigger: "analyze data in {file}" or "generate report for {dataset}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["data", "analysis", "visualization"]
  riskLevel: "MEDIUM"
scripts:
  - name: "analyze"
    language: "python"
    code: |
      import json
      from collections import Counter
      
      def analyze_data(data):
          if isinstance(data, list):
              analysis = {
                  "count": len(data),
                  "type": "list",
                  "sample": data[:5] if data else []
              }
              return analysis
          return {"error": "Unsupported data type"}
    |
resources: []
