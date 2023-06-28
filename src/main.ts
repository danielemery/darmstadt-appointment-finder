import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';

const startUrls = ['https://tevis.ekom21.de/stdar'];

const crawler = new PlaywrightCrawler({
    requestHandler: router,
    // headless: false,
});

await crawler.run(startUrls);
