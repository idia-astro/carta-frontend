import {action, autorun, computed, observable} from "mobx";
import {NumberRange} from "@blueprintjs/core";
import {CARTA} from "carta-protobuf";
import * as AST from "ast_wrapper";
import {ASTSettingsString, ContourConfigStore, ContourStore, LogStore, OverlayBeamStore, OverlayStore, PreferenceStore, RegionSetStore, RegionStore, RenderConfigStore} from "stores";
import {
    CHANNEL_TYPES,
    ChannelInfo,
    ChannelType,
    ControlMap,
    CursorInfo,
    FrameView,
    GenCoordinateLabel,
    IsSpectralSystemSupported,
    IsSpectralTypeSupported,
    IsSpectralUnitSupported,
    Point2D,
    ProtobufProcessing,
    SPECTRAL_COORDS_SUPPORTED,
    SPECTRAL_DEFAULT_UNIT,
    SPECTRAL_TYPE_STRING,
    SpectralInfo,
    SpectralSystem,
    SpectralType,
    SpectralUnit,
    Transform2D,
    ZoomPoint
} from "models";
import {clamp, formattedFrequency, getHeaderNumericValue, getTransformedChannel, transformPoint, isAstBadPoint, minMax2D, rotate2D, toFixed, trimFitsComment} from "utilities";
import {BackendService, ContourWebGLService} from "services";

export interface FrameInfo {
    fileId: number;
    directory: string;
    hdu: string;
    fileInfo: CARTA.FileInfo;
    fileInfoExtended: CARTA.FileInfoExtended;
    fileFeatureFlags: number;
    renderMode: CARTA.RenderMode;
}

export enum RasterRenderType {
    NONE,
    TILED
}

export class FrameStore {
    private readonly astFrameSet: number;
    private readonly spectralFrame: number;
    public spectralCoordsSupported: Map<string, { type: SpectralType, unit: SpectralUnit }>;
    public spectralSystemsSupported: Array<SpectralSystem>;
    // Region set for the current frame. Accessed via regionSet, to take into account region sharing
    @observable private readonly frameRegionSet: RegionSetStore;

    @observable frameInfo: FrameInfo;
    @observable renderHiDPI: boolean;
    @observable wcsInfo: number;
    @observable spectralType: SpectralType;
    @observable spectralUnit: SpectralUnit;
    @observable spectralSystem: SpectralSystem;
    @observable channelValues: Array<number>;
    @observable fullWcsInfo: number;
    @observable validWcs: boolean;
    @observable center: Point2D;
    @observable cursorInfo: CursorInfo;
    @observable cursorValue: number;
    @observable cursorFrozen: boolean;
    @observable zoomLevel: number;
    @observable stokes: number;
    @observable channel: number;
    @observable requiredStokes: number;
    @observable requiredChannel: number;
    @observable animationChannelRange: NumberRange;
    @observable renderType: RasterRenderType;
    @observable currentFrameView: FrameView;
    @observable currentCompressionQuality: number;
    @observable renderConfig: RenderConfigStore;
    @observable contourConfig: ContourConfigStore;
    @observable contourStores: Map<number, ContourStore>;
    @observable valid: boolean;
    @observable moving: boolean;
    @observable zooming: boolean;

    @observable overlayBeamSettings: OverlayBeamStore;
    @observable spatialReference: FrameStore;
    @observable spectralReference: FrameStore;
    @observable secondarySpatialImages: FrameStore[];
    @observable secondarySpectralImages: FrameStore[];

    @computed get regionSet(): RegionSetStore {
        if (this.spatialReference) {
            return this.spatialReference.regionSet;
        } else {
            return this.frameRegionSet;
        }
    }

    @computed get sharedRegions(): boolean {
        return !!this.spatialReference;
    }

    @computed get requiredFrameView(): FrameView {
        // use spatial reference frame to calculate frame view, if it exists
        if (this.spatialReference) {
            // Required view of reference frame
            const refView = this.spatialReference.requiredFrameView;
            // Get the position of the ref frame's view in the secondary frame's pixel space
            const corners = [
                this.spatialTransform.transformCoordinate({x: refView.xMin, y: refView.yMin}, false),
                this.spatialTransform.transformCoordinate({x: refView.xMin, y: refView.yMax}, false),
                this.spatialTransform.transformCoordinate({x: refView.xMax, y: refView.yMax}, false),
                this.spatialTransform.transformCoordinate({x: refView.xMax, y: refView.yMin}, false)
            ];

            const {minPoint, maxPoint} = minMax2D(corners);
            // Manually get adjusted zoom level and round to a power of 2
            const mipAdjustment = (PreferenceStore.Instance.lowBandwidthMode ? 2.0 : 1.0) / this.spatialTransform.scale;
            const mipExact = Math.max(1.0, mipAdjustment / this.spatialReference.zoomLevel);
            const mipLog2 = Math.log2(mipExact);
            const mipLog2Rounded = Math.round(mipLog2);

            return {
                xMin: minPoint.x,
                xMax: maxPoint.x,
                yMin: minPoint.y,
                yMax: maxPoint.y,
                mip: Math.pow(2, mipLog2Rounded)
            };
        } else {
            // If there isn't a valid zoom, return a dummy view
            if (this.zoomLevel <= 0 || !this.isRenderable) {
                return {
                    xMin: 0,
                    xMax: 1,
                    yMin: 0,
                    yMax: 1,
                    mip: 1,
                };
            }

            const pixelRatio = this.renderHiDPI ? devicePixelRatio : 1.0;
            // Required image dimensions
            const imageWidth = pixelRatio * this.renderWidth / this.zoomLevel;
            const imageHeight = pixelRatio * this.renderHeight / this.zoomLevel;

            const mipAdjustment = (PreferenceStore.Instance.lowBandwidthMode ? 2.0 : 1.0);
            const mipExact = Math.max(1.0, mipAdjustment / this.zoomLevel);
            const mipLog2 = Math.log2(mipExact);
            const mipLog2Rounded = Math.round(mipLog2);
            const mipRoundedPow2 = Math.pow(2, mipLog2Rounded);

            return {
                xMin: this.center.x - imageWidth / 2.0,
                xMax: this.center.x + imageWidth / 2.0,
                yMin: this.center.y - imageHeight / 2.0,
                yMax: this.center.y + imageHeight / 2.0,
                mip: mipRoundedPow2
            };
        }
    }

    @computed get spatialTransform() {
        if (this.spatialReference && this.spatialTransformAST) {
            const center = transformPoint(this.spatialTransformAST, this.spatialReference.center, false);
            // Try use center of the screen as a reference point
            if (!isAstBadPoint(center)) {
                return new Transform2D(this.spatialTransformAST, center);
            } else {
                // Otherwise use the center of the image
                return new Transform2D(this.spatialTransformAST, {x: this.frameInfo.fileInfoExtended.width / 2.0 + 0.5, y: this.frameInfo.fileInfoExtended.height / 2.0 + 0.5});
            }
        }
        return null;
    }

