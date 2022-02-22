const { _electron: electron } = require('playwright')
const path = require("path");
const { test, expect } = require('@playwright/test')

const gdDir = `${process.env.LocalAppData}\\Tick42\\GlueDesktop\\`;
const gdExePath = path.join(gdDir, "tick42-glue-desktop.exe");

test.setTimeout(60000);

test('launch dev tools from application-manager and wait for it to appear', async () => {
  // step 1 Start glue42
  const electronApp = await electron.launch({
    executablePath: gdExePath,
    cwd: gdDir
  });

  // step 2 Wait for application manager to appear
  const { page } = await waitForAppToLoad("glue42-application-manager", electronApp);

  // step 3 click on apps element to expand the app
  await page.click(`id=apps`);
  
  // step 4 type `dev tools` in the app filter dialog
  await page.type(`id=app-search`, `dev tools`);

  // step 5 click on the result
  await page.click(`id=search-results`);

  // step 6 wait for the dev tools app to appear
  await waitForAppToLoad("DevTools", electronApp);
});

// helper method that waits for a Glue42 app to appear
const waitForAppToLoad = (appName, electronApp) => {
  return new Promise((resolve, reject) => {
    electronApp.on('window', async (page) => {
      try {
        const glue42gd = await page.evaluate(`glue42gd`);
        if (appName === glue42gd.application) {
          page.on('load', () => {
            resolve({
              app: glue42gd.application,
              instance: glue42gd.instance,
              glue42gd,
              page
            });
          })
        }
      } catch (e) {
        // do nothing
      }
    });
  });
}