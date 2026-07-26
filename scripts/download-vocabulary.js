const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error'));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractWordsFromHTML(html) {
  const words = [];
  
  // Match: pro="pronunciation" word="word"><div><em>pos.</em> definition</div><div>example</div>
  const regex = /pro="([^"]*)"[^>]*word="([^"]*)"><div><em>([^<]*)<\/em>\s*([^<]*(?:<[^>]*>[^<]*)*?)<\/div><div>([^<]*(?:<[^>]*>[^<]*)*?)<\/div>/g;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    const pronunciation = match[1].trim();
    const word = match[2].trim();
    const pos = match[3].replace(/\./g, '').trim();
    // Clean HTML tags from definition and example
    const definition = match[4].replace(/<[^>]*>/g, '').trim();
    const example = match[5].replace(/<[^>]*>/g, '').trim();
    
    words.push({
      word,
      pronunciation,
      part_of_speech: pos,
      english_definition: definition,
      example_sentence: example,
    });
  }
  
  return words;
}

async function main() {
  const BOOKS = [
    'https://raw.githubusercontent.com/MohKardan/4000-Essential-English-Words/main/data/2nd-edition/book1/data.json',
    'https://raw.githubusercontent.com/MohKardan/4000-Essential-English-Words/main/data/2nd-edition/book2/data.json',
    'https://raw.githubusercontent.com/MohKardan/4000-Essential-English-Words/main/data/2nd-edition/book3/data.json',
    'https://raw.githubusercontent.com/MohKardan/4000-Essential-English-Words/main/data/2nd-edition/book4/data.json',
    'https://raw.githubusercontent.com/MohKardan/4000-Essential-English-Words/main/data/2nd-edition/book5/data.json',
    'https://raw.githubusercontent.com/MohKardan/4000-Essential-English-Words/main/data/2nd-edition/book6/data.json',
  ];

  const allWords = [];
  
  for (let i = 0; i < BOOKS.length; i++) {
    console.log(`Downloading book ${i + 1}...`);
    try {
      const data = await fetch(BOOKS[i]);
      
      for (let u = 0; u < data.flashcard.length; u++) {
        const unit = data.flashcard[u];
        const words = extractWordsFromHTML(unit.reading);
        
        for (const w of words) {
          allWords.push({
            ...w,
            book: i + 1,
            unit: u + 1,
          });
        }
        if (words.length > 0) {
          console.log(`  Unit ${u + 1}: ${words.length} words - ${words.map(w => w.word).join(', ')}`);
        }
      }
    } catch (err) {
      console.error(`  Error downloading book ${i + 1}:`, err.message);
    }
  }

  console.log(`\nTotal words extracted: ${allWords.length}`);
  
  // Save raw data
  const outputPath = path.join(__dirname, '..', 'data', 'words-raw.json');
  fs.writeFileSync(outputPath, JSON.stringify(allWords, null, 2));
  console.log(`Saved to ${outputPath}`);
  
  // Show first few words
  console.log('\nFirst 5 words:');
  allWords.slice(0, 5).forEach(w => {
    console.log(`  ${w.word} (${w.pronunciation}) - ${w.english_definition}`);
  });
}

main().catch(console.error);
