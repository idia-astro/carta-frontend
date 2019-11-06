import {observable, computed, action, autorun} from "mobx";
import {Colors} from "@blueprintjs/core";
import * as AST from "ast_wrapper";
import {CARTA} from "carta-protobuf";
import {AppStore, FrameScaling, RenderConfigStore, RegionStore} from "stores";
import {Theme, PresetLayout, CursorPosition, Zoom, WCSType, RegionCreationMode, CompressionQuality, TileCache, Event} from "models";
import {isColorValid, parseBoolean} from "utilities";
import {BackendService} from "services";

export enum PreferenceKeys {
    GLOBAL_THEME,
    GLOBAL_AUTOLAUNCH,
    GLOBAL_LAYOUT,
    GLOBAL_CURSOR_POSITION,
    GLOBAL_ZOOM_MODE,
    GLOBAL_DRAG_PANNING,

    RENDER_CONFIG_SCALING,
    RENDER_CONFIG_COLORMAP,
    RENDER_CONFIG_PERCENTILE,
    RENDER_CONFIG_SCALING_ALPHA,
    RENDER_CONFIG_SCALING_GAMMA,
    RENDER_CONFIG_NAN_COLOR_HEX,
    RENDER_CONFIG_NAN_ALPHA,

    CONTOUR_CONFIG_CONTOUR_SMOOTHING_MODE,
    CONTOUR_CONFIG_CONTOUR_SMOOTHING_FACTOR,
    CONTOUR_CONFIG_CONTOUR_NUM_LEVELS,
    CONTOUR_CONFIG_CONTOUR_THICKNESS,
    CONTOUR_CONFIG_CONTOUR_COLORMAP_ENABLED,
    CONTOUR_CONFIG_CONTOUR_COLOR,
    CONTOUR_CONFIG_CONTOUR_COLORMAP,

    WCS_OVERLAY_AST_COLOR,
    WCS_OVERLAY_AST_GRID_VISIBLE,
    WCS_OVERLAY_AST_LABELS_VISIBLE,
    WCS_OVERLAY_WCS_TYPE,

    REGION_COLOR,
    REGION_LINE_WIDTH,
    REGION_DASH_LENGTH,
    REGION_TYPE,
    REGION_CREATION_MODE,

    PERFORMANCE_IMAGE_COMPRESSION_QUALITY,
    PERFORMANCE_ANIMATION_COMPRESSION_QUALITY,
    PERFORMANCE_GPU_TILE_CACHE,
    PERFORMANCE_SYSTEM_TILE_CACHE,
    PERFORMANCE_CONTOUR_DECIMATION,
    PERFORMANCE_CONTOUR_COMPRESSION_LEVEL,
    PERFORMANCE_CONTOUR_CHUNK_SIZE,
    PERFORMANCE_STREAM_CONTOURS_WHILE_ZOOMING,

    LOG_EVENT
}

const LOCAL_STORAGE_KEYS = new Map<PreferenceKeys, string>([
    [PreferenceKeys.GLOBAL_THEME, "theme"],
    [PreferenceKeys.GLOBAL_AUTOLAUNCH, "autoLaunch"],
    [PreferenceKeys.GLOBAL_LAYOUT, "layout"],
    [PreferenceKeys.GLOBAL_CURSOR_POSITION, "cursorPosition"],
    [PreferenceKeys.GLOBAL_ZOOM_MODE, "zoomMode"],
    [PreferenceKeys.GLOBAL_DRAG_PANNING, "dragPanning"],

    [PreferenceKeys.RENDER_CONFIG_SCALING, "scaling"],
    [PreferenceKeys.RENDER_CONFIG_COLORMAP, "colormap"],
    [PreferenceKeys.RENDER_CONFIG_PERCENTILE, "percentile"],
    [PreferenceKeys.RENDER_CONFIG_SCALING_ALPHA, "scalingAlpha"],
    [PreferenceKeys.RENDER_CONFIG_SCALING_GAMMA, "scalingGamma"],
    [PreferenceKeys.RENDER_CONFIG_NAN_COLOR_HEX, "nanColorHex"],
    [PreferenceKeys.RENDER_CONFIG_NAN_ALPHA, "nanAlpha"],

    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_SMOOTHING_MODE, "contourSmoothingMode"],
    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_SMOOTHING_FACTOR, "contourSmoothingFactor"],
    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_NUM_LEVELS, "contourNumLevels"],
    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_THICKNESS, "contourThickness"],
    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLORMAP_ENABLED, "contourColormapEnabled"],
    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLOR, "contourColor"],
    [PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLORMAP, "contourColormap"],

    [PreferenceKeys.WCS_OVERLAY_AST_COLOR, "astColor"],
    [PreferenceKeys.WCS_OVERLAY_AST_GRID_VISIBLE, "astGridVisible"],
    [PreferenceKeys.WCS_OVERLAY_AST_LABELS_VISIBLE, "astLabelsVisible"],
    [PreferenceKeys.WCS_OVERLAY_WCS_TYPE, "wcsType"],

    [PreferenceKeys.REGION_COLOR, "regionColor"],
    [PreferenceKeys.REGION_LINE_WIDTH, "regionLineWidth"],
    [PreferenceKeys.REGION_DASH_LENGTH, "regionDashLength"],
    [PreferenceKeys.REGION_TYPE, "regionType"],
    [PreferenceKeys.REGION_CREATION_MODE, "regionCreationMode"],

    [PreferenceKeys.PERFORMANCE_IMAGE_COMPRESSION_QUALITY, "imageCompressionQuality"],
    [PreferenceKeys.PERFORMANCE_ANIMATION_COMPRESSION_QUALITY, "animationCompressionQuality"],
    [PreferenceKeys.PERFORMANCE_GPU_TILE_CACHE, "GPUTileCache"],
    [PreferenceKeys.PERFORMANCE_SYSTEM_TILE_CACHE, "systemTileCache"],
    [PreferenceKeys.PERFORMANCE_CONTOUR_DECIMATION, "contourDecimation"],
    [PreferenceKeys.PERFORMANCE_CONTOUR_COMPRESSION_LEVEL, "contourCompressionLevel"],
    [PreferenceKeys.PERFORMANCE_CONTOUR_CHUNK_SIZE, "contourChunkSize"],
    [PreferenceKeys.PERFORMANCE_STREAM_CONTOURS_WHILE_ZOOMING, "streamContoursWhileZooming"],

    [PreferenceKeys.LOG_EVENT, "logEventList"]
]);

