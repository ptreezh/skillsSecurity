/**
 * AgentSkills GitHub Skill Scraper
 *
 * Scrapes GitHub for AI agent-related repositories
 * and prepares them for AgentSkills platform
 *
 * Usage: node scrape-github.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = './scripts/content/github-skills.json';
const CACHE_FILE = './scripts/content/github-cache.json';

// GitHub search query for AI agent repositories
const SEARCH_QUERIES = [
  'AI agent language:JavaScript',
  'AI agent language:TypeScript',
  'AI agent language:Python',
  'GPT agent repository',
  'autonomous agent repository',
  'LangChain agent',
  'AutoGPT repository',
  'AI assistant repository'
];

// Keywords to filter for quality agents
const AGENT_KEYWORDS = [
  'agent', 'autonomous', 'assistant', 'chatbot', 'llm',
  'openai', 'gpt', 'claude', 'langchain', 'vector',
  'embedding', 'retrieval', 'rag', 'chain', 'tool'
];

// Repositories to exclude (not actual agents)
const EXCLUDE_PATTERNS = [
  'tutorial', 'example', 'demo', 'blog', 'course',
  'boilerplate', 'starter', 'template'
];

async function fetch(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'AgentSkills-Scraper/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function searchGitHub(query, perPage = 30) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;
  console.log(`  Searching: ${query}`);

  try {
    const result = await fetch(url);
    if (!result || !result.items) return [];
    return result.items.map(item => ({
      name: item.full_name,
      description: item.description,
      stars: item.stargazers_count,
      language: item.language,
      url: item.html_url,
      topics: item.topics || [],
      created: item.created_at,
      updated: item.updated_at
    }));
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return [];
  }
}

function filterQualityRepos(repos) {
  return repos.filter(repo => {
    // Must have stars (at least some validation from community)
    if (repo.stars < 10) return false;

    // Exclude based on patterns
    const nameLower = repo.name.toLowerCase();
    for (const pattern of EXCLUDE_PATTERNS) {
      if (nameLower.includes(pattern)) return false;
    }

    // Must have agent-related keywords in name, description, or topics
    const searchText = [
      repo.name,
      repo.description || '',
      ...(repo.topics || [])
    ].join(' ').toLowerCase();

    const hasKeyword = AGENT_KEYWORDS.some(kw =>
      searchText.includes(kw)
    );

    return hasKeyword;
  });
}

function deduplicate(repos) {
  const seen = new Set();
  return repos.filter(repo => {
    if (seen.has(repo.name)) return false;
    seen.add(repo.name);
    return true;
  });
}

function categorize(repo) {
  const text = [
    repo.name,
    repo.description || '',
    ...(repo.topics || [])
  ].join(' ').toLowerCase();

  // Categorize based on keywords
  if (text.includes('langchain')) return 'LangChain';
  if (text.includes('autogpt') || text.includes('auto-gpt')) return 'AutoGPT';
  if (text.includes('assistant') || text.includes('chatbot')) return 'Chatbot';
  if (text.includes('tool') || text.includes('plugin')) return 'Tools';
  if (text.includes('rag') || text.includes('retrieval')) return 'RAG';
  if (text.includes('memory') || text.includes('knowledge')) return 'Knowledge';
  if (text.includes('multi') && text.includes('agent')) return 'Multi-Agent';

  return 'General';
}

async function main() {
  console.log('🤖 AgentSkills GitHub Skill Scraper\n');
  console.log('=' .repeat(50));

  const allRepos = [];

  // Search GitHub for each query
  for (const query of SEARCH_QUERIES) {
    const repos = await searchGitHub(query, 30);
    allRepos.push(...repos);
    // Rate limit protection
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n📊 Total repos found: ${allRepos.length}`);

  // Deduplicate
  const uniqueRepos = deduplicate(allRepos);
  console.log(`📊 After dedup: ${uniqueRepos.length}`);

  // Filter quality repos
  const qualityRepos = filterQualityRepos(uniqueRepos);
  console.log(`📊 Quality repos: ${qualityRepos.length}`);

  // Categorize
  const categorized = qualityRepos.map(repo => ({
    ...repo,
    category: categorize(repo)
  }));

  // Sort by stars
  categorized.sort((a, b) => b.stars - a.stars);

  // Stats
  const stats = {
    total: categorized.length,
    byCategory: {},
    byLanguage: {},
    topStars: categorized.slice(0, 10).map(r => ({
      name: r.name,
      stars: r.stars
    }))
  };

  categorized.forEach(r => {
    stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
    stats.byLanguage[r.language || 'Unknown'] = (stats.byLanguage[r.language || 'Unknown'] || 0) + 1;
  });

  // Output
  const output = {
    scrapedAt: new Date().toISOString(),
    totalRepos: categorized.length,
    stats,
    repos: categorized.slice(0, 500) // Top 500
  };

  // Save to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);

  // Also save as ready-to-import format
  const importable = categorized.slice(0, 200).map(r => ({
    name: r.name.split('/')[1],
    creator: r.name.split('/')[0],
    description: r.description,
    category: r.category,
    stars: r.stars,
    url: r.url,
    tags: r.topics,
    pricing: 0, // Free initially
    status: 'pending_review'
  }));

  fs.writeFileSync('./scripts/content/skills-to-import.json', JSON.stringify(importable, null, 2));
  console.log(`✅ Skills to import saved to scripts/content/skills-to-import.json`);

  // Summary
  console.log('\n📈 Summary:');
  console.log(`  Total quality repos: ${categorized.length}`);
  console.log('\n  By Category:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`    ${cat}: ${count}`);
    });

  console.log('\n  Top 10 by Stars:');
  stats.topStars.forEach((r, i) => {
    console.log(`    ${i + 1}. ${r.name} (${r.stars} ⭐)`);
  });
}

main().catch(console.error);