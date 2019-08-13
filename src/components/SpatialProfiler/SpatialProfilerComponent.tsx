import * as React from "react";
import * as _ from "lodash";
import * as AST from "ast_wrapper";
import {autorun, computed, observable} from "mobx";
import {observer} from "mobx-react";
import {Colors, NonIdealState} from "@blueprintjs/core";
import ReactResizeDetector from "react-resize-detector";
import {LinePlotComponent, LinePlotComponentProps, PlotType, PopoverSettingsComponent} from "components/Shared";
import {SpatialProfilerSettingsPanelComponent} from "./SpatialProfilerSettingsPanelComponent/SpatialProfilerSettingsPanelComponent";
import {ASTSettingsString, FrameStore, SpatialProfileStore, WidgetConfig, WidgetProps} from "stores";
import {SpatialProfileWidgetStore} from "stores/widgets";
import {Point2D} from "models";
import {clamp} from "utilities";
import "./SpatialProfilerComponent.css";

// The fixed size of the settings panel popover (excluding the show/hide button)
const PANEL_CONTENT_WIDTH = 180;

@observer
export class SpatialProfilerComponent extends React.Component<WidgetProps> {
    public static get WIDGET_CONFIG(): WidgetConfig {
        return {
            id: "spatial-profiler",
            type: "spatial-profiler",
            minWidth: 250,
            minHeight: 225,
            defaultWidth: 650,
            defaultHeight: 225,
            title: "X Profile: Cursor",
            isCloseable: true
        };
    }

    private cachedFormattedCoordinates: string[];

    @observable width: number;
    @observable height: number;

    @computed get widgetStore(): SpatialProfileWidgetStore {
        if (this.props.appStore && this.props.appStore.widgetsStore.spatialProfileWidgets) {
            const widgetStore = this.props.appStore.widgetsStore.spatialProfileWidgets.get(this.props.id);
            if (widgetStore) {
                return widgetStore;
            }
        }
        console.log("can't find store for widget");
        return new SpatialProfileWidgetStore();
    }

    @computed get profileStore(): SpatialProfileStore {
        if (this.props.appStore && this.props.appStore.activeFrame) {
            let keyStruct = {fileId: this.widgetStore.fileId, regionId: this.widgetStore.regionId};
            // Replace "current file" fileId with active frame's fileId
            if (this.widgetStore.fileId === -1) {
                keyStruct.fileId = this.props.appStore.activeFrame.frameInfo.fileId;
            }
            const key = `${keyStruct.fileId}-${keyStruct.regionId}`;
            return this.props.appStore.spatialProfiles.get(key);
        }
        return undefined;
    }

    @computed get frame(): FrameStore {
        if (this.props.appStore && this.widgetStore) {
            return this.props.appStore.getFrame(this.widgetStore.fileId);
        } else {
            return undefined;
        }
    }

    @computed get settingsPanelWidth(): number {
        return 20 + (this.widgetStore.settingsPanelVisible ? PANEL_CONTENT_WIDTH : 0);
    }

