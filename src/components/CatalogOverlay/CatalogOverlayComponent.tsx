import * as React from "react";
import * as _ from "lodash";
import {autorun, computed, observable, keys} from "mobx";
import {observer} from "mobx-react";
import {Switch, HTMLSelect, AnchorButton, Intent, Tooltip} from "@blueprintjs/core";
import {Cell, Column, Table, SelectionModes, RenderMode} from "@blueprintjs/table";
import ReactResizeDetector from "react-resize-detector";
import {CARTA} from "carta-protobuf";
import {TableComponent, TableComponentProps, TableType} from "components/Shared";
import {CatalogOverlayFilterComponent} from "./CatalogOverlayFilterComponent/CatalogOverlayFilterComponent";
import {CatalogOverlayPlotSettingsComponent} from "./CatalogOverlayPlotSettingsComponent/CatalogOverlayPlotSettingsComponent";
import {WidgetConfig, WidgetProps} from "stores";
import {CatalogOverlayWidgetStore, CatalogOverlay} from "stores/widgets";
import {toFixed} from "utilities";
import "./CatalogOverlayComponent.css";

enum HeaderTableColumnName {
    Name = "Name",
    Display = "Display",
    RepresentAs = "Represent As",
    Description = "Description"
}

enum ComparisonOperator {
   EqualTo = "==", 
   NotEqualTo = "!=",
   LessThan = "<", 
   GreaterThan = ">",
   LessThanOrEqualTo = "<=",
   GreaterThanOrEqualTo = ">=",
   BetweenAnd = "...",
   FromTo = ".."
}

@observer
export class CatalogOverlayComponent extends React.Component<WidgetProps> {
    private catalogdataTableRef: Table;
    private controlHeaderTableRef: Table;
    // private defaultcolumnWidth: number = 100;
    private static readonly DataTypeRepresentationMap = new Map<CARTA.EntryType, Array<CatalogOverlay>>([
        [CARTA.EntryType.BOOL, [CatalogOverlay.NULL]],
        [CARTA.EntryType.DOUBLE, [CatalogOverlay.X, CatalogOverlay.Y, CatalogOverlay.PlotSize, CatalogOverlay.NULL]],
        [CARTA.EntryType.FLOAT, [CatalogOverlay.X, CatalogOverlay.Y, CatalogOverlay.PlotSize, CatalogOverlay.NULL]],
        [CARTA.EntryType.INT, [CatalogOverlay.X, CatalogOverlay.Y, CatalogOverlay.PlotSize, CatalogOverlay.NULL]],
        [CARTA.EntryType.LONGLONG, [CatalogOverlay.X, CatalogOverlay.Y, CatalogOverlay.PlotSize, CatalogOverlay.NULL]],
        [CARTA.EntryType.STRING, [CatalogOverlay.PlotShape, CatalogOverlay.NULL]],
        [CARTA.EntryType.UNKNOWN_TYPE, [CatalogOverlay.NULL]]
    ]);

    public static get WIDGET_CONFIG(): WidgetConfig {
        return {
            id: "catalog-overlay",
            type: "catalog-overlay",
            minWidth: 320,
            minHeight: 400,
            defaultWidth: 600,
            defaultHeight: 350,
            title: "Catalog Overlay",
            isCloseable: true
        };
    }

    @observable width: number;
    @observable height: number;

    @computed get widgetStore(): CatalogOverlayWidgetStore {
        const widgetStore = this.props.appStore.widgetsStore.catalogOverlayWidgets.get(this.props.id); 
        return widgetStore;
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
        autorun(() => {
            if (this.widgetStore) {
                let progressString = "";
                const fileName = this.widgetStore.catalogInfo.fileInfo.name || "";
                const appStore = this.props.appStore;
                const frame = appStore.activeFrame;
                const progress = this.widgetStore.progress;
                if (progress && isFinite(progress) && progress < 1) {
                    progressString = `[${toFixed(progress * 100)}% complete]`;
                }
                if (frame) {
                    const regionId = this.widgetStore.regionIdMap.get(frame.frameInfo.fileId) || 0;
                    const regionString = regionId === 0 ? "Cursor" : `Region #${regionId}`;
                    const selectedString = this.matchesSelectedRegion ? "(Selected)" : "";
                    this.props.appStore.widgetsStore.setWidgetTitle(this.props.id, `Catalog ${fileName} : ${regionString} ${selectedString} ${progressString}`);
                }
            } else {
                this.props.appStore.widgetsStore.setWidgetTitle(this.props.id, `Catalog : Cursor`);
            }
        });
    }

    onCatalogdataTableRefUpdated = (ref) => {
        this.catalogdataTableRef = ref;
    }

    onControlHeaderTableRef = (ref) => {
        this.controlHeaderTableRef = ref;
    }

