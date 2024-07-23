import { IOConnectDesktop } from "@interopio/desktop";
import { ElectronApplication, Page } from "playwright";

export interface InteropElectronAppWrapper {
    app: string;
    windowId: string;
    iodesktop: any;
    page: Page;
}

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

export const waitForWorkspaceToLoad = async (appWithIOWorkspaces: InteropElectronAppWrapper, workspaceAppName: string, electronApp: ElectronApplication): Promise<InteropElectronAppWrapper | undefined> => {
    const workspaceFrameId = await getNewlyOpenedFrameId(appWithIOWorkspaces);
    const workspaceApp = await getWorkspaceAppById(workspaceFrameId, electronApp);
    await workspaceApp?.page.waitForLoadState('domcontentloaded');
    return workspaceApp;
};

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
