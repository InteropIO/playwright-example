const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const { setDefaultResultOrder } = require('dns');

const path = require("path");
const IODesktop = require("@interopio/desktop");

setDefaultResultOrder("ipv4first");
const ioDesktopDir = `${process.env.LocalAppData}\\interop.io\\io.Connect Desktop\\Desktop`;
const desktopExePath = path.join(ioDesktopDir, "io-connect-desktop.exe");

test.setTimeout(60000);

test('open two apps, snap them together and manipulate the formed group via the group frame buttons', async () => {
  // step 1 Start IO.Desktop Enterprise
  const electronApp = await electron.launch({
    executablePath: desktopExePath,
    cwd: ioDesktopDir
  });

  // step 2 Wait for application manager to appear
  const { page } = await waitForAppToLoad("io-connect-desktop-toolbar", electronApp);

  // step 3 open two windows which will be used for testing via the desktop API
  const desktop = await initDesktop(page);
  const url = "https://docs.interop.io/desktop/getting-started/what-is-io-connect-desktop/general-overview/index.html";
  const win1 = await desktop.windows.open("win1", url);
  const win2 = await desktop.windows.open("win2", url);

  // step 4 snap windows to create a group
  await win2.snap(win1.id, "right");
  
  // step 5 get the groupId of the windows and utilizing the helper method get the page for the webGroup
  const groupId = win1.groupId;
  const webGroup = await getWebGroup(groupId, electronApp);

  // step 6 utilzing the page of the webgroup, maximize, restore and close the webgroup entirely
  await webGroup.locator(`#t42-group-caption-bar-standard-buttons-maximize-${groupId}`).click();
  await webGroup.waitForSelector(`#t42-group-caption-bar-standard-buttons-restore-${groupId}`);
  await webGroup.locator(`#t42-group-caption-bar-standard-buttons-restore-${groupId}`).click();
  await webGroup.locator(`#t42-group-caption-bar-standard-buttons-close-${groupId}`).click();
});

// method to initialize IO desktop so it can be used within the testing environment
const initDesktop = async (page) => {
  // In this scenario, we are utilzing the page of the first shell application we have started to obtain a gwToken
  const gwToken = await page.evaluate('glue42gd.getGWToken()');
  return await IODesktop({ layouts: 'full', auth: { gatewayToken: gwToken }, activities: false });
}

// helper method that waits for a IO.Desktop app to appear
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
        // add proper logging
      }
    });
  });
}

// helper method to get the webGroup page to access it's selectors
const getWebGroup = async (groupId, electronApp) => {
  return new Promise(async (resolve, reject) => {
    try {
      const windows = electronApp.windows();
      for (let index = 0; index < windows.length; index++) {
        const page = windows[index];
        const glue42webGroups = await page.evaluate(
          `if (window.glue42webGroups) {
                  glue42webGroups
              }`
        );
        if (glue42webGroups && groupId === glue42webGroups.settings.groupId) {
          resolve(page);
          break;
        }
      }
    } catch (e) {
      // add proper logging
    }
  });
};
