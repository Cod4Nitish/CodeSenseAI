/**
 * Tiny, dependency-free, XSS-safe markdown renderer (builds React elements,
 * never injects HTML). Supports fenced code blocks, inline code, **bold**,
 * bullet / numbered lists, headings and paragraphs, which covers LLM replies.
 */
import { useState } from "react";

export function CopyButton({ text, label = "copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch { /* clipboard unavailable */ }
      }}
    >
      {done ? "✓ copied" : label}
    </button>
  );
}

function inline(text, keyPrefix) {
  const out = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith("`")
        ? <code key={`${keyPrefix}-${i++}`} className="md-code">{tok.slice(1, -1)}</code>
        : <strong key={`${keyPrefix}-${i++}`}>{tok.slice(2, -2)}</strong>
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text = "" }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w*)/);
    if (fence) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i += 1;
      const code = buf.join("\n");
      blocks.push(
        <div className="md-pre" key={blocks.length}>
          <div className="md-pre-bar"><span>{fence[1] || "code"}</span><CopyButton text={code} /></div>
          <pre><code>{code}</code></pre>
        </div>
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i += 1;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(<Tag className="md-list" key={blocks.length}>{items.map((t, k) => <li key={k}>{inline(t, `l${blocks.length}-${k}`)}</li>)}</Tag>);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      blocks.push(<p className="md-h" key={blocks.length}>{inline(h[2], `h${blocks.length}`)}</p>);
      i += 1;
      continue;
    }
    if (!line.trim()) { i += 1; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i])) {
      para.push(lines[i++]);
    }
    blocks.push(<p className="md-p" key={blocks.length}>{inline(para.join(" "), `p${blocks.length}`)}</p>);
  }
  return <div className="md">{blocks}</div>;
}
