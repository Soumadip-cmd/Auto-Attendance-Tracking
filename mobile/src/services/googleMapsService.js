import axios from 'axios';
import Constants from 'expo-constants';

// Google Maps API Configuration
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

class GoogleMapsService {
  /**
   * Calculate distance using Google Maps Distance Matrix API
   * Returns actual road distance, not straight-line
   */
  async getDistance(origin, destination) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      
      const params = {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        mode: 'walking', // driving, walking, bicycling, transit
        key: GOOGLE_MAPS_API_KEY,
      };

      console.log('\n🗺️ Google Maps Distance Matrix API Request:');
      console.log('  Origin:', params.origins);
      console.log('  Destination:', params.destinations);

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK') {
        const result = response.data.rows[0].elements[0];
        
        if (result.status === 'OK') {
          console.log('\n✅ Distance Matrix Response:');
          console.log('  Distance:', result.distance.text);
          console.log('  Duration:', result.duration.text);
          
          return {
            distance: result.distance.value, // meters
            distanceText: result.distance.text,
            duration: result.duration.value, // seconds
            durationText: result.duration.text,
            status: 'OK',
          };
        } else {
          console.error('❌ Distance Matrix element error:', result.status);
          return { status: 'ERROR', error: result.status };
        }
      } else if (response.data.status === 'REQUEST_DENIED') {
        console.error('❌ Google Maps API ACCESS DENIED');
        console.error('   Please enable Distance Matrix API in Google Cloud Console:');
        console.error('   1. Go to https://console.cloud.google.com/');
        console.error('   2. Enable "Distance Matrix API"');
        console.error('   3. Remove API key restrictions or allow this app');
        console.error('   Error message:', response.data.error_message || 'No details');
        return { status: 'REQUEST_DENIED', error: 'API not enabled or restricted' };
      } else {
        console.error('❌ Distance Matrix API error:', response.data.status);
        return { status: 'ERROR', error: response.data.status };
      }
    } catch (error) {
      console.error('❌ Distance Matrix API request failed:', error.message);
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * Get address details from coordinates (Reverse Geocoding)
   */
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      
      const params = {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
      };

      console.log('\n📍 Reverse Geocoding Request:', params.latlng);

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        const addressComponents = {};
        result.address_components.forEach(component => {
          component.types.forEach(type => {
            addressComponents[type] = component.long_name;
          });
        });

        const address = {
          formattedAddress: result.formatted_address,
          street: addressComponents.route || '',
          streetNumber: addressComponents.street_number || '',
          city: addressComponents.locality || addressComponents.administrative_area_level_2 || '',
          state: addressComponents.administrative_area_level_1 || '',
          country: addressComponents.country || '',
          postalCode: addressComponents.postal_code || '',
          placeId: result.place_id,
        };

        console.log('✅ Address:', address.formattedAddress);
        
        return { status: 'OK', address };
      } else if (response.data.status === 'REQUEST_DENIED') {
        console.error('❌ Google Geocoding API ACCESS DENIED');
        console.error('   Please enable Geocoding API in Google Cloud Console:');
        console.error('   1. Go to https://console.cloud.google.com/');
        console.error('   2. Enable "Geocoding API"');
        console.error('   3. Remove API key restrictions or allow this app');
        console.error('   Error message:', response.data.error_message || 'No details');
        return { status: 'REQUEST_DENIED', error: 'API not enabled or restricted' };
      } else {
        console.error('❌ Geocoding error:', response.data.status);
        return { status: 'ERROR', error: response.data.status };
      }
    } catch (error) {
      console.error('❌ Geocoding request failed:', error.message);
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * Fallback: Calculate distance using Haversine formula
   * Use this if Google Maps API fails or for offline mode
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  }
}

export default new GoogleMapsService();
