const fs = require('fs');
const text = fs.readFileSync('packages/data-pipeline/src/sources/news.ts', 'utf8');
const urls = [...text.matchAll(/url:\s*'([^']+)'/g)].map(m => m[1]);
console.log('var RssFeeds = []string{');
urls.forEach(u => console.log('\t"' + u + '",'));
console.log('}');
