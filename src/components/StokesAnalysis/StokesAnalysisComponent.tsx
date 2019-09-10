import * as React from "react";
import * as _ from "lodash";
import {autorun, computed, observable} from "mobx";
import {observer} from "mobx-react";
import {Colors, NonIdealState} from "@blueprintjs/core";
import ReactResizeDetector from "react-resize-detector";
import {CARTA} from "carta-protobuf";
import {LinePlotComponent, LinePlotComponentProps, ScatterPlotComponent, ScatterPlotComponentProps, VERTICAL_RANGE_PADDING} from "components/Shared";
import {StokesAnalysisToolbarComponent} from "./StokesAnalysisToolbarComponent/StokesAnalysisToolbarComponent";
import {TickType} from "../Shared/LinePlot/PlotContainer/PlotContainerComponent";
import {StokesAnalysisProfilerInfoComponent} from "./ProfilerInfo/ProfilerInfoComponent";
import {AnimationState, SpectralProfileStore, WidgetConfig, WidgetProps} from "stores";
import {StokesAnalysisWidgetStore, StokesCoordinate} from "stores/widgets";
import {ChannelInfo, Point2D} from "models";
import {clamp, normalising, polarizationAngle, polarizedIntensity, binarySearchByX, closestPointToCursor} from "utilities";
import "./StokesAnalysisComponent.css";

type Border = { xMin: number, xMax: number, yMin: number, yMax: number };
type Point3D = { x: number, y: number, z?: number };

@observer
export class StokesAnalysisComponent extends React.Component<WidgetProps> {
    private pointDefaultColor = Colors.GRAY2;
    private opacityInit = 1;
    private opacityOutRange = 0.1;
    private colorRangeEnd = 240;
    private pointRadius = 3;
    private channelBorder: { xMin: number, xMax: number };
    private minProgress = 0;
    private cursorInfo: {isMouseEntered: boolean, quValue: Point2D, channel: number, pi: number, pa: number, xUnit: string};
    private static layoutRatioCutoffs = {
        vertical: 0.5,
        horizontal: 2,
    };

    @observable isMouseMoveIntoLinePlots = false;
    @observable isMouseMoveIntoScatterPlots = false;

    public static get WIDGET_CONFIG(): WidgetConfig {
        return {
            id: "stokes",
            type: "stokes",
            minWidth: 300,
            minHeight: 390,
            defaultWidth: 600,
            defaultHeight: 800,
            title: "Stokes Analysis",
            isCloseable: true
        };
    }

    @observable width: number;
    @observable height: number;

    @computed get widgetStore(): StokesAnalysisWidgetStore {
        if (this.props.appStore && this.props.appStore.widgetsStore.stokesAnalysisWidgets) {
            const widgetStore = this.props.appStore.widgetsStore.stokesAnalysisWidgets.get(this.props.id);
            if (widgetStore) {
                return widgetStore;
            }
        }
        console.log("can't find store for widget");
        return new StokesAnalysisWidgetStore();
    }

    @computed get profileStore(): SpectralProfileStore {
        if (this.props.appStore && this.props.appStore.activeFrame) {
            let fileId = this.props.appStore.activeFrame.frameInfo.fileId;
            const regionId = this.widgetStore.regionIdMap.get(fileId) || 0;
            const frameMap = this.props.appStore.spectralProfiles.get(fileId);
            if (frameMap) {
                return frameMap.get(regionId);
            }
        }
        return null;
    }

    @computed get exportHeaders(): string[] {
        let headerString = [];
        const frame = this.props.appStore.activeFrame;
        if (frame && frame.frameInfo && frame.regionSet) {
            const regionId = this.widgetStore.regionIdMap.get(frame.frameInfo.fileId) || 0;
            const region = frame.regionSet.regions.find(r => r.regionId === regionId);

            if (region) {
                headerString.push(region.regionProperties);
            }
        }
        return headerString;
    }

    @computed get matchesSelectedRegion() {
        const appStore = this.props.appStore;
        const frame = appStore.activeFrame;
        if (frame) {
            const widgetRegion = this.widgetStore.regionIdMap.get(frame.frameInfo.fileId);
            if (frame.regionSet.selectedRegion && frame.regionSet.selectedRegion.regionId !== 0) {
                return widgetRegion === frame.regionSet.selectedRegion.regionId;
            }
        }
        return false;
    }

    constructor(props: WidgetProps) {
        super(props);
        if (!props.docked && props.id === StokesAnalysisComponent.WIDGET_CONFIG.type) {
            const id = props.appStore.widgetsStore.addStokesWidget();
            props.appStore.widgetsStore.changeWidgetId(props.id, id);
        } else {
            if (!this.props.appStore.widgetsStore.stokesAnalysisWidgets.has(this.props.id)) {
                console.log(`can't find store for widget with id=${this.props.id}`);
                this.props.appStore.widgetsStore.stokesAnalysisWidgets.set(this.props.id, new StokesAnalysisWidgetStore());
            }
        }

        autorun(() => {
            if (this.widgetStore) {
                const appStore = this.props.appStore;
                const frame = appStore.activeFrame;
                let progressString = "";
                const currentData = this.plotData;
                if (currentData && isFinite(currentData.qProgress) && isFinite(currentData.uProgress)) {
                    const minProgress = Math.min(currentData.qProgress, currentData.uProgress, currentData.iProgress);
                    if (minProgress < 1) {
                        progressString = `[${(minProgress * 100).toFixed(0)}% complete]`;
                    }
                    this.minProgress = minProgress;
                }
                if (frame) {
                    const regionId = this.widgetStore.regionIdMap.get(frame.frameInfo.fileId) || 0;
                    const regionString = regionId === 0 ? "Cursor" : `Region #${regionId}`;
                    const selectedString = this.matchesSelectedRegion ? "(Selected)" : "";
                    this.props.appStore.widgetsStore.setWidgetTitle(this.props.id, `Stokes Analysis : ${regionString} ${selectedString} ${progressString}`);
                }
            } else {
                this.props.appStore.widgetsStore.setWidgetTitle(this.props.id, `Stokes Analysis: Cursor`);
            }
        });
    }

