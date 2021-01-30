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

    draggableAnnotation?: boolean;
    onExportData:  () => void;
    onExportImage: () => void;
    onHover?: (x: number, y:number) => void;
    // mouseEntered?: (value: boolean) => void;

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

const TH = "M15 1H1c-.6 0-1 .5-1 1v12c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V2c0-.5-.4-1-1-1zM6 13H2v-2h4v2zm0-3H2V8h4v2zm0-3H2V5h4v2zm8 6H7v-2h7v2zm0-3H7V8h7v2zm0-3H7V5h7v2z";
const HAND = "M17 5c-.42 0-.79.27-.93.64L14.38 10h-.77l1.34-6.67c.03-.1.05-.21.05-.33a.998.998 0 00-1.98-.19h-.01L11.57 10H11V1c0-.55-.45-1-1-1S9 .45 9 1v9h-.2L6.97 2.76a.997.997 0 00-1.73-.41l-.03.03c-.01.02-.02.03-.03.04-.01.02-.01.03-.02.04v.01c-.01.01-.02.02-.02.03v.01c-.02.01-.02.02-.03.03 0 0 0 .01-.01.01 0 .01 0 .02-.01.03 0 0 0 .01-.01.01 0 .01-.01.02-.01.03 0 0 0 .01-.01.01 0 .01-.01.02-.01.03 0 .01 0 .01-.01.02 0 .01-.01.02-.01.03 0 .01 0 .01-.01.02 0 .01-.01.02-.01.03v.02c0 .01 0 .02-.01.03V3c0 .05 0 .09.01.14l1.45 10.25L6 12.7v.01L3.84 9.45h-.01A.98.98 0 003 9c-.55 0-1 .45-1 1 0 .2.06.39.17.55L6 18.44C7.06 19.4 8.46 20 10 20c3.31 0 6-2.69 6-6v-1.84l.01-.03v-.06l1.94-5.75A1.003 1.003 0 0017 5z";
//const FLOWREVIEW = "M5.175 7.004a3.003 3.003 0 012.83-2.001c1.305 0 2.416.835 2.83 2.001h1.985c-.896-.756-1.401-1.193-1.515-1.31a1.03 1.03 0 01-.292-.705c0-.538.453-.989.99-.989a.95.95 0 01.696.294c.117.124 1.12 1.13 3.008 3.016.176.176.293.41.293.684a.976.976 0 01-.283.695l-3.013 3.027a.995.995 0 01-1.691-.702c0-.273.116-.544.292-.72l1.515-1.292h-1.98a3.003 3.003 0 01-2.835 2.016A3.003 3.003 0 015.17 9.002H3.18l1.515 1.292c.176.176.292.447.292.72a.995.995 0 01-1.69.702L.282 8.69A.976.976 0 010 7.994c0-.273.117-.508.293-.684A535.858 535.858 0 003.3 4.294.95.95 0 013.997 4c.537 0 .99.45.99.989 0 .273-.12.528-.292.705-.114.117-.62.554-1.515 1.31h1.995z";
//const INDICATOR = "M32 6.438c0 3.563-2.875 6.5-6.438 6.5s-6.5-2.938-6.5-6.5C19.062 2.875 22 0 25.562 0S32 2.875 32 6.438zM11.563 8.875h5.75v-5.75h-5.75zM0 8.875h5.75v-5.75H0zM23.125 20.5h5.75v-5.813h-5.75zm0 11.5h5.75v-5.75h-5.75z";
const FLOPPY_DISK = "M15.71 2.29l-2-2A.997.997 0 0013 0h-1v6H4V0H1C.45 0 0 .45 0 1v14c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V3c0-.28-.11-.53-.29-.71zM14 15H2V9c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v6zM11 1H9v4h2V1z";
const SELECT = "M16 15c0-.28-.12-.52-.31-.69l.02-.02-3.12-3.12 3.41-.84-8.05-2.86c.03-.09.05-.17.05-.27V2c0-.55-.45-1-1-1H3c0-.55-.45-1-1-1S1 .45 1 1c-.55 0-1 .45-1 1s.45 1 1 1v4c0 .55.45 1 1 1h5.2c.1 0 .18-.02.27-.05L10.33 16l.85-3.41 3.12 3.12.02-.02c.16.19.4.31.68.31.04 0 .07-.02.1-.02s.06.02.1.02c.44 0 .8-.36.8-.8 0-.04-.02-.07-.02-.1s.02-.06.02-.1zM6 6H3V3h3v3z";

