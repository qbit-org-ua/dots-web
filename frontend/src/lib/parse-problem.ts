/**
 * Parse problem description from the DOTS custom format.
 *
 * The format starts with `#problem` followed by optional tags:
 * - `<attachment>` — replaced with inline image from the attachment API
 * - `<link><href>URL</href>text</link>` — converted to <a> tag
 * - `<iframe>URL</iframe>` — converted to <iframe> tag
 * - `<sample>...</sample>` — converted to <pre><code>
 * - Standard safe HTML tags (b, u, i, em, strong, code, pre, h1-h3, etc.)
 * - `#prop key=value` — properties (time limit, memory limit)
 * - `#task`, `#input`, `#output`, `#note` — section headers
 * - `#examples`, `#example`, `#/example` — example I/O blocks
 *
 * For this dataset, the dominant pattern is:
 *   `#problem\n<attachment>` — just an image
 *   `#problem\n<attachment>\nExtra text with <link>` — image + text
 */
export function parseProblemDescription(
  description: string,
  problemId: number,
  attachment: string | null,
): string {
  if (!description) return '';

  let text = description;

  // Strip #problem marker
  text = text.replace(/^#problem\s*/i, '');

  // Replace <attachment> with inline image if attachment exists and is an image
  if (attachment) {
    const ext = attachment.split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);

    if (isImage) {
      text = text.replace(
        /<attachment\s*\/?>/gi,
        `<div class="my-4"><img src="/api/v1/problems/${problemId}/attachment" alt="${attachment}" class="max-w-full rounded-lg border border-border" /></div>`
      );
    } else {
      text = text.replace(
        /<attachment\s*\/?>/gi,
        `<div class="my-4"><a href="/api/v1/problems/${problemId}/attachment" download class="text-primary hover:underline">📎 ${attachment}</a></div>`
      );
    }
  } else {
    text = text.replace(/<attachment\s*\/?>/gi, '');
  }

  // Replace <link><href>URL</href>text</link> with <a> tags
  text = text.replace(
    /<link><href>([^<]+)<\/href>([^<]*)<\/link>/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$2</a>'
  );

  // Replace <iframe>URL</iframe> with embedded iframe
  text = text.replace(
    /<iframe>([^<]+)<\/iframe>/gi,
    '<div class="my-4"><iframe src="$1" class="w-full h-[500px] rounded-lg border border-border" allowfullscreen></iframe></div>'
  );

  // Replace <sample>...</sample> with <pre><code>
  text = text.replace(/<sample>/gi, '<pre><code>');
  text = text.replace(/<\/sample>/gi, '</code></pre>');

  // Convert newlines to <br> (but not inside <pre>)
  const parts = text.split(/(<pre[\s\S]*?<\/pre>)/gi);
  text = parts.map((part, i) => {
    if (i % 2 === 1) return part; // inside <pre>, leave as-is
    return part.replace(/\n/g, '<br>');
  }).join('');

  // Clean up excessive <br>
  text = text.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
  text = text.trim();

  return text;
}