/*
const PREFERENCE_LOCAL_STORAGE_KEYS = {
    GLOBAL: {
        theme: "theme",
        autoLaunch: "autoLaunch",
        layout: "layout",
        cursorPosition: "cursorPosition",
        zoomMode: "zoomMode",
        dragPanning: "dragPanning",
    },
    RENDER_CONFIG: {
        scaling: "scaling",
        colormap: "colormap",
        percentile: "percentile",
        scalingAlpha: "scalingAlpha",
        scalingGamma: "scalingGamma",
        nanColorHex: "nanColorHex",
        nanAlpha: "nanAlpha",
    },
    CONTOUR_CONFIG: {
        contourSmoothingMode: "contourSmoothingMode",
        contourSmoothingFactor: "contourSmoothingFactor",
        contourNumLevels: "contourNumLevels",
        contourThickness: "contourThickness",
        contourColormapEnabled: "contourColormapEnabled",
        contourColor: "contourColor",
        contourColormap: "contourColormap",
    },
        WCS_OVERLAY: {
        astColor: "astColor",
        astGridVisible: "astGridVisible",
        astLabelsVisible: "astLabelsVisible",
        wcsType: "wcsType",
    },
    REGION: {
        regionColor: "regionColor",
        regionLineWidth: "regionLineWidth",
        regionDashLength: "regionDashLength",
        regionType: "regionType",
        regionCreationMode: "regionCreationMode",
    },
    PERFORMANCE: {
        imageCompressionQuality: "imageCompressionQuality",
        animationCompressionQuality: "animationCompressionQuality",
        GPUTileCache: "GPUTileCache",
        systemTileCache: "systemTileCache",
        contourDecimation: "contourDecimation",
        contourCompressionLevel: "contourCompressionLevel",
        contourChunkSize: "contourChunkSize",
        streamContoursWhileZooming: "streamContoursWhileZooming",
    },
    LOG_EVENT: {
        logEventList: "logEventList"
    }
};
*/

const DEFAULTS = {
    GLOBAL: {
        theme: Theme.LIGHT,
        autoLaunch: true,
        layout: PresetLayout.DEFAULT,
        cursorPosition: CursorPosition.TRACKING,
        zoomMode: Zoom.FIT,
        dragPanning: true,
    },
    RENDER_CONFIG: {
        scaling: FrameScaling.LINEAR,
        colormap: "inferno",
        percentile: 99.9,
        scalingAlpha: 1000,
        scalingGamma: 1,
        nanColorHex: "#137CBD",
        nanAlpha: 1,
    },
    CONTOUR_CONFIG: {
        contourSmoothingMode: CARTA.SmoothingMode.BlockAverage,
        contourSmoothingFactor: 4,
        contourNumLevels: 5,
        contourThickness: 1,
        contourColormapEnabled: false,
        contourColor: Colors.GREEN3,
        contourColormap: "viridis",
    },
    WCS_OVERLAY: {
        astColor: 4,
        astGridVisible: false,
        astLabelsVisible: true,
        wcsType: WCSType.AUTOMATIC,
    },
    REGION: {
        regionColor: "#2EE6D6",
        regionLineWidth: 2,
        regionDashLength: 0,
        regionType: CARTA.RegionType.RECTANGLE,
        regionCreationMode: RegionCreationMode.CENTER,
    },
    PERFORMANCE: {
        imageCompressionQuality: CompressionQuality.IMAGE_DEFAULT,
        animationCompressionQuality: CompressionQuality.ANIMATION_DEFAULT,
        GPUTileCache: TileCache.GPU_DEFAULT,
        systemTileCache: TileCache.SYSTEM_DEFAULT,
        contourDecimation: 4,
        contourCompressionLevel: 8,
        contourChunkSize: 100000,
        streamContoursWhileZooming: false
    },
    LOG_EVENT: {
        eventLoggingEnabled: false
    }
};

interface Global {
    theme: string;
    autoLaunch: boolean;
    layout: string;
    cursorPosition: string;
    zoomMode: string;
    dragPanning: boolean;
}

interface RenderConfig {
    scaling: FrameScaling;
    colormap: string;
    percentile: number;
    scalingAlpha: number;
    scalingGamma: number;
    nanColorHex: string;
    nanAlpha: number;
}

