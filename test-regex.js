const regExp = /!\[(.*?)\]\((?!(?:pagebreak|https:\/\/pagebreak)\))(.*?)\)/;
console.log('Match?', regExp.exec('![pagebreak](https://pagebreak)'));
console.log('Match 2?', regExp.exec('![pagebreak](pagebreak)'));
