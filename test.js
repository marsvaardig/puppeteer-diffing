const puppeteer = require('puppeteer');
const expect = require('chai').expect;
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

var testDir = 'screenshots';

describe('👀 screenshots are correct', function() {
  let browser, page;

  // This is ran when the suite starts up.
  before(async function() {
    // Create the test directory if needed.
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    if (!fs.existsSync(`${testDir}/diffs`)) fs.mkdirSync(`${testDir}/diffs`);
  });

  // This is ran before every test. It's where you start a clean browser.
  beforeEach(async function() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  // This is ran after every test; clean up after your browser.
  afterEach(() => browser.close());

  // Wide screen tests!
  describe('wide screen', function() {
    beforeEach(async function() {
      return page.setViewport({width: 1024, height: 768});
    });
    it('marsvaardig', async function() {
      return takeAndCompareScreenshot(page, 'google');
    });
  });
});

// - page is a reference to the Puppeteer page.
// - route is the path you're loading, which I'm using to name the file.
// - filePrefix is either "wide" or "narrow", since I'm automatically testing both.
async function takeAndCompareScreenshot(page, fileName) {

  // Compare Production (Google.com) with Staging (Google.be)

  // Start the browser, go to that page, and take a screenshot.
  await page.goto(`https://www.google.com`);
  await page.screenshot({path: `${testDir}/${fileName}-production.png`});

  // Start the browser, go to that page, and take a screenshot.
  await page.goto(`https://www.google.be`);
  await page.screenshot({path: `${testDir}/${fileName}-staging.png`});

  // Test to see if it's right.
  return compareScreenshots(fileName);
}

function compareScreenshots(fileName) {
  return new Promise((resolve, reject) => {
    const img1 = fs.createReadStream(`${testDir}/${fileName}-production.png`).pipe(new PNG()).on('parsed', doneReading);
    const img2 = fs.createReadStream(`${testDir}/${fileName}-staging.png`).pipe(new PNG()).on('parsed', doneReading);

    let filesRead = 0;
    function doneReading() {
      // Wait until both files are read.
      if (++filesRead < 2) return;

      // Do the visual diff.
      var diff = new PNG({width: img1.width, height: img2.height});
      var numDiffPixels = pixelmatch(
          img1.data, img2.data, diff.data, img1.width, img1.height,
          {threshold: 0.1});

      // Create diff image
      diff.pack().pipe(fs.createWriteStream(`${testDir}/diffs/${fileName}.png`));

      // The files should look the same.
      expect(numDiffPixels, 'number of different pixels').equal(0);

      resolve();
    }
  });
}