interface ContourConfig {
    contourSmoothingMode: CARTA.SmoothingMode;
    contourSmoothingFactor: number;
    contourNumLevels: number;
    contourThickness: number;
    contourColormapEnabled: boolean;
    contourColor: string;
    contourColormap: string;
}

interface WCSOverlay {
    astColor: number;
    astGridVisible: boolean;
    astLabelsVisible: boolean;
    wcsType: string;
}

interface Region {
    regionColor: string;
    regionLineWidth: number;
    regionDashLength: number;
    regionType: CARTA.RegionType;
    regionCreationMode: string;
}

interface Performance {
    imageCompressionQuality: number;
    animationCompressionQuality: number;
    GPUTileCache: number;
    systemTileCache: number;
    contourDecimation: number;
    contourCompressionLevel: number;
    contourChunkSize: number;
    streamContoursWhileZooming: boolean;
}

interface Preference {
    global: Global;
    renderConfig: RenderConfig;
    contourConfig: ContourConfig;
    wcsOverlay: WCSOverlay;
    region: Region;
    performance: Performance;
    eventsLoggingEnabled: Map<CARTA.EventType, boolean>;
}

export class PreferenceStore {
    private readonly appStore: AppStore;
    private readonly backendService: BackendService;
    private serverSupport: boolean;

    @observable preference: Preference;
    @observable global: Global;
    @observable renderConfig: RenderConfig;
    @observable contourConfig: ContourConfig;
    @observable wcsOverlay: WCSOverlay;
    @observable region: Region;
    @observable performance: Performance;
    @observable eventsLoggingEnabled: Map<CARTA.EventType, boolean>;

    // getters for global settings
    public getTheme = (): string => {
        return this.global.theme;
    };

    public getAutoLaunch = (): boolean => {
        return this.global.autoLaunch;
    };

    public getLayout = (): string => {
        return this.global.layout;
    };

    public getCursorPosition = (): string => {
        return this.global.cursorPosition;
    };

    public getZoomMode = (): string => {
        return this.global.zoomMode;
    };

    public getDragPanning = (): boolean => {
        return this.global.dragPanning;
    };

    // getters for render config
    public getScaling = (): FrameScaling => {
        return this.renderConfig.scaling;
    };

    public getColormap = (): string => {
        return this.renderConfig.colormap;
    };

    public getPercentile = (): number => {
        return this.renderConfig.percentile;
    };

    public getScalingAlpha = (): number => {
        return this.renderConfig.scalingAlpha;
    };

    public getScalingGamma = (): number => {
        return this.renderConfig.scalingGamma;
    };

    public getNaNColorHex = (): string => {
        return this.renderConfig.nanColorHex;
    };

    public getNaNAlpha = (): number => {
        return this.renderConfig.nanAlpha;
    };

    // getters for Contour Config
    public getContourColormapEnabled = (): boolean => {
        return this.contourConfig.contourColormapEnabled;
    };

    public getContourColormap = (): string => {
        return this.contourConfig.contourColormap;
    };

    public getContourColor = (): string => {
        return this.contourConfig.contourColor;
    };

    public getContourSmoothingMode = (): CARTA.SmoothingMode => {
        return this.contourConfig.contourSmoothingMode;
    };

    public getContourSmoothingFactor = (): number => {
        return this.contourConfig.contourSmoothingFactor;
    };

    public getContourNumLevels = (): number => {
        return this.contourConfig.contourNumLevels;
    };

    public getContourThickness = (): number => {
        return this.contourConfig.contourThickness;
    };

    public getContourDecimation = (): number => {
        return this.performance.contourDecimation;
    };

    public getContourCompressionLevel = (): number => {
        return this.performance.contourCompressionLevel;
    };

    public getContourChunkSize = (): number => {
        return this.performance.contourChunkSize;
    };

    // getters for WCS overlay
    public getASTColor = (): number => {
        return this.wcsOverlay.astColor;
    };

    public getASTGridVisible = (): boolean => {
        return this.wcsOverlay.astGridVisible;
    };

    public getASTLabelsVisible = (): boolean => {
        return this.wcsOverlay.astLabelsVisible;
    };

    public getWCSType = (): string => {
        return this.wcsOverlay.wcsType;
    };

    // getters for region
    public getRegionColor = (): string => {
        return this.region.regionColor;
    };

    public getRegionLineWidth = (): number => {
        return this.region.regionLineWidth;
    };

    public getRegionDashLength = (): number => {
        return this.region.regionDashLength;
    };

    public getRegionType = (): CARTA.RegionType => {
        return this.region.regionType;
    };

    public getRegionCreationMode = (): string => {
        return this.region.regionCreationMode;
    };

    // getters for performance
    public getImageCompressionQuality = (): number => {
        return this.performance.imageCompressionQuality;
    };

    public getAnimationCompressionQuality = (): number => {
        return this.performance.animationCompressionQuality;
    };

    public getGPUTileCache = (): number => {
        return this.performance.GPUTileCache;
    };

    public getSystemTileCache = (): number => {
        return this.performance.systemTileCache;
    };

    public getStreamContoursWhileZooming = (): boolean => {
        return this.performance.streamContoursWhileZooming;
    };

    public isEventLoggingEnabled = (eventType: CARTA.EventType): boolean => {
        return Event.isEventTypeValid(eventType) && this.eventsLoggingEnabled.get(eventType);
    };

    public flipEventLoggingEnabled = (eventType: CARTA.EventType): void => {
        if (Event.isEventTypeValid(eventType)) {
            this.eventsLoggingEnabled.set(eventType, !this.eventsLoggingEnabled.get(eventType));
        }
    };

