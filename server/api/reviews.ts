// server/api/greviews.ts
import { defineEventHandler, setResponseHeader } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Force the content type to ensure Nuxt treats this as an API
    setResponseHeader(event, 'Content-Type', 'application/json');
    
    // Get environment variables
    const PLACE_ID = process.env.GOOGLE_PLACE_ID || '';
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

    // Check required parameters
    if (!PLACE_ID || !API_KEY) {
      return {
        error: 'Configuration error',
        details: 'Missing required environment variables. Please check server configuration.'
      };
    }

    // The Places API V1 may require a different format for place IDs
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

    // Safely parse JSON response
    let data;
    try {
      const responseText = await response.text();
      console.log('Raw API response:', responseText.substring(0, 1000));
      data = JSON.parse(responseText);
      
      // Log the exact structure of the first review if available
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
    
    // Process the response to extract only review information
    const result = {
      name: data.name || '',
      rating: data.rating || 0,
      totalReviews: data.user_ratings_total || data.userRatingCount || data.totalReviews || 0,
      reviews: []
    };

    // Map reviews if they exist
    if (data.reviews && Array.isArray(data.reviews)) {
      result.reviews = data.reviews.map((review) => ({
        author: review.author_name || review.authorAttribution?.displayName || 'Anonymous',
        profilePhoto: review.profile_photo_url || review.authorAttribution?.photoUri || '',
        rating: review.rating || 0,
        text: review.text?.text || review.text || '',
        time: review.time || review.publishTime || '',
        relativeTimeDescription: review.relative_time_description || review.relativePublishTimeDescription || ''
      }));

      // Sort reviews by most recent first
      result.reviews.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );
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