    onResize = (width: number, height: number) => {
        this.width = width;
        this.height = height;
        const widgetStore = this.widgetStore;
        // retrun column width according context length
        if (widgetStore && this.controlHeaderTableRef) {
            const columnWidths = this.columnWidts(this.controlHeaderTableRef, 4, 100, 2);
            widgetStore.setHeaderTableColumnWidts(columnWidths); 
        }
        if (widgetStore && this.catalogdataTableRef) {
            const numOfDisplayedColumn = widgetStore.numOfDisplayedColumn;
            const columnWidths = this.columnWidts(this.catalogdataTableRef, numOfDisplayedColumn);
            widgetStore.setDataTableColumnWidts(columnWidths); 
        }
    };

    private handleHeaderDisplayChange(changeEvent: any, columnName: string) {
        const val = changeEvent.target.checked;
        this.widgetStore.setHeaderDisplay(val, columnName);
        const numOfDisplayedColumn = this.widgetStore.numOfDisplayedColumn;
        const columnWidths = this.columnWidts(this.catalogdataTableRef, numOfDisplayedColumn);
        this.widgetStore.setDataTableColumnWidts(columnWidths);
    }

    private handleHeaderRepresentationChange(changeEvent: any, columnName: string) {
        const val = changeEvent.currentTarget.value;
        this.widgetStore.setHeaderRepresentation(val, columnName);
    }

    private renderDataColumn(columnName: string, coloumnData: any) {
        return (
            <Column 
                key={columnName} 
                name={columnName} 
                cellRenderer={(rowIndex, columnIndex) => (
                    <Cell key={`cell_${columnIndex}_${rowIndex}`} interactive={true}>{coloumnData[rowIndex]}</Cell>
            )}
            />
        );
    }

    private renderSwitchButtonCell(rowIndex: number, columnName: string) {
        const display = this.widgetStore.catalogControlHeader.get(columnName).display;
        return (
            <Cell key={`cell_switch_${rowIndex}`}>
                <React.Fragment>
                    <Switch className="display-switch" key={`cell_switch_button_${rowIndex}`} checked={display} onChange={changeEvent => this.handleHeaderDisplayChange(changeEvent, columnName)}/>
                </React.Fragment>
            </Cell>
        );
    }

    private renderDropDownMenuCell(rowIndex: number, columnName: string) {
        const widgetStore = this.widgetStore;
        const controlHeader = widgetStore.catalogControlHeader.get(columnName);
        const dataType = widgetStore.catalogHeader[controlHeader.dataIndex].dataType;
        const supportedRepresentations = CatalogOverlayComponent.DataTypeRepresentationMap.get(dataType);
        return (
            <Cell key={`cell_drop_down_${rowIndex}`}>
                <React.Fragment>
                    <HTMLSelect className="bp3-minimal bp3-fill " value={controlHeader.representAs} onChange={changeEvent => this.handleHeaderRepresentationChange(changeEvent, columnName)}>
                        {supportedRepresentations.map( representation => <option key={representation} value={representation}>{representation}</option>)}
                    </HTMLSelect>
                </React.Fragment>
            </Cell>
        );
    }

    private renderButtonColumns(columnName: HeaderTableColumnName, headerNames: Array<string>) {
        switch (columnName) {
            case HeaderTableColumnName.Display:
                return <Column  key={columnName} name={columnName} cellRenderer={rowIndex => this.renderSwitchButtonCell(rowIndex, headerNames[rowIndex])}/>;
            case HeaderTableColumnName.RepresentAs:
                return <Column  key={columnName} name={columnName} cellRenderer={rowIndex => this.renderDropDownMenuCell(rowIndex, headerNames[rowIndex])}/>;
            default:
                return <Column  key={columnName} name={columnName}/>;
        }
    }

    private createHeaderTable() {
        const tableColumns = [];
        const headerNames = [];
        const headerDescriptions = [];
        const headerDataset = this.widgetStore.catalogHeader;
        const numResultsRows = headerDataset.length;
        for (let index = 0; index < headerDataset.length; index++) {
            const header = headerDataset[index];
            headerNames.push(header.name);
            headerDescriptions.push(header.description);
        }
        const columnName = this.renderDataColumn(HeaderTableColumnName.Name, headerNames);
        tableColumns.push(columnName);
        const columnDisplaySwitch = this.renderButtonColumns(HeaderTableColumnName.Display, headerNames);
        tableColumns.push(columnDisplaySwitch);
        const columnRepresentation = this.renderButtonColumns(HeaderTableColumnName.RepresentAs, headerNames);
        tableColumns.push(columnRepresentation);
        const columnDescription = this.renderDataColumn(HeaderTableColumnName.Description, headerDescriptions);
        tableColumns.push(columnDescription);

        return (
            <Table 
                ref={(ref) => this.onControlHeaderTableRef(ref)}
                numRows={numResultsRows} 
                enableRowReordering={false}
                renderMode={RenderMode.NONE} 
                selectionModes={SelectionModes.NONE} 
                defaultRowHeight={35}
                minRowHeight={20}
                minColumnWidth={30}
                enableGhostCells={true}
                numFrozenColumns={1}
                columnWidths={this.widgetStore.headerTableColumnWidts}
            >
                {tableColumns}
            </Table>
        );
    }

