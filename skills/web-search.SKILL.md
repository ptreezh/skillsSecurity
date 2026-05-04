name: web-search
description: Search the web using AI and return structured results 
trigger: "search web for {query}" or "find information about {topic}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["search", "web", "research"]
  riskLevel: "LOW"
scripts:
  - name: "search"
    language: "python"
    code: |
      import requests
      
      def search_web(query, num_results=10):
          api_key = os.getenv('SEARCH_API_KEY')
          url = f"https://api.example.com/search?q={query}&n={num_results}"
          headers = {"Authorization": f"Bearer {api_key}"}
          response = requests.get(url, headers=headers)
          return response.json()
    |
resources: []