    @computed get plotData(): { values: Array<Point2D>, xMin: number, xMax: number, yMin: number, yMax: number, yMean: number, yRms: number } {
        const isXProfile = this.widgetStore.coordinate.indexOf("x") >= 0;
        if (!this.frame || !this.width) {
            return null;
        }

        // Use accurate profiles from server-sent data
        const coordinateData = this.profileStore.profiles.get(this.widgetStore.coordinate);
        if (!(coordinateData && coordinateData.values && coordinateData.values.length)) {
            return null;
        } else {
            let xMin: number;
            let xMax: number;

            if (this.widgetStore.isAutoScaledX) {
                if (isXProfile) {
                    xMin = clamp(this.frame.requiredFrameView.xMin, 0, this.frame.frameInfo.fileInfoExtended.width);
                    xMax = clamp(this.frame.requiredFrameView.xMax, 0, this.frame.frameInfo.fileInfoExtended.width);
                } else {
                    xMin = clamp(this.frame.requiredFrameView.yMin, 0, this.frame.frameInfo.fileInfoExtended.height);
                    xMax = clamp(this.frame.requiredFrameView.yMax, 0, this.frame.frameInfo.fileInfoExtended.height);
                }
            } else {
                xMin = clamp(this.widgetStore.minX, 0, this.frame.frameInfo.fileInfoExtended.width);
                if (isXProfile) {
                    xMax = clamp(this.widgetStore.maxX, 0, this.frame.frameInfo.fileInfoExtended.width);
                } else {
                    xMax = clamp(this.widgetStore.maxX, 0, this.frame.frameInfo.fileInfoExtended.height);
                }
            }

            xMin = Math.floor(xMin);
            xMax = Math.floor(xMax);
            let yMin = Number.MAX_VALUE;
            let yMax = -Number.MAX_VALUE;
            let yMean;
            let yRms;

            // Variables for mean and RMS calculations
            let ySum = 0;
            let ySum2 = 0;
            let yCount = 0;

            const N = Math.floor(Math.min(xMax - xMin, coordinateData.values.length));

            const numPixels = this.width;
            const decimationFactor = Math.round(N / numPixels);
            const numDecimatedPoints = decimationFactor > 1 ? 2 * Math.ceil(N / decimationFactor) : N;

            let values: Array<{ x: number, y: number }>;
            if (N > 0) {
                if (decimationFactor <= 1) {
                    // full resolution data
                    values = new Array(N);
                    for (let i = 0; i < N; i++) {
                        const y = coordinateData.values[i + xMin];
                        const x = coordinateData.start + i + xMin;
                        if (x >= xMin && x <= xMax && isFinite(y)) {
                            yMin = Math.min(yMin, y);
                            yMax = Math.max(yMax, y);
                            yCount++;
                            ySum += y;
                            ySum2 += y * y;
                        }
                        values[i] = {x, y};
                    }
                } else {
                    // Decimated data
                    values = new Array(numDecimatedPoints);
                    let localMin = NaN, localMax = NaN;
                    let posMin, posMax;
                    let localCounter = 0;
                    for (let i = 0; i < N; i++) {
                        const val = coordinateData.values[i + xMin];
                        const decimatedIndex = Math.floor(i / (decimationFactor));
                        if (isFinite(val)) {
                            yMin = Math.min(yMin, val);
                            yMax = Math.max(yMax, val);
                            yCount++;
                            ySum += val;
                            ySum2 += val * val;

                            if (isNaN(localMin) || val < localMin) {
                                localMin = val;
                                posMin = i;
                            }
                            if (isNaN(localMax) || val > localMax) {
                                localMax = val;
                                posMax = i;
                            }
                        }

                        localCounter++;
                        if (localCounter === decimationFactor) {
                            // Use the midpoint of the decimated data range as the x coordinate (rounded down to nearest pixel)
                            const x1 = Math.floor(coordinateData.start + posMin + xMin);
                            const x2 = Math.floor(coordinateData.start + posMax + xMin);

                            if (posMin < posMax) {
                                values[decimatedIndex * 2] = {x: x1, y: localMin};
                                values[decimatedIndex * 2 + 1] = {x: x2, y: localMax};
                            } else {
                                values[decimatedIndex * 2] = {x: x2, y: localMax};
                                values[decimatedIndex * 2 + 1] = {x: x1, y: localMin};
                            }

                            localMin = NaN;
                            localMax = NaN;
                            localCounter = 0;
                        }
                    }

                    // Add last point if there is left over data
                    if (localCounter > 0) {
                        const x1 = Math.floor(coordinateData.start + posMin + xMin - decimationFactor / 2.0);
                        const x2 = Math.floor(coordinateData.start + posMax + xMin - decimationFactor / 2.0);

                        if (posMin < posMax) {
                            values[values.length - 2] = {x: x1, y: localMin};
                            values[values.length - 1] = {x: x2, y: localMax};
                        } else {
                            values[values.length - 2] = {x: x2, y: localMax};
                            values[values.length - 1] = {x: x1, y: localMin};
                        }
                    }
                }
            }

            if (yCount > 0) {
                yMean = ySum / yCount;
                yRms = Math.sqrt((ySum2 / yCount) - yMean * yMean);
            }

            if (yMin === Number.MAX_VALUE) {
                yMin = undefined;
                yMax = undefined;
            }
            return {values: values, xMin, xMax, yMin, yMax, yMean, yRms};
        }
    }

    constructor(props: WidgetProps) {
        super(props);
        // Check if this widget hasn't been assigned an ID yet
        if (!props.docked && props.id === SpatialProfilerComponent.WIDGET_CONFIG.type) {
            // Assign the next unique ID
            const id = props.appStore.widgetsStore.addSpatialProfileWidget();
            props.appStore.widgetsStore.changeWidgetId(props.id, id);
        } else {
            if (!this.props.appStore.widgetsStore.spatialProfileWidgets.has(this.props.id)) {
                console.log(`can't find store for widget with id=${this.props.id}`);
                this.props.appStore.widgetsStore.spatialProfileWidgets.set(this.props.id, new SpatialProfileWidgetStore());
            }
        }
        // Update widget title when region or coordinate changes
        autorun(() => {
            if (this.widgetStore) {
                const coordinate = this.widgetStore.coordinate;
                const appStore = this.props.appStore;
                if (appStore && coordinate) {
                    const coordinateString = `${coordinate.toUpperCase()} Profile`;
                    const regionString = this.widgetStore.regionId === 0 ? "Cursor" : `Region #${this.widgetStore.regionId}`;
                    this.props.appStore.widgetsStore.setWidgetTitle(this.props.id, `${coordinateString}: ${regionString}`);
                }
            } else {
                this.props.appStore.widgetsStore.setWidgetTitle(this.props.id, `X Profile: Cursor`);
            }
        });
    }

