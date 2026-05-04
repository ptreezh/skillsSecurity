name: file-organizer
description: Organize files, rename, move, and categorize documents automatically 
trigger: "organize files in {directory}" or "rename {file} to {new_name}"
metadata:
  version: "1.0.0"
  author: "AgentSkills Team"
  tags: ["files", "organization", "productivity"]
  riskLevel: "LOW"
scripts:
  - name: "organize"
    language: "python"
    code: |
      import os
      from pathlib import Path
      
      def organize_files(directory):
          files = list(Path(directory).glob("*"))
          organized = {"moved": 0, "renamed": 0}
          
          for file in files:
              # Simple organization logic
              ext = file.suffix.lower()
              dest_dir = Path(directory) / ext[1:]  # Remove dot
              dest_dir.mkdir(exist_ok=True)
              file.rename(dest_dir / file.name)
              organized["moved"] += 1
          
          return organized
    |
resources: []