    @computed get transformedWcsInfo() {
        if (this.spatialTransform) {
            let adjTranslation: Point2D = {
                x: -this.spatialTransform.translation.x / this.spatialTransform.scale,
                y: -this.spatialTransform.translation.y / this.spatialTransform.scale,
            };
            adjTranslation = rotate2D(adjTranslation, -this.spatialTransform.rotation);
            if (this.cachedTransformedWcsInfo >= 0) {
                AST.delete(this.cachedTransformedWcsInfo);
            }

            this.cachedTransformedWcsInfo = AST.createTransformedFrameset(this.wcsInfo,
                adjTranslation.x, adjTranslation.y,
                -this.spatialTransform.rotation,
                this.spatialTransform.origin.x, this.spatialTransform.origin.y,
                1.0 / this.spatialTransform.scale, 1.0 / this.spatialTransform.scale);
            return this.cachedTransformedWcsInfo;
        }
        return null;
    }

    @computed get renderWidth() {
        return this.overlayStore.renderWidth;
    }

    @computed get renderHeight() {
        return this.overlayStore.renderHeight;
    }

    @computed get isRenderable() {
        return this.renderWidth > 0 && this.renderHeight > 0;
    }

    @computed get unit() {
        if (!this.frameInfo || !this.frameInfo.fileInfoExtended || !this.frameInfo.fileInfoExtended.headerEntries) {
            return undefined;
        } else {
            const unitHeader = this.frameInfo.fileInfoExtended.headerEntries.filter(entry => entry.name === "BUNIT");
            if (unitHeader.length) {
                return trimFitsComment(unitHeader[0].value);
            } else {
                return undefined;
            }
        }
    }

