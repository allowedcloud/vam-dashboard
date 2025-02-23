// server/api/schedule.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { defineEventHandler } from 'h3'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(client);

export default defineEventHandler(async (event) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const command = new GetCommand({
      TableName: 'mip-scraped-data',
      Key: {
        id: today
      }
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return {
        schedules: {},
        message: 'No schedules found for today'
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