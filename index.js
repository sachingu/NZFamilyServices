const puppeteer = require('puppeteer');
const fs = require('fs');

async function extractProviderDetails(page, providerUrl) {
    async function extractContactDetails(page, result) {
        const getContactAttributeByPosition = async (page, position) => await page.evaluate((position) => document.querySelector(`.contact-deets li:nth-child(${position}) span`).innerText, position);
        const contactElements = [
            'ContactName', 'Phone1', 'Phone2', 'Fax', 'Email1', 'Email2', 'PhysicalAddress', 'PostalAddress', 'Notes'
        ];

        for (var idx = 0; idx < contactElements.length; idx++) {
            const contactElement = contactElements[idx];
            result[contactElement] = await getContactAttributeByPosition(page, idx + 1);
        }
    }

    await page.goto(providerUrl);
    const result = {
        ServiceName: await page.evaluate(() => document.querySelector('.result .result-title').childNodes[0].textContent),
        ServiceId: await page.evaluate(() => /^[\w\d]+/.exec(document.querySelector('.result .result-title').childNodes[1].innerText)[0]),
        WebsiteUrl: await page.evaluate(() => document.querySelector('.result p.websites a').href),
        Description: await page.evaluate(() => document.querySelector('.result p.purpose').innerText),
        Availability: await page.evaluate(() => document.querySelector('.result .result-info li:nth-child(1)').innerText.replace(/^Availability: /, '')),
        GeoCoverageAreas: await page.evaluate(() => document.querySelector('.result .result-info li:nth-child(2)').innerText.replace(/^Geographic coverage area\(s\): /, '')),
        Services: await page.evaluate(() => Array.from(document.querySelectorAll('.expand-widget>ul>li')).map(service => {
            const getInnerText = (selector) => service.querySelector(selector).innerText;
            return {
                Title: getInnerText('.expand-contract h3'),
                Description: getInnerText('.serviceDetails p'),
                Charges: getInnerText('.charges span').replace(/^Charges: /, ''),
                Referral: getInnerText('.referrals span').replace(/^Referral: /, ''),
                DeliveryMethod: getInnerText('.recipientDetails li:nth-child(1) span'),
                Length: getInnerText('.recipientDetails li:nth-child(2) span'),
                Target: getInnerText('.recipientDetails li:nth-child(3) span')
            }
        }))
    };

    await extractContactDetails(page, result);
    return result;
}

async function executeWithRetry(functionToExecute, retryCount = 3) {
    try {
        return await functionToExecute();
    } catch (ex) {
        if (retryCount > 0) {
            return await executeWithRetry(functionToExecute, --retryCount);
        } else {
            return null;
        }
    }
}

async function scrape(url, retryCount, headless, outputPath, proxyServer) {
    const launchOptions = {
        headless
    };

    if (proxyServer) {
        launchOptions.args = [`--proxy-server=${proxyServer}`];
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await executeWithRetry(() => page.goto(url, { waitUntil: 'load' }), retryCount);
    // wait for search results to load
    await page.waitForSelector('div#searchResults');
    const resultAnchorSelector = 'div.result .result-title a';
    let totalResultCount = await page.evaluate(() => /^\d+/.exec(document.querySelector('#my_form > h1').innerText)[0]);
    console.log(`${totalResultCount} results found`);
    // make the website dispay all results on one page
    try {
        await page.select('#show', '0');
    } catch (ex) {
        // swallow
    }

    await page.waitForFunction((resultAnchorSelector, totalResultCount) => {
        console.log(document.querySelectorAll(resultAnchorSelector).length, totalResultCount);
        return document.querySelectorAll(resultAnchorSelector).length == totalResultCount;
    }, {}, resultAnchorSelector, totalResultCount);
    const allResultLinks = await page.$$eval(resultAnchorSelector, (anchors) => Array.from(anchors).map(anchor => anchor.href));

    const results = [];
    for (let linkIndex = 0; linkIndex < allResultLinks.length; linkIndex++) {
        const providerDetails = await executeWithRetry(async () => await extractProviderDetails(page, allResultLinks[linkIndex]), retryCount);
        if (providerDetails) {
            results.push(providerDetails);
            console.log(`#${linkIndex+1}) ${providerDetails.ServiceName} has been scraped`);
        } else {
            console.warn(`Couldn't extract data for ${allResultLinks[linkIndex]} even after ${retryCount} retries`);
        }
    }

    await browser.close();
    if(outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(results));
    }

    return results;
}

module.exports.scrape = scrape;