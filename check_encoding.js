const fs = require('fs');
const path = require('path');

// const file = '日本語訳選択_共通テスト速読語彙決定版.csv';
const file = '英語空所補充_共通テスト速読語彙決定版.csv';

try {
    const content = fs.readFileSync(path.join(__dirname, file));
    const decoder = new TextDecoder('shift-jis');
    const text = decoder.decode(content);

    const lines = text.split(/\r\n|\n/);
    console.log('Headers:', lines[0]);
    console.log('Row 1:', lines[1]);
    console.log('Row 2:', lines[2]);
} catch (e) {
    console.error(`Error reading ${file}:`, e);
}