    // getters for boolean(convenient)
    @computed get isDarkTheme(): boolean {
        return this.global.theme === Theme.DARK;
    }

    @computed get isZoomRAWMode(): boolean {
        return this.global.zoomMode === Zoom.RAW;
    }

    @computed get isRegionCornerMode(): boolean {
        return this.region.regionCreationMode === RegionCreationMode.CORNER;
    }

    @computed get isCursorFrozen(): boolean {
        return this.global.cursorPosition === CursorPosition.FIXED;
    }

    @computed get enabledLoggingEventNames(): string[] {
        let eventNames: string[] = [];
        this.eventsLoggingEnabled.forEach((isChecked, eventType) => {
            if (isChecked) {
                eventNames.push(Event.getEventNameFromType(eventType));
            }
        });
        return eventNames;
    }

    @action setPreferenceBool = (key: PreferenceKeys, value: boolean): void => {
    };

    @action setPreferenceNum = (key: PreferenceKeys, value: number): void => {
    };

    @action setPreference = (key: PreferenceKeys, value: any): void => {
        const localStorageKey = LOCAL_STORAGE_KEYS.get(key);
        if (!key || !value || !localStorageKey) {
            return;
        }

        switch (key) {
            case PreferenceKeys.GLOBAL_THEME:
                this.global.theme = value;
                break;
            case PreferenceKeys.GLOBAL_AUTOLAUNCH:
                this.global.autoLaunch = value;
                break;
            case PreferenceKeys.GLOBAL_LAYOUT:
                this.global.layout = value;
                break;
            case PreferenceKeys.GLOBAL_CURSOR_POSITION:
                this.global.cursorPosition = value;
                break;
            case PreferenceKeys.GLOBAL_ZOOM_MODE:
                this.global.zoomMode = value;
                break;
            case PreferenceKeys.GLOBAL_DRAG_PANNING:
                this.global.dragPanning = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_SCALING:
                this.renderConfig.scaling = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_COLORMAP:
                this.renderConfig.colormap = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_PERCENTILE:
                this.renderConfig.percentile = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_SCALING_ALPHA:
                this.renderConfig.scalingAlpha = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_SCALING_GAMMA:
                this.renderConfig.scalingGamma = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_NAN_COLOR_HEX:
                this.renderConfig.nanColorHex = value;
                break;
            case PreferenceKeys.RENDER_CONFIG_NAN_ALPHA:
                this.renderConfig.nanAlpha = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_SMOOTHING_MODE:
                this.contourConfig.contourSmoothingMode = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_SMOOTHING_FACTOR:
                this.contourConfig.contourSmoothingFactor = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_NUM_LEVELS:
                this.contourConfig.contourNumLevels = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_THICKNESS:
                this.contourConfig.contourThickness = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLORMAP_ENABLED:
                this.contourConfig.contourColormapEnabled = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLOR:
                this.contourConfig.contourColor = value;
                break;
            case PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLORMAP:
                this.contourConfig.contourColormap = value;
                break;
            case PreferenceKeys.WCS_OVERLAY_AST_COLOR:
                this.wcsOverlay.astColor = value;
                break;
            case PreferenceKeys.WCS_OVERLAY_AST_GRID_VISIBLE:
                this.wcsOverlay.astGridVisible = value;
                break;
            case PreferenceKeys.WCS_OVERLAY_AST_LABELS_VISIBLE:
                this.wcsOverlay.astLabelsVisible = value;
                break;
            case PreferenceKeys.WCS_OVERLAY_WCS_TYPE:
                this.wcsOverlay.wcsType = value;
                break;
            case PreferenceKeys.REGION_COLOR:
                this.region.regionColor = value;
                break;
            case PreferenceKeys.REGION_LINE_WIDTH:
                this.region.regionLineWidth = value;
                break;
            case PreferenceKeys.REGION_DASH_LENGTH:
                this.region.regionDashLength = value;
                break;
            case PreferenceKeys.REGION_TYPE:
                this.region.regionType = value;
                break;
            case PreferenceKeys.REGION_CREATION_MODE:
                this.region.regionCreationMode = value;
                break;
            case PreferenceKeys.PERFORMANCE_IMAGE_COMPRESSION_QUALITY:
                this.performance.imageCompressionQuality = value;
                break;
            case PreferenceKeys.PERFORMANCE_ANIMATION_COMPRESSION_QUALITY:
                this.performance.animationCompressionQuality = value;
                break;
            case PreferenceKeys.PERFORMANCE_GPU_TILE_CACHE:
                this.performance.GPUTileCache = value;
                break;
            case PreferenceKeys.PERFORMANCE_SYSTEM_TILE_CACHE:
                this.performance.systemTileCache = value;
                break;
            case PreferenceKeys.PERFORMANCE_CONTOUR_DECIMATION:
                this.performance.contourDecimation = value;
                break;
            case PreferenceKeys.PERFORMANCE_CONTOUR_COMPRESSION_LEVEL:
                this.performance.contourCompressionLevel = value;
                break;
            case PreferenceKeys.PERFORMANCE_CONTOUR_CHUNK_SIZE:
                this.performance.contourChunkSize = value;
                break;
            case PreferenceKeys.PERFORMANCE_STREAM_CONTOURS_WHILE_ZOOMING:
                this.performance.streamContoursWhileZooming = value;
                break;
            default:
                return;
        }

        if (this.serverSupport) {
            // save to server
        } else {
            switch (typeof value) {
                case "boolean":
                    localStorage.setItem(localStorageKey, value ? "true" : "false");
                    break;
                case "number":
                    localStorage.setItem(localStorageKey, value.toString(10));
                    break;
                case "string":
                    localStorage.setItem(localStorageKey, value);
                    break;
                default:
                    return;
            }
        }
    };

