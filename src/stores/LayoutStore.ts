import {observable, computed, action} from "mobx";
import {AppStore, AlertStore} from "stores";
import * as GoldenLayout from "golden-layout";
import {PresetLayout} from "models";
import {AppToaster} from "components/Shared";
import {smoothStepOffset} from "utilities";

const KEY = "CARTA_saved_layouts";
const MAX_LAYOUT = 10;
const COMPONENT_CONFIG = new Map<string, any>([
    ["image-view", {
        type: "react-component",
        component: "image-view",
        title: "No image loaded",
        height: smoothStepOffset(window.innerHeight, 720, 1080, 65, 75), // image view fraction: adjust layout properties based on window dimensions
        id: "image-view",
        isClosable: false
    }],
    ["render-config", {
        type: "react-component",
        component: "render-config",
        title: "Render Configuration",
        id: "render-config"
    }],
    ["region-list", {
        type: "react-component",
        component: "region-list",
        title: "Region List",
        id: "region-list"
    }],
    ["animator", {
        type: "react-component",
        component: "animator",
        title: "Animator",
        id: "animator"
    }],
    ["spatial-profiler-0", {
        type: "react-component",
        component: "spatial-profiler",
        id: "spatial-profiler-0"
    }],
    ["spatial-profiler-1", {
        type: "react-component",
        component: "spatial-profiler",
        id: "spatial-profiler-1"
    }],
    ["spectral-profiler", {
        type: "react-component",
        component: "spectral-profiler",
        id: "spectral-profiler",
        title: "Z Profile: Cursor"
    }],
    ["stats", {
        type: "react-component",
        component: "stats",
        title: "Statistics",
        id: "stats"
    }]
]);

const PRESET_CONFIGS = new Map<string, any>([
    [PresetLayout.DEFAULT, {
        leftBottomContent: {
            type: "stack",
            content: [{type: "component", id: "render-config"}]
        },
        rightColumnContent: [{type: "component", id: "spatial-profiler-0"}, {type: "component", id: "spatial-profiler-1"}, {
            type: "stack",
            content: [{type: "component", id: "animator"}, {type: "component", id: "region-list"}]
        }]
    }],
    [PresetLayout.CUBEVIEW, {
        leftBottomContent: {
            type: "stack",
            content: [{type: "component", id: "animator"}, {type: "component", id: "render-config"}, {type: "component", id: "region-list"}]
        },
        rightColumnContent: [{type: "component", id: "spatial-profiler-x"}, {type: "component", id: "spatial-profiler-y"}, {type: "component", id: "spectral-profiler"}]
    }],
    [PresetLayout.CUBEANALYSIS, {
        leftBottomContent: {
            type: "stack",
            content: [{type: "component", id: "animator"}, {type: "component", id: "render-config"}, {type: "component", id: "region-list"}]
        },
        rightColumnContent: [{type: "component", id: "spectral-profiler"}, {type: "component", id: "stats"}]
    }],
    [PresetLayout.CONTINUUMANALYSIS, {
        leftBottomContent: {
            type: "stack",
            content: [{type: "component", id: "render-config"}, {type: "component", id: "region-list"}, {type: "component", id: "animator"}]
        },
        rightColumnContent: [{type: "component", id: "spatial-profiler-x"}, {type: "component", id: "spatial-profiler-y"}, {type: "component", id: "stats"}]
    }]
]);

export class LayoutStore {
    public static TOASTER_TIMEOUT = 1500;

    private readonly appStore: AppStore;
    private alertStore: AlertStore;
    private layoutNameToBeSaved: string;

    // self-defined structure: {layoutName: config, layoutName: config, ...}
    @observable dockedLayout: GoldenLayout;
    @observable dockedLayoutName: string;
    @observable private layouts: any;

    constructor(appStore: AppStore, alertStore: AlertStore) {
        this.appStore = appStore;
        this.alertStore = alertStore;
        this.dockedLayout = null;
        this.layouts = {};
        this.initLayouts();
    }

    public layoutExist = (layoutName: string): boolean => {
        return layoutName && this.allLayouts.includes(layoutName);
    };

