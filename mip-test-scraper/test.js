require('dotenv').config();
const puppeteer = require('puppeteer');

async function testScraper() {
    const browser = await puppeteer.launch({
        headless: false, // Set to false so we can see what's happening
        slowMo: 100 // Slows down operations so we can see them
    });

    try {
        const page = await browser.newPage();
        
        // Handle login
        console.log('Navigating to login page...');
        await page.goto(process.env.LOGIN_URL);
        await page.waitForSelector('#user_name');
        await page.type('#user_name', process.env.SITE_USERNAME);
        await page.type('#pass', process.env.SITE_PASSWORD);
        await page.click('input[type="submit"]');
        
        // Wait for login to complete
        // await page.waitForNavigation();

        // Instead of waitForNavigation, we'll wait for a selector that indicates successful login
        // Let's try waiting for any element that would only be present after login
        // This could be a dashboard element, header, etc.
        await page.waitForSelector('.app-brand-text', { timeout: 30000 });
        
        // Small delay to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Construct today's URL and navigate to it
        const today = new Date().toISOString().split('T')[0];
        // const scrapingUrl = `${process.env.DATA_URL}/${today}/0`;
	const scrapingUrl = `${process.env.DATA_URL}/2025-02-24/0`;
        console.log(`Navigating to: ${scrapingUrl}`);
        
        await page.goto(scrapingUrl);
        await page.waitForSelector('.fc-content');

	//
	//
	//


	// Update the page.evaluate section
	const scheduleData = await page.evaluate(() => {
    	const scheduleEntries = {};
    	
    	function parseContent(content) {
        // Extract customer name (everything before the first digit)
        const customerMatch = content.match(/^([^\d]+)/);
        const customer = customerMatch ? customerMatch[1].trim() : '';

        // Extract time
        const timeMatch = content.match(/(\d{1,2}:\d{2}am-\d{1,2}:\d{2}am)/);
        const jobTime = timeMatch ? timeMatch[1] : '';

        // Get the remaining content after customer and time
        let remainingContent = content.substring(
            content.indexOf(jobTime) + jobTime.length
        );

        // Initialize the result object
        const parsed = {
            customer: customer,
            job_time: jobTime
        };

        // Extract pack hours
        const packMatch = remainingContent.match(/Pack\. Hrs:(\d+\.?\d*)/);
        if (packMatch) {
            parsed.pack_hrs = parseFloat(packMatch[1]);
        }

        // Extract estimated hours and men
        const estHrsMatch = remainingContent.match(/Est\. Hrs:(\d+)\s*M:(\d+)/);
        if (estHrsMatch) {
            parsed.est_hrs = parseInt(estHrsMatch[1]);
            parsed.men = parseInt(estHrsMatch[2]);
        }

        // Extract trucks
        const trucksMatch = remainingContent.match(/T:(\d+)/);
        if (trucksMatch) {
            parsed.trucks = parseInt(trucksMatch[1]);
        }

        // Extract estimated cost
        const estCostMatch = remainingContent.match(/Est\.\$\s*([\d,]+\.?\d*)/);
        if (estCostMatch) {
            parsed.est_cost = parseFloat(estCostMatch[1].replace(',', ''));
        }

        // Extract estimated pounds
        const estLbsMatch = remainingContent.match(/Est\. lbs:(\d+)/);
        if (estLbsMatch) {
            parsed.est_lbs = parseInt(estLbsMatch[1]);
        }

        // Extract cubic feet
        const cuFtMatch = remainingContent.match(/Est\.CuFt:(\d+\.?\d*)/);
        if (cuFtMatch) {
            parsed.est_cuft = parseFloat(cuFtMatch[1]);
        }

        // Extract origin-destination (everything after the last number)
        const orgDestMatch = remainingContent.match(/(\d+\.?\d*)([^|]+)$/);
        if (orgDestMatch) {
            parsed['org-dest'] = orgDestMatch[2].trim();
        }

        return parsed;
    }

    // Find all spans inside fc-content that have an ID starting with 'content_'
    const contentSpans = document.querySelectorAll('.fc-content .fc-title span[id^="content_"]');
    
    Array.from(contentSpans).forEach((span, index) => {
        scheduleEntries[`schedule_${index + 1}`] = {
            ...parseContent(span.textContent.trim()),
            contentId: span.id
        };
    });
    
    return scheduleEntries;
});

        console.log('Scraped Data:');
        console.log(JSON.stringify(scheduleData, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testScraper();