    /*
    // setters for global
    @action setTheme = (theme: string) => {
        this.global.theme = theme;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.GLOBAL.theme, theme);
    };

    @action setAutoLaunch = (autoLaunch: boolean) => {
        this.global.autoLaunch = autoLaunch;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.GLOBAL.autoLaunch, autoLaunch ? "true" : "false");
    };

    @action setLayout = (layout: string) => {
        this.global.layout = layout;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.GLOBAL.layout, layout);
    };

    @action setCursorPosition = (cursorPosition: string) => {
        this.global.cursorPosition = cursorPosition;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.GLOBAL.cursorPosition, cursorPosition);
    };

    @action setZoomMode = (zoomMode: string) => {
        this.global.zoomMode = zoomMode;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.GLOBAL.zoomMode, zoomMode);
    };

    @action setDragPanning = (dragPanning: boolean) => {
        this.global.dragPanning = dragPanning;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.GLOBAL.dragPanning, String(dragPanning));
    };

    // setters for render config
    @action setScaling = (scaling: FrameScaling) => {
        this.renderConfig.scaling = scaling;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.scaling, scaling.toString(10));
    };

    @action setColormap = (colormap: string) => {
        this.renderConfig.colormap = colormap;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.colormap, colormap);
    };

    @action setPercentile = (percentile: number) => {
        this.renderConfig.percentile = percentile;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.percentile, percentile.toString(10));
    };

    @action setScalingAlpha = (scalingAlpha: number) => {
        this.renderConfig.scalingAlpha = scalingAlpha;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.scalingAlpha, scalingAlpha.toString(10));
    };

    @action setScalingGamma = (scalingGamma: number) => {
        this.renderConfig.scalingGamma = scalingGamma;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.scalingGamma, scalingGamma.toString(10));
    };

    @action setNaNColorHex = (nanColorHex: string) => {
        this.renderConfig.nanColorHex = nanColorHex;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.nanColorHex, nanColorHex);
    };

    @action setNaNAlpha = (nanAlpha: number) => {
        this.renderConfig.nanAlpha = nanAlpha;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.RENDER_CONFIG.nanAlpha, nanAlpha.toString(10));
    };

    // setters for contours
    @action setContourSmoothingMode = (val: CARTA.SmoothingMode) => {
        this.contourConfig.contourSmoothingMode = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourSmoothingMode, val.toString());
    };

    @action setContourSmoothingFactor = (val: number) => {
        this.contourConfig.contourSmoothingFactor = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourSmoothingFactor, val.toString());
    };

    @action setContourNumLevels = (val: number) => {
        this.contourConfig.contourNumLevels = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourNumLevels, val.toString());
    };

    @action setContourThickness = (val: number) => {
        this.contourConfig.contourThickness = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourThickness, val.toString());
    };

    @action setContourColor = (color: string) => {
        this.contourConfig.contourColor = color;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourColor, color);
    };

    @action setContourColormapEnabled = (val: boolean) => {
        this.contourConfig.contourColormapEnabled = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourColormapEnabled, String(val));
    };

    @action setContourColormap = (colormap: string) => {
        this.contourConfig.contourColormap = colormap;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.CONTOUR_CONFIG.contourColormap, colormap);
    };

    // setters for WCS overlay
    @action setASTColor = (astColor: number) => {
        this.wcsOverlay.astColor = astColor;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.WCS_OVERLAY.astColor, astColor.toString(10));
    };

    @action setASTGridVisible = (visible: boolean) => {
        this.wcsOverlay.astGridVisible = visible;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.WCS_OVERLAY.astGridVisible, visible ? "true" : "false");
    };

    @action setASTLabelsVisible = (visible: boolean) => {
        this.wcsOverlay.astLabelsVisible = visible;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.WCS_OVERLAY.astLabelsVisible, visible ? "true" : "false");
    };

    @action setWCSType = (wcsType: string) => {
        this.wcsOverlay.wcsType = wcsType;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.WCS_OVERLAY.wcsType, wcsType);
    };

    // setters for region
    @action setRegionColor = (color: string) => {
        this.region.regionColor = color;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.REGION.regionColor, color);
    };

    @action setRegionLineWidth = (lineWidth: number) => {
        this.region.regionLineWidth = lineWidth;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.REGION.regionLineWidth, lineWidth.toString(10));
    };

    @action setRegionDashLength = (dashLength: number) => {
        this.region.regionDashLength = dashLength;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.REGION.regionDashLength, dashLength.toString(10));
    };

    @action setRegionType = (regionType: CARTA.RegionType) => {
        if (this.appStore.activeFrame && this.appStore.activeFrame.regionSet) {
            this.appStore.activeFrame.regionSet.setNewRegionType(regionType);
        }

        this.region.regionType = regionType;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.REGION.regionType, regionType.toString(10));
    };

    @action setRegionCreationMode = (regionCreationMode: string) => {
        this.region.regionCreationMode = regionCreationMode;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.REGION.regionCreationMode, regionCreationMode);
    };

    // setters for performance
    @action setImageCompressionQuality = (imageCompressionQuality: number) => {
        this.appStore.compressionQuality = imageCompressionQuality;
        this.performance.imageCompressionQuality = imageCompressionQuality;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.imageCompressionQuality, imageCompressionQuality.toString(10));
    };

    @action setAnimationCompressionQuality = (animationCompressionQuality: number) => {
        this.performance.animationCompressionQuality = animationCompressionQuality;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.animationCompressionQuality, animationCompressionQuality.toString(10));
    };

    @action setGPUTileCache = (GPUTileCache: number) => {
        this.performance.GPUTileCache = GPUTileCache;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.GPUTileCache, GPUTileCache.toString(10));
    };

    @action setSystemTileCache = (systemTileCache: number) => {
        this.performance.systemTileCache = systemTileCache;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.systemTileCache, systemTileCache.toString(10));
    };

    @action setStreamContoursWhileZooming = (val: boolean) => {
        this.performance.streamContoursWhileZooming = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.streamContoursWhileZooming, String(val));
    };

    @action setContourDecimation = (val: number) => {
        this.performance.contourDecimation = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.contourDecimation, val.toString());
    };

    @action setContourCompressionLevel = (val: number) => {
        this.performance.contourCompressionLevel = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.contourCompressionLevel, val.toString());
    };

    @action setContourChunkSize = (val: number) => {
        this.performance.contourChunkSize = val;
        localStorage.setItem(PREFERENCE_LOCAL_STORAGE_KEYS.PERFORMANCE.contourChunkSize, val.toString());
    };
    */

