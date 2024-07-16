const { _electron: electron } = require("playwright");
const { test, expect } = require("@playwright/test");
const { setDefaultResultOrder } = require("dns");
const path = require("path");

setDefaultResultOrder("ipv4first");

const platformDir = `${process.env.LocalAppData}\Glue42\\GlueDesktop`;
const executablePath = path.join(platformDir, "tick42-glue-desktop.exe");

let electronApp;
let workspacesPage;

test.setTimeout(60000);

// Start io.Connect Desktop, wait for the io.Connect launcher to load,
// and initialize the `@interopio/desktop` library before the tests.
test.beforeAll(async () => {
    // Start io.Connect Desktop.
    electronApp = await electron.launch({
        executablePath: executablePath,
        cwd: platformDir
    });

    const appNames = ["glue42-application-manager", "workspaces-demo"];
    // Wait for the specified apps to appear.
    const [toolbar, workspacesApp] = await waitForAppsToLoad(appNames, electronApp);
    // Wait for the Workspaces App to initialize its io.Connect library and the Workspaces API.
    await workspacesApp.page.waitForFunction("window.glue && window.glue.workspaces !== undefined");
    // Set the Workspaces App page globally so it can be used in the following tests.
    workspacesPage = workspacesApp.page;
});


test("Launch a workspace and change its title", async () => {
    // Open a specific workspace through the initially obtained workspace app page
    await workspacesPage.evaluate(async () => {
        window.glue.workspaces.restoreWorkspace('ws-demo1')
    });

    // Get page reference to the newly opened instance of the workspaces app
    const { page } = await waitForAppToLoad("workspaces-demo", electronApp)
    await page.waitForLoadState()

    // Click on the tab settings button
    await page.locator('span.icon-ellipsis-vert').click()
    // Click the 'Save' button
    await page.locator('button', { hasText: 'Save' }).click()
    
    // Fill in 'test' as a new name for the workspace
    await page.locator("#js-workspace-name").fill('test1')
    // Click the Save button to apply the changes
    await page.locator("#saveButton").click()

    const updatedTitle = await page.locator('span.lm_title').locator('nth=0')

    // Assert that the updated title is equal to the newly set one
    await expect(updatedTitle).toHaveText('test1')

    // Close the page after test execution
    await page.locator('span.icon-ellipsis-vert').click()
    await page.locator('button', { hasText: 'Close' }).click()
    await page.waitForEvent('close')
});

test("Launch a workspace app and close it through the tab header options button", async () => {
    // Open a specific workspace through the initially obtained workspace app page
    await workspacesPage.evaluate(async () => {
        window.glue.workspaces.restoreWorkspace('test')
    });

    // Get page reference to the newly opened instance of the workspaces app
    const { page } = await waitForAppToLoad("workspaces-demo", electronApp)
    await page.waitForLoadState()

    // Click on the tab settings button 
    await page.locator('span.icon-ellipsis-vert').click()
    
    // Click the 'Close' button
    await page.locator('button', { hasText: 'Close' }).click()

    // Await for 'close' event 
    const closedPage = await page.waitForEvent('close')

    // Assert that the page was closed
    expect(closedPage.isClosed()).toBe(true);
});

test("Launch a workspace app and create a new workspace from the popup", async () => {
     // Open a specific workspace through the initially obtained workspace app page
    await workspacesPage.evaluate(async () => {
        window.glue.workspaces.restoreWorkspace('test')
    });

    // Get page reference to the newly opened instance of the workspaces app
    const { page } = await waitForAppToLoad("workspaces-demo", electronApp)
    await page.waitForLoadState()

    // Click the '+' button on the workspace tab
    await page.locator('li.lm_add_button').locator('nth=0').click()

    //  for workspace popup to become visible
    await page.locator('div.workspaces-system-popup').waitFor('visible')

    // Click the 'Create New' button
    const createButton = await page.locator('#createNewButton')
    await createButton.click()

    const newTab = await page.locator('li.lm_tab').locator('nth=1')

    // Assert that a new tab was created
    await expect(newTab).toHaveText('Untitled 1')
});

// Helper for awaiting an io.Connect app to load.
const waitForAppToLoad = (appName, electronApp) => {
    return new Promise((resolve, reject) => {
        electronApp.on("window", async (page) => {
            try {
                // Check for the `iodesktop` service object injected in the page.
                const iodesktop = await page.evaluate("window.glue42gd");

                // Check the app name against the name contained in the `iodekstop` service object.
                if (iodesktop && appName === iodesktop.applicationName) {
                    page.on("load", () => {
                        resolve({
                            app: iodesktop.applicationName,
                            instance: iodesktop.instance,
                            iodesktop,
                            page
                        });
                    })
                };
            } catch (error) {
                // Add proper logging.
            };
        });
    });
};

// Helper function to wait for apps to load.
const waitForAppsToLoad = async (appNames, appInstance) => {
    return Promise.all(appNames.map(appName => waitForAppToLoad(appName, appInstance)));
};