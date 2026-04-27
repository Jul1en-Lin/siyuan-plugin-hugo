type NodeRuntime = {
    fs: typeof import("fs");
    path: typeof import("path");
    childProcess: typeof import("child_process");
};

let cachedRuntime: NodeRuntime | null = null;

function getNodeRequire(): NodeJS.Require {
    const req = (globalThis as any).require ?? (window as any).require;
    if (!req) {
        throw new Error("Node runtime is not available in the current SiYuan environment.");
    }
    return req as NodeJS.Require;
}

export function hasNodeRuntime(): boolean {
    try {
        getNodeRequire();
        return true;
    } catch {
        return false;
    }
}

export function getNodeRuntime(): NodeRuntime {
    if (cachedRuntime) {
        return cachedRuntime;
    }

    const require = getNodeRequire();
    cachedRuntime = {
        fs: require("fs") as typeof import("fs"),
        path: require("path") as typeof import("path"),
        childProcess: require("child_process") as typeof import("child_process"),
    };
    return cachedRuntime;
}