    onResize = (width: number, height: number) => {
        this.width = width;
        this.height = height;
    };

    private getChannelLabel = (): string => {
        const frame = this.props.appStore.activeFrame;
        if (this.widgetStore.useWcsValues && frame.channelInfo) {
            const channelInfo = frame.channelInfo;
            let channelLabel = channelInfo.channelType.name;
            if (channelInfo.channelType.unit && channelInfo.channelType.unit.length) {
                channelLabel += ` (${channelInfo.channelType.unit})`;
            }
            return channelLabel;
        }
        return null;
    };

    private getChannelUnit = (): string => {
        const frame = this.props.appStore.activeFrame;
        if (this.widgetStore.useWcsValues && frame.channelInfo && frame.channelInfo.channelType.unit) {
            return frame.channelInfo.channelType.unit;
        }
        return "Channel";
    };

    private getRequiredChannelValue = (): number => {
        const frame = this.props.appStore.activeFrame;
        if (frame) {
            const channel = frame.requiredChannel;
            if (this.widgetStore.useWcsValues && frame.channelInfo &&
                channel >= 0 && channel < frame.channelInfo.values.length) {
                return frame.channelInfo.values[channel];
            }
            return channel;
        }
        return null;
    };

    onChannelChanged = (x: number) => {
        const frame = this.props.appStore.activeFrame;
        if (this.props.appStore.animatorStore.animationState === AnimationState.PLAYING) {
            return;
        }

        if (frame && frame.channelInfo) {
            let channelInfo = frame.channelInfo;
            let nearestIndex = (this.widgetStore.useWcsValues && channelInfo.getChannelIndexWCS) ?
                channelInfo.getChannelIndexWCS(x) :
                channelInfo.getChannelIndexSimple(x);
            if (nearestIndex !== null && nearestIndex !== undefined) {
                frame.setChannels(nearestIndex, frame.requiredStokes);
            }
        }
    };

    onScatterChannelChanged = (x: number, y: number, data: Point3D[]) => {
        const frame = this.props.appStore.activeFrame;
        if (this.props.appStore.animatorStore.animationState === AnimationState.PLAYING) {
            return;
        }
        if (data.length > 0 && frame && frame.channelInfo) {
            let channelInfo = frame.channelInfo;
            const zIndex = this.matchZindex(x, y, data);
            let nearestIndex = (this.widgetStore.useWcsValues && channelInfo.getChannelIndexWCS) ?
                channelInfo.getChannelIndexWCS(zIndex) :
                channelInfo.getChannelIndexSimple(zIndex);
            if (nearestIndex !== null && nearestIndex !== undefined) {
                frame.setChannels(nearestIndex, frame.requiredStokes);
            }
        }
    };

