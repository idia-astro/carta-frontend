import * as React from "react";
import * as Plotly from "plotly.js";
import * as D3 from "d3";
import Plot from "react-plotly.js";
import {computed, makeObservable} from "mobx";
import {observer} from "mobx-react";
import {PlotType} from "components/Shared";
import {Colors} from "@blueprintjs/core";
import {StokesCoordinate} from "stores/widgets/StokesAnalysisWidgetStore";
import {clamp, toExponential} from "utilities";
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
    showImageMarke?: boolean;
    cursorXImage?: number; 
    meanRmsVisible?: boolean;
    yMean?: number;
    yRms?: number;
    onHover: (x: number, y:number) => void;
    mouseEntered?: (value: boolean) => void;
}

const th = "M15 1H1c-.6 0-1 .5-1 1v12c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V2c0-.5-.4-1-1-1zM6 13H2v-2h4v2zm0-3H2V8h4v2zm0-3H2V5h4v2zm8 6H7v-2h7v2zm0-3H7V8h7v2zm0-3H7V5h7v2z";

@observer
export class LineGLPlotComponent extends React.Component<LineGLPlotComponentProps> {
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

        if (this.props.multiPlotPropsMap.size) {
            this.props.multiPlotPropsMap.forEach((line) => {
                scatterDatasets.push(                
                    LineGLPlotComponent.updateLineData(
                        line.type, 
                        line.pointRadius * devicePixelRatio,
                        line.borderColor,
                        line.borderWidth * devicePixelRatio, 
                        line.data
                    )
                );
            });
        }

