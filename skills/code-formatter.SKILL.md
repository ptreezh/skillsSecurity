name: code-formatter
description: Format and lint code in multiple languages using AI-powered tools 
trigger: "format code in {language}" or "lint my {file}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["code", "development", "formatting"]
  riskLevel: "LOW"
scripts:
  - name: "format"
    language: "python"
    code: |
      import re
      
      def format_code(code, language):
          # Simplified formatting logic
          if language == "python":
              # Remove extra whitespace
              formatted = "\n".join(line.rstrip() for line in code.split("\n"))
              return {"formatted": formatted, "language": language}
          return {"error": "Unsupported language"}
    |
resources: []