    // reset functions
    @action resetGlobalSettings = () => {
        this.setTheme(DEFAULTS.GLOBAL.theme);
        this.setAutoLaunch(DEFAULTS.GLOBAL.autoLaunch);
        this.setLayout(DEFAULTS.GLOBAL.layout);
        this.setCursorPosition(DEFAULTS.GLOBAL.cursorPosition);
        this.setZoomMode(DEFAULTS.GLOBAL.zoomMode);
    };

    @action resetRenderConfigSettings = () => {
        this.setScaling(DEFAULTS.RENDER_CONFIG.scaling);
        this.setColormap(DEFAULTS.RENDER_CONFIG.colormap);
        this.setPercentile(DEFAULTS.RENDER_CONFIG.percentile);
        this.setScalingAlpha(DEFAULTS.RENDER_CONFIG.scalingAlpha);
        this.setScalingGamma(DEFAULTS.RENDER_CONFIG.scalingGamma);
        this.setNaNColorHex(DEFAULTS.RENDER_CONFIG.nanColorHex);
        this.setNaNAlpha(DEFAULTS.RENDER_CONFIG.nanAlpha);
    };

    @action resetContourConfigSettings = () => {
        this.setContourSmoothingFactor(DEFAULTS.CONTOUR_CONFIG.contourSmoothingFactor);
        this.setContourSmoothingMode(DEFAULTS.CONTOUR_CONFIG.contourSmoothingMode);
        this.setContourNumLevels(DEFAULTS.CONTOUR_CONFIG.contourNumLevels);
        this.setContourThickness(DEFAULTS.CONTOUR_CONFIG.contourThickness);
        this.setContourColor(DEFAULTS.CONTOUR_CONFIG.contourColor);
        this.setContourColormap(DEFAULTS.CONTOUR_CONFIG.contourColormap);
        this.setContourColormapEnabled(DEFAULTS.CONTOUR_CONFIG.contourColormapEnabled);
    };

    @action resetWCSOverlaySettings = () => {
        this.setASTColor(DEFAULTS.WCS_OVERLAY.astColor);
        this.setASTGridVisible(DEFAULTS.WCS_OVERLAY.astGridVisible);
        this.setASTLabelsVisible(DEFAULTS.WCS_OVERLAY.astLabelsVisible);
        this.setWCSType(DEFAULTS.WCS_OVERLAY.wcsType);
    };

    @action resetRegionSettings = () => {
        this.setRegionColor(DEFAULTS.REGION.regionColor);
        this.setRegionLineWidth(DEFAULTS.REGION.regionLineWidth);
        this.setRegionDashLength(DEFAULTS.REGION.regionDashLength);
        this.setRegionType(DEFAULTS.REGION.regionType);
        this.setRegionCreationMode(DEFAULTS.REGION.regionCreationMode);
    };

    @action resetPerformanceSettings = () => {
        this.setImageCompressionQuality(DEFAULTS.PERFORMANCE.imageCompressionQuality);
        this.setAnimationCompressionQuality(DEFAULTS.PERFORMANCE.animationCompressionQuality);
        this.setGPUTileCache(DEFAULTS.PERFORMANCE.GPUTileCache);
        this.setSystemTileCache(DEFAULTS.PERFORMANCE.systemTileCache);
        this.setContourDecimation(DEFAULTS.PERFORMANCE.contourDecimation);
        this.setContourCompressionLevel(DEFAULTS.PERFORMANCE.contourCompressionLevel);
        this.setContourChunkSize(DEFAULTS.PERFORMANCE.contourChunkSize);
        this.setStreamContoursWhileZooming(DEFAULTS.PERFORMANCE.streamContoursWhileZooming);
    };

    @action resetLogEventSettings = () => {
        this.eventsLoggingEnabled.forEach((value, key, map) => map.set(key, DEFAULTS.LOG_EVENT.eventLoggingEnabled));
    };

