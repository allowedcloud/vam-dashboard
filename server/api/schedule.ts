// server/api/schedule.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { defineEventHandler } from 'h3'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(client);

function getDateInET() {
  // Log current UTC time for debugging
  const utcDate = new Date();
  // console.log('UTC DateTime:', utcDate.toISOString());

  // Convert to ET
  const etOptions = { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' };
  const [month, day, year] = new Date().toLocaleDateString('en-US', etOptions).split('/');
  
  // Format as YYYY-MM-DD
  const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  // console.log('Formatted ET Date:', formattedDate);
  
  return formattedDate;
}

export default defineEventHandler(async (event) => {
  try {
    // Let's log what we're querying to debug
    const today = getDateInET();
    // console.log('Querying DynamoDB for date:', today);

    const command = new GetCommand({
      TableName: 'mip-scraped-data',
      Key: {
        id: today
      }
    });

    const result = await docClient.send(command);
    
    // Log the result for debugging
    // console.log('DynamoDB result:', result);

    if (!result.Item) {
      // Let's also try to scan the table to see what dates are available
      const scanCommand = new ScanCommand({
        TableName: 'mip-scraped-data',
        ProjectionExpression: 'id'
      });
      
      const scanResult = await docClient.send(scanCommand);
      // console.log('Available dates in table:', scanResult.Items);

      return {
        schedules: {},
        message: `No schedules found for ${today}. Please check the date format.`
      }
    }

    return {
      schedules: result.Item.schedules,
      timestamp: result.Item.timestamp,
      totalSchedules: result.Item.totalSchedules
    }
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch schedule data'
    })
  }
});