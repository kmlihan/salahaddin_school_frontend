/**
 * Group a flat list of blocks into rows for the lesson/news viewer.
 *
 * Rules:
 *   - Each block carries `perRow` (1, 2, 3, 4, or 6). When it's not set,
 *     we derive it from the legacy `size` field so old data still renders.
 *   - Consecutive blocks with the same `perRow` share a row.
 *   - As soon as we accumulate `perRow` blocks in a row, we start a new row
 *     even if the next block has the same value (so rows of 4 actually fit
 *     four items, not five or six).
 *   - A different `perRow` always starts a new row.
 *
 * Each block in the output gets a `widthPct` string like "50%" so the
 * renderer can pass it straight into inline style. We render each row as
 * its own flex container, which is robust against any oddities in the
 * source ordering.
 */
const SIZE_TO_PER_ROW = { '100': 1, '75': 1, '50': 2, '25': 4 };

function effectivePerRow(block) {
  if (block.perRow && [1, 2, 3, 4, 6].includes(Number(block.perRow))) {
    return Number(block.perRow);
  }
  return SIZE_TO_PER_ROW[String(block.size)] || 1;
}

export function groupBlocksIntoRows(blocks) {
  const rows = [];
  let current = null;

  for (const block of blocks) {
    const per = effectivePerRow(block);
    const widthPct = `${(100 / per).toFixed(4)}%`;

    if (
      !current ||
      current.perRow !== per ||
      current.items.length >= per
    ) {
      current = { perRow: per, items: [] };
      rows.push(current);
    }
    current.items.push({ block, widthPct });
  }

  return rows;
}