    @computed get beamProperties(): { x: number, y: number, angle: number, overlayBeamSettings: OverlayBeamStore } {
        const bMajHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("BMAJ") !== -1);
        const bMinHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("BMIN") !== -1);
        const bpaHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("BPA") !== -1);
        const unitHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("CUNIT1") !== -1);
        const deltaHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("CDELT1") !== -1);

        if (bMajHeader && bMinHeader && bpaHeader && unitHeader && deltaHeader) {
            let bMaj = getHeaderNumericValue(bMajHeader);
            let bMin = getHeaderNumericValue(bMinHeader);
            const bpa = getHeaderNumericValue(bpaHeader);
            const unit = unitHeader.value.trim();
            const delta = getHeaderNumericValue(deltaHeader);

            if (isFinite(bMaj) && bMaj > 0 && isFinite(bMin) && bMin > 0 && isFinite(bpa) && isFinite(delta) && unit === "deg" || unit === "rad") {
                return {
                    x: bMaj / Math.abs(delta),
                    y: bMin / Math.abs(delta),
                    angle: bpa,
                    overlayBeamSettings: this.overlayBeamSettings
                };
            }
            return null;
        }
        return null;
    }

    public getWcsSizeInArcsec(size: Point2D): Point2D {
        const deltaHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("CDELT1") !== -1);
        const unitHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf("CUNIT1") !== -1);
        if (size && deltaHeader && unitHeader) {
            const delta = getHeaderNumericValue(deltaHeader);
            const unit = unitHeader.value.trim();
            if (isFinite(delta) && unit === "deg" || unit === "rad") {
                return {
                    x: size.x * Math.abs(delta) * (unit === "deg" ? 3600 : (180 * 3600 / Math.PI)),
                    y: size.y * Math.abs(delta) * (unit === "deg" ? 3600 : (180 * 3600 / Math.PI))
                };
            }
        }
        return null;
    }

    public getTransformForRegion(region: RegionStore) {
        if (this.spatialReference && this.spatialTransformAST && region.controlPoints?.length) {
            const regionCenter = transformPoint(this.spatialTransformAST, region.controlPoints[0], false);
            if (!isAstBadPoint(regionCenter)) {
                return new Transform2D(this.spatialTransformAST, regionCenter);
            }
        }
        return null;
    }

    @computed get channelInfo(): ChannelInfo {
        if (!this.frameInfo || !this.frameInfo.fileInfoExtended || this.frameInfo.fileInfoExtended.depth <= 1 || !this.frameInfo.fileInfoExtended.headerEntries) {
            return undefined;
        }
        const N = this.frameInfo.fileInfoExtended.depth;
        const indexes = new Array<number>(N);
        const values = new Array<number>(N);
        const rawValues = new Array<number>(N);

        let getChannelIndexSimple = (value: number): number => {
            if (!value) {
                return null;
            }

            if (value < 0) {
                return 0;
            } else if (value > N - 1) {
                return N - 1;
            }

            const ceil = Math.ceil(value);
            const floor = Math.floor(value);
            return (ceil - value) < (value - floor) ? ceil : floor;
        };

        // By default, we try to use the WCS information to determine channel info.
        if (this.spectralAxis) {
            const refPixHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`CRPIX${this.spectralAxis.dimension}`) !== -1);
            const refValHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`CRVAL${this.spectralAxis.dimension}`) !== -1);
            const deltaHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`CDELT${this.spectralAxis.dimension}`) !== -1);

            if (refPixHeader && refValHeader && deltaHeader) {
                // Shift pixel coordinates by -1 to start at zero instead of 1
                const refPix = getHeaderNumericValue(refPixHeader) - 1;
                const refVal = getHeaderNumericValue(refValHeader);
                const delta = getHeaderNumericValue(deltaHeader);
                if (isFinite(refPix) && isFinite(refVal) && isFinite(delta)) {
                    for (let i = 0; i < N; i++) {
                        const channelOffset = i - refPix;
                        indexes[i] = i;
                        rawValues[i] = (channelOffset * delta + refVal);
                        values[i] = rawValues[i];
                    }
                    return {
                        fromWCS: true,
                        channelType: this.spectralAxis.type,
                        indexes,
                        values,
                        rawValues,
                        getChannelIndexWCS: (value: number): number => {
                            if (!value) {
                                return null;
                            }

                            const index = (value - refVal) / delta + refPix;
                            if (index < 0) {
                                return 0;
                            } else if (index > values.length - 1) {
                                return values.length - 1;
                            }

                            const ceil = Math.ceil(index);
                            const floor = Math.floor(index);
                            return Math.abs(values[ceil] - value) < Math.abs(value - values[floor]) ? ceil : floor;
                        },
                        getChannelIndexSimple: getChannelIndexSimple
                    };
                }
            }
        }

        // return channels
        for (let i = 0; i < N; i++) {
            indexes[i] = i;
            values[i] = i;
            rawValues[i] = i;
        }
        return {
            fromWCS: false, channelType: {code: "", name: "Channel", unit: ""}, indexes, values, rawValues,
            getChannelIndexWCS: null, getChannelIndexSimple: getChannelIndexSimple
        };
    }

    @computed get spectralInfo(): SpectralInfo {
        const spectralInfo: SpectralInfo = {
            channel: this.channel,
            channelType: {code: "", name: "Channel", unit: ""},
            specsys: "",
            spectralString: ""
        };

        if (this.frameInfo.fileInfoExtended.depth > 1) {
            const channelInfo = this.channelInfo;
            spectralInfo.channelType = channelInfo.channelType;
            if (channelInfo.channelType.code) {
                const specSysHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`SPECSYS`) !== -1);
                if (specSysHeader && specSysHeader.value) {
                    spectralInfo.specsys = trimFitsComment(specSysHeader.value).toUpperCase();
                }

                spectralInfo.spectralString = `${channelInfo.channelType.name} (${spectralInfo.specsys}): ${toFixed(channelInfo.values[this.channel], 4)} ${channelInfo.channelType.unit}`;
                if (channelInfo.channelType.code === "FREQ") {
                    const freqVal = channelInfo.rawValues[this.channel];
                    // convert frequency value to unit in GHz
                    if (this.isSpectralCoordinateConvertible && channelInfo.channelType.unit !== SPECTRAL_DEFAULT_UNIT.get(SpectralType.FREQ)) {
                        const freqGHz = this.astSpectralTransform(SpectralType.FREQ, SpectralUnit.GHZ, this.spectralSystem, freqVal);
                        if (isFinite(freqGHz)) {
                            spectralInfo.spectralString = `Frequency (${this.spectralSystem}): ${formattedFrequency(freqGHz)}`;
                        }
                    }
                    // convert frequency to volecity
                    const velocityVal = this.astSpectralTransform(SpectralType.VRAD, SpectralUnit.KMS, this.spectralSystem, freqVal);
                    if (isFinite(velocityVal)) {
                        spectralInfo.velocityString = `Velocity: ${toFixed(velocityVal, 4)} km/s`;
                    }
                } else if (channelInfo.channelType.code === "VRAD") {
                    const velocityVal = channelInfo.rawValues[this.channel];
                    // convert velocity value to unit in km/s
                    if (this.isSpectralCoordinateConvertible && channelInfo.channelType.unit !== SPECTRAL_DEFAULT_UNIT.get(SpectralType.VRAD)) {
                        const volecityKMS = this.astSpectralTransform(SpectralType.VRAD, SpectralUnit.KMS, this.spectralSystem, velocityVal);
                        if (isFinite(volecityKMS)) {
                            spectralInfo.spectralString = `Velocity (${this.spectralSystem}): ${toFixed(volecityKMS, 4)} km/s`;
                        }
                    }
                    // convert velocity to frequency
                    const freqGHz = this.astSpectralTransform(SpectralType.FREQ, SpectralUnit.GHZ, this.spectralSystem, velocityVal);
                    if (isFinite(freqGHz)) {
                        spectralInfo.freqString = `Frequency: ${formattedFrequency(freqGHz)}`;
                    }
                }
            }
        }

        return spectralInfo;
    }

    @computed get spectralAxis(): { valid: boolean; dimension: number, type: ChannelType } {
        if (!this.frameInfo || !this.frameInfo.fileInfoExtended || this.frameInfo.fileInfoExtended.depth <= 1 || !this.frameInfo.fileInfoExtended.headerEntries) {
            return undefined;
        }
        const entries = this.frameInfo.fileInfoExtended.headerEntries;
        const typeHeader3 = entries.find(entry => entry.name.includes("CTYPE3"));
        const typeHeader4 = entries.find(entry => entry.name.includes("CTYPE4"));
        if ((!typeHeader3 && !typeHeader4) ||
            (typeHeader3 && typeHeader3.value.match(/stokes/i) && !typeHeader4) ||
            (!typeHeader3 && typeHeader4 && typeHeader4.value.match(/stokes/i)) ||
            (typeHeader3 && typeHeader3.value.match(/stokes/i) && typeHeader4 && typeHeader4.value.match(/stokes/i))) {
            return undefined;
        }

        if (typeHeader3 && !typeHeader3.value.match(/stokes/i)) { // spectral axis should be CTYPE3
            const headerVal = typeHeader3.value.trim().toUpperCase();
            const channelType = CHANNEL_TYPES.find(type => headerVal === type.code);
            const unitHeader = entries.find(entry => entry.name.includes("CUNIT3"));
            if (channelType) {
                return {valid: true, dimension: 3, type: {name: channelType.name, code: channelType.code, unit: unitHeader ? unitHeader.value.trim() : channelType.unit}};
            } else {
                return {valid: false, dimension: 3, type: {name: headerVal, code: headerVal, unit: unitHeader ? unitHeader.value.trim() : undefined}};
            }
        } else if (typeHeader4 && !typeHeader4.value.match(/stokes/i)) { // spectral axis should be CTYPE4
            const headerVal = typeHeader4.value.trim().toUpperCase();
            const channelType = CHANNEL_TYPES.find(type => headerVal === type.code);
            const unitHeader = entries.find(entry => entry.name.includes("CUNIT4"));
            if (channelType) {
                return {valid: true, dimension: 4, type: {name: channelType.name, code: channelType.code, unit: unitHeader ? unitHeader.value.trim() : channelType.unit}};
            } else {
                return {valid: false, dimension: 4, type: {name: headerVal, code: headerVal, unit: unitHeader ? unitHeader.value.trim() : undefined}};
            }
        }
        return undefined;
    }

    @computed get isSpectralCoordinateConvertible(): boolean {
        if (!this.spectralAxis || (this.spectralAxis && !this.spectralAxis.valid) || !this.spectralFrame) {
            return false;
        }
        return IsSpectralTypeSupported(this.spectralAxis.type.code as string) && IsSpectralUnitSupported(this.spectralAxis.type.unit as string);
    }

    @computed get isSpectralSystemConvertible(): boolean {
        if (!this.spectralInfo || !this.spectralFrame) {
            return false;
        }
        return IsSpectralSystemSupported(this.spectralInfo.specsys as string);
    }

    @computed get isSpectralPropsEqual(): boolean {
        let result = false;
        if (this.spectralInfo && this.spectralInfo.channelType) {
            const isTypeEqual = this.spectralInfo.channelType.code === (this.spectralType as string);
            const isUnitEqual = this.spectralInfo.channelType.unit === (this.spectralUnit as string);
            const isSpecsysEqual = this.spectralInfo.specsys === (this.spectralSystem as string);
            result = isTypeEqual && isUnitEqual && isSpecsysEqual;
        }
        return result;
    }

    @computed get isCoordChannel(): boolean {
        return this.spectralType === SpectralType.CHANNEL;
    }

    @computed get nativeSpectralCoordinate(): string {
        return this.spectralAxis ? `${this.spectralAxis.type.name} (${this.spectralAxis.type.unit})` : undefined;
    }

    @computed get spectralCoordinate(): string {
        return !this.spectralType && !this.spectralUnit ? this.nativeSpectralCoordinate : GenCoordinateLabel(this.spectralType, this.spectralUnit);
    }

    @computed get spectralUnitStr(): string {
        if (this.spectralAxis && !this.spectralType && !this.spectralUnit) {
            return this.spectralAxis.type.unit;
        }
        return this.isCoordChannel ? SPECTRAL_TYPE_STRING.get(SpectralType.CHANNEL) : this.spectralUnit as string;
    }

    @computed get hasStokes(): boolean {
        return this.frameInfo && this.frameInfo.fileInfoExtended && this.frameInfo.fileInfoExtended.stokes > 1;
    }

    @computed get spectralSiblings(): FrameStore[] {
        if (this.spectralReference) {
            let siblings = [];
            siblings.push(this.spectralReference);
            siblings.push(...this.spectralReference.secondarySpectralImages.slice().filter(f => f !== this));
            return siblings;
        } else {
            return this.secondarySpectralImages.slice();
        }
    }

    @computed
    private get zoomLevelForFit() {
        return Math.min(this.calculateZoomX, this.calculateZoomY);
    }

    @computed
    private get calculateZoomX() {
        const imageWidth = this.frameInfo.fileInfoExtended.width;
        const pixelRatio = this.renderHiDPI ? devicePixelRatio : 1.0;

        if (imageWidth <= 0) {
            return 1.0;
        }
        return this.renderWidth * pixelRatio / imageWidth;
    }

    @computed
    private get calculateZoomY() {
        const imageHeight = this.frameInfo.fileInfoExtended.height;
        const pixelRatio = this.renderHiDPI ? devicePixelRatio : 1.0;
        if (imageHeight <= 0) {
            return 1.0;
        }
        return this.renderHeight * pixelRatio / imageHeight;
    }

    @computed get contourProgress(): number {
        // Use -1 when there are no contours required
        if (!this.contourConfig.levels || !this.contourConfig.levels.length || !this.contourConfig.enabled) {
            return -1;
        }

        // Progress is zero if we haven't received any contours yet
        if (!this.contourStores || !this.contourStores.size) {
            return 0;
        }

        let totalProgress = 0;
        this.contourStores.forEach((contourStore, level) => {
            if (this.contourConfig.levels.indexOf(level) !== -1) {
                totalProgress += contourStore.progress;
            }
        });

        return totalProgress / (this.contourConfig.levels ? this.contourConfig.levels.length : 1);
    }

    @computed get stokesInfo(): string[] {
        if (this.frameInfo && this.frameInfo.fileInfoExtended && this.frameInfo.fileInfoExtended.headerEntries) {
            const ctype = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.value.toUpperCase() === "STOKES");
            if (ctype && ctype.name.indexOf("CTYPE") !== -1) {
                const index = ctype.name.substring(5);
                const naxisHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`NAXIS${index}`) !== -1);
                const crpixHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`CRPIX${index}`) !== -1);
                const crvalHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`CRVAL${index}`) !== -1);
                const cdeltHeader = this.frameInfo.fileInfoExtended.headerEntries.find(entry => entry.name.indexOf(`CDELT${index}`) !== -1);
                let stokesInfo = [];
                for (let i = 0; i < parseInt(naxisHeader.value); i++) {
                    let val = getHeaderNumericValue(crvalHeader) + (i + 1 - getHeaderNumericValue(crpixHeader)) * getHeaderNumericValue(cdeltHeader);
                    switch (val) {
                        case 1:
                            stokesInfo.push("I");
                            break;
                        case 2:
                            stokesInfo.push("Q");
                            break;
                        case 3:
                            stokesInfo.push("U");
                            break;
                        case 4:
                            stokesInfo.push("V");
                            break;
                        default:
                            break;
                    }
                }
                return stokesInfo;
            }
        }
        return [];
    }

    private readonly overlayStore: OverlayStore;
    private readonly logStore: LogStore;
    private readonly backendService: BackendService;
    private readonly controlMaps: Map<FrameStore, ControlMap>;
    public spatialTransformAST: number;
    private spectralTransformAST: number;
    private cachedTransformedWcsInfo: number = -1;
    private zoomTimeoutHandler;

    private static readonly CursorInfoMaxPrecision = 25;
    private static readonly ZoomInertiaDuration = 250;

    constructor(frameInfo: FrameInfo) {
        this.overlayStore = OverlayStore.Instance;
        this.logStore = LogStore.Instance;
        this.backendService = BackendService.Instance;
        const preferenceStore = PreferenceStore.Instance;

        this.astFrameSet = null;
        this.spectralFrame = null;
        this.spectralType = null;
        this.spectralUnit = null;
        this.spectralSystem = null;
        this.channelValues = null;
        this.spectralCoordsSupported = null;
        this.spectralSystemsSupported = null;
        this.fullWcsInfo = null;
        this.validWcs = false;
        this.frameInfo = frameInfo;
        this.renderHiDPI = true;
        this.center = {x: 0, y: 0};
        this.stokes = 0;
        this.channel = 0;
        this.requiredStokes = 0;
        this.requiredChannel = 0;
        this.renderConfig = new RenderConfigStore(preferenceStore);
        this.contourConfig = new ContourConfigStore(preferenceStore);
        this.contourStores = new Map<number, ContourStore>();
        this.renderType = RasterRenderType.NONE;
        this.moving = false;
        this.zooming = false;
        this.overlayBeamSettings = new OverlayBeamStore();
        this.spatialTransformAST = null;
        this.controlMaps = new Map<FrameStore, ControlMap>();
        this.secondarySpatialImages = [];
        this.secondarySpectralImages = [];

        // synchronize AST overlay's color/grid/label with preference when frame is created
        const astColor = preferenceStore.astColor;
        if (astColor !== this.overlayStore.global.color) {
            this.overlayStore.global.setColor(astColor);
        }
        const astGridVisible = preferenceStore.astGridVisible;
        if (astGridVisible !== this.overlayStore.grid.visible) {
            this.overlayStore.grid.setVisible(astGridVisible);
        }
        const astLabelsVisible = preferenceStore.astLabelsVisible;
        if (astLabelsVisible !== this.overlayStore.labels.visible) {
            this.overlayStore.labels.setVisible(astLabelsVisible);
        }

        this.frameRegionSet = new RegionSetStore(this, PreferenceStore.Instance, BackendService.Instance);
        this.valid = true;
        this.currentFrameView = {
            xMin: 0,
            xMax: 0,
            yMin: 0,
            yMax: 0,
            mip: 999
        };
        this.animationChannelRange = [0, frameInfo.fileInfoExtended.depth - 1];

        this.initSkyWCS();
        if (frameInfo.fileInfoExtended.depth > 1) {
            this.initFullWCS();
        }

        this.astFrameSet = this.initFrame();
        if (this.astFrameSet) {
            this.spectralFrame = AST.getSpectralFrame(this.astFrameSet);
        }
        this.initSupportedSpectralConversion();
        this.initCenter();
        this.zoomLevel = preferenceStore.isZoomRAWMode ? 1.0 : this.zoomLevelForFit;

        // init spectral settings
        if (this.spectralAxis && IsSpectralTypeSupported(this.spectralAxis.type.code as string) && IsSpectralUnitSupported(this.spectralAxis.type.unit as string)) {
            this.spectralType = this.spectralAxis.type.code as SpectralType;
            this.spectralUnit = SPECTRAL_DEFAULT_UNIT.get(this.spectralType);
        }
        if (this.isSpectralSystemConvertible) {
            this.spectralSystem = this.spectralInfo.specsys as SpectralSystem;
        }

        // need initialized wcs to get correct cursor info
        this.cursorInfo = this.getCursorInfo(this.center);
        this.cursorValue = 0;
        this.cursorFrozen = preferenceStore.isCursorFrozen;

        autorun(() => {
            // update zoomLevel when image viewer is available for drawing
            if (this.isRenderable && this.zoomLevel <= 0) {
                this.setZoom(this.zoomLevelForFit);
            }
        });

        // if type/unit/specsys changes, trigger spectral conversion
        autorun(() => {
            const type = this.spectralType;
            const unit = this.spectralUnit;
            const specsys = this.spectralSystem;
            if (this.channelInfo) {
                if (!type && !unit) {
                    this.channelValues = this.channelInfo.values;
                } else if (this.isCoordChannel) {
                    this.channelValues = this.channelInfo.indexes;
                } else {
                    this.channelValues = this.isSpectralPropsEqual ? this.channelInfo.values : this.convertSpectral(this.channelInfo.values);
                }
            }
        });
    }

    private convertSpectral = (values: Array<number>): Array<number> => {
        return values && values.length > 0 ? values.map(value => this.astSpectralTransform(this.spectralType, this.spectralUnit, this.spectralSystem, value)) : null;
    };

    private astSpectralTransform = (type: SpectralType, unit: SpectralUnit, system: SpectralSystem, value: number): number => {
        if (!this.spectralFrame || !isFinite(value)) {
            return undefined;
        }
        return AST.transformSpectralPoint(this.spectralFrame, type, unit, system, value);
    };

    @action private initSkyWCS = () => {
        let headerString = "";

        for (let entry of this.frameInfo.fileInfoExtended.headerEntries) {
            // Skip empty header entries
            if (!entry.value.length) {
                continue;
            }

            // Skip higher dimensions
            if (entry.name.match(/(CTYPE|CDELT|CRPIX|CRVAL|CUNIT|NAXIS|CROTA)[3-9]/)) {
                continue;
            }

            let value = entry.value;
            if (entry.name.toUpperCase() === "NAXIS") {
                value = "2";
            }

            if (entry.name.toUpperCase() === "WCSAXES") {
                value = "2";
            }

            if (entry.entryType === CARTA.EntryType.STRING) {
                value = `'${value}'`;
            } else {
                value = FrameStore.ShiftASTCoords(entry, value);
            }

            let name = entry.name;
            while (name.length < 8) {
                name += " ";
            }

            let entryString = `${name}=  ${value}`;
            while (entryString.length < 80) {
                entryString += " ";
            }
            headerString += entryString;
        }
        const initResult = AST.initFrame(headerString);
        if (!initResult) {
            this.logStore.addWarning(`Problem processing WCS info in file ${this.frameInfo.fileInfo.name}`, ["ast"]);
            this.wcsInfo = AST.initDummyFrame();
        } else {
            this.wcsInfo = initResult;
            this.validWcs = true;
            this.overlayStore.setDefaultsFromAST(this);
            console.log("Initialised WCS info from frame");
        }
    };

    @action private initFullWCS = () => {
        let headerString = "";

        for (let entry of this.frameInfo.fileInfoExtended.headerEntries) {
            // Skip empty header entries
            if (!entry.value.length) {
                continue;
            }

            // Skip higher dimensions
            if (entry.name.match(/(CTYPE|CDELT|CRPIX|CRVAL|CUNIT|NAXIS|CROTA)[4-9]/)) {
                continue;
            }

            let value = trimFitsComment(entry.value);
            if (entry.name.toUpperCase() === "NAXIS") {
                value = "3";
            }

            if (entry.name.toUpperCase() === "WCSAXES") {
                value = "3";
            }

            if (entry.entryType === CARTA.EntryType.STRING) {
                value = `'${value}'`;
            } else {
                value = FrameStore.ShiftASTCoords(entry, value);
            }

            let name = entry.name;
            while (name.length < 8) {
                name += " ";
            }

            let entryString = `${name}=  ${value}`;
            while (entryString.length < 80) {
                entryString += " ";
            }
            headerString += entryString;
        }
        const initResult = AST.initFrame(headerString);
        if (!initResult) {
            this.logStore.addWarning(`Problem processing WCS info in file ${this.frameInfo.fileInfo.name}`, ["ast"]);
            this.fullWcsInfo = null;
        } else {
            this.fullWcsInfo = initResult;
            console.log("Initialised 3D WCS info from frame");
        }
    };

    // This function shifts the pixel axis by 1, so that it starts at 0, rather than 1
    // For entries that are not related to the reference pixel location, the current value is returned
    private static ShiftASTCoords = (entry: CARTA.IHeaderEntry, currentValue: string) => {
        if (entry.name.match(/CRPIX\d+/)) {
            const numericValue = parseFloat(entry.value);
            if (isFinite(numericValue)) {
                return (numericValue - 1).toString();
            }
        }
        return currentValue;
    };

    private initFrame = (): number => {
        if (!this.spectralAxis || !this.spectralAxis.valid) {
            return null;
        }

        let headerString = "";
        const entries = this.frameInfo.fileInfoExtended.headerEntries;
        for (let entry of entries) {
            // Skip empty header entries
            if (!entry.value.length) {
                continue;
            }
            let name = entry.name;
            let value = trimFitsComment(entry.value);
            if (entry.entryType === CARTA.EntryType.STRING) {
                value = `'${value}'`;
            } else {
                value = FrameStore.ShiftASTCoords(entry, value);
            }
            while (name.length < 8) {
                name += " ";
            }
            let entryString = `${name}=  ${value}`;
            while (entryString.length < 80) {
                entryString += " ";
            }
            headerString += entryString;
        }
        return AST.initFrame(headerString);
    };

    @action private initSupportedSpectralConversion = () => {
        if (this.spectralAxis && !this.spectralAxis.valid) {
            this.channelValues = this.channelInfo.values;
            this.spectralCoordsSupported = new Map<string, { type: SpectralType, unit: SpectralUnit }>([
                [this.nativeSpectralCoordinate, {type: null, unit: null}],
                [SPECTRAL_TYPE_STRING.get(SpectralType.CHANNEL), {type: SpectralType.CHANNEL, unit: null}]
            ]);
            this.spectralSystemsSupported = [];
            return;
        } else if (!this.spectralAxis || !this.spectralFrame) {
            this.spectralCoordsSupported = null;
            this.spectralSystemsSupported = null;
            return;
        }

        // generate spectral coordinate options
        const entries = this.frameInfo.fileInfoExtended.headerEntries;
        const spectralType = this.spectralInfo.channelType.code;
        if (IsSpectralTypeSupported(spectralType)) {
            // check RESTFRQ
            const restFrqHeader = entries.find(entry => entry.name.indexOf("RESTFRQ") !== -1);
            if (restFrqHeader) {
                this.spectralCoordsSupported = SPECTRAL_COORDS_SUPPORTED;
            } else {
                this.spectralCoordsSupported = new Map<string, { type: SpectralType, unit: SpectralUnit }>();
                Array.from(SPECTRAL_COORDS_SUPPORTED.keys()).forEach((key: string) => {
                    const value = SPECTRAL_COORDS_SUPPORTED.get(key);
                    const isVolecity = spectralType === SpectralType.VRAD || spectralType === SpectralType.VOPT;
                    const isValueVolecity = value.type === SpectralType.VRAD || value.type === SpectralType.VOPT;
                    if (isVolecity && isValueVolecity) { // VRAD, VOPT
                        this.spectralCoordsSupported.set(key, value);
                    }
                    if (!isVolecity && !isValueVolecity) { // FREQ, WAVE, AWAV
                        this.spectralCoordsSupported.set(key, value);
                    }
                });
                this.spectralCoordsSupported.set(SPECTRAL_TYPE_STRING.get(SpectralType.CHANNEL), {type: SpectralType.CHANNEL, unit: null});
            }
        } else {
            this.spectralCoordsSupported = new Map<string, { type: SpectralType, unit: SpectralUnit }>([
                [SPECTRAL_TYPE_STRING.get(SpectralType.CHANNEL), {type: SpectralType.CHANNEL, unit: null}]
            ]);
        }

        // generate spectral system options
        const spectralSystem = this.spectralInfo.specsys;
        if (IsSpectralSystemSupported(spectralSystem)) {
            const dateObsHeader = entries.find(entry => entry.name.indexOf("DATE-OBS") !== -1);
            const obsgeoxHeader = entries.find(entry => entry.name.indexOf("OBSGEO-X") !== -1);
            const obsgeoyHeader = entries.find(entry => entry.name.indexOf("OBSGEO-Y") !== -1);
            const obsgeozHeader = entries.find(entry => entry.name.indexOf("OBSGEO-Z") !== -1);
            if (spectralSystem === SpectralSystem.LSRK || spectralSystem === SpectralSystem.LSRD) { // LSRK, LSRD
                if (dateObsHeader && (obsgeoxHeader && obsgeoyHeader && obsgeozHeader)) {
                    this.spectralSystemsSupported = [SpectralSystem.LSRK, SpectralSystem.LSRD, SpectralSystem.BARY, SpectralSystem.TOPO];
                } else if (dateObsHeader && !(obsgeoxHeader && obsgeoyHeader && obsgeozHeader)) {
                    this.spectralSystemsSupported = [SpectralSystem.LSRK, SpectralSystem.LSRD, SpectralSystem.BARY];
                } else {
                    this.spectralSystemsSupported = [SpectralSystem.LSRK, SpectralSystem.LSRD];
                }
            } else if (spectralSystem === SpectralSystem.BARY) { // BARY
                if (dateObsHeader && (obsgeoxHeader && obsgeoyHeader && obsgeozHeader)) {
                    this.spectralSystemsSupported = [SpectralSystem.LSRK, SpectralSystem.LSRD, SpectralSystem.BARY, SpectralSystem.TOPO];
                } else if (dateObsHeader && !(obsgeoxHeader && obsgeoyHeader && obsgeozHeader)) {
                    this.spectralSystemsSupported = [SpectralSystem.LSRK, SpectralSystem.LSRD, SpectralSystem.BARY];
                } else {
                    this.spectralSystemsSupported = [SpectralSystem.BARY];
                }
            } else { // TOPO
                if (dateObsHeader && (obsgeoxHeader && obsgeoyHeader && obsgeozHeader)) {
                    this.spectralSystemsSupported = [SpectralSystem.LSRK, SpectralSystem.LSRD, SpectralSystem.BARY, SpectralSystem.TOPO];
                } else {
                    this.spectralSystemsSupported = [SpectralSystem.TOPO];
                }
            }
        } else {
            this.spectralSystemsSupported = [];
        }
    };

    public convertToNativeWCS = (value: number): number => {
        if (!this.spectralFrame || !isFinite(value)) {
            return undefined;
        }
        return AST.transformSpectralPoint(this.spectralFrame, this.spectralType, this.spectralUnit, this.spectralSystem, value, false);
    };

    public convertFreqMHzToSettingWCS = (value: number): number => {
        if (!this.spectralFrame || !isFinite(value)) {
            return undefined;
        }

        if (this.spectralType === SpectralType.FREQ && this.spectralUnit === SpectralUnit.MHZ) {
            return value;
        }

        const nativeWCSValue = AST.transformSpectralPoint(this.spectralFrame, SpectralType.FREQ, SpectralUnit.MHZ, this.spectralSystem, value, false);
        if (!isFinite(nativeWCSValue)) {
            return undefined;
        }

        const settingWCSValue = this.astSpectralTransform(this.spectralType, this.spectralUnit, this.spectralSystem, nativeWCSValue);
        return isFinite(settingWCSValue) ? settingWCSValue : undefined;
    };

    public getCursorInfo(cursorPosImageSpace: Point2D) {
        let cursorPosWCS, cursorPosFormatted;
        if (this.validWcs) {
            // We need to compare X and Y coordinates in both directions
            // to avoid a confusing drop in precision at rounding threshold
            const offsetBlock = [[0, 0], [1, 1], [-1, -1]];

            // Shift image space coordinates to 1-indexed when passing to AST
            const cursorNeighbourhood = offsetBlock.map((offset) => transformPoint(this.wcsInfo, {x: cursorPosImageSpace.x + offset[0], y: cursorPosImageSpace.y + offset[1]}));

            cursorPosWCS = cursorNeighbourhood[0];

            const normalizedNeighbourhood = cursorNeighbourhood.map((pos) => AST.normalizeCoordinates(this.wcsInfo, pos.x, pos.y));

            let precisionX = 0;
            let precisionY = 0;

            while (precisionX < FrameStore.CursorInfoMaxPrecision && precisionY < FrameStore.CursorInfoMaxPrecision) {
                let astString = new ASTSettingsString();
                astString.add("Format(1)", this.overlayStore.numbers.cursorFormatStringX(precisionX));
                astString.add("Format(2)", this.overlayStore.numbers.cursorFormatStringY(precisionY));
                astString.add("System", this.overlayStore.global.explicitSystem);

                let formattedNeighbourhood = normalizedNeighbourhood.map((pos) => AST.getFormattedCoordinates(this.wcsInfo, pos.x, pos.y, astString.toString()), true);
                let [p, n1, n2] = formattedNeighbourhood;
                if (!p.x || !p.y || p.x === "<bad>" || p.y === "<bad>") {
                    cursorPosFormatted = null;
                    break;
                }

                if (p.x !== n1.x && p.x !== n2.x && p.y !== n1.y && p.y !== n2.y) {
                    cursorPosFormatted = {x: p.x, y: p.y};
                    break;
                }

                if (p.x === n1.x || p.x === n2.x) {
                    precisionX += 1;
                }

                if (p.y === n1.y || p.y === n2.y) {
                    precisionY += 1;
                }
            }
        }

        return {
            posImageSpace: cursorPosImageSpace,
            posWCS: cursorPosWCS,
            infoWCS: cursorPosFormatted,
        };
    }

    public getControlMap(frame: FrameStore) {
        const preferenceStore = PreferenceStore.Instance;
        let controlMap = this.controlMaps.get(frame);
        if (!controlMap) {
            const tStart = performance.now();
            controlMap = new ControlMap(this, frame, -1, preferenceStore.contourControlMapWidth, preferenceStore.contourControlMapWidth);
            this.controlMaps.set(frame, controlMap);
            const tEnd = performance.now();
            const dt = tEnd - tStart;
            console.log(`Created ${preferenceStore.contourControlMapWidth}x${preferenceStore.contourControlMapWidth} transform grid for ${this.frameInfo.fileId} -> ${frame.frameInfo.fileId} in ${dt} ms`);
        }

        return controlMap;
    }

    public removeControlMap(frame: FrameStore) {
        const gl = ContourWebGLService.Instance.gl;
        const controlMap = this.controlMaps.get(frame);
        if (controlMap && gl && controlMap.hasTextureForContext(gl)) {
            const texture = controlMap.getTextureX(gl);
            gl.deleteTexture(texture);
        }
        this.controlMaps.delete(frame);
    }

    @action updateFromContourData(contourImageData: CARTA.ContourImageData) {
        let vertexCounter = 0;

        const processedData = ProtobufProcessing.ProcessContourData(contourImageData);
        for (const contourSet of processedData.contourSets) {
            vertexCounter += contourSet.coordinates.length / 2;
        }
        this.stokes = processedData.stokes;
        this.channel = processedData.channel;

        for (const contourSet of processedData.contourSets) {
            let contourStore = this.contourStores.get(contourSet.level);
            if (!contourStore) {
                contourStore = new ContourStore();
                this.contourStores.set(contourSet.level, contourStore);
            }

            if (!contourStore.isComplete && processedData.progress > 0) {
                contourStore.addContourData(contourSet.indexOffsets, contourSet.coordinates, processedData.progress);
            } else {
                contourStore.setContourData(contourSet.indexOffsets, contourSet.coordinates, processedData.progress);
            }
        }

        let totalProgress = 0;
        let totalVertices = 0;
        let totalChunks = 0;
        // Clear up stale contour levels by checking against the config, and update total contour progress
        this.contourStores.forEach((contourStore, level) => {
            if (this.contourConfig.levels.indexOf(level) === -1) {
                this.contourStores.delete(level);
            } else {
                totalProgress += contourStore.progress;
                totalVertices += contourStore.vertexCount;
                totalChunks += contourStore.chunkCount;
            }
        });
    }

    @action setChannels(channel: number, stokes: number, recursive: boolean) {
        const sanitizedChannel = this.sanitizeChannelNumber(channel);

        // Automatically switch to per-channel histograms when Stokes parameter changes
        if (this.requiredStokes !== stokes) {
            this.renderConfig.setUseCubeHistogram(false);
            this.renderConfig.updateCubeHistogram(null, 0);
        }

        this.requiredChannel = sanitizedChannel;
        this.requiredStokes = stokes;

        if (recursive) {
            this.spectralSiblings.forEach(frame => {
                const siblingChannel = getTransformedChannel(this.fullWcsInfo, frame.fullWcsInfo, PreferenceStore.Instance.spectralMatchingType, sanitizedChannel);
                frame.setChannels(siblingChannel, frame.requiredStokes, false);
            });

        }
    }

    private sanitizeChannelNumber(channel: number) {
        if (!isFinite(channel)) {
            return this.requiredChannel;
        }

        return Math.round(clamp(channel, 0, this.frameInfo.fileInfoExtended.depth - 1));
    }

    @action incrementChannels(deltaChannel: number, deltaStokes: number, wrap: boolean = true) {
        const depth = Math.max(1, this.frameInfo.fileInfoExtended.depth);
        const numStokes = Math.max(1, this.frameInfo.fileInfoExtended.stokes);

        let newChannel = this.requiredChannel + deltaChannel;
        let newStokes = this.requiredStokes + deltaStokes;
        if (wrap) {
            newChannel = (newChannel + depth) % depth;
            newStokes = (newStokes + numStokes) % numStokes;
        } else {
            newChannel = clamp(newChannel, 0, depth - 1);
            newStokes = clamp(newStokes, 0, numStokes - 1);
        }
        this.setChannels(newChannel, newStokes, true);
    }

    @action setZoom(zoom: number, absolute: boolean = false) {
        if (this.spatialReference) {
            // Adjust zoom by scaling factor if zoom level is not absolute
            const adjustedZoom = absolute ? zoom : zoom / this.spatialTransform.scale;
            this.spatialReference.setZoom(adjustedZoom);
        } else {
            this.zoomLevel = zoom;
            this.replaceZoomTimeoutHandler();
            this.zooming = true;
        }
    }

    @action setCenter(x: number, y: number) {
        if (this.spatialReference) {
            const centerPointRefImage = this.spatialTransform.transformCoordinate({x, y}, true);
            this.spatialReference.setCenter(centerPointRefImage.x, centerPointRefImage.y);
        } else {
            this.center = {x, y};
        }
    }

    @action setCursorInfo(cursorInfo: CursorInfo) {
        if (!this.cursorFrozen) {
            this.cursorInfo = cursorInfo;
        }
    }

    @action setCursorValue(cursorValue: number) {
        this.cursorValue = cursorValue;
    }

    // Sets a new zoom level and pans to keep the given point fixed
    @action zoomToPoint(x: number, y: number, zoom: number, absolute: boolean = false) {
        if (this.spatialReference) {
            // Adjust zoom by scaling factor if zoom level is not absolute
            const adjustedZoom = absolute ? zoom : zoom / this.spatialTransform.scale;
            const pointRefImage = transformPoint(this.spatialTransformAST, {x, y}, true);
            this.spatialReference.zoomToPoint(pointRefImage.x, pointRefImage.y, adjustedZoom);
        } else {
            if (PreferenceStore.Instance.zoomPoint === ZoomPoint.CURSOR) {
                this.center = {
                    x: x + this.zoomLevel / zoom * (this.center.x - x),
                    y: y + this.zoomLevel / zoom * (this.center.y - y)
                };
            }
            this.setZoom(zoom);
        }
    }

    private replaceZoomTimeoutHandler = () => {
        if (this.zoomTimeoutHandler) {
            clearTimeout(this.zoomTimeoutHandler);
        }

        this.zoomTimeoutHandler = setTimeout(() => {
            this.zooming = false;
        }, FrameStore.ZoomInertiaDuration);
    };

    @action private initCenter = () => {
        this.center.x = (this.frameInfo.fileInfoExtended.width - 1) / 2.0;
        this.center.y = (this.frameInfo.fileInfoExtended.height - 1) / 2.0;
    };

    @action fitZoom = () => {
        if (this.spatialReference) {
            // Calculate midpoint of image
            this.initCenter();
            const imageCenterReferenceSpace = transformPoint(this.spatialTransformAST, this.center, true);
            this.spatialReference.setCenter(imageCenterReferenceSpace.x, imageCenterReferenceSpace.y);
            // Calculate bounding box for transformed image
            const corners = [
                this.spatialTransform.transformCoordinate({x: 0, y: 0}, true),
                this.spatialTransform.transformCoordinate({x: 0, y: this.frameInfo.fileInfoExtended.height}, true),
                this.spatialTransform.transformCoordinate({x: this.frameInfo.fileInfoExtended.width, y: this.frameInfo.fileInfoExtended.height}, true),
                this.spatialTransform.transformCoordinate({x: this.frameInfo.fileInfoExtended.width, y: 0}, true)
            ];
            const {minPoint, maxPoint} = minMax2D(corners);
            const rangeX = maxPoint.x - minPoint.x;
            const rangeY = maxPoint.y - minPoint.y;
            const pixelRatio = this.renderHiDPI ? devicePixelRatio : 1.0;
            const zoomX = this.spatialReference.renderWidth * pixelRatio / rangeX;
            const zoomY = this.spatialReference.renderHeight * pixelRatio / rangeY;
            this.spatialReference.setZoom(Math.min(zoomX, zoomY), true);
        } else {
            this.zoomLevel = this.zoomLevelForFit;
            this.initCenter();
        }
    };

    @action setAnimationRange = (range: NumberRange) => {
        this.animationChannelRange = range;
    };

    @action setRasterRenderType = (renderType: RasterRenderType) => {
        this.renderType = renderType;
    };

    @action startMoving = () => {
        this.moving = true;
    };

    @action endMoving = () => {
        this.moving = false;
    };

    @action applyContours = () => {
        if (!this.contourConfig || !this.renderConfig) {
            return;
        }

        const preferenceStore = PreferenceStore.Instance;
        this.contourConfig.setEnabled(true);

        // TODO: Allow a different reference frame
        const contourParameters: CARTA.ISetContourParameters = {
            fileId: this.frameInfo.fileId,
            referenceFileId: this.frameInfo.fileId,
            smoothingMode: this.contourConfig.smoothingMode,
            smoothingFactor: this.contourConfig.smoothingFactor,
            levels: this.contourConfig.levels,
            imageBounds: {
                xMin: 0,
                xMax: this.frameInfo.fileInfoExtended.width,
                yMin: 0,
                yMax: this.frameInfo.fileInfoExtended.height,
            },
            decimationFactor: preferenceStore.contourDecimation,
            compressionLevel: preferenceStore.contourCompressionLevel,
            contourChunkSize: preferenceStore.contourChunkSize
        };
        this.backendService.setContourParameters(contourParameters);
    };

    @action clearContours = (updateBackend: boolean = true) => {
        // Clear up GPU resources
        this.contourStores.forEach(contourStore => contourStore.clearData());
        this.contourStores.clear();
        if (updateBackend) {
            // Send empty contour parameter message to the backend, to prevent contours from being automatically updated
            const contourParameters: CARTA.ISetContourParameters = {
                fileId: this.frameInfo.fileId,
                referenceFileId: this.frameInfo.fileId,
            };
            this.backendService.setContourParameters(contourParameters);
        }
        this.contourConfig.setEnabled(false);
    };

    // Spatial WCS Matching
    @action setSpatialReference = (frame: FrameStore) => {
        if (frame === this) {
            console.log(`Skipping spatial self-reference`);
            this.clearSpatialReference();
            return false;
        }

        if (this.validWcs !== frame.validWcs) {
            console.log(`Error creating spatial transform between files ${this.frameInfo.fileId} and ${frame.frameInfo.fileId}`);
            this.spatialReference = null;
            return false;
        }
        console.log(`Setting spatial reference for file ${this.frameInfo.fileId} to ${frame.frameInfo.fileId}`);
        this.spatialReference = frame;

        const copySrc = AST.copy(this.wcsInfo);
        const copyDest = AST.copy(frame.wcsInfo);
        AST.invert(copySrc);
        AST.invert(copyDest);
        this.spatialTransformAST = AST.convert(copySrc, copyDest, "");
        AST.delete(copySrc);
        AST.delete(copyDest);
        if (!this.spatialTransformAST) {
            console.log(`Error creating spatial transform between files ${this.frameInfo.fileId} and ${frame.frameInfo.fileId}`);
            this.spatialReference = null;
            return false;
        }
        this.spatialReference = frame;
        const currentTransform = this.spatialTransform;
        if (!isFinite(currentTransform.rotation) || !isFinite(currentTransform.scale) || !isFinite(currentTransform.translation.x) || !isFinite(currentTransform.translation.y)
            || !isFinite(currentTransform.origin.x) || !isFinite(currentTransform.origin.y)) {
            console.log(`Error creating spatial transform between files ${this.frameInfo.fileId} and ${frame.frameInfo.fileId}`);
            this.spatialReference = null;
            AST.delete(this.spatialTransformAST);
            this.spatialTransformAST = null;
            return false;
        }

        this.spatialReference.addSecondarySpatialImage(this);
        return true;
    };

    @action clearSpatialReference = () => {
        // Adjust center and zoom based on existing spatial reference
        if (this.spatialReference) {
            this.center = this.spatialTransform.transformCoordinate(this.spatialReference.center, false);
            this.zoomLevel = this.spatialReference.zoomLevel * this.spatialTransform.scale;
            this.spatialReference.removeSecondarySpatialImage(this);
            this.spatialReference = null;
        }

        if (this.spatialTransformAST) {
            AST.delete(this.spatialTransformAST);
        }
        this.spatialTransformAST = null;
        const gl = ContourWebGLService.Instance.gl;
        if (gl) {
            this.controlMaps.forEach(controlMap => {
                if (controlMap.hasTextureForContext(gl)) {
                    const texture = controlMap.getTextureX(gl);
                    gl.deleteTexture(texture);
                }
            });
        }
        this.controlMaps.forEach((controlMap, frame) => {
            this.removeControlMap(frame);
        });
        this.controlMaps.clear();
    };

    @action addSecondarySpatialImage = (frame: FrameStore) => {
        if (!this.secondarySpatialImages.find(f => f.frameInfo.fileId === frame.frameInfo.fileId)) {
            this.secondarySpatialImages.push(frame);
        }
    };

    @action removeSecondarySpatialImage = (frame: FrameStore) => {
        this.secondarySpatialImages = this.secondarySpatialImages.filter(f => f.frameInfo.fileId !== frame.frameInfo.fileId);
    };

    // Spectral WCS matching
    @action setSpectralReference = (frame: FrameStore) => {
        if (frame === this) {
            this.clearSpatialReference();
            console.log(`Skipping spectral self-reference`);
            return false;
        }
        console.log(`Setting spectral reference for file ${this.frameInfo.fileId} to ${frame.frameInfo.fileId}`);

        if (!this.fullWcsInfo || !frame.fullWcsInfo) {
            console.log(`Error creating spectral transform between files ${this.frameInfo.fileId} and ${frame.frameInfo.fileId}. One of the files is missing spectral information`);
            this.spectralReference = null;
            return false;
        }

        // For now, this is just done to ensure a mapping can be constructed
        const copySrc = AST.copy(this.fullWcsInfo);
        const copyDest = AST.copy(frame.fullWcsInfo);
        const preferenceStore = PreferenceStore.Instance;
        const spectralMatchingType = preferenceStore.spectralMatchingType;
        // Ensure that a mapping for the current alignment system is possible
        if (spectralMatchingType !== SpectralType.CHANNEL) {
            AST.set(copySrc, `AlignSystem=${preferenceStore.spectralMatchingType}`);
            AST.set(copyDest, `AlignSystem=${preferenceStore.spectralMatchingType}`);
        }
        AST.invert(copySrc);
        AST.invert(copyDest);
        this.spectralTransformAST = AST.convert(copySrc, copyDest, "");
        AST.delete(copySrc);
        AST.delete(copyDest);

        if (!this.spectralTransformAST) {
            console.log(`Error creating spatial transform between files ${this.frameInfo.fileId} and ${frame.frameInfo.fileId}. Could not create AST transform`);
            this.spectralReference = null;
            return false;
        }

        this.spectralReference = frame;
        this.spectralReference.addSecondarySpectralImage(this);
        const matchedChannel = getTransformedChannel(frame.fullWcsInfo, this.fullWcsInfo, preferenceStore.spectralMatchingType, frame.requiredChannel);
        this.setChannels(matchedChannel, this.requiredStokes, false);
        return true;
    };

    @action clearSpectralReference = () => {
        if (this.spectralReference) {
            this.spectralReference.removeSecondarySpectralImage(this);
            this.spectralReference = null;
        }

        if (this.spectralTransformAST) {
            AST.delete(this.spectralTransformAST);
        }
        this.spectralTransformAST = null;
    };

    @action addSecondarySpectralImage = (frame: FrameStore) => {
        if (!this.secondarySpectralImages.find(f => f.frameInfo.fileId === frame.frameInfo.fileId)) {
            this.secondarySpectralImages.push(frame);
        }
    };

    @action removeSecondarySpectralImage = (frame: FrameStore) => {
        this.secondarySpectralImages = this.secondarySpectralImages.filter(f => f.frameInfo.fileId !== frame.frameInfo.fileId);
    };
}