    public initUserDefinedPreferences = (serverSupport: boolean, preference: { [k: string]: string; }) => {
        this.serverSupport = serverSupport;
        if (serverSupport) {
            this.initPreferenceFromServer(preference);
        } else {
            this.initPreferenceFromLocalStorage();
        }
    }

    private initPreferenceFromDefault = () => {
        this.global = Object.assign(DEFAULTS.GLOBAL);
        this.renderConfig = Object.assign(DEFAULTS.RENDER_CONFIG);
        this.contourConfig = Object.assign(DEFAULTS.CONTOUR_CONFIG);
        this.wcsOverlay = Object.assign(DEFAULTS.WCS_OVERLAY);
        this.region = Object.assign(DEFAULTS.REGION);
        this.performance = Object.assign(DEFAULTS.PERFORMANCE);
        this.eventsLoggingEnabled = new Map<CARTA.EventType, boolean>();
        Event.EVENT_TYPES.forEach(eventType => this.eventsLoggingEnabled.set(eventType, DEFAULTS.LOG_EVENT.eventLoggingEnabled));
    };

    private initPreferenceFromServer = (preference: { [k: string]: string; }) => {
        // TODO
    };

    private initPreferenceFromLocalStorage = () => {
        this.initGlobalFromLocalStorage();
        this.initRenderConfigFromLocalStorage();
        this.initContourConfigFromLocalStorage();
        this.initWCSOverlayFromLocalStorage();
        this.initPerformanceFromLocalStorage();
        this.initRegionFromLocalStorage();
        this.initLogEventsFromLocalStorage();
    };

