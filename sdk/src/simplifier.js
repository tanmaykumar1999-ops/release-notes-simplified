









// This won't be used since other different approach is was taken for web scraping and simplification of release notes. The code is kept for reference and future use if needed.








const axios = require('axios');
const cheerio = require('cheerio');

// Fetches the 3 latest Java releases from the GitHub API
const simplifierJava = async function () {
  try {
    const { data } = await axios.get("https://api.github.com/repos/openjdk/jdk/releases");

    const latest = data.slice(0, 3).map((release) => ({
      version: release.tag_name,
      title: release.name,
      url: release.html_url,
      publishedAt: release.published_at, // Fix: was release.content, correct field is body
      rawContent: release.body,          // Fix: .content doesn't exist, it's .body
    }));

    return latest;
  } 
  catch (err) {
    console.error("Error fetching Java releases:", err.message);
    return [];
  }
};

// Scrapes the 3 latest C++ standard entries from cppreference compiler support page
// Fix: cppreference returns HTML, not JSON — must use cheerio to scrape it
const simplifierCpp = async function () {
  try {
    const { data } = await axios.get("https://en.cppreference.com/w/cpp/compiler_support");
    const $ = cheerio.load(data);

    const releases = [];

    // Each C++ standard has a heading like "C++23", "C++20", etc.
    $('h2').each((i, el) => {
      if (i >= 3) return false; // Only take the 3 most recent

      const version = $(el).text().trim();
      const features = [];

      // Walk the table that follows each heading to extract feature names
      $(el).next('table').find('tr').each((_, row) => {
        const featureName = $(row).find('td').first().text().trim();
        if (featureName) features.push(featureName);
      });

      releases.push({
        version,
        title: `${version} Compiler Support`,
        url: "https://en.cppreference.com/w/cpp/compiler_support",
        publishedAt: new Date().toISOString(), // cppreference has no publish date
        rawContent: features.join('\n'),
      });
    });

    return releases;
  } catch (err) {
    console.error("Error fetching C++ releases:", err.message);
    return [];
  }
};

module.exports = { simplifierCpp, simplifierJava };