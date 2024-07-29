import { _electron as electron, ElectronApplication, Page } from "playwright";
import { test, expect } from "@playwright/test";
import { setDefaultResultOrder } from "dns";
import path from "path";

import { InteropElectronAppWrapper, waitForHiddenAppToInitialize, waitForWorkspaceToLoad } from "./interopWindowsUtils";

setDefaultResultOrder("ipv4first");

const platformDir = `C:\\Program Files\\interop.io\\io.Connect Desktop\\Desktop`;
const executablePath = path.join(platformDir, "io-connect-desktop.exe");

let electronApp: ElectronApplication;
let workspaceManagerApp: InteropElectronAppWrapper;
let workspaceApp: InteropElectronAppWrapper;

test.setTimeout(60000);

// Start io.Connect Desktop and wait for the default workspace to load
test.beforeAll(async () => {
    test.setTimeout(60000);

    // Start io.Connect Desktop.
    electronApp = await electron.launch({
        executablePath: executablePath,
        cwd: platformDir,
        args: ['--', 'config=config/system.json', 'configOverrides', 'config0=config/configOverrides/system-dev.json']
    });

    workspaceManagerApp = await waitForHiddenAppToInitialize('owx-workspace-manager', electronApp);
    workspaceApp = (await waitForWorkspaceToLoad(workspaceManagerApp, 'owx-workspace', electronApp))!;
});

test("Menu should be open by default", async () => {
    const menu = workspaceApp.page.locator('.menu')
    await expect(menu).toBeVisible();
});

test("Clicking close menu button should close the menu", async () => {
    const menu = workspaceApp.page.locator('.menu');
    const closeMenuButton = workspaceApp.page.locator('#closeMenuButton');
    closeMenuButton?.click();

    await expect(menu).toBeHidden();
});

test("Close the default open workspace via the API", async () => {
    workspaceApp.page.evaluate('io.appManager.exit({ showDialog: false, autoSave: false });')

    const closedPage = await workspaceApp?.page.waitForEvent('close');

    // Assert that the page was closed
    expect(closedPage!.isClosed()).toBe(true);
});