    private columnWidts = (ref, numColumns: number, fixedWidth?: number, fixedIndex?: number) => {
        const viewportRect = ref.locator.getViewportRect();
        const tableRect = ref.locator.getTableRect();
        ref.updateViewportRect(viewportRect); 
        const tableWidth = tableRect.width;
        const minColumnWidth = 100;

        let cumulativeColumnWidths = [];
        if (ref) { 
            let totalMinSizeReq = 0;
            for (let index = 0; index < numColumns; index++) {
                let columnWidth = 0;
                if (fixedWidth && fixedIndex === index) {
                    columnWidth = fixedWidth;
                } else {
                    columnWidth = ref.locator.getWidestVisibleCellInColumn(index);
                    // ref.locator.getColumnCellSelector(index) return nodelist [], bugs from blueprint table
                    if (columnWidth === 0 ) {
                        columnWidth = minColumnWidth;
                    }
                }
                totalMinSizeReq += columnWidth;
                cumulativeColumnWidths.push(columnWidth);
            }

            if (totalMinSizeReq > tableWidth) {
                return cumulativeColumnWidths;
            } else {
                let diff = ((tableWidth - totalMinSizeReq) / numColumns);
                return cumulativeColumnWidths.map(columnWidt => columnWidt + diff);
            }
        } else {
            const defaultWidth = tableWidth / numColumns;
            for (let index = 0; index < numColumns; index++) {
                cumulativeColumnWidths.push(defaultWidth);
            }
            return cumulativeColumnWidths;
        }
    }

    private getUserFilters(): CARTA.FilterConfig[] {
        let userFilters: CARTA.FilterConfig[] = [];
        const filters = this.widgetStore.catalogControlHeader;
        filters.forEach((value, key) => {
            if (value.filter !== undefined) {
                let filter = new CARTA.FilterConfig();
                const dataType = this.widgetStore.catalogHeader[value.dataIndex].dataType;
                filter.columnName = key;
                if (dataType === CARTA.EntryType.STRING) {
                    filter.subString = value.filter;
                    filter.comparisonOperator = null;
                    filter.max = null;
                    filter.min = null;
                    userFilters.push(filter);
                } else {
                    const result = this.getComparisonOperatorAndValue(value.filter);
                    if (result.operator !== -1 && result.values.length > 0) {
                        filter.comparisonOperator = result.operator;
                        switch (result.values.length) {
                            case 2:
                                filter.min = Math.min(result.values[0], result.values[1]);
                                filter.max = Math.max(result.values[0], result.values[1]);
                                break;
                            default:
                                filter.min = result.values[0];
                                filter.max = result.values[0];
                                break;
                        }
                        userFilters.push(filter);
                    } 
                }
            }
            
        });
        return userFilters;
    }

    private getComparisonOperatorAndValue(filterString: string): {operator: number, values: number[]} {
        for (let operator in ComparisonOperator) {
            const filter = filterString.replace(/\s/g, "");
            if (filter.includes(ComparisonOperator[operator])) {
                let result = {operator: -1, values: []};
                switch (ComparisonOperator[operator]) {
                    case ComparisonOperator.EqualTo:
                        const equalTo = filter.replace(/[^0-9.+-\.]+/g, "");
                        result.operator = CARTA.ComparisonOperator.EqualTo;
                        result.values.push(Number(equalTo));
                        return result;
                    case ComparisonOperator.NotEqualTo:
                        const notEqualTo = filter.replace(/[^0-9.+-\.]+/g, "");
                        result.operator = CARTA.ComparisonOperator.NotEqualTo;
                        result.values.push(Number(notEqualTo));
                        return result;
                    case ComparisonOperator.LessThan:
                        const lessThan = filter.replace(/[^0-9.+-\.]+/g, "");
                        result.operator = CARTA.ComparisonOperator.LessThan;
                        result.values.push(Number(lessThan));
                        return result;
                    case ComparisonOperator.GreaterThan:
                        const greaterThan = filter.replace(/[^0-9.+-\.]+/g, "");
                        result.operator = CARTA.ComparisonOperator.GreaterThan;
                        result.values.push(Number(greaterThan));
                        return result;
                    case ComparisonOperator.LessThanOrEqualTo:
                        const lessThanOrEqualTo = filter.replace(/[^0-9.+-\.]+/g, "");
                        result.values.push(Number(lessThanOrEqualTo));
                        result.operator = CARTA.ComparisonOperator.LessThanOrEqualTo;
                        return result;
                    case ComparisonOperator.GreaterThanOrEqualTo:
                        const greaterThanOrEqualTo = filter.replace(/[^0-9.+-\.]+/g, "");
                        result.values.push(Number(greaterThanOrEqualTo));
                        result.operator = CARTA.ComparisonOperator.GreaterThanOrEqualTo;
                        return result;
                    case ComparisonOperator.BetweenAnd:
                        const betweenAnd = filter.split(ComparisonOperator.BetweenAnd, 2);
                        result.values.push(Number(betweenAnd[0]));
                        result.values.push(Number(betweenAnd[1]));
                        result.operator = CARTA.ComparisonOperator.BetweenAnd;
                        return result;
                    case ComparisonOperator.FromTo:
                        const fromTo = filter.split(ComparisonOperator.FromTo, 2);
                        result.values.push(Number(fromTo[0]));
                        result.values.push(Number(fromTo[1]));
                        result.operator = CARTA.ComparisonOperator.FromTo;
                        return result;                                                                                
                    default:
                        return result;
                }
            }
        }
        return {operator: -1, values: []};
    }

