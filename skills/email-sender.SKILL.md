name: email-sender
description: Send emails via AI with smart templates and delivery tracking 
trigger: "send email to {recipient} with subject {subject} and body {content}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["communication", "email", "productivity"]
  riskLevel: "LOW"
scripts:
  - name: "send-email"
    language: "python"
    code: |
      import smtplib, os
      from email.mime.text import MIMEText
      
      def send_email(recipient, subject, content):
          msg = MIMEText(content)
          msg['Subject'] = subject
          msg['From'] = os.getenv('EMAIL_FROM')
          msg['To'] = recipient
          
          with smtplib.SMTP(os.getenv('SMTP_SERVER')) as server:
              server.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASS'))
              server.send_message(msg)
          return {"status": "sent", "to": recipient}
    |
resources: []
