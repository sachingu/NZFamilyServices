const args = require('minimist')(process.argv.slice(2), { boolean: 'headless' });
const scraper = require('./index');

(async () => {
    const url = args.url;
    if (!url) {
        console.warn('Please provide the url using -url flag');
        return;
    }

    const proxyServer = args.proxy;
    const headless = args.headless;
    const retries = args.retries || 10;
    const outputPath = args.output;

    const scrapedData = await scraper.scrape(url, retries, headless, outputPath, proxyServer);
    console.log(scrapedData);
})();