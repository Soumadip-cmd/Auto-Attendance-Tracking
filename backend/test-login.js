const http = require('http');

async function testLogin() {
  try {
    console.log('Testing login with admin@example.com / Admin@123...\n');
    
    const data = JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin@123'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log('✅ Login successful!\n');
            console.log('User Info:');
            console.log('  - Email:', response.data.user.email);
            console.log('  - Name:', response.data.user.firstName, response.data.user.lastName);
            console.log('  - Role:', response.data.user.role);
            console.log('\nToken:', response.data.token.substring(0, 50) + '...');
            console.log('\n🎉 Backend authentication is working!\n');
          } else {
            console.log('❌ Login failed!');
            console.log('Status:', res.statusCode);
            console.log('Response:', response);
          }
        } catch (e) {
          console.log('Error parsing response:', responseData);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      console.log('\n⚠️  Make sure backend is running on http://localhost:5000\n');
    });

    req.write(data);
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
