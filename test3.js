const assert = require('assert');

// Lexical markdown export simplified
function exportTopLevelElements(node, elementTransformers) {
  for (const transformer of elementTransformers) {
    if (!transformer.export) continue;
    const result = transformer.export(node, () => "");
    if (result != null) return result;
  }
  if (node.type === 'element') {
      return "exportChildren";
  } else if (node.type === 'decorator') {
      return node.text;
  }
  return null;
}

const PAGE_BREAK_ELEMENT_TRANSFORMER = {
  type: "element",
  export: (node) => {
    return node.type === 'pagebreak' ? '\n\\newpage\n' : null;
  }
};

const PAGE_BREAK_TEXT_MATCH_TRANSFORMER = {
  type: "text-match",
  export: (node) => {
    return node.type === 'pagebreak' ? '\\newpage' : null;
  }
};

const elementTransformers = [PAGE_BREAK_ELEMENT_TRANSFORMER].filter(t => t.type === 'element');

console.log(exportTopLevelElements({ type: 'pagebreak', text: 'raw' }, elementTransformers));
