/**
 * Outline & Tree Module
 * Handles document outline, tree view, and navigation
 */

import { Markmap } from "https://esm.sh/markmap-view@0.18.9";

export const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

export const buildHeadingTree = (markdown) => {
  const lines = markdown.split("\n");
  const headings = [];
  lines.forEach((line, idx) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const slug = slugify(title);
      headings.push({ level, title, slug, line: idx, start: idx + 1, children: [] });
    }
  });
  
  if (headings.length === 0) return [];
  
  const root = [];
  const stack = [];
  headings.forEach((heading) => {
    heading.id = `${heading.slug}-${heading.line}`;
    while (stack.length && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(heading);
    } else {
      stack[stack.length - 1].children.push(heading);
    }
    stack.push(heading);
  });
  return root;
};

export const buildOutline = (markdown) => {
  const lines = markdown.split("\n");
  const outline = [];
  lines.forEach((line, idx) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      outline.push({ level, title, line: idx });
    }
  });
  return outline;
};

export const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const toMarkmapNode = (node) => ({
  content: node.title,
  id: node.id,
  slug: node.slug,
  level: node.level,
  start: node.start,
  children: node.children?.map(toMarkmapNode) || []
});

export const hyperbolicRadius = (r) => {
  const tanh = Math.tanh(r);
  return tanh / (1 - tanh);
};

export const truncateLabel = (text, max = 28) => {
  return text.length > max ? text.slice(0, max) + "…" : text;
};

export const getStats = (text) => {
  const chars = text.length;
  const words = (text.trim().match(/\S+/g) || []).length;
  const headingMatches = text.match(/^#{1,6}\s+.+$/gm) || [];
  const headings = headingMatches.length;
  const depth = headingMatches.reduce((max, line) => Math.max(max, line.match(/^#+/)[0].length), 0);
  return { chars, words, headings, depth };
};

export const parseSourcepos = (value) => {
  if (!value) return null;
  const match = value.match(/(\d+):\d+-(\d+):\d+/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
};

export const getLineHeight = (el) => {
  const computed = window.getComputedStyle(el);
  const lineHeight = computed.lineHeight;
  if (lineHeight === "normal") {
    return parseInt(computed.fontSize, 10) * 1.2;
  }
  return parseFloat(lineHeight);
};

export const escapeCss = (value) => {
  return CSS.escape ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
};

let markmapInstance = null;

export const initMarkmap = (svgElement) => {
  if (markmapInstance) {
    markmapInstance.destroy();
  }
  markmapInstance = Markmap.create(svgElement, {
    duration: 300,
    spacingHorizontal: 80,
    spacingVertical: 20,
    nodeMinHeight: 30,
    autoFit: true,
    initialExpandLevel: 3
  });
  return markmapInstance;
};

export const renderMarkmap = (data, svgElement) => {
  if (!markmapInstance) {
    markmapInstance = initMarkmap(svgElement);
  }
  markmapInstance.setData(data);
  markmapInstance.fit();
};
