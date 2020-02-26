import * as React from "react";
import {CSSProperties} from "react";
import {observable} from "mobx";
import {observer} from "mobx-react";
import {AnchorButton, NonIdealState, Tooltip} from "@blueprintjs/core";
import {Cell, Column, ColumnHeaderCell, RowHeaderCell, SelectionModes, Table} from "@blueprintjs/table";
import ReactResizeDetector from "react-resize-detector";
import {WidgetConfig, WidgetProps, HelpType} from "stores";
import "./LayerListComponent.css";

@observer
export class LayerListComponent extends React.Component<WidgetProps> {
    @observable width: number = 0;
    @observable height: number = 0;
    @observable columnWidths = [150, 70, 85, 80, 70];

    public static get WIDGET_CONFIG(): WidgetConfig {
        return {
            id: "layer-list",
            type: "layer-list",
            minWidth: 350,
            minHeight: 180,
            defaultWidth: 650,
            defaultHeight: 180,
            title: "Layer List",
            isCloseable: true,
            helpType: HelpType.LAYER_LIST
        };
    }

    private onColumnWidthsChange = (index: number, size: number) => {
        if (!Number.isInteger(index) || index < 0 || index >= this.columnWidths.length || size <= 0) {
            return;
        }
        this.columnWidths[index] = size;
        this.forceUpdate();
    };

    private onResize = (width: number, height: number) => {
        this.width = width;
        this.height = height;
    };

    private handleFileReordered = (oldIndex: number, newIndex: number, length: number) => {
        if (oldIndex === newIndex) {
            return;
        }
        this.props.appStore.reorderFrame(oldIndex, newIndex, length);
    };

    private rowHeaderCellRenderer = (rowIndex: number) => {
        return <RowHeaderCell name={rowIndex.toString()} className={rowIndex === this.props.appStore.activeFrameIndex ? "active-row-cell" : ""}/>;
    };

    private fileNameRenderer = (rowIndex: number) => {
        const appStore = this.props.appStore;
        if (rowIndex < 0 || rowIndex >= appStore.frames.length) {
            return <Cell/>;
        }

        const frame = appStore.frames[rowIndex];

        return <Cell className={rowIndex === appStore.activeFrameIndex ? "active-row-cell" : ""}>
            <div onDoubleClick={() => appStore.setActiveFrame(frame.frameInfo.fileId)}>
                {frame.frameInfo.fileInfo.name}
            </div>
        </Cell>;
    };

    private channelRenderer = (rowIndex: number) => {
        const appStore = this.props.appStore;
        if (rowIndex < 0 || rowIndex >= appStore.frames.length) {
            return <Cell/>;
        }
        return <Cell className={rowIndex === appStore.activeFrameIndex ? "active-row-cell" : ""}>{appStore.frames[rowIndex].requiredChannel}</Cell>;
    };

    private stokesRenderer = (rowIndex: number) => {
        const appStore = this.props.appStore;
        if (rowIndex < 0 || rowIndex >= appStore.frames.length) {
            return <Cell/>;
        }
        return <Cell className={rowIndex === appStore.activeFrameIndex ? "active-row-cell" : ""}>{appStore.frames[rowIndex].requiredStokes}</Cell>;
    };

    private typeRenderer = (rowIndex: number) => {
        const appStore = this.props.appStore;
        if (rowIndex < 0 || rowIndex >= appStore.frames.length) {
            return <Cell/>;
        }

        const frame = appStore.frames[rowIndex];

        return (
            <Cell className={rowIndex === appStore.activeFrameIndex ? "active-row-cell" : ""}>
                <React.Fragment>
                    <Tooltip content={<span>Raster image<br/><i><small>Click to {frame.renderConfig.visible ? "hide" : "show"}</small></i></span>}>
                        <AnchorButton minimal={true} small={true} intent={frame.renderConfig.visible ? "success" : "none"} onClick={frame.renderConfig.toggleVisibility}>R</AnchorButton>
                    </Tooltip>
                    {frame.contourConfig.enabled &&
                    <Tooltip content={<span>Contour image<br/><i><small>Click to {frame.contourConfig.visible ? "hide" : "show"}</small></i></span>}>
                        <AnchorButton minimal={true} small={true} intent={frame.contourConfig.visible ? "success" : "none"} onClick={frame.contourConfig.toggleVisibility}>C</AnchorButton>
                    </Tooltip>
                    }
                </React.Fragment>
            </Cell>
        );
    };

