import { IOConnectDesktop } from "@interopio/desktop";
import { ElectronApplication, Page } from "playwright";

export interface InteropElectronAppWrapper {
    app: string;
    windowId: string;
    iodesktop: any;
    page: Page;
}

// Helper for awaiting an io.Connect app to load.
export const waitForAppToLoad = (appName: string, electronApp: ElectronApplication): Promise<InteropElectronAppWrapper> => {
    return new Promise((resolve) => {
        electronApp.on("window", async (page) => {
            try {
                // Check for the `iodesktop` service object injected in the page.
                const iodesktop: any = await page.evaluate("window.iodesktop");

                // Check the app name against the name contained in the `iodekstop` service object.
                if (iodesktop && appName === iodesktop.applicationName) {
                    page.on("load", () => {
                        resolve({
                            app: iodesktop.applicationName,
                            windowId: iodesktop.windowId,
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
export const waitForAppsToLoad = async (appNames, appInstance): Promise<InteropElectronAppWrapper[]> => {
    return Promise.all(appNames.map((appName: string) => waitForAppToLoad(appName, appInstance)));
};

// Helper function to wait for a hidden application to have an initialized interop API.
export const waitForHiddenAppToInitialize = (appName: string, electronApp: ElectronApplication): Promise<InteropElectronAppWrapper> => {
    return new Promise((resolve, reject) => {
        electronApp.on("window", async (page) => {
            try {
                // Check for the `iodesktop` service object injected in the page.
                const iodesktop: any = await page.evaluate("window.iodesktop");

                // Check the app name against the name contained in the `iodekstop` service object.
                if (iodesktop && appName === iodesktop.applicationName) {

                    await page.waitForFunction('window.io !== undefined');

                    resolve({
                        app: iodesktop.applicationName,
                        windowId: iodesktop.windowId,
                        iodesktop,
                        page
                    });
                };
            } catch (error) {
                // Add proper logging.
            };
        });
    });
};

// Helper function to wait for a wokrpsace application to be initialized.
export const waitForWorkspaceToLoad = async (appWithIOWorkspaces: InteropElectronAppWrapper, workspaceAppName: string, electronApp: ElectronApplication): Promise<InteropElectronAppWrapper | undefined> => {
    const workspaceFrameId = await getNewlyOpenedFrameId(appWithIOWorkspaces);
    const workspaceApp = await getWorkspaceAppById(workspaceFrameId, electronApp);
    return workspaceApp;
};

// Helper function to wait for a workspace frame to be added and returns the id of that frame.
export const getNewlyOpenedFrameId = async (appWithIOWorkspaces: InteropElectronAppWrapper): Promise<string> => {
    const workspaceFrameId = await appWithIOWorkspaces.page.evaluate(async () => {
        return new Promise<string>(async (res, reject) => {
            const io: IOConnectDesktop.API = (window as any).io;
            if (!io.workspaces) {
                reject('Expected interop enabled application with workspaces API.');
                return;
            }
            const unsub = await io.workspaces.onFrameOpened((frame) => {
                unsub?.();
                res(frame.id)
            });
        });
    });

    return workspaceFrameId;
}

// Helper function to get an already opened workspace by id.
export const getWorkspaceAppById = async (id: string, electronApp: ElectronApplication): Promise<InteropElectronAppWrapper | undefined> => {
    const applications = await Promise.all(electronApp.windows().map(async (page) => {
        const iodesktop: any = await page.evaluate("window.iodesktop");
        if (!iodesktop) {
            return;
        }

        return {
            app: iodesktop.applicationName,
            windowId: iodesktop.windowId,
            iodesktop,
            page
        };
    }));

    const workspaceApp = applications.find((app) => app?.windowId === id);
    return workspaceApp;
}
