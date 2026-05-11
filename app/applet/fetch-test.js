async function main() {
  try {
    const response = await fetch('http://localhost:3000/api/public/podcasts');
    const text = await response.text();
    console.log(text.substring(0, 300));
  } catch (err) {
    console.error(err);
  }
}
main();