    private matchingRenderer = (rowIndex: number) => {
        const appStore = this.props.appStore;
        if (rowIndex < 0 || rowIndex >= appStore.frames.length) {
            return <Cell/>;
        }

        const frame = appStore.frames[rowIndex];

        let spatialMatchingButton: React.ReactNode;
        if (appStore.spatialReference) {
            let tooltipSubtitle: string;
            if (frame === appStore.spatialReference) {
                tooltipSubtitle = `${frame.frameInfo.fileInfo.name} is the current spatial reference`;
            } else {
                tooltipSubtitle = `Click to ${frame.spatialReference ? "disable" : "enable"} matching to ${appStore.spatialReference.frameInfo.fileInfo.name}`;
            }
            spatialMatchingButton = (
                <Tooltip content={<span>Spatial matching<br/><i><small>{tooltipSubtitle}</small></i></span>}>
                    <AnchorButton minimal={true} small={true} active={frame === appStore.spatialReference} intent={frame.spatialReference ? "primary" : "none"} onClick={() => appStore.toggleSpatialMatching(frame)}>XY</AnchorButton>
                </Tooltip>
            );
        }

        let spectralMatchingButton: React.ReactNode;
        if (frame.frameInfo.fileInfoExtended.depth > 1 && appStore.spectralReference) {
            let tooltipSubtitle: string;
            if (frame === appStore.spectralReference) {
                tooltipSubtitle = `${frame.frameInfo.fileInfo.name} is the current spectral reference`;
            } else {
                tooltipSubtitle = `Click to ${frame.spectralReference ? "disable" : "enable"} matching to ${appStore.spectralReference.frameInfo.fileInfo.name}`;
            }
            spectralMatchingButton = (
                <Tooltip content={<span>Spectral matching<br/><i><small>{tooltipSubtitle}</small></i></span>}>
                    <AnchorButton
                        className="spectral-matching-button"
                        minimal={true}
                        small={true}
                        active={frame === appStore.spectralReference}
                        intent={frame.spectralReference ? "primary" : "none"}
                        onClick={() => appStore.toggleSpectralMatching(frame)}
                    >
                        Z
                    </AnchorButton>
                </Tooltip>
            );
        }

        return (
            <Cell className={rowIndex === appStore.activeFrameIndex ? "active-row-cell" : ""}>
                <div className="matching-cell">
                    {spatialMatchingButton}
                    {spectralMatchingButton}
                </div>
            </Cell>
        );
    };

    private columnHeaderRenderer = (columnIndex: number) => {
        let name: string;
        switch (columnIndex) {
            case 0:
                name = "File name";
                break;
            case 1:
                name = "Type";
                break;
            case 2:
                name = "Matching";
                break;
            case 3:
                name = "Channel";
                break;
            case 4:
                name = "Stokes";
                break;
            default:
                break;
        }

        const columnHeaderStyleProps: CSSProperties = {
            fontSize: "12",
            fontWeight: "bold"
        };

        return <ColumnHeaderCell name={name} style={columnHeaderStyleProps}/>;
    };

    render() {
        const appStore = this.props.appStore;
        const frameNum = appStore.frameNum;

        if (frameNum <= 0) {
            return (
                <div className="layer-list-widget">
                    <NonIdealState icon={"folder-open"} title={"No file loaded"} description={"Load a file using the menu"}/>;
                    <ReactResizeDetector handleWidth handleHeight onResize={this.onResize}/>
                </div>
            );
        }

        // This is a necessary hack in order to trigger a re-rendering when values change, because the cell renderer is in its own function
        // There is probably a neater way to do this, though
        const frameChannels = appStore.frameChannels;
        const frameStokes = appStore.frameStokes;
        const activeFrameIndex = this.props.appStore.activeFrameIndex;
        const visibilityRaster = appStore.frames.map(f => f.renderConfig.visible);
        const visibilityContour = appStore.frames.map(f => f.contourConfig.visible && f.contourConfig.enabled);
        const matchingTypes = appStore.frames.map(f => f.spatialReference && f.spectralReference);

        return (
            <div className="layer-list-widget">
                {this.width > 0 &&
                <Table
                    numRows={frameNum}
                    rowHeaderCellRenderer={this.rowHeaderCellRenderer}
                    enableRowHeader={true}
                    enableRowReordering={true}
                    enableRowResizing={false}
                    selectionModes={SelectionModes.ROWS_ONLY}
                    enableMultipleSelection={true}
                    onRowsReordered={this.handleFileReordered}
                    columnWidths={this.columnWidths}
                    enableColumnResizing={true}
                    onColumnWidthChanged={this.onColumnWidthsChange}
                    onSelection={r => console.log(r)}
                >
                    <Column columnHeaderCellRenderer={this.columnHeaderRenderer} cellRenderer={this.fileNameRenderer}/>
                    <Column columnHeaderCellRenderer={this.columnHeaderRenderer} cellRenderer={this.typeRenderer}/>
                    <Column columnHeaderCellRenderer={this.columnHeaderRenderer} cellRenderer={this.matchingRenderer}/>
                    <Column columnHeaderCellRenderer={this.columnHeaderRenderer} cellRenderer={this.channelRenderer}/>
                    <Column columnHeaderCellRenderer={this.columnHeaderRenderer} cellRenderer={this.stokesRenderer}/>
                </Table>
                }
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize}/>
            </div>
        );
    }
}