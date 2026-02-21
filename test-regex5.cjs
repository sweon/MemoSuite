const testRegex = /!\[([^\]]*)\]\(([^)]*)\)/;
const result = testRegex.exec("![pagebreak](pagebreak)");
console.log(result);
