import * as React from "react";
import * as Plotly from "plotly.js";
import * as D3 from "d3";
import * as _ from "lodash";
import Plot from "react-plotly.js";
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
    data?: { x: number, y: number }[];
    type: PlotType;
    borderColor?: string;
    lineWidth?: number;
    pointRadius?: number;
    order?: number;
    exportData?: Map<string, string>;
}

export class LineGLPlotComponentProps {
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
    graphZoomedX?: (xMin: number, xMax: number) => void;
    graphZoomedY?: (yMin: number, yMax: number) => void;
    graphZoomReset?: () => void;
    updateChartMargin: (chartMargin: {top: number, bottom: number, left: number, right: number}) => void
    shapes?: Partial<Plotly.Shape>[];
    showTopAxis?: boolean;
    topAxisTickFormatter?: (values: number[]) => string[];
    zeroLineWidth?: number;
    plotRefUpdated?: (plotRef: any) => void;
    colorable?: boolean;
    logY?: boolean;
    showXAxisLabel: boolean;
    showYAxisLabel: boolean;
    showXAxisTicks: boolean;
    showYAxisTicks: boolean;
    showLegend?: boolean;
    // scatter
    opacity?: number;
    scatterPointColor?: Array<string>;
    pointRadius?: number;
    multiColorSingleLineColors?: Array<string>;
    multiColorMultiLinesColors?: Map<string, Array<string>>;
    // isGroupSubPlot?: boolean;
    isDialog?: boolean;
}

export class LineGLPlotComponent extends React.Component<LineGLPlotComponentProps> {
    public static marginTop: number = 5;
    public static marginBottom: number = 40;
    public static marginLeft: number = 70;
    public static marginRight: number = 10;
    private graphRef: Readonly<HTMLElement>;
    private chartMargin: { top: number, bottom: number, left: number, right: number };

    shouldComponentUpdate(nextProps: LineGLPlotComponentProps) {
        const props = this.props;
        // Basic prop check
        if (props.width !== nextProps.width) {
            return true;
        } else if (props.height !== nextProps.height) {
            return true;
        } else if (props.lineColor !== nextProps.lineColor) {
            return true;
        } else if (props.opacity !== nextProps.opacity) {
            return true;
        } else if (props.tickTypeX !== nextProps.tickTypeX) {
            return true;
        } else if (props.tickTypeY !== nextProps.tickTypeY) {
            return true;
        } else if (props.darkMode !== nextProps.darkMode) {
            return true;
        } else if (props.logY !== nextProps.logY) {
            return true;
        } else if (props.xLabel !== nextProps.xLabel) {
            return true;
        } else if (props.xMin !== nextProps.xMin) {
            return true;
        } else if (props.xMax !== nextProps.xMax) {
            return true;
        } else if (props.yMin !== nextProps.yMin) {
            return true;
        } else if (props.yMax !== nextProps.yMax) {
            return true;
        } else if (props.yLabel !== nextProps.yLabel) {
            return true;
        } else if (props.showTopAxis !== nextProps.showTopAxis) {
            return true;
        } else if (props.topAxisTickFormatter !== nextProps.topAxisTickFormatter) {
            return true;
        } else if (props.showXAxisTicks !== nextProps.showXAxisTicks) {
            return true;
        } else if (props.showXAxisLabel !== nextProps.showXAxisLabel) {
            return true;
        } else if (props.showLegend !== nextProps.showLegend) {
            return true;
        } else if (props.plotType !== nextProps.plotType) {
            return true;
        } else if (props.scatterPointColor !== nextProps.scatterPointColor) {
            return true;
        } else if (props.colorable !== nextProps.colorable) {
            return true;
        } else if (props.pointRadius !== nextProps.pointRadius) {
            return true;
        } else if (props.zeroLineWidth !== nextProps.zeroLineWidth) {
            return true;
        } else if (props.lineWidth !== nextProps.lineWidth) {
            return true;
        }

        // Deep check of arrays (this should be optimised!)
        if (props.data?.length !== nextProps.data?.length) {
            return true;
        }

        // NaN !== NaN is true
        for (let i = 0; i < props.data?.length; i++) {
            if (!_.isEqual(props.data[i].x, nextProps.data[i].x) || !_.isEqual(props.data[i].y, nextProps.data[i].y)) {
                return true;
            }
        }

        if (props.multiColorSingleLineColors?.length !== nextProps.multiColorSingleLineColors?.length) {
            return true;
        }

        for (let i = 0; i < props.multiColorSingleLineColors?.length; i++) {
            if (props.multiColorSingleLineColors[i] !== nextProps.multiColorSingleLineColors[i]) {
                return true;
            }
        }

        // Deep check of maps
        if (!_.isEqual(props.multiPlotPropsMap, nextProps.multiPlotPropsMap)) {
            return true;
        }

        if (!_.isEqual(props.multiColorMultiLinesColors, nextProps.multiColorMultiLinesColors)) {
            return true;
        }

        if (!_.isEqual(props.shapes, nextProps.shapes)) {
            return true;
        }

        // Skip any other changes
        return false;
    }

