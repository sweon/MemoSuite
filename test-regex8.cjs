const testStr = '![pagebreak](pagebreak)';
console.log(testStr.replace(/!\[([^\]]*)\]\(([^)]*)\)/, 'REPLACED'));
console.log(testStr.replace(/!\[(.*?)\]\((?!pagebreak\))(.*?)\)/, 'REPLACED2'));