        return {data: scatterDatasets};
    }

    @computed get tickVals() {
        let ticks = D3.scale.linear().domain([this.props.xMin, this.props.xMax]).ticks();
        const topAxisTick = this.props.topAxisTickFormatter(ticks);
        return {ticks, topAxisTick}
    }

    public render() {
        const scale = 1 / devicePixelRatio;
        const plotName = this.props.plotName || "unknown";
        const imageName = this.props.imageName || "unknown";
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

        // if (this.props.markers) {
        //     this.props.markers[0].y0 = this.props.yMin;
        //     this.props.markers[0].y1 = this.props.yMax;
        //     layout.shapes = this.props.markers;
        //     layout.shapes[0]["editable"] = true;
        //     // layout.shapes[0]["drawdirection"] = "horizontal";
        //     // layout["newshape"]=this.props.markers;
        // }

        if (this.props.showImageMarke && this.props.cursorXImage) {
            let cursorX: Partial<Plotly.Shape> = {
                type: "line",
                layer: "above",
                x0: this.props.cursorXImage,
                y0: this.props.yMin,
                x1: this.props.cursorXImage,
                y1: this.props.yMax,
                line: {
                  color: this.props.darkMode ? Colors.RED4 : Colors.RED2,
                  width: 1 * devicePixelRatio
                }
            };
            layout.shapes.push(cursorX);
        }

        if (this.props.meanRmsVisible && isFinite(this.props.yMean) && isFinite(this.props.yRms)) {
            let yRms: Partial<Plotly.Shape> = {
                type: "rect",
                x0: this.props.xMin,
                y0: clamp(this.props.yMean - this.props.yRms, this.props.yMin, this.props.yMax),
                x1: this.props.xMax,
                y1: clamp(this.props.yMean + this.props.yRms, this.props.yMin, this.props.yMax),
                fillcolor: this.props.darkMode ? Colors.GREEN4 : Colors.GREEN2,
                opacity: 0.2,
                line: {
                    width: 0
                }
            };

            let yMean: Partial<Plotly.Shape> = {
                type: "line",
                x0: this.props.xMin,
                y0: this.props.yMean,
                x1: this.props.xMax,
                y1: this.props.yMean,
                line: {
                  color: this.props.darkMode ? Colors.GREEN4 : Colors.GREEN2,
                  width: 1 * devicePixelRatio,
                  dash: "dash"
                }
            };
            layout.shapes.push(yRms, yMean);
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

        const exportData: Plotly.ModeBarButton = {
            name: "Export Data",
            title: "Export Data",
            icon: {
                path: th,
                width: 16,
                height: 16
            },
            click: this.onExportData,
        };

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
            toImageButtonOptions: {
                filename: `${imageName}-${plotName.replace(" ", "-")}-${LineGLPlotComponent.GetTimestamp()}`,
                format: "png"
            },
            modeBarButtonsToAdd: [exportData]
            // editable: true,
            // edits: {
            //     shapePosition: true
            // }
        };

        return (
            <div 
                className={devicePixelRatio === 2? plotlyContainerScaleClass : plotlyContainerClass} 
                onWheelCapture={this.onWheelCaptured} 
                onMouseEnter={this.onMouseEnter} 
                onMouseLeave={this.onMouseLeave}
            >
                <Plot
                    data={data}
                    layout={layout}
                    config={config}
                    onRelayout={this.onRelayout}
                    // onRestyle={this.onClick}
                    // onUpdate={this.onUpdate}
                    onHover={this.onHover}
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

    private static GetTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    }

    // private onClick = (event) => {
    //     console.log(event)
    // }

    // private onUpdate = (figure: Readonly<Figure>, graphDiv: Readonly<HTMLElement>) => {
    //     console.log(figure);
    //     figure.layout.shapes[0].y0 = this.props.yMin;
    //     figure.layout.shapes[0].y1 = this.props.yMax;
    //     console.log(Plotly.update(graphDiv, {},figure.layout, 0));
    // }

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

    private onMouseEnter = () => {
        if (this.props.mouseEntered) {
            this.props.mouseEntered(true);
        }
    };

    private onMouseLeave = () => {
        if (this.props.mouseEntered) {
            this.props.mouseEntered(false);
        }
    };

    private onHover = (event: Readonly<Plotly.PlotMouseEvent>) => {
        console.log(event)
        if (event["xvals"] && event["yvals"]) {
            this.props.onHover(event.points[0].x as number, event.points[0].y as number);   
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

    private onExportData = () => {
        const plotName = this.props.plotName || "unknown";
        const imageName = this.props.imageName || "unknown";

        let comment = `# ${imageName} ${plotName}`;
        if (this.props.xLabel) {
            comment += `\n# xLabel: ${this.props.xLabel}`;
        }
        if (this.props.yLabel) {
            comment += `\n# yLabel: ${this.props.yLabel}`;
        }

        // add comments from properties
        if (this.props.comments && this.props.comments.length) {
            comment += "\n" + this.props.comments.map(c => "# " + c).join("\n");
        }

        const header = "# x\ty";

        let rows = [];
        if (plotName === "histogram") {
            rows = this.props.data.map(o => `${toExponential(o.x, 10)}\t${toExponential(o.y, 10)}`);
        } else {
            if (this.props.data && this.props.data.length) {
                if (this.props.tickTypeX === TickType.Scientific) {
                    rows = this.props.data.map(o => `${toExponential(o.x, 10)}\t${toExponential(o.y, 10)}`);
                } else {
                    rows = this.props.data.map(o => `${o.x}\t${toExponential(o.y, 10)}`);
                }
            }

            if (this.props.multiPlotPropsMap && this.props.multiPlotPropsMap.size) {
                this.props.multiPlotPropsMap.forEach((props, key) => {
                    if (key === StokesCoordinate.LinearPolarizationQ || key === StokesCoordinate.LinearPolarizationU) {
                        rows.push(`# ${key}\t`);
                    } else if (key.indexOf("smoothed") > -1) {
                        if (props.exportData) {
                            props.exportData.forEach((content, title) => {
                                rows.push(`# ${title}: ${content}\t`);
                            });
                        }
                        rows.push(`# smoothed_x\tsmoothed_y`);
                    }

                    if (props.data) {
                        props.data.forEach(o => {
                            rows.push(`${o.x}\t${toExponential(o.y, 10)}`);
                        });
                    }
                });
            }
        }

        const tsvData = `data:text/tab-separated-values;charset=utf-8,${comment}\n${header}\n${rows.join("\n")}\n`;

        const dataURL = encodeURI(tsvData).replace(/#/g, "%23");

        const a = document.createElement("a") as HTMLAnchorElement;
        a.href = dataURL;
        a.download = `${imageName}-${plotName.replace(" ", "-")}-${LineGLPlotComponent.GetTimestamp()}.tsv`;
        a.dispatchEvent(new MouseEvent("click"));
    }
}