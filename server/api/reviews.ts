// server/api/greviews.ts
import { defineEventHandler, setResponseHeader } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    setResponseHeader(event, 'Content-Type', 'application/json');

    const PLACE_ID = process.env.GOOGLE_PLACE_ID || '';
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

    if (!PLACE_ID || !API_KEY) {
      return {
        error: 'Configuration error',
        details: 'Missing required environment variables. Please check server configuration.'
      };
    }

    const formattedPlaceId = PLACE_ID.startsWith('places/') ? PLACE_ID : `places/${PLACE_ID}`;
    const url = `https://places.googleapis.com/v1/${formattedPlaceId}`;

    console.log('Fetching from URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'name,rating,userRatingCount,reviews'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      return {
        error: `Google API responded with status: ${response.status}`,
        details: errorText
      };
    }

    let data;
    try {
      const responseText = await response.text();
      console.log('Raw API response:', responseText.substring(0, 1000));
      data = JSON.parse(responseText);

      if (data.reviews && data.reviews.length > 0) {
        console.log('First review structure:', JSON.stringify(data.reviews[0], null, 2));
      }

      console.log('Available fields at root level:', Object.keys(data));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        error: `Failed to parse API response`,
        details: parseError.message
      };
    }

    const result = {
      name: data.name || '',
      rating: data.rating || 0,
      totalReviews: data.user_ratings_total || data.userRatingCount || data.totalReviews || 0,
      reviews: []
    };

    if (data.reviews && Array.isArray(data.reviews)) {
      result.reviews = data.reviews.map((review) => {
        let reviewDate;
        if (review.publishTime) {
          reviewDate = review.publishTime;
        } else if (review.time) {
          reviewDate = typeof review.time === 'number' ?
            new Date(review.time * 1000).toISOString() : review.time;
        } else {
          reviewDate = new Date().toISOString();
        }

        console.log(`Review date extraction: Original:`,
          review.time || review.publishTime,
          `Parsed:`, reviewDate);
        return {
          author: review.author_name || (review.authorAttribution?.displayName) || 'Anonymous',
          profilePhoto: review.profile_photo_url || (review.authorAttribution?.photoUri) || '',
          rating: review.rating || 0,
          text: review.text?.text || review.text || '',
          time: reviewDate,
          relativeTimeDescription: review.relative_time_description ||
            review.relativePublishTimeDescription || ''
        };
      });

      console.log('Review dates before sorting:',
        result.reviews.map(r => ({ author: r.author, date: r.time })));

      result.reviews.sort((a, b) => {
        try {
          const dateA = new Date(a.time);
          const dateB = new Date(b.time);

          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            console.warn('Invalid date found during sorting:', { a: a.time, b: b.time });
            return 0;
          }

          return dateB.getTime() - dateA.getTime();
        } catch (err) {
          console.error('Error during date sorting:', err, { a: a.time, b: b.time });
          return 0;
        }
      });

      console.log('Review dates after sorting:',
        result.reviews.map(r => ({ author: r.author, date: r.time })));
    }

    return result;
  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    return {
      error: 'Failed to fetch reviews',
      details: error.message
    };
  }
});
