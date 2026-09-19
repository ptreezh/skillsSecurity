---
name: p30-e2e-write-test-v2
description: P30 public E2E acceptance write-path UI-fix verification skill (success display)
trigger: "p30写路径测试v2 运行 {param}"
metadata:
  version: "1.0.0"
  author: "0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3"
  riskLevel: "LOW"
scripts:
  - name: "main"
    language: "python"
    code: |
      def main(param):
          return {"status": "ok", "echo": param}
resources: []
---

# p30-e2e-write-test-v2

P30 public E2E acceptance write-path UI-fix verification skill.

## Usage

Run with a single parameter; echoes it back.