    private initGlobalFromLocalStorage = () => {
        let value;
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.GLOBAL_THEME));
        this.setTheme(value && Theme.isValid(value) ? value : DEFAULTS.GLOBAL.theme);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.GLOBAL_AUTOLAUNCH));
        this.setAutoLaunch(parseBoolean(value, DEFAULTS.GLOBAL.autoLaunch));
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.GLOBAL_LAYOUT));
        this.setLayout(value && this.appStore.layoutStore.layoutExist(value) ? value : DEFAULTS.GLOBAL.layout);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.GLOBAL_CURSOR_POSITION));
        this.setCursorPosition(value && CursorPosition.isValid(value) ? value : DEFAULTS.GLOBAL.cursorPosition);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.GLOBAL_ZOOM_MODE));
        this.setZoomMode(value && Zoom.isValid(value) ? value : DEFAULTS.GLOBAL.zoomMode);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.GLOBAL_DRAG_PANNING));
        this.setDragPanning(value === "false" ? false : DEFAULTS.GLOBAL.dragPanning);
    };

    private initRenderConfigFromLocalStorage = () => {
        let value;
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_SCALING));
        this.setScaling(value && isFinite(Number(value)) && RenderConfigStore.IsScalingValid(Number(value)) ? Number(value) : DEFAULTS.RENDER_CONFIG.scaling);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_COLORMAP));
        this.setColormap(value && RenderConfigStore.IsColormapValid(value) ? value : DEFAULTS.RENDER_CONFIG.colormap);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_PERCENTILE));
        this.setPercentile(value && isFinite(Number(value)) && RenderConfigStore.IsPercentileValid(Number(value)) ? Number(value) : DEFAULTS.RENDER_CONFIG.percentile);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_SCALING_ALPHA));
        this.setScalingAlpha(value && isFinite(Number(value)) ? Number(value) : DEFAULTS.RENDER_CONFIG.scalingAlpha);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_SCALING_GAMMA));
        this.setScalingGamma(value && isFinite(Number(value)) && RenderConfigStore.IsGammaValid(Number(value)) ? Number(value) : DEFAULTS.RENDER_CONFIG.scalingGamma);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_NAN_COLOR_HEX));
        this.setNaNColorHex(value && isColorValid(value) ? value : DEFAULTS.RENDER_CONFIG.nanColorHex);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.RENDER_CONFIG_NAN_ALPHA));
        this.setNaNAlpha(value && isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1 ? Number(value) : DEFAULTS.RENDER_CONFIG.nanAlpha);
    };

    private initContourConfigFromLocalStorage = () => {
        let value;
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_SMOOTHING_MODE));
        this.setContourSmoothingMode(value && isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 2 ? Number(value) : DEFAULTS.CONTOUR_CONFIG.contourSmoothingMode);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_SMOOTHING_FACTOR));
        this.setContourSmoothingFactor(value && (isFinite(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 33) ? parseInt(value) : DEFAULTS.CONTOUR_CONFIG.contourSmoothingFactor);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_NUM_LEVELS));
        this.setContourNumLevels(value && (isFinite(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 15) ? parseInt(value) : DEFAULTS.CONTOUR_CONFIG.contourNumLevels);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_THICKNESS));
        this.setContourThickness(value && (isFinite(parseFloat(value)) && parseFloat(value) > 0 && parseFloat(value) <= 10) ? parseFloat(value) : DEFAULTS.CONTOUR_CONFIG.contourThickness);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLOR));
        this.setContourColor(value && isColorValid(value) ? value : DEFAULTS.CONTOUR_CONFIG.contourColor);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLORMAP));
        this.setContourColormap(value && RenderConfigStore.IsColormapValid(value) ? value : DEFAULTS.CONTOUR_CONFIG.contourColormap);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.CONTOUR_CONFIG_CONTOUR_COLORMAP_ENABLED));
        this.setContourColormapEnabled(parseBoolean(value, DEFAULTS.CONTOUR_CONFIG.contourColormapEnabled));
    };

    private initWCSOverlayFromLocalStorage = () => {
        let value;
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.WCS_OVERLAY_AST_COLOR));
        this.setASTColor(value && isFinite(Number(value)) && Number(value) >= 0 && Number(value) < AST.colors.length ? Number(value) : DEFAULTS.WCS_OVERLAY.astColor);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.WCS_OVERLAY_AST_GRID_VISIBLE));
        this.setASTGridVisible(parseBoolean(value, DEFAULTS.WCS_OVERLAY.astGridVisible));
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.WCS_OVERLAY_AST_LABELS_VISIBLE));
        this.setASTLabelsVisible(parseBoolean(value, DEFAULTS.WCS_OVERLAY.astLabelsVisible));
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.WCS_OVERLAY_WCS_TYPE));
        this.setWCSType(value && WCSType.isValid(value) ? value : DEFAULTS.WCS_OVERLAY.wcsType);
    };

    private initRegionFromLocalStorage = () => {
        let value;
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.REGION_COLOR));
        this.setRegionColor(value && isColorValid(value) ? value : DEFAULTS.REGION.regionColor);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.REGION_LINE_WIDTH));
        this.setRegionLineWidth(value && isFinite(Number(value)) && RegionStore.IsRegionLineWidthValid(Number(value)) ? Number(value) : DEFAULTS.REGION.regionLineWidth);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.REGION_DASH_LENGTH));
        this.setRegionDashLength(value && isFinite(Number(value)) && RegionStore.IsRegionDashLengthValid(Number(value)) ? Number(value) : DEFAULTS.REGION.regionDashLength);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.REGION_TYPE));
        this.setRegionType(value && isFinite(Number(value)) && RegionStore.IsRegionTypeValid(Number(value)) ? Number(value) : DEFAULTS.REGION.regionType);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.REGION_CREATION_MODE));
        this.setRegionCreationMode(value && RegionCreationMode.isValid(value) ? value : DEFAULTS.REGION.regionCreationMode);
    };

    private initPerformanceFromLocalStorage = () => {
        let value;
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_IMAGE_COMPRESSION_QUALITY));
        this.setImageCompressionQuality(value && isFinite(Number(value)) && CompressionQuality.isImageCompressionQualityValid(Number(value)) ? Number(value) : DEFAULTS.PERFORMANCE.imageCompressionQuality);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_ANIMATION_COMPRESSION_QUALITY));
        this.setAnimationCompressionQuality(value && isFinite(Number(value)) && CompressionQuality.isAnimationCompressionQualityValid(Number(value)) ? Number(value) : DEFAULTS.PERFORMANCE.animationCompressionQuality);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_GPU_TILE_CACHE));
        this.setGPUTileCache(value && isFinite(Number(value)) && TileCache.isGPUTileCacheValid(Number(value)) ? Number(value) : DEFAULTS.PERFORMANCE.GPUTileCache);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_SYSTEM_TILE_CACHE));
        this.setSystemTileCache(value && isFinite(Number(value)) && TileCache.isSystemTileCacheValid(Number(value)) ? Number(value) : DEFAULTS.PERFORMANCE.systemTileCache);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_STREAM_CONTOURS_WHILE_ZOOMING));
        this.setStreamContoursWhileZooming(parseBoolean(value, DEFAULTS.PERFORMANCE.streamContoursWhileZooming));
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_CONTOUR_DECIMATION));
        this.setContourDecimation(value && (isFinite(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 32) ? parseInt(value) : DEFAULTS.PERFORMANCE.contourDecimation);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_CONTOUR_COMPRESSION_LEVEL));
        this.setContourCompressionLevel(value && (isFinite(parseInt(value)) && parseInt(value) >= 0 && parseInt(value) <= 19) ? parseInt(value) : DEFAULTS.PERFORMANCE.contourCompressionLevel);
        value = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.PERFORMANCE_CONTOUR_CHUNK_SIZE));
        this.setContourChunkSize(value && (isFinite(parseInt(value)) && parseInt(value) >= 1000 && parseInt(value) <= 1000000) ? parseInt(value) : DEFAULTS.PERFORMANCE.contourChunkSize);
    };

    // getters for log event, the list saved in local storage should be a string array like ["REGISTER_VIEWER", "OPEN_FILE_ACK", ...]
    private initLogEventsFromLocalStorage = () => {
        const localStorageEventList = localStorage.getItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.LOG_EVENT));
        if (localStorageEventList && localStorageEventList.length) {
            try {
                const eventNameList = JSON.parse(localStorageEventList);
                if (eventNameList && Array.isArray(eventNameList) && eventNameList.length) {
                    eventNameList.forEach((eventName) => {
                        const eventType = Event.getEventTypeFromName(eventName);
                        if (eventType !== undefined) {
                            this.eventsLoggingEnabled.set(eventType, true);
                        }
                    });
                }
            } catch (e) {
                console.log("Invalid event list read from local storage");
            }
        }
    };

    constructor(appStore: AppStore) {
        this.appStore = appStore;
        this.initPreferenceFromDefault();

        autorun(() => {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEYS.get(PreferenceKeys.LOG_EVENT), JSON.stringify(this.enabledLoggingEventNames));
            } catch (e) {
                console.log("Save event list to local storage failed!");
            }
        });
    }
}