    private handleFilterClick = () => {
        let catalogFilter: CARTA.CatalogFilterRequest = new CARTA.CatalogFilterRequest();
        const widgetStore = this.widgetStore;
        const appStore = this.props.appStore;
        const frame = appStore.activeFrame;
        let regionId = 0;
        let imageBounds: CARTA.CatalogImageBounds = new CARTA.CatalogImageBounds();

        if (frame) {
            regionId = this.widgetStore.regionIdMap.get(frame.frameInfo.fileId) || 0;
            imageBounds.xColumnName = widgetStore.xColumn;
            imageBounds.yColumnName = widgetStore.yColumn;
            imageBounds.imageBounds = frame.requiredFrameView;
        }

        catalogFilter.fileId = widgetStore.catalogInfo.fileId;
        // bugs with backend?
        catalogFilter.filterConfigs = this.getUserFilters();
        // control in fronend
        catalogFilter.hidedHeaders = null;
        // return all data for test;
        catalogFilter.subsetDataSize = -1;
        // Todo user setting for start index
        catalogFilter.subsetStartIndex = 0;
        // bugs with backend?
        catalogFilter.imageBounds = imageBounds;
        // bugs with backend?
        catalogFilter.regionId = regionId;
        appStore.sendCatalogFilter(catalogFilter);
    };

    public render() {
        const appStore = this.props.appStore;
        const widgetStore = this.widgetStore;
        console.log(widgetStore);
        const dataTableProps: TableComponentProps = {
            type: TableType.ColumnFilter,
            dataset: widgetStore.catalogData,
            filter: widgetStore.catalogControlHeader,
            columnHeaders: widgetStore.displayedColumnHeaders,
            numVisibleRows: widgetStore.numVisibleRows,
            columnWidts: widgetStore.dataTableColumnWidts,
            updateRef: this.onCatalogdataTableRefUpdated,
            updateColumnFilter: widgetStore.setColumnFilter,
            setNumVisibleRows: widgetStore.setNumVisibleRows,
            // updateTable: this.updateTableData.bind(this),
            // updateSpeed: 5,
            tableSize: widgetStore.catalogSize,
            loadingCell: widgetStore.loadingData
        };

        return (
            <div className={"catalog-overlay"}>
                <div className={"catalog-overlay-filter-settings"}>
                    <CatalogOverlayFilterComponent widgetStore={this.widgetStore} appStore={appStore}/>
                    <CatalogOverlayPlotSettingsComponent widgetStore={this.widgetStore} appStore={appStore}/>
                </div>
                <div className={"catalog-overlay-column-header-container"}>
                    {this.createHeaderTable()}
                </div>
                <div className={"catalog-overlay-data-container"}>
                    <TableComponent {...dataTableProps}/>
                </div>
                <div className="bp3-dialog-footer">
                    <div className="bp3-dialog-footer-actions">
                        <Tooltip content={"Apply filter"}>
                        <AnchorButton
                            intent={Intent.PRIMARY}
                            text="Filter"
                            onClick={this.handleFilterClick}
                        />
                        </Tooltip>
                        <Tooltip content={"Clear filter"}>
                        <AnchorButton
                            intent={Intent.PRIMARY}
                            text="Clear"
                            onClick={widgetStore.reset}
                        />
                        </Tooltip>
                        <Tooltip content={"Load"}>
                        <AnchorButton
                            intent={Intent.PRIMARY}
                            text="Load"
                        />
                        </Tooltip>
                    </div>
                </div>
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} refreshMode={"throttle"} refreshRate={33}/>
            </div>
        );
    }

}