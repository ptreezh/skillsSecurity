---
name: example-analyzer
description: A simple data analyzer skill
version: 1.0.0
trigger:
  type: event
  event: data.received
---

# Data Analyzer

This skill analyzes incoming data and provides insights.

## Usage

When data is received, this skill will:
1. Parse the data
2. Apply analysis rules
3. Return insights

## Configuration

- `analysis_depth`: shallow|deep (default: shallow)
- `output_format`: json|text (default: json)
