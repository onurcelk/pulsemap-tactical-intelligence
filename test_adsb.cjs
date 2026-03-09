const https = require('https');

https
  .get('https://api.adsb.fi/v2/mil', (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`Successfully fetched ${parsed.ac?.length || 0} aircraft from adsb.fi`);
        if (parsed.ac && parsed.ac.length > 0) {
          console.log(parsed.ac[0]);
        }
      } catch (e) {
        console.error('Failed to parse adsb.fi:', e.message);
      }
    });
  })
  .on('error', (err) => {
    console.error('Error fetching adsb.fi:', err.message);
  });

https
  .get('https://api.adsb.one/v2/mil', (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`Successfully fetched ${parsed.ac?.length || 0} aircraft from adsb.one`);
        if (parsed.ac && parsed.ac.length > 0) {
          console.log(parsed.ac[0]);
        }
      } catch (e) {
        console.error('Failed to parse adsb.one:', e.message);
      }
    });
  })
  .on('error', (err) => {
    console.error('Error fetching adsb.one:', err.message);
  });
