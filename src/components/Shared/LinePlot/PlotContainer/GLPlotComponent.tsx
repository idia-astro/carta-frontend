import * as React from "react";
import * as Plotly from "plotly.js";
import * as D3 from "d3";
import Plot from "react-plotly.js";
import {computed, makeObservable} from "mobx";
import {observer} from "mobx-react";
import {Figure} from "react-plotly.js";
import {PlotType} from "components/Shared";
import {Colors} from "@blueprintjs/core";
import "./GLPlotComponent.scss";

export enum TickType {
    Automatic,
    Scientific,
    Integer
}

export class MultiPlotProps {
    data: { x: number, y: number }[];
    type: PlotType;
    borderColor?: string;
    lineWidth?: number;
    pointRadius?: number;
    order?: number;
    exportData?: Map<string, string>;
}

export class LineGLPlotComponentProps {
    //
    width: number;
    height: number;
    darkMode?: boolean; 
    data?: { x: number, y: number, z?: number }[];
    multiPlotPropsMap?: Map<string, MultiPlotProps>;
    plotType?: PlotType;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    xLabel?: string;
    yLabel?: string;
    lineColor?: string;
    lineWidth?: number;
    tickTypeX?: TickType;
    tickTypeY?: TickType;
    // fixedRangeY: boolean;
    // fixedRangeX: boolean;
    graphZoomedX?: (xMin: number, xMax: number) => void;
    graphZoomedY?: (yMin: number, yMax: number) => void;
    graphZoomReset?: () => void;
    updateChartMargin: (chartMargin: {top: number, bottom: number, left: number, right: number}) => void
    shapes?: Partial<Plotly.Shape>[];

    showTopAxis?: boolean;
    topAxisTickFormatter?: (values: number[]) => string[];
    showXAxisTicks?: boolean;
    showYAxisTicks?: boolean;
    zeroLineWidth?: number;
    plotRefUpdated?: (plotRef: any) => void;

    //?
    logY?: boolean;
    // scatter
    opacity?: number;
    dataBackgroundColor?: Array<string>;
    pointRadius?: number;
    multiColorSingleLineColors?: Array<string>;
    multiColorMultiLinesColors?: Map<string, Array<string>>;
    
    showXAxisLabel: boolean;
    showYAxisLabel: boolean;

    // xZeroLineColor?: string;
    // yZeroLineColor?: string;
    // showLegend?: boolean;
    // xTickMarkLength?: number;
    // isGroupSubPlot?: boolean;
    // multiColorSingleLineColors?: Array<string>;
    // multiColorMultiLinesColors?: Map<string, Array<string>>;

    //?
    order?: number;
}

@observer
export class LineGLPlotComponent extends React.Component<LineGLPlotComponentProps> {
    public static marginTop: number = 5;
    public static marginBottom: number = 40;
    public static marginLeft: number = 70;
    public static marginRight: number = 10;

    constructor(props: LineGLPlotComponentProps) {
        super(props);
        makeObservable(this);
    }

    @computed get LineGLData() {
        let scatterDatasets: Plotly.Data[] = [];
        scatterDatasets.push(
                LineGLPlotComponent.updateLineData(
                this.props.plotType, 
                this.props.pointRadius * devicePixelRatio,
                this.props.lineColor,
                this.props.lineWidth * devicePixelRatio,
                this.props.data
            )
        );

        if (this.props.multiPlotPropsMap?.size) {
            this.props.multiPlotPropsMap.forEach((line) => {
                scatterDatasets.push(                
                    LineGLPlotComponent.updateLineData(
                        line.type, 
                        line.pointRadius * devicePixelRatio,
                        line.borderColor,
                        line.lineWidth * devicePixelRatio, 
                        line.data
                    )
                );
            });
        }

        return {data: scatterDatasets};
    }

