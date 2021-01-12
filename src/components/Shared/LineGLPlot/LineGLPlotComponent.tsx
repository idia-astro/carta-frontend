import * as React from "react";
import * as Plotly from "plotly.js";
import Plot from "react-plotly.js";
import {computed, makeObservable} from "mobx";
import {observer} from "mobx-react";
import {PlotType} from "components/Shared";
import {Colors} from "@blueprintjs/core";
import * as D3 from "d3";
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
    comments?: string[];
    logY?: boolean;
    opacity?: number;
    imageName?: string;
    plotName?: string;
    // markers?: LineMarker[];

    graphClicked?: (x: number) => void;
    graphRightClicked?: (x: number) => void;
    graphZoomedXY?: (xMin: number, xMax: number, yMin: number, yMax: number) => void;
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
    width: number;
    height: number;
    darkMode?: boolean; 
    data?: { x: number, y: number, z?: number }[];
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
    lineColor?: string;
    tickTypeX: TickType;
    tickTypeY: TickType;
    fixedRangeY: boolean;
    fixedRangeX: boolean;
    graphZoomedX: (xMin: number, xMax: number) => void;
    graphZoomedY: (yMin: number, yMax: number) => void;
    graphZoomReset: () => void;
    markers?: Partial<Plotly.Shape>[];
    showTopAxis?: boolean;
    topAxisTickFormatter?: (values: number[]) => string[];
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
        }
        this.updateDataByPlotType(this.props.plotType, trace1);
        scatterDatasets.push(trace1);

        // let trace2: Partial<Plotly.PlotData> = {};
        // trace2.type = "scattergl";
        // trace2.mode = "lines";
        // trace2.hoverinfo = "none";
        // trace2.xaxis = "x2";
        // trace2.opacity = 1;
        // trace2.x = trace1.x;
        // trace2.y = trace1.y;
        // scatterDatasets.push(trace2);

        // scatterDatasets.push(trace1);

        return {data: scatterDatasets};
    }

    @computed get tickVals() {
        let ticks = D3.scale.linear().domain([this.props.xMin, this.props.xMax]).ticks();
        const topAxisTick = this.props.topAxisTickFormatter(ticks);
        return {ticks, topAxisTick}
    }

    public render() {
        const scale = 1 / devicePixelRatio;
        const fontFamily = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
        let themeColor = Colors.LIGHT_GRAY5;
        let lableColor = Colors.GRAY1;
        let gridColor = Colors.LIGHT_GRAY1;
        let markerColor = Colors.GRAY2;
        let plotlyContainerScaleClass = "line-gl-plot-scale";
        let plotlyContainerClass = "line-gl-plot";

        if (this.props.darkMode) {
            gridColor = Colors.DARK_GRAY5;
            lableColor = Colors.LIGHT_GRAY5;
            themeColor = Colors.DARK_GRAY3;
            markerColor = Colors.GRAY4;
        }



        let layout: Partial<Plotly.Layout> = {
            width: this.props.width * devicePixelRatio, 
            height: this.props.height * devicePixelRatio,
            paper_bgcolor: themeColor, 
            plot_bgcolor: themeColor,
            hovermode: "closest" ,
            xaxis: {
                title: this.props.xLabel,
                // true will disable x axis range selection
                fixedrange: false,
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
                showspikes: true,
                spikemode: "across",
                spikedash: "solid",
                spikecolor: markerColor,
                spikethickness: 1 * devicePixelRatio,
                // d3 format
                tickformat: LineGLPlotComponent.GetTickType(this.props.tickTypeX),
            },
            yaxis: {
                title: this.props.yLabel,
                fixedrange: false,
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
                showspikes: false,
                tickformat: LineGLPlotComponent.GetTickType(this.props.tickTypeY),
            },
            margin: {
                t: 5 * devicePixelRatio,
                b: 40 * devicePixelRatio,
                l: 80 * devicePixelRatio,
                r: 10 * devicePixelRatio,
                pad: 0
            },
            showlegend: false,
            // dragmode: "drawline",
        };

        if (this.props.markers) {
            layout.shapes = this.props.markers;
            layout.shapes[0]["editable"] = true;
            // layout.shapes[0]["drawdirection"] = "horizontal";
            // layout["newshape"]=this.props.markers;
        }

        let data: Plotly.Data[];
        if (this.props.data) {
            data = this.LineGLData.data;
            layout.xaxis.range = [this.props.xMin, this.props.xMax];
            layout.yaxis.range = [this.props.yMin, this.props.yMax];

            if(this.props.showTopAxis && this.props.topAxisTickFormatter) {
                plotlyContainerScaleClass = "line-gl-plot-scale-top-axis";
                plotlyContainerClass = "line-gl-plot-top-axis";
                let trace2: Partial<Plotly.PlotData> = {};
                let {ticks, topAxisTick} = this.tickVals;
                layout.xaxis.tickvals = ticks;
                layout.xaxis.ticktext = ticks.join().split(',');
                // layout.xaxis.tickmode = "array";

                trace2.type = "scattergl";
                trace2.mode = "lines";
                trace2.hoverinfo = "none";
                trace2.xaxis = "x2";
                trace2.opacity = 0;
                trace2.x = data[0].x;
                trace2.y = data[0].y;

                let xaxis2: Partial<Plotly.LayoutAxis> = {
                    side: "top",
                    range: [this.props.xMin, this.props.xMax],
                    tickvals: ticks,
                    ticktext: topAxisTick,
                    tickfont: layout.xaxis.tickfont,
                    tickcolor: gridColor,
                    gridcolor: gridColor,
                    fixedrange: false,
                    overlaying: "x",
                    automargin: true
                }
                layout.xaxis2 = xaxis2;
                data.push(trace2);
                layout.margin.t = 30 * devicePixelRatio;
            }
        }

        const config: Partial<Plotly.Config> = {
            displaylogo: false,
            scrollZoom: false,
            showTips: false,
            doubleClick: "autosize",
            showAxisDragHandles: false,
            modeBarButtonsToRemove: [
                "zoomIn2d",
                "zoomOut2d",
                "resetScale2d",
                "toggleSpikelines",
                "hoverClosestCartesian",
                "hoverCompareCartesian",
                "lasso2d",
                "select2d"
            ],
            // editable: true,
            // edits: {
            //     shapePosition: true
            // }
        };

        return (
            <div className={devicePixelRatio === 2? plotlyContainerScaleClass : plotlyContainerClass} onWheelCapture={this.onWheelCaptured}>
                <Plot
                    data={data}
                    layout={layout}
                    config={config}
                    onRelayout={this.onRelayout}
                    onRestyle={this.onClick}
                    // onUpdate={this.onUpdate}
                    // onHover={this.onHover}
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

    private onClick = (event) => {
        console.log(event)
    }

    // private onUpdate = (fig) => {
    //     console.log(fig)
    // }

    // private onHover = (event) => {
    //     console.log(event)
    // }

    private updateDataByPlotType(type: PlotType ,plotData: Partial<Plotly.PlotData>): Partial<Plotly.PlotData> {
        switch (type) {
            case PlotType.STEPS:
                plotData.mode = "lines+markers";
                plotData.line.shape = "hvh";
                return plotData;
            case PlotType.POINTS:
                plotData.mode = "markers";
                plotData.marker.size = this.props.pointRadius * devicePixelRatio;
                return plotData;
            default:
                return plotData;
        }
    }

    private onWheelCaptured = (event: React.WheelEvent<HTMLDivElement>) => {
        if (event && event.nativeEvent && event.nativeEvent.type === "wheel") {
            const wheelEvent = event.nativeEvent;
            const lineHeight = 15;
            const zoomSpeed = 0.001;
            if (wheelEvent.offsetX > (this.props.width - 10) * devicePixelRatio|| wheelEvent.offsetX < 80 * devicePixelRatio) {
                return;
            }
            const delta = wheelEvent.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? wheelEvent.deltaY : wheelEvent.deltaY * lineHeight;
            const currentRange = this.props.xMax - this.props.xMin;
            const fraction = (wheelEvent.offsetX - 80 * devicePixelRatio) / ((this.props.width - 90) * devicePixelRatio);
            const rangeChange = zoomSpeed * delta * currentRange;
            this.props.graphZoomedX(this.props.xMin - rangeChange * fraction, this.props.xMax + rangeChange * (1 - fraction));
        }
    };

    private onRelayout = (event: Readonly<Plotly.PlotRelayoutEvent>) => {
        console.log(event)
        if (!this.props.fixedRangeX) {
            const xMin = event["xaxis.range[0]"];
            const xMax = event["xaxis.range[1]"];
            this.props.graphZoomedX(xMin, xMax);   
        } else {
            this.props.graphZoomedX(undefined, undefined);
        }  
        
        if (!this.props.fixedRangeY) {
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