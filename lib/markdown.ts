/**
 * Small dependency-free markdown renderer covering just what research notes
 * actually use: headers, bold/italic, tables, lists, blockquotes, hr, links.
 * Not a general CommonMark implementation - good enough for pasted analyst
 * notes without adding a markdown library dependency.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return out;
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let inList = false;
  let inParagraph: string[] = [];

  function flushParagraph() {
    if (inParagraph.length > 0) {
      html.push(`<p>${renderInline(inParagraph.join(" "))}</p>`);
      inParagraph = [];
    }
  }
  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      flushParagraph();
      closeList();
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      flushParagraph();
      closeList();
      html.push("<hr/>");
      i++;
      continue;
    }

    const headerMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headerMatch) {
      flushParagraph();
      closeList();
      const level = headerMatch[1].length + 2; // start headers at h3 inside a note card
      html.push(`<h${level}>${renderInline(headerMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      closeList();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${renderInline(quoteLines.join(" "))}</blockquote>`);
      continue;
    }

    // table: a line with | followed by a separator line
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph();
      closeList();
      const headerCells = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      html.push("<div class=\"md-table-wrap\"><table><thead><tr>");
      for (const cell of headerCells) html.push(`<th>${renderInline(cell)}</th>`);
      html.push("</tr></thead><tbody>");
      for (const row of rows) {
        html.push("<tr>");
        for (const cell of row) html.push(`<td>${renderInline(cell)}</td>`);
        html.push("</tr>");
      }
      html.push("</tbody></table></div>");
      continue;
    }

    const listMatch = line.match(/^\s*[-*]\s+(?:\[( |x)\]\s+)?(.*)$/);
    if (listMatch) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      const checked = listMatch[1] === "x";
      const checkbox = listMatch[1] != null ? `<input type="checkbox" disabled ${checked ? "checked" : ""}/> ` : "";
      html.push(`<li>${checkbox}${renderInline(listMatch[2])}</li>`);
      i++;
      continue;
    }

    closeList();
    inParagraph.push(line.trim());
    i++;
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}