    @computed get tickVals() {
        const nticks = Math.floor(this.props.width / 100);
        let ticks = D3.scale.linear().domain([this.props.xMin, this.props.xMax]).ticks(nticks);
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
            shapes: [],
            xaxis: {
                fixedrange: false,
                // tick
                showticklabels: this.props.showXAxisTicks,
                tickformat: LineGLPlotComponent.GetTickType(this.props.tickTypeX),
                tickangle: 0,
                titlefont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
                tickfont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
                tickcolor: gridColor,
                gridcolor: gridColor,
                zerolinecolor: gridColor,
                zerolinewidth: this.props.zeroLineWidth * devicePixelRatio,
                // box boreder
                mirror: true,
                linecolor: gridColor,
                showline: true,
                // indicator 
                showspikes: true,
                spikemode: "across",
                spikedash: "solid",
                spikecolor: markerColor,
                spikethickness: 1 * devicePixelRatio
            },
            yaxis: {
                fixedrange: false,
                showticklabels: this.props.showYAxisTicks,
                tickformat: LineGLPlotComponent.GetTickType(this.props.tickTypeY),
                tickangle: 0,
                titlefont: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                },
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
            },
            margin: {
                t: LineGLPlotComponent.marginTop * devicePixelRatio,
                b: LineGLPlotComponent.marginBottom * devicePixelRatio,
                l: this.props.showYAxisTicks === undefined ? LineGLPlotComponent.marginLeft * devicePixelRatio : 5,
                r: LineGLPlotComponent.marginRight * devicePixelRatio,
                pad: 0
            },
            showlegend: false
        };

        if (this.props.showXAxisLabel === true) {
            layout.xaxis.title = this.props.xLabel;
        }

        if (this.props.showYAxisLabel === true) {
            layout.yaxis.title = this.props.yLabel;
        }

        // if (this.props.showImageMarke && this.props.cursorXImage) {
        //     let cursorX: Partial<Plotly.Shape> = {
        //         type: "line",
        //         layer: "above",
        //         x0: this.props.cursorXImage,
        //         y0: this.props.yMin,
        //         x1: this.props.cursorXImage,
        //         y1: this.props.yMax,
        //         line: {
        //           color: this.props.darkMode ? Colors.RED4 : Colors.RED2,
        //           width: 1 * devicePixelRatio
        //         }
        //     };
        //     layout.shapes.push(cursorX);
        //     // layout.shapes[0]["editable"] = true;
        // }

        // if (this.props.meanRmsVisible && isFinite(this.props.yMean) && isFinite(this.props.yRms)) {
        //     let yRms: Partial<Plotly.Shape> = {
        //         type: "rect",
        //         x0: this.props.xMin,
        //         y0: clamp(this.props.yMean - this.props.yRms, this.props.yMin, this.props.yMax),
        //         x1: this.props.xMax,
        //         y1: clamp(this.props.yMean + this.props.yRms, this.props.yMin, this.props.yMax),
        //         fillcolor: this.props.darkMode ? Colors.GREEN4 : Colors.GREEN2,
        //         opacity: 0.2,
        //         line: {
        //             width: 0
        //         }
        //     };

        //     let yMean: Partial<Plotly.Shape> = {
        //         type: "line",
        //         x0: this.props.xMin,
        //         y0: this.props.yMean,
        //         x1: this.props.xMax,
        //         y1: this.props.yMean,
        //         line: {
        //           color: this.props.darkMode ? Colors.GREEN4 : Colors.GREEN2,
        //           width: 1 * devicePixelRatio,
        //           dash: "dash"
        //         }
        //     };
        //     layout.shapes.push(yRms, yMean);
        // }

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
                    tickangle: 0
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
            displayModeBar: false
        };

        return (
            <div 
                className={devicePixelRatio === 2? plotlyContainerScaleClass : plotlyContainerClass}
            >
                <Plot
                    className={"line-container"}
                    data={data}
                    layout={layout}
                    config={config}
                    onUpdate={this.onUpdate}
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

    private static updateLineData (
        plotType: PlotType, 
        pointRadius: number,
        lineColor: string,
        lineWidth: number,
        data: { x: number, y: number }[] | { x: number, y: number, z?: number }[]
    ): Partial<Plotly.PlotData> {
        let trace: Partial<Plotly.PlotData> = {};
        trace.type = "scattergl";
        trace.hoverinfo = "none";
        let marker: Partial<Plotly.PlotMarker> = {
            color: lineColor,
            opacity: 1
        };

        let line: Partial<Plotly.ScatterLine> = {
            width: lineWidth
        };
        trace.marker = marker;
        trace.line = line;

        switch (plotType) {
            case PlotType.STEPS:
                trace.mode = "lines+markers";
                trace.line.shape = "hvh";
                break;
            case PlotType.POINTS:
                trace.mode = "markers";
                trace.marker.size = pointRadius;
                break;
            default:
                trace.mode = "lines";
                break;
        }

        const dataSize = data.length;
        trace.x = Array(dataSize);
        trace.y = Array(dataSize);

        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            trace.x[i] = point.x;
            trace.y[i] = point.y; 
        }

        return trace;
    }

    private onUpdate = (figure: Figure, graphDiv: Readonly<HTMLElement>) => {
        this.props.updateChartMargin({
            top: figure.layout.margin.t / devicePixelRatio,
            bottom: figure.layout.margin.b / devicePixelRatio,
            left: figure.layout.margin.l / devicePixelRatio,
            right: figure.layout.margin.r / devicePixelRatio
        });
        this.props.plotRefUpdated(graphDiv);
    }
}