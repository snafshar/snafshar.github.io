const layoutKeys = ["frames", "pages", "columns", "align"];
const snapshot = doc => JSON.stringify(layoutKeys.map(key => doc[key]));

// A continuous drag, resize, or caption edit is one undo step.
export function layoutHistory(doc, limit = 30) {
  const past = [], future = [];
  let current = snapshot(doc), active = null;
  function switchTo(source, destination) {
    if (!source.length) return false;
    destination.push(current);
    current = source.pop();
    JSON.parse(current).forEach((value, i) => { doc[layoutKeys[i]] = value; });
    active = null;
    return true;
  }
  return {
    record(group) {
      const next = snapshot(doc);
      if (current === next) return;
      if (!group || active !== group) {
        past.push(current);
        if (past.length > limit) past.shift();
      }
      current = next;
      future.length = 0;
      active = group;
    },
    end() { active = null; },
    undo: () => switchTo(past, future),
    redo: () => switchTo(future, past),
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
  };
}
