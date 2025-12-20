const mongoose = require('mongoose');
require('dotenv').config();

const Geofence = require('./src/models/Geofence');

async function updateGeofence() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find current geofence
    const current = await Geofence.findOne({ name: 'FIEM' });
    console.log('🔍 Current FIEM Geofence:');
    console.log('  Coordinates:', current.center.coordinates);
    console.log('  Lat, Lon:', current.center.coordinates[1], ',', current.center.coordinates[0]);
    console.log('  Radius:', current.radius, 'm\n');

    // Your actual location from logs (22.8267002, 88.3911263)
    const newLon = 88.3911263;
    const newLat = 22.8267002;

    console.log('✏️ Updating to your current location:');
    console.log('  New Lat, Lon:', newLat, ',', newLon, '\n');

    // Update geofence using $set operator
    const result = await Geofence.findOneAndUpdate(
      { name: 'FIEM' },
      { 
        $set: { 
          'center.type': 'Point',
          'center.coordinates': [newLon, newLat]
        } 
      },
      { new: true }
    );

    console.log('✅ Updated Successfully!');
    console.log('  New coordinates:', result.center.coordinates);
    console.log('  Lat, Lon:', result.center.coordinates[1], ',', result.center.coordinates[0]);
    
    // Calculate distance to verify
    const dist = Math.sqrt(
      Math.pow((result.center.coordinates[1] - newLat) * 111000, 2) + 
      Math.pow((result.center.coordinates[0] - newLon) * 111000, 2)
    );
    console.log('  Distance check:', Math.round(dist), 'meters (should be 0)\n');
    
    console.log('📱 Now RELOAD your mobile app to see distance = 0m!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

updateGeofence();
