const fs = require('fs');
const pdf = require('pdf-parse');

async function test() {
    try {
        const buf = fs.readFileSync('books/ibni_abidin.pdf');
        console.log('File size:', buf.length, 'bytes');
        const data = await pdf(buf);
        console.log('Pages:', data.numpages);
        console.log('Text length:', data.text.length);
        console.log('Sample:', data.text.substring(0, 300));
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
test();
