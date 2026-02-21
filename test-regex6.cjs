const testRegex = /!\[(.*?)\]\((?!pagebreak\))(.*?)\)/;
console.log(testRegex.test("![pagebreak](pagebreak)"));
console.log(testRegex.test("![img](img.png)"));
