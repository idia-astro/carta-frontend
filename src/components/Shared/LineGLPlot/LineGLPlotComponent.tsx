import * as React from "react";
import * as Plotly from "plotly.js";
import Plot from "react-plotly.js";
import {computed, makeObservable} from "mobx";
import {observer} from "mobx-react";
import {PlotType} from "components/Shared";
import {Colors} from "@blueprintjs/core";
import "./LineGLPlotComponent.scss";

enum TickType {
    Automatic,
    Scientific,
    Integer
}

class MultiPlotProps {
    data: { x: number, y: number }[];
    type: PlotType;
    borderColor?: string;
    borderWidth?: number;
    pointRadius?: number;
    order?: number;
    exportData?: Map<string, string>;
}

interface LineMarker {
    value: number;
    id: string;
    color?: string;
    opacity?: number;
    dash?: number[];
    label?: string;
    horizontal: boolean;
    width?: number;
    draggable?: boolean;
    dragCustomBoundary?: { xMin?: number, xMax?: number, yMin?: number, yMax?: number };
    dragMove?: (val: number) => void;
    isMouseMove?: boolean;
    interactionMarker?: boolean;
}

enum LinePlotSelectingMode {
    BOX,
    HORIZONTAL,
    VERTICAL
}

export class LineGLPlotComponentProps {
    width: number;
    height: number;
    data?: { x: number, y: number, z?: number }[];
    comments?: string[];
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
    logY?: boolean;
    lineColor?: string;
    opacity?: number;
    darkMode?: boolean;
    imageName?: string;
    plotName?: string;
    tickTypeX?: TickType;
    tickTypeY?: TickType;
    markers?: LineMarker[];
    showTopAxis?: boolean;
    topAxisTickFormatter?: (value: number, index: number, values: number[]) => string | number;
    graphClicked?: (x: number) => void;
    graphRightClicked?: (x: number) => void;
    graphZoomedX?: (xMin: number, xMax: number) => void;
    graphZoomedY?: (yMin: number, yMax: number) => void;
    graphZoomedXY?: (xMin: number, xMax: number, yMin: number, yMax: number) => void;
    graphZoomReset?: () => void;
    graphCursorMoved?: (x: number) => void;
    scrollZoom?: boolean;
    showXAxisTicks?: boolean;
    showXAxisLabel?: boolean;
    showYAxisTicks?: boolean;
    showYAxisLabel?: boolean;
    yZeroLineColor?: string;
    showLegend?: boolean;
    xTickMarkLength?: number;
    plotType?: PlotType;
    isGroupSubPlot?: boolean;
    zIndex?: boolean;
    pointRadius?: number;
    zeroLineWidth?: number;
    mouseEntered?: (value: boolean) => void;
    multiColorSingleLineColors?: Array<string>;
    multiColorMultiLinesColors?: Map<string, Array<string>>;
    lineWidth?: number;
    selectingMode?: LinePlotSelectingMode;
    setSelectedRange?: (min: number, max: number) => void;
    order?: number;
    multiPlotPropsMap?: Map<string, MultiPlotProps>;
    //
    fixedRangeY: boolean;
    fixedRangeX: boolean;
}

@observer
export class LineGLPlotComponent extends React.Component<LineGLPlotComponentProps> {
    constructor(props: LineGLPlotComponentProps) {
        super(props);
        makeObservable(this);
    }

    @computed get LineGLData() {
        let scatterDatasets: Plotly.Data[] = [];
        let trace1: Partial<Plotly.PlotData> = {};
        // let trace2: Partial<Plotly.PlotData> = {};
        let marker: Partial<Plotly.PlotMarker> = {
            color: this.props.lineColor,
            opacity: 1
        };

        let line: Partial<Plotly.ScatterLine> = {
            width: this.props.lineWidth * devicePixelRatio
        };
        trace1.type = "scattergl";
        trace1.mode = "lines";
        trace1.line = line;
        trace1.marker = marker;
        trace1.hoverinfo = "none";
        const dataSize = this.props.data.length;
        trace1.x = Array(dataSize);
        trace1.y = Array(dataSize);
        // let topAxisTick = [];
        for (let i = 0; i < dataSize; i++) {
            const point = this.props.data[i];
            trace1.x[i] = point.x;
            trace1.y[i] = point.y;
            // if (this.props.showTopAxis && this.props.topAxisTickFormatter) {
                // trace2 = trace1;
                // topAxisTick.push(this.props.topAxisTickFormatter(point.x, i, trace1.x as number[]))
            // }
        }
        this.updateDataByPlotType(this.props.plotType, trace1);
        scatterDatasets.push(trace1);
        return {data: scatterDatasets};
    }

