import { fetchRssFeed } from '../packages/data-pipeline/src/sources/news';

const feeds = [
  { url: 'https://promedmail.org/feed/', category: 'health', name: 'ProMED Disease Outbreaks' },
  { url: 'https://www.start.umd.edu/gtd/rss/', category: 'terrorism', name: 'Global Terrorism Database (GTD)' },
  { url: 'https://acleddata.com/feed/', category: 'geopolitical', name: 'ACLED' }
];

async function run() {
  console.log('Fetching feeds...');
  for (const feed of feeds) {
    try {
      const items = await fetchRssFeed(feed as any);
      console.log(`\n=== Feed: ${feed.name} ===`);
      console.log(`Received ${items.length} events.`);
      if (items.length > 0) {
        console.log('Sample event:', JSON.stringify(items[0], null, 2));
      }
    } catch (e) {
      console.error(`Error fetching ${feed.name}:`, e);
    }
  }
}

run();