    public render() {
        const scale = 1 / devicePixelRatio;
        const fontFamily = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
        let themeColor = this.props.isDialog ? Colors.LIGHT_GRAY4 : Colors.LIGHT_GRAY5;
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
        console.log(themeColor)

        let layout: Partial<Plotly.Layout> = {
            width: this.props.width * devicePixelRatio, 
            height: this.props.height * devicePixelRatio,
            paper_bgcolor: themeColor, 
            plot_bgcolor: themeColor,
            hovermode: "closest",
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
                b: !this.props.showXAxisLabel ? 8 : LineGLPlotComponent.marginBottom * devicePixelRatio,
                l: this.props.showYAxisTicks ? LineGLPlotComponent.marginLeft * devicePixelRatio : 5,
                r: LineGLPlotComponent.marginRight * devicePixelRatio,
                pad: 0
            }, 
            legend: {
                x: 0.3,
                y: 1,
                bgcolor: "rgba(0,0,0,0)",
                orientation: "h",
                font: {
                    family: fontFamily,
                    size: 12 * devicePixelRatio,
                    color: lableColor
                }
            },
        };

        if (this.props.shapes) {
            layout.shapes = this.props.shapes;
        }

        if (this.props.showXAxisLabel === true) {
            let titleX: string | Partial<Plotly.DataTitle> = {
                text: this.props.xLabel,
                standoff: 5
            };
            layout.xaxis.title = titleX;
        }

        if (this.props.showYAxisLabel === true) {
            let standoff = 5;
            if (this.props.tickTypeY === TickType.Integer) {
                standoff = 55;
            }
            let titleY: string | Partial<Plotly.DataTitle> = {
                text: this.props.yLabel,
                standoff: standoff
            };
            layout.yaxis.title = titleY;
        }

        let data: Plotly.Data[];
        if (this.props.data || this.props.multiPlotPropsMap?.size) {
            data = this.LineGL().data;
            layout.xaxis.range = [this.props.xMin, this.props.xMax];
            if (this.props.logY) {
                const yMin = Math.log10(this.props.yMin);
                const yMax = Math.log10(this.props.yMax);
                layout.yaxis.range = [
                   yMin, 
                   yMax
                ];
                let {logTickVals, logTickText} = this.tickValsLogY(yMin, yMax);
                layout.yaxis.tickvals = logTickVals;
                layout.yaxis.ticktext = logTickText;
            } else {
                layout.yaxis.range = [this.props.yMin, this.props.yMax];
            }

            if(this.props.showTopAxis && this.props.topAxisTickFormatter) {
                let trace: Partial<Plotly.PlotData> = {};
                let {ticks, topAxisTick} = this.tickValsX();
                layout.xaxis.tickvals = ticks;
                layout.xaxis.ticktext = ticks.join().split(',');

                trace.type = "scattergl";
                trace.mode = "lines";
                trace.hoverinfo = "none";
                trace.xaxis = "x2";
                trace.opacity = 0;
                trace.x = data[0].x;
                trace.y = data[0].y;
                trace.showlegend = false;

                let xaxis2: Partial<Plotly.LayoutAxis> = {
                    side: "top",
                    range: [this.props.xMin, this.props.xMax],
                    tickvals: ticks,
                    ticktext: topAxisTick,
                    tickfont: layout.xaxis.tickfont,
                    tickcolor: gridColor,
                    gridcolor: gridColor,
                    zerolinecolor: gridColor,
                    fixedrange: false,
                    overlaying: "x",
                    tickangle: 0
                }
                layout.xaxis2 = xaxis2;
                data.push(trace);
                layout.margin.t = 30 * devicePixelRatio;
            }
        }

        const config: Partial<Plotly.Config> = {
            displaylogo: false,
            scrollZoom: false,
            showTips: false,
            doubleClick: false,
            showAxisDragHandles: false,
            displayModeBar: false,
            modeBarButtonsToRemove: [
                "zoomIn2d",
                "zoomOut2d",
                "resetScale2d",
                "toggleSpikelines",
                "hoverClosestCartesian",
                "hoverCompareCartesian",
                "lasso2d",
                "select2d",
                "zoom2d",
                "pan2d",
                "autoScale2d",
                "toImage"
            ]
        };