    public render() {
        const props = this.props;
        const scale = 1 / devicePixelRatio;
        console.log(this.props)
        const fontFamily = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
        let themeColor = Colors.LIGHT_GRAY5;
        let lableColor = Colors.GRAY1;
        let gridColor = Colors.LIGHT_GRAY1;
        let markerColor = Colors.GRAY2;

        let layout: Partial<Plotly.Layout> = {
            width: props.width * devicePixelRatio, 
            height: props.height * devicePixelRatio,
            paper_bgcolor: themeColor, 
            plot_bgcolor: themeColor,
            hovermode: "closest" ,
            xaxis: {
                title: props.xLabel,
                fixedrange: this.props.fixedRangeX,
                // ticktext:[],
                // tickvals:[],
                titlefont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
                showticklabels: true,
                tickfont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
                tickcolor: gridColor,
                gridcolor: gridColor,
                zerolinecolor: gridColor,
                zerolinewidth: 2 * devicePixelRatio,
                // box boreder
                mirror: true,
                linecolor: gridColor,
                showline: true,
                // indicator 
                spikemode: "across",
                spikedash: "solid",
                spikecolor: markerColor,
                spikethickness: 1 * devicePixelRatio,
                // d3 format
                tickformat: LineGLPlotComponent.GetTickType(props.tickTypeX),
            },
            yaxis: {
                title: props.yLabel,
                fixedrange: this.props.fixedRangeY,
                titlefont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
                showticklabels: true,
                tickfont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
                tickcolor: gridColor,
                gridcolor: gridColor,
                zerolinecolor: gridColor,
                zerolinewidth: 2 * devicePixelRatio,
                mirror: true,
                linecolor: gridColor,
                showline: true,
                spikemode: "across",
                spikedash: "solid",
                spikecolor: markerColor,
                spikethickness: 1 * devicePixelRatio,
                tickformat: LineGLPlotComponent.GetTickType(props.tickTypeY),
            },
            margin: {
                t: 5 * devicePixelRatio,
                b: 40 * devicePixelRatio,
                l: 80 * devicePixelRatio,
                r: 10 * devicePixelRatio,
                pad: 0
            },
            showlegend: false,
            // dragmode: widgetStore.dragmode,
        };
        let data;
        if (this.props.data) {
            data = this.LineGLData.data;
            layout.xaxis.range = [props.xMin, props.xMax];
            layout.yaxis.range = [props.yMin, props.yMax];
        }

        const config: Partial<Plotly.Config> = {
            displaylogo: false,
            scrollZoom: true,
            showTips: false,
            doubleClick: false,
            showAxisDragHandles: true,
            modeBarButtonsToRemove: [
                "zoomIn2d",
                "zoomOut2d",
                "resetScale2d",
                "toggleSpikelines",
                "hoverClosestCartesian",
                "hoverCompareCartesian",
            ],
        };

        return (
            <div className="line-GL-plot">
                <Plot
                    data={data}
                    layout={layout}
                    config={config}
                    onDoubleClick={this.onDoubleClick}
                    onRelayout={this.onRelayout}
                    style={{transform: `scale(${scale})`, transformOrigin: "top left"}}
                />
            </div>
        )
    }

    private static GetTickType(tickType: TickType): string {
        switch (tickType) {
            case TickType.Scientific:
                return ".2e";
            case TickType.Integer:
                return "f";
            default:
                return "";
        }
    }

    private updateDataByPlotType(type: PlotType ,plotData: Partial<Plotly.PlotData>): Partial<Plotly.PlotData> {
        switch (type) {
            case PlotType.STEPS:
                plotData.mode = "lines+markers";
                plotData.line.shape = "hvh";
                return plotData;
            case PlotType.POINTS:
                plotData.mode = "markers";
                plotData.marker = {
                    size: this.props.pointRadius * devicePixelRatio
                }
                return plotData;
            default:
                return plotData;
        }
    }

    private onDoubleClick = () => {
        this.props.graphZoomReset();
    }

    private onRelayout = (event: Readonly<Plotly.PlotRelayoutEvent>) => {

        if (!this.props.fixedRangeX && this.props.graphZoomedX) {
            const xMin = event["xaxis.range[0]"];
            const xMax = event["xaxis.range[1]"];
            this.props.graphZoomedX(xMin, xMax);   
        } else {
            this.props.graphZoomedX(undefined, undefined);
        }  
        
        if (!this.props.fixedRangeY && this.props.graphZoomedY) {
            const yMin = event["yaxis.range[0]"];
            const yMax = event["yaxis.range[1]"];
            this.props.graphZoomedY(yMin, yMax)
        } else {
            this.props.graphZoomedY(undefined, undefined);
        }

        if (event.xaxis?.autorange || event.yaxis?.autorange) {
            this.props.graphZoomReset();
        }
    }
}