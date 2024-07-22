import { _electron as electron, ElectronApplication, Page } from "playwright";
import { test, expect } from "@playwright/test";
import { setDefaultResultOrder } from "dns";
import path from "path";

import { InteropElectronAppWrapper, waitForHiddenAppToInitialize, waitForWorkspaceToLoad } from "./interopWindowsUtils";

setDefaultResultOrder("ipv4first");

const platformDir = `C:\\Users\\vanchev\\AppData\\Local\\interop.io\\io.Connect Desktop\\Desktop`;
const executablePath = path.join(platformDir, "io-connect-desktop.exe");

let electronApp: ElectronApplication;
let workspaceManagerApp: InteropElectronAppWrapper;
let workspaceApp: InteropElectronAppWrapper;

test.setTimeout(60000);

// Start io.Connect Desktop and wait for the default workspace to load
test.beforeAll(async () => {
    // Start io.Connect Desktop.
    electronApp = await electron.launch({
        executablePath: executablePath,
        cwd: platformDir
    });

    workspaceManagerApp = await waitForHiddenAppToInitialize('owx-manager', electronApp);
    workspaceApp = (await waitForWorkspaceToLoad(workspaceManagerApp, 'owx-workspace', electronApp))!;
});

test("Menu should be open by default", async () => {

    await workspaceApp?.page.waitForLoadState('domcontentloaded');

    const menu = workspaceApp.page.locator('.menu')
    await expect(menu).toBeVisible();
});

test("Clicking close menu button should close the menu", async () => {
    await workspaceApp.page.waitForLoadState('domcontentloaded');

    const menu = workspaceApp.page.locator('.menu')
    const closeMenuButton = menu?.locator('nth=0').locator('nth=0');
    closeMenuButton?.click();

    await expect(menu).toBeHidden();
});

test("Close the default open workspace via the API", async () => {
    workspaceApp.page.evaluate('io.appManager.exit({ showDialog: false, autoSave: false });')

    const closedPage = await workspaceApp?.page.waitForEvent('close');

    // Assert that the page was closed
    expect(closedPage!.isClosed()).toBe(true);
});
