name: password-generator
description: Generate secure passwords and check password strength 
trigger: "generate password" or "check strength of {password}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["security", "tools", "authentication"]
  riskLevel: "LOW"
scripts:
  - name: "generate"
    language: "python"
    code: |
      import secrets
      import string
      
      def generate_password(length=16, include_symbols=True):
          chars = string.ascii_letters + string.digits
          if include_symbols:
              chars += string.punctuation
          password = ''.join(secrets.choice(chars) for _ in range(length))
          return {"password": password, "length": length}
    |
resources: []
