# How to run
## install npm packages by executing the following command
npm install

## How to use as a module
const scraper = require('./index');
const scrapedData = await scraper.scrape(url, retries, headless, outputPath, proxyServer);

// proxyServer is optional but can be used
// headless can be true or false and specifies whether puppeteer should launch chrome in headless mode or headful mode
// outputPath specific the file path to store the scraped data to - can be null
// retryCount is also optional but can be used to specify the number of times scraper should retry befor giving up, shouldn't be needed unless you're using an unreliable proxy - this is also optional

## How to trigger the scraper from cli
node trigger --url "https://www.familyservices.govt.nz/directory/searchresultspublic.htm?pageNumber=1&searchRegion=-1&cat1=849&expandCategories=false&searchTerms=&searchByProviderName=false&cat2=855" --output "test.json" --headless true

// url flag specifies the input url
// output flag specific the file path to store the scraped data to