    public setLayoutToBeSaved = (layoutName: string) => {
        this.layoutNameToBeSaved = layoutName ? layoutName : "Empty";
    };

    private initLayouts = () => {
        // 1. fill layout with presets
        PresetLayout.PRESETS.forEach((presetName) => {
            const config = PRESET_CONFIGS.get(presetName);
            this.layouts[presetName] = {
                type: "row",
                content: [{
                    type: "column",
                    width: 60,
                    content: [{type: "component", id: "image-view"}, config.leftBottomContent]
                }, {
                    type: "column",
                    content: config.rightColumnContent
                }]
            };
        });

        // 2. add user layouts stored in local storage
        const layoutJson = localStorage.getItem(KEY);
        let userLayouts = null;
        if (layoutJson) {
            try {
                userLayouts = JSON.parse(layoutJson);
            } catch (e) {
                this.alertStore.showAlert("Loading user-defined layout failed!");
                userLayouts = null;
            }
        }

        if (userLayouts) {
            // skip user layouts which have the same name as presets
            Object.keys(userLayouts).forEach((userLayout) => {
                if (!PresetLayout.isValid(userLayout)) { this.layouts[userLayout] = userLayouts[userLayout]; }
            });
        }
    };

    private saveLayoutToLocalStorage = (): boolean => {
        if (this.userLayouts && this.userLayouts.length > 0) {
            // save only user layouts to local storage, excluding presets
            let userLayouts = {};
            this.userLayouts.forEach((layoutName) => {
                if (!PresetLayout.isValid(layoutName)) { userLayouts[layoutName] = this.layouts[layoutName]; }
            });

            try {
                const serializedJson = JSON.stringify(userLayouts);
                localStorage.setItem(KEY, serializedJson);
            } catch (e) {
                this.alertStore.showAlert("Saving user-defined layout failed! " + e.message);
                return false;
            }
        }

        return true;
    };

    private genSimpleConfig = (newParentContent, parentContent): void => {
        if (!newParentContent || !parentContent) {
            return;
        }

        parentContent.forEach((child) => {
            if (child.type) {
                if (child.type === "stack" || child.type === "row" || child.type === "column") {
                    let simpleChild = {
                        type: child.type,
                        content: []
                    };
                    if (child.width) {
                        simpleChild["width"] = child.width;
                    }
                    if (child.height) {
                        simpleChild["height"] = child.height;
                    }
                    newParentContent.push(simpleChild);
                    if (child.content) {
                        this.genSimpleConfig(simpleChild.content, child.content);
                    }
                } else if (child.type === "component" && child.component) {
                    let simpleChild = {
                        type: child.type,
                        id: child.component
                    };
                    if (child.width) {
                        simpleChild["width"] = child.width;
                    }
                    if (child.height) {
                        simpleChild["height"] = child.height;
                    }
                    newParentContent.push(simpleChild);
                }
            }
        });
    };

    private fillComponents = (newParentContent, parentContent, componentConfigs: string[]) => {
        if (!newParentContent || !parentContent) {
            return;
        }

        parentContent.forEach((child) => {
            if (child.type) {
                if (child.type === "stack" || child.type === "row" || child.type === "column") {
                    let simpleChild = {
                        type: child.type,
                        content: []
                    };
                    if (child.width) {
                        simpleChild["width"] = child.width;
                    }
                    if (child.height) {
                        simpleChild["height"] = child.height;
                    }
                    newParentContent.push(simpleChild);
                    if (child.content) {
                        this.fillComponents(simpleChild.content, child.content, componentConfigs);
                    }
                } else if (child.type === "component" && child.id && COMPONENT_CONFIG.has(child.id)) {
                    let componentConfig = COMPONENT_CONFIG.get(child.id);
                    if (child.width) {
                        componentConfig["width"] = child.width;
                    }
                    if (child.height) {
                        componentConfig["height"] = child.height;
                    }
                    componentConfig.props = {appStore: this.appStore, id: child.id, docked: true};
                    componentConfigs.push(componentConfig);
                    newParentContent.push(componentConfig);
                }
            }
        });
    };

