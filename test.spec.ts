import { _electron as electron, ElectronApplication, Page } from "playwright";
import { test, expect } from "@playwright/test";
import { setDefaultResultOrder } from "dns";
import path from "path";
import { InteropElectronAppWrapper, waitForAppToLoad, waitForWorkspaceToLoad } from "./interopWindowsUtils";
import { IOConnectDesktop } from "@interopio/desktop";

setDefaultResultOrder("ipv4first");

const platformDir = `${process.env.LocalAppData}\\interop.io\\io.Connect Desktop\\Desktop`;
const executablePath = path.join(platformDir, "io-connect-desktop.exe");

let electronApp: ElectronApplication;
let workspacesApp: InteropElectronAppWrapper;

test.setTimeout(60000);

// Start io.Connect Desktop, wait for the io.Connect launcher to load,
// and initialize the `@interopio/desktop` library before the tests.
test.beforeAll(async () => {
    // Start io.Connect Desktop.
    electronApp = await electron.launch({
        executablePath: executablePath,
        cwd: platformDir
    });

    // Wait for the specified apps to appear.
    const wsApp = await waitForAppToLoad( "workspaces-demo", electronApp);
    // Wait for the Workspaces App to initialize its io.Connect library and the Workspaces API.
    await wsApp.page.waitForFunction("window.io && window.io.workspaces !== undefined");
    // Set the Workspaces App page globally so it can be used in the following tests.
    workspacesApp = wsApp
});

test("Launch a workspace and change its title", async () => {
    // Open a specific workspace through the initially obtained workspace app page
    await workspacesApp.page.evaluate(async () => {
        const io: IOConnectDesktop.API = (window as any).io;
        io.workspaces?.restoreWorkspace('Client')
    });

    // Get page reference to the newly opened instance of the workspaces app
    const openedWorkspace = (await waitForWorkspaceToLoad(workspacesApp, 'workspaces-demo', electronApp))!;
    const { page } = openedWorkspace

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
    await workspacesApp.page.evaluate(async () => {
        const io: IOConnectDesktop.API = (window as any).io;
        io.workspaces?.restoreWorkspace('test1')
    });

    // Get page reference to the newly opened instance of the workspaces app
    const openedWorkspace = (await waitForWorkspaceToLoad(workspacesApp, 'workspaces-demo', electronApp))!;
    const { page } = openedWorkspace

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
    await workspacesApp.page.evaluate(async () => {
        const io: IOConnectDesktop.API = (window as any).io;
        io.workspaces?.restoreWorkspace('test1')
    });

    // Get page reference to the newly opened instance of the workspaces app
    const openedWorkspace = (await waitForWorkspaceToLoad(workspacesApp, 'workspaces-demo', electronApp))!;
    const { page } = openedWorkspace

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
