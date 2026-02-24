
// Helper: parse a markdown table row into cells safely (without regex lookbehind)
function parseTableRow(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
    const inner = trimmed.substring(1, trimmed.length - 1);

    const cells: string[] = [];
    let currentCell = '';

    for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        if (char === '\\' && inner[i + 1] === '|') {
            currentCell += '|';
            i++; // skip next char
        } else if (char === '|') {
            cells.push(currentCell.trim());
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    cells.push(currentCell.trim());
    return cells;
}

console.log("Testing Table Logic...");

const mockCells = ["Header 1", "Header with | pipe", "**Bold** Content"];
// Simulation of export: escape pipe characters
const escaped = mockCells.map(c => c.replace(/\|/g, '\\|'));
console.log("Escaped cells (for export):", escaped);

const rowOutput = "| " + escaped.join(" | ") + " |";
console.log("Exported Row output:", rowOutput);

const parsed = parseTableRow(rowOutput);
console.log("Imported (parsed back):", JSON.stringify(parsed));

if (JSON.stringify(mockCells) === JSON.stringify(parsed)) {
    console.log("SUCCESS: Roundtrip for cell content and pipe escaping works.");
} else {
    console.log("FAILURE: Roundtrip failed.");
    console.log("Expected:", JSON.stringify(mockCells));
    console.log("Actual:", JSON.stringify(parsed));
}

// Test case with multiple escaped pipes and other backslashes
const complexCell = "Cell with \\ and \\| and |";
const escapedComplex = complexCell.replace(/\|/g, '\\|');
const complexRow = "| " + escapedComplex + " |";
const parsedComplex = parseTableRow(complexRow);
console.log("\nComplex case:");
console.log("Original:", complexCell);
console.log("Exported:", complexRow);
console.log("Parsed:", parsedComplex[0]);

if (parsedComplex[0] === complexCell) {
    console.log("SUCCESS: Complex case also works.");
} else {
    console.log("FAILURE: Complex case failed.");
}
