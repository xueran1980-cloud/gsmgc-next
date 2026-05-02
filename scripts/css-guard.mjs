#!/usr/bin/env node
/**
 * CSS GUARD — Tailwind v4 Layer Safety Checker
 *
 * 用途：构建前/每次修改前运行，防止 CSS 回退破坏 Tailwind 层级
 * 运行：node scripts/css-guard.mjs
 *
 * 检测规则：
 *   CRITICAL: 裸 CSS（@layer 外）       → 必须立即修复
 *   HIGH:     全局选择器在非 base 层     → 必须立即修复
 *   WARN:     自定义 @layer utilities     → 建议检查（可能与 Tailwind 内置冲突）
 *   INFO:     信息性提示                 → 无需处理
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_FILE = resolve(__dirname, '..', 'src', 'app', 'globals.css');

// ── 全局选择器黑名单 ────────────────────────────────
// 必须仅在 @layer base 中
const GLOBAL_SELECTORS = [
  'html', 'body', 'img', 'a', 'button', 'div', 'span',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
  'input', 'textarea', 'select', 'form', 'label',
  'header', 'footer', 'nav', 'main', 'section', 'article',
  'svg', 'path', 'video', 'audio', 'canvas', 'iframe',
];

// 伪元素选择器（无法用 Tailwind utility 控制，允许在 components 层）
const PSEUDO_PREFIXES = ['::-webkit', '::before', '::after', '::placeholder', '::selection'];

// ── 解析 CSS ────────────────────────────────────────

function parseCSS(source) {
  const lines = source.split('\n');
  const blocks = [];
  let currentLayer = null;
  let inLayer = false;
  let braceDepth = 0;
  let currentBlock = null;
  let currentSelector = '';
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const rawLine = lines[i];

    // 跳过注释
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inComment = true;
      continue;
    }
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      continue;
    }
    if (!line) continue;

    // @import / @theme / 单行注释 — 跳过
    if (line.startsWith('@import') || line.startsWith('@theme') || line.startsWith('//')) continue;

    // @layer 检测
    const layerMatch = line.match(/^@layer\s+(\w+)\s*\{/);
    if (layerMatch) {
      currentLayer = layerMatch[1];
      inLayer = true;
      braceDepth = 0;
      continue;
    }

    // 追踪大括号深度
    for (const ch of rawLine) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // @layer 块结束
    if (inLayer && braceDepth <= 0 && line === '}' && !currentBlock) {
      inLayer = false;
      currentLayer = null;
      braceDepth = 0;
      continue;
    }

    // 检测 CSS 选择器
    const selectorMatch = line.match(/^([^{]+?)\s*\{/);
    if (selectorMatch) {
      currentSelector = selectorMatch[1].trim();
      currentBlock = {
        layer: currentLayer,
        startLine: i + 1,
        selector: currentSelector,
        properties: [],
        braceCount: 1,
      };

      // 单行规则（如 `* { box-sizing: border-box; }`）
      const inlineMatch = line.match(/\{([^}]+)\}/);
      if (inlineMatch && line.indexOf('{', line.indexOf('{') + 1) === -1) {
        const props = inlineMatch[1].split(';').map(s => s.trim()).filter(Boolean);
        currentBlock.properties = props;
        currentBlock.endLine = i + 1;
        blocks.push(currentBlock);
        currentBlock = null;
        currentSelector = '';
      }
      continue;
    }

    // 收集属性
    if (currentBlock && currentSelector) {
      const propMatch = line.match(/^\s*([^:]+)\s*:\s*(.+?);?$/);
      if (propMatch) {
        currentBlock.properties.push(`${propMatch[1].trim()}: ${propMatch[2].trim()}`);
      }

      if (line.includes('}')) {
        currentBlock.braceCount--;
        if (currentBlock.braceCount <= 0) {
          currentBlock.endLine = i + 1;
          blocks.push(currentBlock);
          currentBlock = null;
          currentSelector = '';
        }
      }
    }
  }

  return blocks;
}

// ── 检测逻辑 ─────────────────────────────────────────

function isGlobal(selector) {
  for (const gs of GLOBAL_SELECTORS) {
    const escaped = gs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[,\\s>+~])${escaped}([,\\s>+~\\[:.]|$)`);
    if (pattern.test(selector)) return gs;
  }
  return null;
}

function isPseudo(selector) {
  return PSEUDO_PREFIXES.some(p => selector.includes(p));
}

function analyze(blocks) {
  const violations = [];

  for (const block of blocks) {
    const sel = block.selector;
    const layer = block.layer;
    const line = block.startLine;

    // ── CRITICAL: 裸 CSS（不在任何 @layer） ──
    if (!layer) {
      violations.push({
        level: 'critical',
        rule: 'BARE_CSS',
        line,
        selector: sel,
        message: '裸 CSS 不在 @layer 内 → 优先级高于所有 Tailwind utilities，会覆盖一切！',
        fix: `将 "${sel}" 移入 @layer base 或 @layer components`,
      });
      continue;
    }

    // ── HIGH: 全局选择器在非 base 层 ──
    const matchedGlobal = isGlobal(sel);
    if (matchedGlobal && layer !== 'base' && !isPseudo(sel)) {
      violations.push({
        level: 'high',
        rule: 'GLOBAL_IN_NON_BASE',
        line,
        selector: sel,
        layer,
        message: `全局元素 "${matchedGlobal}" 出现在 @layer ${layer} → 仅应在 @layer base`,
        fix: `将 "${sel}" 移入 @layer base，或用组件级选择器替代`,
      });
    }

    // ── WARN: 自定义 @layer utilities ──
    if (layer === 'utilities') {
      violations.push({
        level: 'warn',
        rule: 'CUSTOM_UTILITIES',
        line,
        selector: sel,
        message: '自定义 @layer utilities → 与 Tailwind 内置 utilities 同层，可能冲突',
        fix: '移到 @layer components 或用 @apply 在组件中引用',
      });
    }
  }

  return violations;
}

// ── 信息输出 ─────────────────────────────────────────

function infoBlocks(blocks) {
  const infos = [];
  for (const block of blocks) {
    const sel = block.selector;
    const layer = block.layer;

    // 全局选择器在 base 层 → 安全
    const gs = isGlobal(sel);
    if (gs && layer === 'base') {
      infos.push({
        level: 'info',
        line: block.startLine,
        selector: sel.substring(0, 50),
        note: `@layer base · 全局 "${gs}" · 安全（优先级 < utilities）`,
      });
    }

    // 伪元素在 components 层 → 安全
    if (isPseudo(sel) && layer === 'components') {
      infos.push({
        level: 'info',
        line: block.startLine,
        selector: sel.substring(0, 50),
        note: `@layer components · 伪元素 · 安全（无法用 Tailwind 控制）`,
      });
    }

    // 组件样式在 components 层 → 安全
    if (sel.startsWith('.') && !isPseudo(sel) && layer === 'components') {
      const props = block.properties.map(p => p.split(':')[0].trim()).join(', ');
      infos.push({
        level: 'info',
        line: block.startLine,
        selector: sel.substring(0, 50),
        note: `@layer components · 组件样式 · 属性: ${props || '(无)'}`,
      });
    }
  }
  return infos;
}

// ── 主流程 ───────────────────────────────────────────

function main() {
  if (!existsSync(CSS_FILE)) {
    console.error(`❌ CSS 文件不存在: ${CSS_FILE}`);
    process.exit(1);
  }

  const source = readFileSync(CSS_FILE, 'utf-8');
  const blocks = parseCSS(source);
  const violations = analyze(blocks);
  const infos = infoBlocks(blocks);

  const criticals = violations.filter(v => v.level === 'critical');
  const highs = violations.filter(v => v.level === 'high');
  const warns = violations.filter(v => v.level === 'warn');

  // ── 输出 ──
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🛡️  CSS GUARD — Tailwind Layer Safety     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  📄 ${CSS_FILE}`);
  console.log(`  📦 ${blocks.length} 规则块`);
  console.log(`  🔴 CRITICAL: ${criticals.length}   ⚠️ HIGH: ${highs.length}   🔶 WARN: ${warns.length}`);
  console.log('');

  // ── Info: 结构摘要 ──
  console.log('  ┌─ CSS 层级结构 ──────────────────────────┐');
  console.log('  │  @layer utilities  ← Tailwind 内置       │');
  console.log('  │  @layer components ← 组件样式（当前）    │');
  console.log('  │  @layer base       ← 全局 reset（当前）  │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('');

  for (const info of infos) {
    console.log(`  ℹ️  L${info.line}: ${info.selector.padEnd(30)} ${info.note}`);
  }

  // ── Violations ──
  if (violations.length === 0) {
    console.log('');
    console.log('  ✅ 全部通过 — Tailwind utilities 拥有最高控制权');
    console.log('');
    process.exit(0);
  }

  console.log('');
  const icons = { critical: '🔴', high: '⚠️', warn: '🔶' };

  for (const v of violations) {
    console.log(`  ${icons[v.level] || '❓'} [${v.level.toUpperCase()}] ${v.rule}`);
    console.log(`     L${v.line}: ${v.selector}`);
    if (v.layer) console.log(`     Layer: @layer ${v.layer}`);
    console.log(`     📝 ${v.message}`);
    console.log(`     🔧 ${v.fix}`);
    console.log('');
  }

  // 阻止继续
  if (criticals.length > 0 || highs.length > 0) {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🚫  CRITICAL/HIGH 违规 — 必须先修复再继续  ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    process.exit(1);
  }

  if (warns.length > 0) {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🔶 WARN — 建议检查，但不阻止继续           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  }

  process.exit(0);
}

main();
