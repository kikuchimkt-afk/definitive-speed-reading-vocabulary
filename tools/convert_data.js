const fs = require('fs');
const path = require('path');

const file1 = '日本語訳選択_共通テスト速読語彙決定版.csv';
const file2 = '英語空所補充_共通テスト速読語彙決定版.csv';

function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    // Normalize newlines
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++; // Skip escape
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if (char === '\n' && !insideQuotes) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    return rows;
}

function processFile(filename, type) {
    const raw = fs.readFileSync(path.join(__dirname, '..', filename), 'utf-8');
    // Remove BOM if present
    const content = raw.replace(/^\uFEFF/, '');
    const rows = parseCSV(content);

    // Remove header
    const dataRows = rows.slice(1);

    // Take top 10
    const top10 = dataRows.slice(0, 10);

    return top10.map(row => {
        // Translation Mode: ID, Source, Word, Correct, Wrong1, Wrong2, Wrong3, Example, Explanation
        if (type === 'vocab') {
            return {
                id: row[0],
                source: row[1],
                question: row[2], // Word
                correct: row[3],
                distractors: [row[4], row[5], row[6]],
                example: row[7],
                explanation: row[8]
            };
        }
        // Fill-in Mode: ID, Source, Sentence, Correct, Wrong1, Wrong2, Wrong3, Tag, Translation (Hint), Explanation
        // Index: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
        else { // type === 'fill'
            return {
                id: row[0],
                source: row[1],
                question: row[2], // Sentence with ( )
                correct: row[3],
                distractors: [row[4], row[5], row[6]],
                translation: row[8], // 文意訳（ヒント） - Sentence Translation as Hint
                explanation: row[9] // 解説 - Points and Distractors
            };
        }
    });
}

try {
    const vocabData = processFile(file1, 'vocab');
    const fillData = processFile(file2, 'fill');

    const outputContent = `// This file is auto-generated
const VOCAB_DATA = ${JSON.stringify(vocabData, null, 2)};

const FILL_DATA = ${JSON.stringify(fillData, null, 2)};
`;

    fs.writeFileSync(path.join(__dirname, '..', 'js', 'data.js'), outputContent, 'utf-8');
    console.log('Successfully created js/data.js');
} catch (e) {
    console.error('Error processing files:', e);
}
