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
    showLegend?: boolean;
    // xTickMarkLength?: number;
    // isGroupSubPlot?: boolean;

    //?
    order?: number;
}

export class LineGLPlotComponent extends React.Component<LineGLPlotComponentProps> {
    public static marginTop: number = 5;
    public static marginBottom: number = 40;
    public static marginLeft: number = 70;
    public static marginRight: number = 10;

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
        } 
        // else if (props.xZeroLineColor !== nextProps.xZeroLineColor) {
        //     return true;
        // } else if (props.yZeroLineColor !== nextProps.yZeroLineColor) {
        //     return true;
        // } 
        else if (props.showLegend !== nextProps.showLegend) {
            return true;
        } 
        // else if (props.xTickMarkLength !== nextProps.xTickMarkLength) {
        //     return true;
        // } 
        else if (props.plotType !== nextProps.plotType) {
            return true;
        } else if (props.dataBackgroundColor !== nextProps.dataBackgroundColor) {
            return true;
        } 
        // else if (props.isGroupSubPlot !== nextProps.isGroupSubPlot) {
        //     return true;
        // } 
        else if (props.pointRadius !== nextProps.pointRadius) {
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

        // Skip any other changes
        return false;
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
                b: !this.props.showXAxisLabel ? 8 : LineGLPlotComponent.marginBottom * devicePixelRatio,
                l: this.props.showYAxisTicks === undefined ? LineGLPlotComponent.marginLeft * devicePixelRatio : 5,
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
            }
        };

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
            layout.yaxis.range = [this.props.yMin, this.props.yMax];

            if(this.props.showTopAxis && this.props.topAxisTickFormatter) {
                plotlyContainerScaleClass = "line-gl-plot-scale-top-axis";
                plotlyContainerClass = "line-gl-plot-top-axis";
                let trace2: Partial<Plotly.PlotData> = {};
                let {ticks, topAxisTick} = this.tickVals();
                layout.xaxis.tickvals = ticks;
                layout.xaxis.ticktext = ticks.join().split(',');

                trace2.type = "scattergl";
                trace2.mode = "lines";
                trace2.hoverinfo = "none";
                trace2.xaxis = "x2";
                trace2.opacity = 0;
                trace2.x = data[0].x;
                trace2.y = data[0].y;
                trace2.showlegend = false;

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
        traceType: Plotly.PlotType,
        plotType: PlotType, 
        pointRadius: number,
        lineColor: string | string[],
        lineWidth: number,
        showlegend: boolean = false,
        transformData: boolean,
        data?: { x: number, y: number }[] | { x: number, y: number, z?: number }[],
        traceName?: string
    ): Partial<Plotly.PlotData> {
        let trace: Partial<Plotly.PlotData> = {};
        trace.type = traceType;
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
        trace.showlegend = showlegend;
        if(showlegend) {
            trace.name = traceName;
        }

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

        if (transformData && data?.length) {
            const dataSize = data.length;
            trace.x = Array(dataSize);
            trace.y = Array(dataSize);
            for (let i = 0; i < data.length; i++) {
                const point = data[i];
                trace.x[i] = point.x;
                trace.y[i] = point.y; 
            }   
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

    private LineGL() {
        let scatterDatasets: Plotly.Data[] = [];
        let color: string | string[] = this.props.lineColor;
        if (this.props.plotType === PlotType.POINTS && this.props.multiColorSingleLineColors?.length) {
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
                    true,
                    this.props.data
                )   
            );   
        }
        
        if (this.props.multiPlotPropsMap?.size) {
            this.props.multiPlotPropsMap.forEach((line, key) => {
                let color: string | string[] = line.borderColor;
                if (this.props.plotType === PlotType.POINTS && this.props.multiColorMultiLinesColors?.size) {
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
                        true,
                        line.data,
                        key
                    )
                );
            });
        }
        return {data: scatterDatasets};
    }

    private tickVals() {
        const nticks = Math.floor(this.props.width / 100);
        let ticks = D3.scale.linear().domain([this.props.xMin, this.props.xMax]).ticks(nticks);
        const topAxisTick = this.props.topAxisTickFormatter(ticks);
        return {ticks, topAxisTick}
    }
}