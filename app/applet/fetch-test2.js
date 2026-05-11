async function main() {
  try {
    const response = await fetch('https://dejavufmpodcast.podomatic.com/rss2.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Text length:", text.length);
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}
main();