        return (
            <div className={devicePixelRatio === 2? plotlyContainerScaleClass : plotlyContainerClass}>
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
                // If e < –6 or e ≥ p
                return ".6g";
        }
    }

    private static updateLineData (
        traceType: Plotly.PlotType,
        plotType: PlotType, 
        pointRadius: number,
        lineColor: string | string[],
        lineWidth: number,
        showlegend: boolean = false,
        colorable: boolean,
        opacity: number,
        data: { x: number, y: number }[] | { x: number, y: number, z?: number }[],
        logY: boolean,
        scatterPointColor?: Array<string>, 
        traceName?: string 
    ): Partial<Plotly.PlotData> {
        let trace: Partial<Plotly.PlotData> = {};
        trace.type = traceType;
        trace.hoverinfo = "none";
        let marker: Partial<Plotly.PlotMarker> = {
            color: lineColor,
            opacity: opacity
        };

        let line: Partial<Plotly.ScatterLine> = {
            width: lineWidth
        };
        trace.marker = marker;
        trace.line = line;
        trace.showlegend = showlegend;
        if(showlegend) {
            trace.name = traceName;
        }

        switch (plotType) {
            case PlotType.STEPS:
                trace.mode = "lines+markers";
                trace.line.shape = "hvh";
                trace.marker.opacity = 0;
                if (colorable) {
                    trace.marker.opacity = 1;
                    trace.marker.size = 10;
                }
                break;
            case PlotType.POINTS:
                trace.mode = "markers";
                trace.marker.size = pointRadius;
                if (scatterPointColor?.length) {
                    trace.marker.color = scatterPointColor;
                }
                break;
            default:
                trace.mode = "lines";
                break;
        }

        if (data.length) {
            const dataSize = data.length;
            trace.x = Array(dataSize);
            trace.y = Array(dataSize);
            for (let i = 0; i < data.length; i++) {
                const point = data[i];
                trace.x[i] = point.x;
                if (logY) {
                    if (point.y === 0) {
                        trace.y[i] = Math.log10(0.5);
                    } else {
                        trace.y[i] = Math.log10(point.y);
                    }
                } else {
                    trace.y[i] = point.y;
                }
            } 
        }
        return trace;
    }

    private onUpdate = (figure: Figure, graphDiv: Readonly<HTMLElement>) => {
        const margin = {
            top: figure.layout.margin.t / devicePixelRatio,
            bottom: figure.layout.margin.b / devicePixelRatio,
            left: figure.layout.margin.l / devicePixelRatio,
            right: figure.layout.margin.r / devicePixelRatio
        }

        if (!_.isEqual(margin, this.chartMargin)) {
            this.chartMargin = margin;
            this.props.updateChartMargin(margin);
        }
        this.graphRef = graphDiv;
        this.props.plotRefUpdated(graphDiv);

        // const gl = graphDiv.getElementsByTagName("canvas")[0];
        // gl.addEventListener("webglcontextlost", (event) => {
        //     event.preventDefault();
        //     // console.log("innnns", event, figure)
        //     const trace: Partial<Plotly.PlotData> = {
        //         type: "scatter"
        //     };

        //     figure.layout.xaxis.range = [this.props.xMin, this.props.xMax];
        //     figure.layout.yaxis.range = [this.props.yMin, this.props.yMax];
        //     Plotly.restyle(graphDiv, trace);
        // }, false);
        // console.log(figure, graphDiv)
    }

    private LineGL() {
        let scatterDatasets: Plotly.Data[] = [];
        let color: string | string[] = this.props.lineColor;
        if (this.props.multiColorSingleLineColors?.length) {
            color = this.props.multiColorSingleLineColors;
        }
        if (this.props.data?.length) {
            scatterDatasets.push(
                LineGLPlotComponent.updateLineData(
                    "scattergl",
                    this.props.plotType, 
                    this.props.pointRadius * devicePixelRatio,
                    color,
                    this.props.lineWidth * devicePixelRatio,
                    this.props.showLegend,
                    this.props.colorable,
                    this.props.opacity,
                    this.props.data,
                    this.props.logY,
                    this.props.scatterPointColor
                )   
            );   
        }
        
        if (this.props.multiPlotPropsMap?.size) {
            this.props.multiPlotPropsMap.forEach((line, key) => {
                let color: string | string[] = line.borderColor;
                if (this.props.multiColorMultiLinesColors?.size) {
                    color = this.props.multiColorMultiLinesColors.get(key);
                }
                scatterDatasets.push(                
                    LineGLPlotComponent.updateLineData(
                        "scattergl",
                        line.type, 
                        line.pointRadius * devicePixelRatio,
                        color,
                        line.lineWidth * devicePixelRatio,
                        this.props.showLegend,
                        this.props.colorable,
                        this.props.opacity,
                        line.data,
                        this.props.logY,
                        [],
                        key
                    )
                );
            });
        }
        return {data: scatterDatasets};
    }

    private tickValsX() {
        const nticks = Math.floor(this.props.width / 100);
        let ticks = D3.scaleLinear().domain([this.props.xMin, this.props.xMax]).ticks(nticks);
        const topAxisTick = this.props.topAxisTickFormatter(ticks);
        return {ticks, topAxisTick};
    }

    private tickValsLogY(yMin: number, yMax: number) {
        const min = yMin < 1 ? 1 : yMin;
        const nticks = Math.floor(this.props.height / 100);
        let logTickVals = D3.scaleLog().domain([min, yMax]).ticks(nticks);
        const f = D3.format(LineGLPlotComponent.GetTickType(this.props.tickTypeY));
        logTickVals.unshift(0);
        let logTickText = [];
        logTickVals.forEach(tick => {
            logTickText.push(f(Math.pow(10,tick)));
        });
        return {logTickVals, logTickText};
    }
}