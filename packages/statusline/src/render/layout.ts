// The layout grammar — brace clusters of item ids — parsed once for every
// door: the writer validates through layoutItems, the status row collects
// through layoutItemsOf, and the engine renders the clusters it returns.

export function parseClusters(layout: string): string[][] {
  const clusters: string[][] = [];
  let words: string[] = [];
  let word = '';
  let open = false;
  function pushWord(): void {
    if (word !== '') {
      words.push(word);
      word = '';
    }
  }
  for (const c of layout) {
    if (c === '{') {
      if (open) {
        throw new Error(`layout '${layout}': '{' inside a cluster`);
      }
      open = true;
      words = [];
    } else if (c === '}') {
      if (!open) {
        throw new Error(`layout '${layout}': '}' outside a cluster`);
      }
      pushWord();
      open = false;
      if (words.length > 0) {
        clusters.push(words);
      }
    } else if (c === ' ') {
      if (open) {
        pushWord();
      } else if (word !== '') {
        throw new Error(`layout '${layout}': '${word}' sits outside a cluster`);
      }
    } else if (/[a-z0-9]/.test(c)) {
      word += c;
    } else {
      throw new Error(
        `layout '${layout}': '${c}' is not layout grammar (braces, item ids, spaces)`,
      );
    }
  }
  if (open) {
    throw new Error(`layout '${layout}': unterminated cluster`);
  }
  if (word !== '') {
    throw new Error(`layout '${layout}': '${word}' sits outside a cluster`);
  }
  if (clusters.length === 0) {
    throw new Error(`layout '${layout}': no clusters`);
  }
  return clusters;
}

// The items a layout names, in first-appearance order — tolerant of names the
// registry does not know.
export function layoutItemsOf(layout: string): string[] {
  const items: string[] = [];
  for (const cluster of parseClusters(layout)) {
    for (const item of cluster) {
      if (!items.includes(item)) {
        items.push(item);
      }
    }
  }
  return items;
}

export function layoutItems(
  layout: string,
  valid: readonly string[],
): string[] {
  const known = new Set(valid);
  const items = layoutItemsOf(layout);
  for (const item of items) {
    if (!known.has(item)) {
      throw new Error(
        `unknown layout item '${item}' — valid items: ${valid.join(' ')}`,
      );
    }
  }
  return items;
}