    private matchZindex (x: number, y: number, data: Point3D[]): number {
        let channel = 0;
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            if (element.x === x && element.y === y) {
                channel = element.z;
                break;
            }
            
        }
        return channel;
    }

    private getCurrentChannelValue = (): number => {
        const frame = this.props.appStore.activeFrame;
        if (frame) {
            const channel = frame.channel;
            if (this.widgetStore.useWcsValues && frame.channelInfo &&
                channel >= 0 && channel < frame.channelInfo.values.length) {
                return frame.channelInfo.values[channel];
            }
            return channel;
        }
        return null;
    };

    private matchXYindex (z: number, data: Point3D[]): Point3D {
        let point = data[0];
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            if (element.z === z) {
                point = element;
                break;
            }
            
        }
        return point;
    }

    private static calculateLayout = (width: number, height: number): string => {
        if (width && height) {
            let ratio = width / height;
            let verticalDiff = Math.abs(ratio - StokesAnalysisComponent.layoutRatioCutoffs.vertical);
            let horizontalDiff = Math.abs(ratio - StokesAnalysisComponent.layoutRatioCutoffs.horizontal);

            let minValue = Math.min(verticalDiff, horizontalDiff);

            if (minValue === verticalDiff) {
                return "vertical";
            } else if (minValue === horizontalDiff) {
                return "horizontal";
            }
            return null;
        }
        return null;
    };

    onGraphCursorMoved = _.throttle((x) => {
        this.widgetStore.setlinePlotCursorX(x);
    }, 33);

    onScatterGraphCursorMoved = _.throttle((x, y) => {
        this.widgetStore.setScatterPlotCursor({ x: x, y: y});
    }, 33);

    private static calculatePA(qData: Float32Array | Float64Array, uData: Float32Array | Float64Array): Array<number> {
        let vals = [];
        if (qData && uData && qData.length === uData.length) {
            for (let i = 0; i < qData.length; i++) {
                // Unit degree
                vals[i] = polarizationAngle(qData[i], uData[i]);
            }
        }
        return vals;
    }

    private static calculatePI(qData: Float32Array | Float64Array, uData: Float32Array | Float64Array): Array<number> {
        let vals = [];
        if (qData && uData && qData.length === uData.length) {
            for (let i = 0; i < qData.length; i++) {
                vals[i] = polarizedIntensity(qData[i], uData[i]);
            }
        }
        return vals;
    }

    private static calculateFractionalPol(targetData: Array<number> | Float32Array | Float64Array, dataIz: Float32Array | Float64Array): Array<number> {
        let vals = [];
        if (targetData && dataIz && targetData.length === dataIz.length) {
            for (let i = 0; i < targetData.length; i++) {
                vals[i] = normalising(targetData[i], dataIz[i]);
            }
        }
        return vals;
    }

    private calculateCompositeProfile(statsType: CARTA.StatsType): { qProfile: Array<number>, uProfile: Array<number>, piProfile: Array<number>, paProfile: Array<number>, qProgress: number, uProgress: number, iProgress: number } {
        if (this.profileStore) {
            let qProfileOriginal = this.profileStore.getProfile(StokesCoordinate.LinearPolarizationQ, statsType);
            let uProfileOriginal = this.profileStore.getProfile(StokesCoordinate.LinearPolarizationU, statsType);
            let piProfile = [];
            let paProfile = [];
            let qProfile = [];
            let uProfile = [];

            if (qProfileOriginal && uProfileOriginal && qProfileOriginal.values && uProfileOriginal.values) {
                qProfile = Array.prototype.slice.call(qProfileOriginal.values);
                uProfile = Array.prototype.slice.call(uProfileOriginal.values);
                piProfile = StokesAnalysisComponent.calculatePI(qProfileOriginal.values, uProfileOriginal.values);
                paProfile = StokesAnalysisComponent.calculatePA(qProfileOriginal.values, uProfileOriginal.values);

                if (this.widgetStore.fractionalPolVisible) {
                    let iProfileOriginal = this.profileStore.getProfile(StokesCoordinate.TotalIntensity, statsType);
                    if (iProfileOriginal && iProfileOriginal.values) {
                        piProfile = StokesAnalysisComponent.calculateFractionalPol(piProfile, iProfileOriginal.values);
                        qProfile = StokesAnalysisComponent.calculateFractionalPol(qProfile, iProfileOriginal.values);
                        uProfile = StokesAnalysisComponent.calculateFractionalPol(uProfile, iProfileOriginal.values);
                        return {qProfile, uProfile, piProfile, paProfile, qProgress: qProfileOriginal.progress, uProgress: uProfileOriginal.progress, iProgress: iProfileOriginal.progress};
                    }
                }
                return {qProfile, uProfile, piProfile, paProfile, qProgress: qProfileOriginal.progress, uProgress: uProfileOriginal.progress, iProgress: 1};
            }
        }
        return null;
    }

    private calculateXYborder(xValues: Array<number>, yValues: Array<number>, isLinePlots: boolean): Border {
        let xMin = Math.min(...xValues.filter(n => {
            return !isNaN(n);
        }));
        let xMax = Math.max(...xValues.filter(n => {
            return !isNaN(n);
        }));
        let yMin = Number.MAX_VALUE;
        let yMax = -Number.MAX_VALUE;

        if (!this.widgetStore.isLinePlotsAutoScaledX && isLinePlots) {
            const localXMin = clamp(this.widgetStore.sharedMinX, xMin, xMax);
            const localXMax = clamp(this.widgetStore.sharedMaxX, xMin, xMax);
            xMin = localXMin;
            xMax = localXMax;
        }

        yMin = Math.min(...yValues.filter(n => {
            return !isNaN(n);
        }));
        yMax = Math.max(...yValues.filter(n => {
            return !isNaN(n);
        }));

        if (yMin === Number.MAX_VALUE) {
            yMin = undefined;
            yMax = undefined;
        } else {
            // extend y range a bit
            const range = yMax - yMin;
            yMin -= range * VERTICAL_RANGE_PADDING;
            yMax += range * VERTICAL_RANGE_PADDING;
        }
        return {xMin, xMax, yMin, yMax};
    }

    private assembleLinePlotData(profile: Array<number>, channelInfo: ChannelInfo): { dataset: Array<Point2D>, border: Border } {
        if (profile && profile.length && profile.length === channelInfo.values.length) {
            let channelValues = this.widgetStore.useWcsValues ? channelInfo.values : channelInfo.indexes;
            let border = this.calculateXYborder(channelValues, profile, true);
            let values: Array<{ x: number, y: number }> = [];
            let isIncremental = channelValues[0] <= channelValues[channelValues.length - 1];
            for (let i = 0; i < channelValues.length; i++) {
                let index = isIncremental ? i : channelValues.length - 1 - i;
                const x = channelValues[index];
                const y = profile[index];

                if (x < border.xMin || x > border.xMax) {
                    if (values.length) {
                        break;
                    } else {
                        continue;
                    }
                }
                values.push({x, y});
            }
            return {dataset: values, border};
        }
        return null;
    }

    private assembleScatterPlotData(qProfile: Array<number>, uProfile: Array<number>, channelInfo: ChannelInfo): { dataset: Array<{ x: number, y: number, z: number }>, border: Border } {
        if (qProfile && qProfile.length && uProfile && uProfile.length && qProfile.length === uProfile.length && qProfile.length === channelInfo.values.length) {
            let channelValues = this.widgetStore.useWcsValues ? channelInfo.values : channelInfo.indexes;
            let border = this.calculateXYborder(qProfile, uProfile, false);
            let values: Array<{ x: number, y: number, z: number }> = [];
            let isIncremental = channelValues[0] <= channelValues[channelValues.length - 1] ? true : false;

            for (let i = 0; i < channelValues.length; i++) {
                // Todo: still need handel data outof range when zooming
                let index = isIncremental ? i : channelValues.length - 1 - i;
                const x = qProfile[index];
                const y = uProfile[index];
                const z = channelValues[index];
                values.push({x, y, z});
            }
            return {dataset: values, border};
        }
        return null;
    }

    private compareVariable(a: number, b: number, c: number, d: number): boolean {
        return a === b && a === c && a === d && a !== null;
    }

    private getScatterColor(currentIndex: number, range: number, toColor: number, frequencyIncreases: boolean): string {
        let percentage = currentIndex / range;
        if (!frequencyIncreases) {
            percentage = 1 - percentage;
        }
        let hue = (percentage * toColor);
        return `hsla(${hue}, 100%, 50%, ${this.opacityInit})`;
    }

    private frequencyIncreases(data: Point3D[]): boolean {
        const zFirst = data[0].z;
        const zLast = data[data.length - 1].z;
        if (zFirst > zLast) {
            return false;
        }
        return true;
    }

    private fillColor(data: Array<{ x: number, y: number, z?: number }>, interactionBorder: { xMin: number, xMax: number }, zIndex: boolean): Array<string> {
        let scatterColors = [];
        if (data && data.length && zIndex && interactionBorder) {
            let xlinePlotRange = interactionBorder;
            const outOfRangeColor = `hsla(0, 0%, 50%, ${this.opacityOutRange})`;
            const zOrder = this.frequencyIncreases(data);
            const dataLength = data.length;
            const colorRangeEnd = this.colorRangeEnd;
            data.forEach((point, i) => {
                let pointColor = this.pointDefaultColor;
                let outRange = true;
                if (point.z >= xlinePlotRange.xMin && point.z <= xlinePlotRange.xMax) {
                    outRange = false;
                }
                pointColor = outRange ? outOfRangeColor : this.getScatterColor(i, dataLength, colorRangeEnd, zOrder);
                scatterColors.push(pointColor);
            });
        }
        return scatterColors;
    }

    private closestChannel(channel: number, data: Array<{ x: number, y: number, z?: number }>): number {
        var mid;
        var lo = 0;
        var hi = data.length - 1;
        while (hi - lo > 1) {
            mid = Math.floor ((lo + hi) / 2);
            if (data[mid].z < channel) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        if (channel - data[lo].z <= data[hi].z - channel) {
            return data[lo].z;
        }
        return data[hi].z;
    }

    private getScatterChannel(data: Array<{ x: number, y: number, z?: number }>, channel: { channelCurrent: number, channelHovered: number }, zIndex: boolean): { currentChannel: Point3D, hoveredChannel: Point3D } {
        let indicator = { currentChannel: data[0], hoveredChannel: data[0]};
        if (data && data.length && zIndex && channel) {
            let channelCurrent = channel.channelCurrent;
            let channelHovered = channel.channelHovered;
            if (channelCurrent) {
                let close = channelCurrent;
                if (channelHovered) {
                    close = this.closestChannel(channelHovered, data);
                    if (this.channelBorder && this.channelBorder.xMin !== 0) {
                        if (close > this.channelBorder.xMax || close < this.channelBorder.xMin || !this.isMouseMoveIntoLinePlots) {
                            close = channelCurrent;
                        }
                    }
                }
                for (let index = 0; index < data.length; index++) {
                    const points = data[index];
                    if (points.z === close) {
                        indicator.hoveredChannel = points;
                    }
                    if (points.z === channelCurrent) {
                        indicator.currentChannel = points;
                    }
                }
            }
        }
        return indicator;
    }

    private onMouseEnterHandler = () => {
        this.isMouseMoveIntoLinePlots = true;
    };

    private onMouseleaveHandler = () => {
        this.isMouseMoveIntoLinePlots = false;
    };

    private onMouseEnterScatterHandler = () => {
        this.isMouseMoveIntoScatterPlots = true;
    };

    private onMouseleaveScatterHandler = () => {
        this.isMouseMoveIntoScatterPlots = false;
    };

    @computed get plotData(): {
        qValues: { dataset: Array<Point2D>, border: Border },
        uValues: { dataset: Array<Point2D>, border: Border },
        piValues: { dataset: Array<Point2D>, border: Border },
        paValues: { dataset: Array<Point2D>, border: Border },
        quValues: { dataset: Array<{ x: number, y: number, z: number }>, border: Border },
        qProgress: number,
        uProgress: number,
        iProgress: number
    } {
        const frame = this.props.appStore.activeFrame;
        if (!frame) {
            return null;
        }

        const fileId = frame.frameInfo.fileId;
        let compositeProfile: {
            qProfile: Array<number>,
            uProfile: Array<number>,
            piProfile: Array<number>,
            paProfile: Array<number>,
            qProgress: number,
            uProgress: number,
            iProgress: number
        };
        let regionId = this.widgetStore.regionIdMap.get(fileId) || 0;
        if (frame.regionSet) {
            const region = frame.regionSet.regions.find(r => r.regionId === regionId);
            if (region) {
                compositeProfile = this.calculateCompositeProfile(region.isClosedRegion ? this.widgetStore.statsType : CARTA.StatsType.Sum);
            }
        }

        let channelInfo = frame.channelInfo;
        if (compositeProfile && channelInfo) {
            let piDic = this.assembleLinePlotData(compositeProfile.piProfile, channelInfo);
            let paDic = this.assembleLinePlotData(compositeProfile.paProfile, channelInfo);
            let qDic = this.assembleLinePlotData(compositeProfile.qProfile, channelInfo);
            let uDic = this.assembleLinePlotData(compositeProfile.uProfile, channelInfo);
            let quDic = this.assembleScatterPlotData(compositeProfile.qProfile, compositeProfile.uProfile, channelInfo);

            return {
                qValues: qDic, 
                uValues: uDic, 
                piValues: piDic, 
                paValues: paDic, 
                quValues: quDic, 
                qProgress: compositeProfile.qProgress, 
                uProgress: compositeProfile.uProgress,
                iProgress: compositeProfile.iProgress
            };
        }
        return null;
    }

    private getCursorInfo (quDataset: Point3D[], piDataset: Point2D[], paDataset: Point2D[], scatterCursorProfiler: Point3D, lineCursorProfiler: number, scatterCursorImage: Point3D, lineCursorImage: number) {
        const isMouseEntered = this.isMouseMoveIntoLinePlots || this.isMouseMoveIntoScatterPlots;
        const xUnit =  this.getChannelUnit();
        let profilerData = {q: 0, u: 0, pi: 0, pa: 0, channel: 0};
        if (this.isMouseMoveIntoLinePlots) {
            const lineCursorPIDataProfiler = binarySearchByX(piDataset, lineCursorProfiler);
            const lineCursorPADataProfiler = binarySearchByX(paDataset, lineCursorProfiler);
            if (lineCursorPIDataProfiler && lineCursorPADataProfiler) {
                let cursor = this.matchXYindex(lineCursorPIDataProfiler.x, quDataset);
                profilerData.q = cursor.x;
                profilerData.u = cursor.y;
                profilerData.channel = cursor.z;
                profilerData.pi = lineCursorPIDataProfiler.y;
                profilerData.pa = lineCursorPADataProfiler.y;
            }   
        }
        if (this.isMouseMoveIntoScatterPlots) {
            const currentScatterData = closestPointToCursor(scatterCursorProfiler, quDataset);
            const lineCursorPIDataProfiler = binarySearchByX(piDataset, currentScatterData.z);
            const lineCursorPADataProfiler = binarySearchByX(paDataset, currentScatterData.z);
            if (lineCursorPIDataProfiler && lineCursorPADataProfiler) {
                profilerData.q = currentScatterData.x;
                profilerData.u = currentScatterData.y;
                profilerData.channel = lineCursorPIDataProfiler.x;
                profilerData.pi = lineCursorPIDataProfiler.y;
                profilerData.pa = lineCursorPADataProfiler.y;
            }
        }
        if (isMouseEntered) {
            return {
                isMouseEntered: isMouseEntered,
                quValue: { x: profilerData.q, y: profilerData.u },
                channel: profilerData.channel,
                pi: profilerData.pi,
                pa: profilerData.pa,
                xUnit: xUnit
            };   
        } else {
            const lineCursorPIDataImage = binarySearchByX(piDataset, lineCursorImage);
            const lineCursorPADataImage = binarySearchByX(paDataset, lineCursorImage);
            return {
                isMouseEntered: isMouseEntered,
                quValue: { x: scatterCursorImage.x, y: scatterCursorImage.y },
                channel: lineCursorImage,
                pi: lineCursorPIDataImage.y,
                pa: lineCursorPADataImage.y,
                xUnit: xUnit
            };
        }
    }
    
    render() {
        const appStore = this.props.appStore;
        if (!this.widgetStore) {
            return <NonIdealState icon={"error"} title={"Missing profile"} description={"Profile not found"}/>;
        }
        const frame = appStore.activeFrame;
        const imageName = (appStore.activeFrame ? appStore.activeFrame.frameInfo.fileInfo.name : undefined);

        let quLinePlotProps: LinePlotComponentProps = {
            xLabel: "Channel",
            yLabel: "Value",
            darkMode: appStore.darkTheme,
            imageName: imageName,
            plotName: "profile",
            tickTypeY: TickType.Scientific,
            showXAxisTicks: false,
            showXAxisLabel: false,
            multiPlotData: new Map(),
            showLegend: true,
            xTickMarkLength: 0,
            graphCursorMoved: this.onGraphCursorMoved,
            multiPlotBorderColor: new Map(),
            isGroupSubPlot: true,
            scrollZoom: true,
            graphZoomedX: this.widgetStore.setSharedXBounds,
            graphZoomedY: this.widgetStore.setQULinePlotYBounds,
            graphZoomedXY: this.widgetStore.setQULinePlotsXYBounds,
            graphZoomReset: this.widgetStore.clearLinePlotsXYBounds,
            graphClicked: this.onChannelChanged,
            markers: []
        };

        let piLinePlotProps: LinePlotComponentProps = {
            xLabel: "Channel",
            yLabel: "Value",
            darkMode: appStore.darkTheme,
            imageName: imageName,
            plotName: "profile",
            tickTypeY: TickType.Scientific,
            showXAxisTicks: false,
            showXAxisLabel: false,
            multiPlotData: new Map(),
            xTickMarkLength: 0,
            graphCursorMoved: this.onGraphCursorMoved,
            isGroupSubPlot: true,
            scrollZoom: true,
            graphZoomedX: this.widgetStore.setSharedXBounds,
            graphZoomedY: this.widgetStore.setPolIntensityYBounds,
            graphZoomedXY: this.widgetStore.setPolIntensityXYBounds,
            graphZoomReset: this.widgetStore.clearLinePlotsXYBounds,
            graphClicked: this.onChannelChanged,
            markers: []
        };

        let paLinePlotProps: LinePlotComponentProps = {
            xLabel: "Channel",
            yLabel: "Value",
            darkMode: appStore.darkTheme,
            imageName: imageName,
            plotName: "profile",
            tickTypeY: TickType.Integer,
            showXAxisTicks: true,
            showXAxisLabel: true,
            multiPlotData: new Map(),
            graphCursorMoved: this.onGraphCursorMoved,
            isGroupSubPlot: true,
            scrollZoom: true,
            graphZoomedX: this.widgetStore.setSharedXBounds,
            graphZoomedY: this.widgetStore.setPolAngleYBounds,
            graphZoomedXY: this.widgetStore.setPolAngleXYBounds,
            graphZoomReset: this.widgetStore.clearLinePlotsXYBounds,
            graphClicked: this.onChannelChanged,
            markers: []
        };

        let quScatterPlotProps: ScatterPlotComponentProps = {
            xLabel: "Channel",
            yLabel: "Channel",
            darkMode: appStore.darkTheme,
            imageName: imageName,
            plotName: "profile",
            tickTypeX: TickType.Scientific,
            tickTypeY: TickType.Scientific,
            showXAxisTicks: true,
            showXAxisLabel: true,
            usePointSymbols: true,
            multiPlotData: new Map(),
            zeroLineWidth: 2,
            multiPlotBorderColor: new Map(),
            isGroupSubPlot: true,
            colorRangeEnd: 240,
            centeredOrigin: true,
            equalScale: true,
            zIndex: true,
            pointRadius: this.pointRadius,
            graphCursorMoved: this.onScatterGraphCursorMoved,
            graphClicked: this.onScatterChannelChanged,
            graphZoomReset: this.widgetStore.clearScatterPlotXYBounds,
        };

        let className = "profile-container-" + StokesAnalysisComponent.calculateLayout(this.width, this.height);
        let interactionBorder = {xMin: 0, xMax: 0};
        if (this.profileStore && frame) {
            const currentPlotData = this.plotData;
            let channel = {channelCurrent: 0, channelHovered: 0};
            if (currentPlotData && currentPlotData.piValues && currentPlotData.paValues && currentPlotData.qValues && currentPlotData.uValues && currentPlotData.quValues) {
                quLinePlotProps.multiPlotData.set(StokesCoordinate.LinearPolarizationQ, currentPlotData.qValues.dataset);
                quLinePlotProps.multiPlotData.set(StokesCoordinate.LinearPolarizationU, currentPlotData.uValues.dataset);
                piLinePlotProps.data = currentPlotData.piValues.dataset;
                paLinePlotProps.data = currentPlotData.paValues.dataset;
                quScatterPlotProps.data = currentPlotData.quValues.dataset;
 
                const lineOpacity = this.minProgress < 1.0 ? 0.15 + this.minProgress / 4.0 : 1.0;
                quLinePlotProps.opacity = lineOpacity;
                piLinePlotProps.opacity = lineOpacity;
                paLinePlotProps.opacity = lineOpacity;
                quLinePlotProps.opacity = lineOpacity;
                
                const QlinePlotColor = appStore.darkTheme ? Colors.GREEN4 : Colors.GREEN2;
                const UlinePlotColor = appStore.darkTheme ? Colors.ORANGE4 : Colors.ORANGE2;
                quLinePlotProps.multiPlotBorderColor.set(StokesCoordinate.LinearPolarizationQ, QlinePlotColor);
                quLinePlotProps.multiPlotBorderColor.set(StokesCoordinate.LinearPolarizationU, UlinePlotColor);

                let qBorder = currentPlotData.qValues.border;
                let uBorder = currentPlotData.uValues.border;
                let piBorder = currentPlotData.piValues.border;
                let paBorder = currentPlotData.paValues.border;
                let quBorder = currentPlotData.quValues.border;

                if (this.compareVariable(qBorder.xMin, uBorder.xMin, piBorder.xMin, paBorder.xMin) && this.compareVariable(qBorder.xMax, uBorder.xMax, piBorder.xMax, paBorder.xMax)) {
                    interactionBorder = {xMin: paBorder.xMin, xMax: paBorder.xMax};
                    this.channelBorder = {xMin: paBorder.xMin, xMax: paBorder.xMax};
                    if (this.widgetStore.isLinePlotsAutoScaledX) {
                        quLinePlotProps.xMin = qBorder.xMin;
                        quLinePlotProps.xMax = qBorder.xMax;
                        piLinePlotProps.xMin = piBorder.xMin;
                        piLinePlotProps.xMax = piBorder.xMax;
                        paLinePlotProps.xMin = paBorder.xMin;
                        paLinePlotProps.xMax = paBorder.xMax;
                    } else {
                        quLinePlotProps.xMin = this.widgetStore.sharedMinX;
                        quLinePlotProps.xMax = this.widgetStore.sharedMaxX;
                        piLinePlotProps.xMin = this.widgetStore.sharedMinX;
                        piLinePlotProps.xMax = this.widgetStore.sharedMaxX;
                        paLinePlotProps.xMin = this.widgetStore.sharedMinX;
                        paLinePlotProps.xMax = this.widgetStore.sharedMaxX;
                        interactionBorder = {xMin: this.widgetStore.sharedMinX, xMax: this.widgetStore.sharedMaxX};
                    }
                    let dataBackgroundColor = this.fillColor(quScatterPlotProps.data, interactionBorder, true);
                    quScatterPlotProps.dataBackgroundColor = dataBackgroundColor;

                    if (this.widgetStore.isQULinePlotAutoScaledY) {
                        quLinePlotProps.yMin = qBorder.yMin < uBorder.yMin ? qBorder.yMin : uBorder.yMin;
                        quLinePlotProps.yMax = qBorder.yMax > uBorder.yMax ? qBorder.yMax : uBorder.yMax;
                    } else {
                        quLinePlotProps.yMin = this.widgetStore.quMinY;
                        quLinePlotProps.yMax = this.widgetStore.quMaxY;
                    }

                    if (this.widgetStore.isPolIntensityAutoScaledY) {
                        piLinePlotProps.yMin = piBorder.yMin;
                        piLinePlotProps.yMax = piBorder.yMax;
                    } else {
                        piLinePlotProps.yMin = this.widgetStore.polIntensityMinY;
                        piLinePlotProps.yMax = this.widgetStore.polIntensityMaxY;
                    }

                    if (this.widgetStore.isPolAngleAutoScaledY) {
                        paLinePlotProps.yMin = paBorder.yMin;
                        paLinePlotProps.yMax = paBorder.yMax;
                    } else {
                        paLinePlotProps.yMin = this.widgetStore.polAngleMinY;
                        paLinePlotProps.yMax = this.widgetStore.polAngleMaxY;
                    }

                }

                if (this.widgetStore.isQUScatterPlotAutoScaledX) {
                    quScatterPlotProps.xMin = quBorder.xMin;
                    quScatterPlotProps.xMax = quBorder.xMax;
                } else {
                    quScatterPlotProps.xMin = this.widgetStore.quScatterMinX;
                    quScatterPlotProps.xMax = this.widgetStore.quScatterMaxX;
                }
                if (this.widgetStore.isQUScatterPlotAutoScaledY) {
                    quScatterPlotProps.yMin = quBorder.yMin;
                    quScatterPlotProps.yMax = quBorder.yMax;
                } else {
                    quScatterPlotProps.yMin = this.widgetStore.quScatterMinY;
                    quScatterPlotProps.yMax = this.widgetStore.quScatterMaxY;
                }
                // cursor infor
                let cursorXInfo = {
                    profiler: this.widgetStore.linePlotcursorX,
                    image: this.getCurrentChannelValue(),
                    unit: this.getChannelUnit()
                };
                paLinePlotProps.cursorX = cursorXInfo;
                piLinePlotProps.cursorX = cursorXInfo;
                quLinePlotProps.cursorX = cursorXInfo;
                let scatterCursorInfor = {
                    profiler: { x: this.widgetStore.scatterPlotCursorX, y: this.widgetStore.scatterPlotCursorY},
                    image: this.matchXYindex(cursorXInfo.image, currentPlotData.quValues.dataset),
                    unit: this.getChannelUnit()
                };
                quScatterPlotProps.cursorXY = scatterCursorInfor;
                this.cursorInfo = this.getCursorInfo(
                    currentPlotData.quValues.dataset, 
                    currentPlotData.piValues.dataset, 
                    currentPlotData.paValues.dataset, 
                    scatterCursorInfor.profiler,
                    cursorXInfo.profiler,
                    scatterCursorInfor.image,
                    cursorXInfo.image);
                if (this.cursorInfo && this.cursorInfo.quValue) {
                    quScatterPlotProps.cursorNearestPoint = this.cursorInfo.quValue;
                }
                
            }

            paLinePlotProps.yLabel = "PA (Degrees)";
            if (this.widgetStore.fractionalPolVisible) {
                quLinePlotProps.yLabel = "Value (%)";
                piLinePlotProps.yLabel = "PI/I (%)";
                quScatterPlotProps.xLabel = "Q/I (%)";
                quScatterPlotProps.yLabel = "U/I (%)";
            } else {
                quLinePlotProps.yLabel = "Value (" + frame.unit + ")";
                piLinePlotProps.yLabel = "PI (" + frame.unit + ")";
                quScatterPlotProps.xLabel = "Stokes Q (" + frame.unit + ")";
                quScatterPlotProps.yLabel = "Stokes U (" + frame.unit + ")";
            }

            const wcsLabel = this.getChannelLabel();
            if (wcsLabel) {
                paLinePlotProps.xLabel = this.getChannelLabel();
                piLinePlotProps.xLabel = this.getChannelLabel();
                quLinePlotProps.xLabel = this.getChannelLabel();
            }

            paLinePlotProps.markers = [];
            piLinePlotProps.markers = [];
            quLinePlotProps.markers = [];

            if (this.cursorInfo && this.cursorInfo.channel && this.isMouseMoveIntoScatterPlots) {
                let lineCursorIndicator = {
                    value: this.cursorInfo.channel,
                    id: "marker-profiler-cursor-stokes2",
                    draggable: false,
                    horizontal: false,
                    color: appStore.darkTheme ? Colors.GRAY4 : Colors.GRAY2,
                    opacity: 0.8,
                    isMouseMove: !this.isMouseMoveIntoLinePlots,
                    interactionMarker: true,
                };
                paLinePlotProps.markers.push(lineCursorIndicator);
                piLinePlotProps.markers.push(lineCursorIndicator);
                quLinePlotProps.markers.push(lineCursorIndicator);
            }

            if (paLinePlotProps.cursorX && paLinePlotProps.cursorX.profiler !== null) {
                let cursor = {
                    value: paLinePlotProps.cursorX.profiler,
                    id: "marker-profiler-cursor-stokes",
                    draggable: false,
                    horizontal: false,
                    color: appStore.darkTheme ? Colors.GRAY4 : Colors.GRAY2,
                    opacity: 0.8,
                    isMouseMove: !this.isMouseMoveIntoLinePlots,
                };
                paLinePlotProps.markers.push(cursor);
                piLinePlotProps.markers.push(cursor);
                quLinePlotProps.markers.push(cursor);
                if (cursor && cursor.value && typeof(cursor.value) !== undefined) {
                    channel.channelHovered = cursor.value;   
                }
            }

            if (paLinePlotProps.cursorX && paLinePlotProps.cursorX.image !== null) {
                let channelCurrent = {
                    value: paLinePlotProps.cursorX.image,
                    id: "marker-channel-current",
                    opacity: 0.4,
                    draggable: false,
                    horizontal: false,
                };
                let channelRequired = {
                    value: this.getRequiredChannelValue(),
                    id: "marker-channel-required",
                    draggable: appStore.animatorStore.animationState !== AnimationState.PLAYING,
                    dragMove: this.onChannelChanged,
                    horizontal: false,
                };
                paLinePlotProps.markers.push(channelCurrent, channelRequired);
                piLinePlotProps.markers.push(channelCurrent, channelRequired);
                quLinePlotProps.markers.push(channelCurrent, channelRequired);

                if (channelCurrent && channelCurrent.value && typeof(channelCurrent.value) !== undefined) {
                    channel.channelCurrent = channelCurrent.value;
                }
            }

            if (quScatterPlotProps.data && quScatterPlotProps.data.length && interactionBorder) {
                const scatterChannel = this.getScatterChannel(quScatterPlotProps.data, channel, true);
                quScatterPlotProps.indicatorInteractionChannel = scatterChannel;
            }

            paLinePlotProps.comments = this.exportHeaders;
            piLinePlotProps.comments = this.exportHeaders;
            quLinePlotProps.comments = this.exportHeaders;
            quScatterPlotProps.comments = this.exportHeaders;

        }

        return (
            <div className={"stokes-widget"}>
                <div className={className}>
                    <div className="profile-plot-toolbar">
                        <StokesAnalysisToolbarComponent widgetStore={this.widgetStore} appStore={appStore}/>
                    </div>
                    <div className="profile-plot-qup" onMouseEnter={this.onMouseEnterHandler} onMouseLeave={this.onMouseleaveHandler}>
                        <div className="profile-plot-qu">
                            <LinePlotComponent {...quLinePlotProps}/>
                        </div>
                        <div className="profile-plot-pi">
                            <LinePlotComponent {...piLinePlotProps}/>
                        </div>
                        <div className="profile-plot-pa">
                            <LinePlotComponent {...paLinePlotProps}/>
                        </div>
                    </div>
                    <div className="profile-plot-qvsu" onMouseEnter={this.onMouseEnterScatterHandler} onMouseLeave={this.onMouseleaveScatterHandler}>
                        <ScatterPlotComponent {...quScatterPlotProps}/>
                    </div>
                    {this.cursorInfo &&
                    <StokesAnalysisProfilerInfoComponent
                        darkMode={appStore.darkTheme}
                        cursorInfo={this.cursorInfo}
                    />
                    }
                </div>
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} refreshMode={"throttle"} refreshRate={33}/>
            </div>
        );
    }
}