    @computed get allLayouts(): string[] {
        return this.layouts ? Object.keys(this.layouts) : [];
    }

    @computed get userLayouts(): string[] {
        return this.layouts ? Object.keys(this.layouts).filter((layoutName) => !PresetLayout.isValid(layoutName)) : [];
    }

    @computed get savedUserLayoutNumber(): number {
        return this.userLayouts.length;
    }

    @action applyLayout = (layoutName: string): boolean => {
        if (!layoutName || !this.layoutExist(layoutName)) {
            this.alertStore.showAlert(`Applying layout failed! Layout ${layoutName} not found.`);
            return false;
        }

        const config = this.layouts[layoutName];
        if (!config || !config.type || !config.content) {
            this.alertStore.showAlert(`Applying layout failed! Something is wrong with layout ${layoutName}.`);
            return false;
        }

        let arrangementConfig = {
            type: config.type,
            content: []
        };
        let componentConfigs = [];
        this.fillComponents(arrangementConfig.content, config.content, componentConfigs);

        const mainLayoutConfig = {
            settings: {
                showPopoutIcon: false,
                showCloseIcon: false
            },
            dimensions: {
                minItemWidth: 250,
                minItemHeight: 200,
                dragProxyWidth: 600,
                dragProxyHeight: 270,
            },
            content: [arrangementConfig]
        };

        // destroy old layout & init new layout
        if (this.dockedLayout) {
            this.dockedLayout.destroy();
        }
        this.dockedLayout = new GoldenLayout(mainLayoutConfig, this.appStore.getImageViewContainer());
        this.dockedLayoutName = layoutName;
        this.appStore.widgetsStore.initLayoutWithWidgets(this.dockedLayout, componentConfigs);
        this.dockedLayout.init();

        return true;
    };

    @action saveLayout = () => {
        if (!this.layouts || !this.layoutNameToBeSaved || !this.dockedLayout) {
            this.alertStore.showAlert("Save layout failed! Empty layouts or name.");
            return;
        }

        if (PresetLayout.isValid(this.layoutNameToBeSaved)) {
            this.alertStore.showAlert("Layout name cannot be the same as system presets.");
            return;
        }

        if (!this.layoutExist(this.layoutNameToBeSaved) && this.savedUserLayoutNumber >= MAX_LAYOUT) {
            this.alertStore.showAlert(`Maximum user-defined layout quota exceeded! (${MAX_LAYOUT} layouts)`);
            return;
        }

        const currentConfig = this.dockedLayout.toConfig();
        if (!currentConfig || !currentConfig.content || currentConfig.content.length <= 0 || !currentConfig.content[0].type || !currentConfig.content[0].content) {
            this.alertStore.showAlert("Saving layout failed! Something is wrong with current layout.");
            return;
        }

        // generate simple config from current layout
        const rootConfig = currentConfig.content[0];
        let simpleConfig = {
            type: rootConfig.type,
            content: []
        };
        this.genSimpleConfig(simpleConfig.content, rootConfig.content);
        this.layouts[this.layoutNameToBeSaved] = simpleConfig;

        if (!this.saveLayoutToLocalStorage()) {
            delete this.layouts[this.layoutNameToBeSaved];
            return;
        }

        this.dockedLayoutName = this.layoutNameToBeSaved;
        AppToaster.show({icon: "layout-grid", message: `Layout ${this.layoutNameToBeSaved} saved successfully.`, intent: "success", timeout: LayoutStore.TOASTER_TIMEOUT});
    };

    @action deleteLayout = (layoutName: string) => {
        if (!layoutName || !this.layoutExist(layoutName)) {
            this.alertStore.showAlert(`Cannot delete layout ${layoutName}! It does not exist.`);
            return;
        }

        delete this.layouts[layoutName];
        if (!this.saveLayoutToLocalStorage()) {
            return;
        }

        AppToaster.show({icon: "layout-grid", message: `Layout ${layoutName} deleted successfully.`, intent: "success", timeout: LayoutStore.TOASTER_TIMEOUT});
    };
}
