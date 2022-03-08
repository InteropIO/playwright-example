const { _electron: electron } = require("playwright")
const path = require("path");
const { test, expect } = require("@playwright/test")

const gdDir = `${process.env.LocalAppData}\\Tick42\\GlueDesktop\\`;
const gdExePath = path.join(gdDir, "tick42-glue-desktop.exe");

test.setTimeout(60000);

test("Launch Dev Tools from the Glue42 Application Manager and wait for it to appear.", async () => {
    // Step 1: Start Glue42 Enterprise.
    const electronApp = await electron.launch({
        executablePath: gdExePath,
        cwd: gdDir
    });

    // Step 2: Wait for the Glue42 Application Manager to appear.
    const { page } = await waitForAppToLoad("glue42-application-manager", electronApp);

    // Step 3: Click on the element with an "apps" ID to expand the Applications view.
    await page.click("id=apps");

    // Step 4: Type "dev tools" in the app search field.
    await page.type("id=app-search", "dev tools");

    // Step 5: Click on the result.
    await page.click("id=search-results");

    // Step 6: Wait for the Dev Tools app to appear.
    await waitForAppToLoad("DevTools", electronApp);
});

// Helper method that waits for a Glue42 app to appear.
const waitForAppToLoad = (appName, electronApp) => {
    return new Promise((resolve, reject) => {
        electronApp.on("window", async (page) => {
            try {
                const glue42gd = await page.evaluate("glue42gd");

                if (appName === glue42gd.application) {
                    page.on("load", () => {
                        resolve({
                            app: glue42gd.application,
                            instance: glue42gd.instance,
                            glue42gd,
                            page
                        });
                    });
                };
            } catch (error) {
                // Do nothing.
            };
        });
    });
};