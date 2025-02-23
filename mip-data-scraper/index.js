const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const AWS = require('aws-sdk');

const dynamoDB = new AWS.DynamoDB.DocumentClient();

function parseContent(content) {
    const customerMatch = content.match(/^([^\d]+)/);
    const customer = customerMatch ? customerMatch[1].trim() : '';

    const timeMatch = content.match(/(\d{1,2}:\d{2}am-\d{1,2}:\d{2}am)/);
    const jobTime = timeMatch ? timeMatch[1] : '';

    let remainingContent = content.substring(
        content.indexOf(jobTime) + jobTime.length
    );

    const parsed = {
        customer: customer,
        job_time: jobTime
    };

    const packMatch = remainingContent.match(/Pack\. Hrs:(\d+\.?\d*)/);
    if (packMatch) {
        parsed.pack_hrs = parseFloat(packMatch[1]);
    }

    const estHrsMatch = remainingContent.match(/Est\. Hrs:(\d+)\s*M:(\d+)/);
    if (estHrsMatch) {
        parsed.est_hrs = parseInt(estHrsMatch[1]);
        parsed.men = parseInt(estHrsMatch[2]);
    }

    const trucksMatch = remainingContent.match(/T:(\d+)/);
    if (trucksMatch) {
        parsed.trucks = parseInt(trucksMatch[1]);
    }

    const estCostMatch = remainingContent.match(/Est\.\$\s*([\d,]+\.?\d*)/);
    if (estCostMatch) {
        parsed.est_cost = parseFloat(estCostMatch[1].replace(',', ''));
    }

    const estLbsMatch = remainingContent.match(/Est\. lbs:(\d+)/);
    if (estLbsMatch) {
        parsed.est_lbs = parseInt(estLbsMatch[1]);
    }

    const cuFtMatch = remainingContent.match(/Est\.CuFt:(\d+\.?\d*)/);
    if (cuFtMatch) {
        parsed.est_cuft = parseFloat(cuFtMatch[1]);
    }

    const orgDestMatch = remainingContent.match(/(\d+\.?\d*)([^|]+)$/);
    if (orgDestMatch) {
        parsed['org-dest'] = orgDestMatch[2].trim();
    }

    return parsed;
}

exports.handler = async (event) => {
    // Verify the request is from EventBridge if needed
    if (event.source === 'aws.events') {
        console.log('Triggered by EventBridge schedule');
    }

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: true,
        ignoreHTTPSErrors: true
    });

    try {
        const page = await browser.newPage();
        
        console.log('Navigating to login page...');
       	await page.goto(process.env.LOGIN_URL);
        await page.waitForSelector('#user_name');
        await page.type('#user_name', process.env.SITE_USERNAME);
        await page.type('#pass', process.env.SITE_PASSWORD);
        await page.click('input[type="submit"]');
        
        await page.waitForSelector('.app-brand-text', { timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const today = new Date().toISOString().split('T')[0];
        const scrapingUrl = `${process.env.DATA_URL}/${today}/0`;
        console.log(`Navigating to: ${scrapingUrl}`);
        
        await page.goto(scrapingUrl);
        await page.waitForSelector('.fc-content');

        const scheduleData = await page.evaluate(() => {
            const scheduleEntries = {};
            const contentSpans = document.querySelectorAll('.fc-content .fc-title span[id^="content_"]');
            
            const rawData = Array.from(contentSpans).map(span => ({
                content: span.textContent.trim(),
                contentId: span.id
            }));

            return rawData;
        });

        // Parse the data outside of page.evaluate
        const parsedSchedules = scheduleData.reduce((acc, item, index) => {
            acc[`job_${index + 1}`] = {
                ...parseContent(item.content),
                // contentId: item.contentId
            };
            return acc;
        }, {});

        // Store in DynamoDB
        const params = {
            TableName: 'mip-scraped-data',
            Item: {
                id: today,
                schedules: parsedSchedules,
                timestamp: new Date().toISOString(),
                totalSchedules: Object.keys(parsedSchedules).length
            }
        };

        await dynamoDB.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Data scraped and stored successfully',
                date: today,
                scheduleCount: Object.keys(parsedSchedules).length
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error scraping data',
                error: error.message
            })
        };
    } finally {
        await browser.close();
    }
};
