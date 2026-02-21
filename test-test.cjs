const code = '!\[pagebreak\]\(pagebreak\)';
console.log(code);
const rx2 = /!\[pagebreak\]\(pagebreak\)/i;
console.log(rx2.test("![pagebreak](pagebreak)"));
