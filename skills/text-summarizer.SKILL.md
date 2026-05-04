name: text-summarizer
description: Summarize long texts, articles, and documents using AI 
trigger: "summarize {text}" or "create summary of {url}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["text", "nlp", "productivity"]
  riskLevel: "LOW"
scripts:
  - name: "summarize"
    language: "python"
    code: |
      def summarize_text(text, max_length=200):
          # Simplified summarization
          sentences = text.split('. ')
          if len(sentences) <= 3:
              return {"summary": text, "original_length": len(text)}
          
          summary = '. '.join(sentences[:3]) + '.'
          return {"summary": summary, "original_length": len(text), "summary_length": len(summary)}
    |
resources: []