export class LineGLPlotComponent extends React.Component<LineGLPlotComponentProps> {
    public static marginTop: number = 5;
    public static marginBottom: number = 40;
    public static marginLeft: number = 70;
    public static marginRight: number = 10;
    private annotationActive: boolean = true;

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
        } else if (props.draggableAnnotation !== nextProps.draggableAnnotation) {
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
            paper_bgcolor: "rgba(0,0,0,0)", 
            plot_bgcolor: "rgba(0,0,0,0)",
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
            },
        };

        layout["modebar"] = {
            bgcolor: themeColor
        }

        if (this.props.shapes) {
            layout.shapes = this.props.shapes;
        }

        // if (this.props.logY) {
        //     layout.yaxis.type = "log";   
        // }

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
                let {logTickVals, logTickText} = this.tickValsLogY();
                // logTicks.unshift(0);
                layout.yaxis.tickvals = logTickVals;
                layout.yaxis.ticktext = logTickText;
                // layout.yaxis.tickmode = "array";
                // layout.yaxis.overlaying = "y";
                // console.log(logTickVals)
                // console.log(logTickText)
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
        const annotation: Plotly.ModeBarButton = {
            name: "annotation",
            title: "Enable draggable annotation",
            icon: {
                path: HAND,
                width: 20,
                height: 20
            },
            click: this.onDragActive,
            attr: "annotationlayer"
        };

        const select: Plotly.ModeBarButton = {
            name: "select",
            title: "Box zoom",
            icon: {
                path: SELECT,
                width: 16,
                height: 16
            },
            click: this.onDataIndicatorActive,
            attr: "select"
        };

        const exportData: Plotly.ModeBarButton = {
            name: "Export Data",
            title: "Export Data",
            icon: {
                path: TH,
                width: 16,
                height: 16
            },
            click: this.props.onExportData,
        };

        const exportImage: Plotly.ModeBarButton = {
            name: "Export Image",
            title: "Export Image",
            icon: {
                path: FLOPPY_DISK,
                width: 16,
                height: 16
            },
            click: this.props.onExportImage,
        };


        const config: Partial<Plotly.Config> = {
            displaylogo: false,
            scrollZoom: false,
            showTips: false,
            doubleClick: false,
            showAxisDragHandles: false,
            displayModeBar: true,
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
            ],
            modeBarButtonsToAdd: [exportImage, exportData]
        };
        
        if (this.props.draggableAnnotation) {
            const barSize = config.modeBarButtonsToAdd.length;
            config.modeBarButtonsToAdd[barSize] = annotation;
            config.modeBarButtonsToAdd[barSize + 1] = select;
        }

        return (
            <div 
                className={devicePixelRatio === 2? plotlyContainerScaleClass : plotlyContainerClass}
                onWheelCapture={this.onWheelCaptured}
            >
                <Plot
                    className={"line-container"}
                    data={data}
                    layout={layout}
                    onInitialized={this.onInitialized}
                    config={config}
                    onUpdate={this.onUpdate}
                    onRelayout={this.onRelayout}
                    onDoubleClick={this.onDoubleClick}
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

    private static updateLineData (
        traceType: Plotly.PlotType,
        plotType: PlotType, 
        pointRadius: number,
        lineColor: string | string[],
        lineWidth: number,
        showlegend: boolean = false,
        transformData: boolean,
        logY: boolean,
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
                if (logY && point.y !== 0) {
                    trace.y[i] = Math.log10(point.y);
                } else {
                    trace.y[i] = point.y; 
                }
            }   
        }

        return trace;
    }

    private onInitialized = (figure: Figure, graphDiv: Readonly<HTMLElement>) => {
        this.onDragActive(graphDiv);
    }



    private onDragActive = (gd: Readonly<HTMLElement>)=> {
        this.annotationActive = true;
        LineGLPlotComponent.updateBarStyle(
            gd, 
            "rgba(68, 68, 68, 0.3)", 
            "rgba(255, 255, 255, 0.3)", 
            "rgba(68, 68, 68, 0.7)", 
            "rgba(255, 255, 255, 0.7)",
            this.annotationActive,
            this.props.darkMode
        );
    }

    private onDataIndicatorActive = (gd: Readonly<HTMLElement>)=> {
        this.annotationActive = false;
        LineGLPlotComponent.updateBarStyle(
            gd, 
            "rgba(68, 68, 68, 0.7)", 
            "rgba(255, 255, 255, 0.7)", 
            "rgba(68, 68, 68, 0.3)", 
            "rgba(255, 255, 255, 0.3)",
            this.annotationActive,
            this.props.darkMode
        );
    }

    private static updateBarStyle = (
        gd: Readonly<HTMLElement>, 
        select: string, 
        selectDark: string, 
        annotation: string, 
        annotationDark: string, 
        annotationActive: boolean,
        darkMode: boolean
    ) => {
        if (annotationActive) {
            Plotly.d3.select(gd).style("z-index", 0);
        } else {
            Plotly.d3.select(gd).style("z-index", 1).style("position", "relative");
        }

        const selectPath = Plotly.d3.select(gd).select(".modebar-container").select("[data-attr=select]").select("path");
        if (darkMode) {
            selectPath.style("fill", selectDark);
        } else {
            selectPath.style("fill", select);
        }

        const annotationPath = Plotly.d3.select(gd)
                .select(".modebar-container")
                .select("[data-attr=annotationlayer]")
                .select("path");
        if (darkMode) {
            annotationPath.style("fill", annotationDark);
        } else {
            annotationPath.style("fill", annotation);
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

    private onUpdate = (figure: Figure, graphDiv: Readonly<HTMLElement>) => {
        this.props.updateChartMargin({
            top: figure.layout.margin.t / devicePixelRatio,
            bottom: figure.layout.margin.b / devicePixelRatio,
            left: figure.layout.margin.l / devicePixelRatio,
            right: figure.layout.margin.r / devicePixelRatio
        });
        this.props.plotRefUpdated(graphDiv);
        if (this.annotationActive) {
            this.onDragActive(graphDiv);
        } else {
            this.onDataIndicatorActive(graphDiv);
        }
    }

    private onRelayout = (event: Readonly<Plotly.PlotRelayoutEvent>) => {
        const xMin = event["xaxis.range[0]"];
        const xMax = event["xaxis.range[1]"];
        const yMin = event["yaxis.range[0]"];
        const yMax = event["yaxis.range[1]"];

        // console.log(event)

        if (xMin && xMax) {
            this.props.graphZoomedX(xMin, xMax);   
        } else {
            this.props.graphZoomedX(undefined, undefined);
        }  
        
        if (yMin && yMin) {
            if (this.props.logY) {
                this.props.graphZoomedY(Math.pow(10, yMin), Math.pow(10, yMax));
            } else {
                this.props.graphZoomedY(yMin, yMax);
            }
        } else {
            this.props.graphZoomedY(undefined, undefined);
        }
        if (event.xaxis?.autorange || event.yaxis?.autorange) {
            this.props.graphZoomReset();
        }
    }

    private onDoubleClick = () => {
        this.props.graphZoomReset();
    }

    private onHover = (event: Readonly<Plotly.PlotMouseEvent>) => {
        if (event["xvals"] && event["yvals"] && this.props.onHover) {
            this.props.onHover(event.points[0].x as number, event.points[0].y as number);   
        }
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
                    true,
                    this.props.logY,
                    this.props.data
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
                        true,
                        this.props.logY,
                        line.data,
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

    private tickValsLogY() {
        const nticks = Math.floor(this.props.height / 100);
        const logTickVals = D3.scaleLog().domain([this.props.yMin, this.props.yMax]).ticks(nticks);
        const f = D3.format(".2e");
        let logTickText = [];
        logTickVals.forEach(tick => {
            logTickText.push(f(tick));
        });
        // console.log(nticks)
        // console.log(logTickVals)
        // console.log(logTickText);
        return {logTickVals, logTickText};
    }
}