    onResize = (width: number, height: number) => {
        this.width = width;
        this.height = height;
    };

    private calculateFormattedValues(values: number[]) {
        if (!this.cachedFormattedCoordinates || this.cachedFormattedCoordinates.length !== values.length) {
            this.cachedFormattedCoordinates = new Array(values.length);
        }
        if (!this.frame || !this.profileStore || !this.widgetStore) {
            return;
        }
        const isXProfile = this.widgetStore.coordinate.indexOf("x") >= 0;

        let astString = new ASTSettingsString();
        astString.add("System", this.props.appStore.overlayStore.global.explicitSystem);

        if (isXProfile) {
            for (let i = 0; i < values.length; i++) {
                const pointWCS = AST.pixToWCS(this.frame.wcsInfo, values[i] + 1, this.profileStore.y + 1);
                const normVals = AST.normalizeCoordinates(this.frame.wcsInfo, pointWCS.x, pointWCS.y);
                this.cachedFormattedCoordinates[i] = AST.getFormattedCoordinates(this.frame.wcsInfo, normVals.x, undefined, astString.toString(), true).x;
            }
        } else {
            for (let i = 0; i < values.length; i++) {
                const pointWCS = AST.pixToWCS(this.frame.wcsInfo, this.profileStore.x + 1, values[i] + 1);
                const normVals = AST.normalizeCoordinates(this.frame.wcsInfo, pointWCS.x, pointWCS.y);
                this.cachedFormattedCoordinates[i] = AST.getFormattedCoordinates(this.frame.wcsInfo, undefined, normVals.y, astString.toString(), true).y;
            }
        }
        this.trimDecimals();
    }

    // Trims unnecessary decimals from the list of formatted coordinates
    private trimDecimals() {
        if (!this.cachedFormattedCoordinates || !this.cachedFormattedCoordinates.length) {
            return;
        }
        // If the existing tick list has repeats, don't trim
        if (SpatialProfilerComponent.hasRepeats(this.cachedFormattedCoordinates)) {
            return;
        }
        const decimalIndex = this.cachedFormattedCoordinates[0].indexOf(".");
        // Skip lists without decimals. This assumes that all ticks have the same number of decimals
        if (decimalIndex === -1) {
            return;
        }
        const initialTrimLength = this.cachedFormattedCoordinates[0].length - decimalIndex;
        for (let trim = initialTrimLength; trim > 0; trim--) {
            let trimmedArray = this.cachedFormattedCoordinates.slice();
            for (let i = 0; i < trimmedArray.length; i++) {
                trimmedArray[i] = trimmedArray[i].slice(0, -trim);
            }
            if (!SpatialProfilerComponent.hasRepeats(trimmedArray)) {
                this.cachedFormattedCoordinates = trimmedArray;
                return;
            }
            // Skip an extra character after the first check, because of the decimal indicator
            if (trim === initialTrimLength) {
                trim--;
            }
        }
    }

    private static hasRepeats(ticks: string[]): boolean {
        if (!ticks || ticks.length < 2) {
            return false;
        }
        let prevTick = ticks[0];
        for (let i = 1; i < ticks.length; i++) {
            const nextTick = ticks[i];
            if (prevTick === nextTick) {
                return true;
            }
            prevTick = nextTick;
        }
        return false;
    }

    private formatProfileAst = (v: number, i: number, values: number[]) => {
        if (!this.frame || !this.profileStore) {
            return v;
        }

        // Cache all formatted values
        if (i === 0) {
            this.calculateFormattedValues(values);
        }
        return this.cachedFormattedCoordinates[i];
    };

    onGraphCursorMoved = _.throttle((x) => {
        this.widgetStore.setCursor(x);
    }, 33);

