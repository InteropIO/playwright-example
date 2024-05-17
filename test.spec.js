const { _electron: electron } = require("playwright");
const { test, expect } = require("@playwright/test");
const { setDefaultResultOrder } = require("dns");
const path = require("path");
const IODesktop = require("@interopio/desktop");

setDefaultResultOrder("ipv4first");

const platformDir = `${process.env.LocalAppData}\\interop.io\\io.Connect Desktop\\Desktop`;
const executablePath = path.join(platformDir, "io-connect-desktop.exe");

let electronApp;
let io;
let workspacesPage;

test.setTimeout(40000);

// Start io.Connect Desktop, wait for the io.Connect launcher to load,
// and initialize the `@interopio/desktop` library before the tests.
test.beforeAll(async () => {
    // Start io.Connect Desktop.
    electronApp = await electron.launch({
        executablePath: executablePath,
        cwd: platformDir
    });

    // Wait for the io.Connect launcher to appear.
    const { page } = await waitForAppToLoad("io-connect-desktop-toolbar", electronApp);

    // Wait for the io.Connect workspaces app to appear.
    const { page: workspacesApp } = await waitForAppToLoad("workspaces-demo", electronApp);
    // Wait for app to initialize its io & io.workspaces api
    await workspacesApp.waitForFunction('window.io && window.io.workspaces !== undefined');
    // Set the Workspaces app page globally so it can be used in tests below
    workspacesPage = workspacesApp

    // Initialize the `@interopio/desktop` library.
    io = await initDesktop(page);
});

test("Launch Client List and click the button to open Client Portfolio.", async () => {
    // Open the "Client List" app using the `@interopio/desktop` library and wait for it to appear.
    io.appManager.application("channelsclientlist").start();

    const { page } = await waitForAppToLoad("channelsclientlist", electronApp);

    // Click on the "Open Client Portfolio" button.
    page.locator("button.btn.btn-icon.btn-primary.btn-borderless").click();

    // Wait for the "Client Portfolio" app to appear.
    await waitForAppToLoad("channelsclientportfolio", electronApp);
});

test("Open two windows, snap them together, and manipulate the window group via its frame buttons.", async () => {
    // Open two windows using the `@interopio/desktop` library.
    const url = "https://docs.interop.io/";
    const win1 = await io.windows.open("win1", url);
    const win2 = await io.windows.open("win2", url);

    // Snap the opened windows to each other to create a window group.
    await win2.snap(win1.id, "right");

    // Get the `groupId` of the windows and retrieve the Web Group App.
    const groupId = win1.groupId;
    const webGroup = await getWebGroup(groupId, electronApp);

    // Maximize, restore and close the Wb Group App via the standard frame buttons.
    await webGroup.locator(`#t42-group-caption-bar-standard-buttons-maximize-${groupId}`).click();
    await webGroup.waitForSelector(`#t42-group-caption-bar-standard-buttons-restore-${groupId}`);
    await webGroup.locator(`#t42-group-caption-bar-standard-buttons-restore-${groupId}`).click();
    await webGroup.locator(`#t42-group-caption-bar-standard-buttons-close-${groupId}`).click();
});

test("Launch Client workspace and check if 'Client view' app has loaded", async () => {
    // Open workspace using the `@interopio/desktop` library.
    io.layouts.restore({ name: 'Client', type: 'Workspace'})
    
    // Locate the "Client View" app in the workspace
    const { page } = await waitForAppToLoad("client-view", electronApp);

    // Check if contents in "Client View" app are visible
    await expect(page.locator("div.col-12.ng-scope")).toBeVisible()
});

test("Launch Client workspace and manipulate window inside", async () => {
    const ordersWorkspaceWindowContext = await workspacesPage.evaluate(async () => {
        // Open the "Client" workspace app using the 'workspaces' app
        window.io.workspaces.restoreWorkspace('Client')

        // Wrap onWindowLoaded in promise to wait for the window of "Client-view" app to load
        function waitForClientViewWindow() {
            return new Promise((resolve, reject) => {
                window.io.workspaces.onWindowLoaded((win) => {
                    if (win.appName === 'client-view') {
                        resolve(win);  // Resolve the promise with the window object
                    }
                });
            });
        }

         // Get the "Client-view" app window when loaded
        const clientViewWindow = await waitForClientViewWindow();

        if (clientViewWindow) {
            // Get the underlying IOconnectWindow object
            const ioConnectWindow = clientViewWindow.getGdWindow()
        
            // Update window context of IOconnectWindow
            await ioConnectWindow.updateContext({ testKey: 'testValue' })
        
            // Return the updated context
            return ioConnectWindow.getContext()
        }
    });

    // Assert against the updated context property
    await expect(ordersWorkspaceWindowContext.testKey).toEqual('testValue')
});

// Helper for initializing the `@interopio/desktop` library so that it can be used in the tests.
const initDesktop = async (page) => {
    // Using the page of the first started shell app to obtain a Gateway token
    // for the library to be able to connect to the io.Connect Gateway.
    const gwToken = await page.evaluate("iodesktop.getGWToken()");
    // Initializing the library.
    const io = await IODesktop({ layouts: 'full', auth: { gatewayToken: gwToken } });

    return io;
};

// Helper for awaiting an io.Connect app to load.
const waitForAppToLoad = (appName, electronApp) => {
    return new Promise((resolve, reject) => {
        electronApp.on("window", async (page) => {
            try {
                // Check for the `iodesktop` service object injected in the page.
                const iodesktop = await page.evaluate("window.iodesktop");

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

// Helper for retrieving the io.Connect Web Group App.
const getWebGroup = async (groupId, electronApp) => {
    return new Promise(async (resolve, reject) => {
        try {
            const windows = electronApp.windows();
            // Search for the Web Group App.
            for (let index = 0; index < windows.length; index++) {
                const page = windows[index];
                // Check for the `iodesktop` service object injected in the page.
                const iodesktop = await page.evaluate("window.iodesktop");

                // Check the window group ID against the window ID contained in the `iodesktop` service object.
                if (iodesktop && groupId === iodesktop.windowId) {
                    resolve(page);
                    break;
                };
            };
        } catch (error) {
            // Add proper logging.
        };
    });
};