    render() {
        const appStore = this.props.appStore;
        if (!this.widgetStore) {
            return <NonIdealState icon={"error"} title={"Missing profile"} description={"Profile not found"}/>;
        }

        const isXProfile = this.widgetStore.coordinate.indexOf("x") >= 0;

        const imageName = (appStore.activeFrame ? appStore.activeFrame.frameInfo.fileInfo.name : undefined);

        let linePlotProps: LinePlotComponentProps = {
            xLabel: `${isXProfile ? "X" : "Y"} coordinate`,
            yLabel: "Value",
            darkMode: appStore.darkTheme,
            imageName: imageName,
            plotName: `${isXProfile ? "X" : "Y"} profile`,
            usePointSymbols: this.widgetStore.plotType === PlotType.POINTS,
            interpolateLines: this.widgetStore.plotType === PlotType.LINES,
            forceScientificNotationTicksY: true,
            graphZoomedX: this.widgetStore.setXBounds,
            graphZoomedY: this.widgetStore.setYBounds,
            graphZoomedXY: this.widgetStore.setXYBounds,
            graphZoomReset: this.widgetStore.clearXYBounds,
            graphCursorMoved: this.onGraphCursorMoved,
            scrollZoom: true
        };

        if (appStore.activeFrame) {
            if (this.profileStore && this.frame) {
                if (this.frame.unit) {
                    linePlotProps.yLabel = `Value (${this.frame.unit})`;
                }

                if (this.frame.validWcs && this.widgetStore.wcsAxisVisible) {
                    linePlotProps.showTopAxis = true;
                    linePlotProps.topAxisTickFormatter = this.formatProfileAst;
                } else {
                    linePlotProps.showTopAxis = false;
                }

                const currentPlotData = this.plotData;
                if (currentPlotData) {
                    linePlotProps.data = currentPlotData.values;
                    // Determine scale in X and Y directions. If auto-scaling, use the bounds of the current data
                    if (this.widgetStore.isAutoScaledX) {
                        linePlotProps.xMin = currentPlotData.xMin;
                        linePlotProps.xMax = currentPlotData.xMax;
                    } else {
                        linePlotProps.xMin = this.widgetStore.minX;
                        linePlotProps.xMax = this.widgetStore.maxX;
                    }

                    if (this.widgetStore.isAutoScaledY) {
                        linePlotProps.yMin = currentPlotData.yMin;
                        linePlotProps.yMax = currentPlotData.yMax;
                    } else {
                        linePlotProps.yMin = this.widgetStore.minY;
                        linePlotProps.yMax = this.widgetStore.maxY;
                    }
                }

                linePlotProps.cursorX = {
                    profiler: this.widgetStore.cursorX,
                    image: isXProfile ? this.profileStore.x : this.profileStore.y,
                    unit: "px"
                };

                linePlotProps.markers = [{
                    value: linePlotProps.cursorX.image,
                    id: "marker-image-cursor",
                    draggable: false,
                    horizontal: false,
                }];

                linePlotProps.markers.push({
                    value: linePlotProps.cursorX.profiler,
                    id: "marker-profiler-cursor",
                    draggable: false,
                    horizontal: false,
                    color: appStore.darkTheme ? Colors.GRAY4 : Colors.GRAY2,
                    opacity: 0.8,
                    isMouseMove: true,
                });

                if (this.widgetStore.meanRmsVisible && currentPlotData && isFinite(currentPlotData.yMean) && isFinite(currentPlotData.yRms)) {
                    linePlotProps.markers.push({
                        value: currentPlotData.yMean,
                        id: "marker-mean",
                        draggable: false,
                        horizontal: true,
                        color: appStore.darkTheme ? Colors.GREEN4 : Colors.GREEN2,
                        dash: [5]
                    });

                    linePlotProps.markers.push({
                        value: currentPlotData.yMean,
                        id: "marker-rms",
                        draggable: false,
                        horizontal: true,
                        width: currentPlotData.yRms,
                        opacity: 0.2,
                        color: appStore.darkTheme ? Colors.GREEN4 : Colors.GREEN2
                    });

                    linePlotProps.dataStat = {mean: currentPlotData.yMean, rms: currentPlotData.yRms};
                }

                // TODO: Get comments from region info, rather than directly from cursor position
                if (appStore.activeFrame.cursorInfo) {
                    const comments: string[] = [];
                    comments.push(`region (pixel): Point[${appStore.activeFrame.cursorInfo.posImageSpace.x.toFixed(0)}, ${appStore.activeFrame.cursorInfo.posImageSpace.y.toFixed(0)}]`);
                    if (appStore.activeFrame.cursorInfo.infoWCS) {
                        comments.push(`region (world): Point[${appStore.activeFrame.cursorInfo.infoWCS.x}, ${appStore.activeFrame.cursorInfo.infoWCS.y}]`);
                    }
                    linePlotProps.comments = comments;
                }
            }
        }

        return (
            <div className={"spatial-profiler-widget"}>
                <div className="profile-container">
                    <div className="profile-plot">
                        <LinePlotComponent {...linePlotProps}/>
                    </div>
                </div>
                <PopoverSettingsComponent
                    isOpen={this.widgetStore.settingsPanelVisible}
                    onShowClicked={this.widgetStore.showSettingsPanel}
                    onHideClicked={this.widgetStore.hideSettingsPanel}
                    contentWidth={PANEL_CONTENT_WIDTH}
                >
                    <SpatialProfilerSettingsPanelComponent widgetStore={this.widgetStore}/>
                </PopoverSettingsComponent>
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} refreshMode={"throttle"} refreshRate={33}/>
            </div>
        );
    }
}
