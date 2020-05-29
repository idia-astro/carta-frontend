import * as React from "react";
import {action, computed, observable} from "mobx";
import {observer} from "mobx-react";
import {Button, Divider, FormGroup, HTMLSelect, HTMLTable, Switch} from "@blueprintjs/core";
import {Cell, Column, Regions, RenderMode, SelectionModes, Table} from "@blueprintjs/table";
import ReactResizeDetector from "react-resize-detector";
import {TableComponent, TableComponentProps, TableType} from "components/Shared";
import {SafeNumericInput} from "components/Shared";
import {AppStore, HelpType, WidgetConfig, WidgetProps, WidgetsStore} from "stores";
import {RedshiftType, SPECTRAL_LINE_OPTION_DESCRIPTIONS, SpectralLineOptions, SpectralLineOverlayWidgetStore, SpectralLineQueryRangeType} from "stores/widgets";
import "./SpectralLineOverlayComponent.css";

enum HeaderTableColumnName {
    Name = "Name",
    Description = "Description",
    Display = "Display"
}

@observer
export class SpectralLineOverlayComponent extends React.Component<WidgetProps> {
    @observable width: number;
    @observable height: number;
    @observable widgetId: string;
    @observable headerTableColumnWidths: Array<number>;
    private headerTableRef: Table;

    public static get WIDGET_CONFIG(): WidgetConfig {
        return {
            id: "spectral-line-overlay",
            type: "spectral-line-overlay",
            minWidth: 320,
            minHeight: 400,
            defaultWidth: 600,
            defaultHeight: 600,
            title: "Spectral Line Overlay",
            isCloseable: true,
            helpType: HelpType.SPECTRAL_LINE_OVERLAY,
            componentId: "spectral-line-overlay-component"
        };
    }

    constructor(props: WidgetProps) {
        super(props);
        this.headerTableColumnWidths = [100, 300, 70];
    }

    @computed get widgetStore(): SpectralLineOverlayWidgetStore {
        const widgetsStore = WidgetsStore.Instance;
        if (widgetsStore.spectralLineOverlayWidgets) {
            const widgetStore = widgetsStore.spectralLineOverlayWidgets.get(this.props.id);
            if (widgetStore) {
                return widgetStore;
            }
        }
        console.log("can't find store for widget");
        return new SpectralLineOverlayWidgetStore();
    }

    @action onResize = (width: number, height: number) => {
        this.width = width;
        this.height = height;

        // fixed bug from blueprintjs, only display 4 rows.
        if (this.headerTableRef) {
            this.updateTableSize(this.headerTableRef, this.props.docked);
        }
    };

    @action setHeaderTableColumnWidts(vals: Array<number>) {
        this.headerTableColumnWidths = vals;
    }

    private renderDataColumn(columnName: string, coloumnData: any) {
        return (
            <Column
                key={columnName}
                name={columnName}
                cellRenderer={(rowIndex, columnIndex) => (
                    <Cell className="header-table-cell" key={`cell_${columnIndex}_${rowIndex}`} interactive={true}>{coloumnData[rowIndex]}</Cell>
            )}
            />
        );
    }

    private renderSwitchButtonCell(rowIndex: number, columnName: SpectralLineOptions) {
        const widgetStore = this.widgetStore;
        const display = widgetStore.optionsDisplay.get(columnName);
        return (
            <Cell className="header-table-cell" key={`cell_switch_${rowIndex}`}>
                <React.Fragment>
                    <Switch className="cell-switch-button" key={`cell_switch_button_${rowIndex}`} checked={display} onChange={() => widgetStore.setOptionsDisplay(columnName)}/>
                </React.Fragment>
            </Cell>
        );
    }

    private renderButtonColumns(columnName: HeaderTableColumnName, headerNames: SpectralLineOptions[]) {
        return <Column key={columnName} name={columnName} cellRenderer={rowIndex => this.renderSwitchButtonCell(rowIndex, headerNames[rowIndex])}/>;
    }

    onControlHeaderTableRef = (ref) => {
        this.headerTableRef = ref;
    }

    private createHeaderTable() {
        const tableColumns = [];
        const headerNames: SpectralLineOptions[] = [];
        const headerDescriptions = [];
        const headerDataset = SPECTRAL_LINE_OPTION_DESCRIPTIONS;
        const numResultsRows = headerDataset.length;
        for (let index = 0; index < headerDataset.length; index++) {
            const header = headerDataset[index];
            headerNames.push(header[0] as SpectralLineOptions);
            headerDescriptions.push(header[1]);
        }
        const columnName = this.renderDataColumn(HeaderTableColumnName.Name, headerNames);
        tableColumns.push(columnName);
        const columnDescription = this.renderDataColumn(HeaderTableColumnName.Description, headerDescriptions);
        tableColumns.push(columnDescription);
        const columnDisplaySwitch = this.renderButtonColumns(HeaderTableColumnName.Display, headerNames);
        tableColumns.push(columnDisplaySwitch);

        return (
            <Table
                ref={(ref) => this.onControlHeaderTableRef(ref)}
                numRows={numResultsRows}
                enableRowReordering={false}
                renderMode={RenderMode.BATCH}
                selectionModes={SelectionModes.NONE}
                defaultRowHeight={30}
                minRowHeight={20}
                minColumnWidth={30}
                enableGhostCells={true}
                numFrozenColumns={1}
                columnWidths={this.headerTableColumnWidths}
                onColumnWidthChanged={this.updateHeaderTableColumnSize}
                enableRowResizing={false}
            >
                {tableColumns}
            </Table>
        );
    }

    private updateHeaderTableColumnSize = (index: number, size: number) => {
        if (this.headerTableColumnWidths) {
            this.headerTableColumnWidths[index] = size;
        }
    }

    private setQueryResultTableColumnWidth = (width: number, columnName: string) => {
    }

    private updateTableSize(ref: any, docked: boolean) {
        const viewportRect = ref.locator.getViewportRect();
        ref.updateViewportRect(viewportRect);
        // fixed bug for blueprint table, first column overlap with row index
        // triger table update
        if (docked) {
            ref.scrollToRegion(Regions.column(0));
        }
    }

    private updateByInfiniteScroll = () => {
        const widgetStore = this.widgetStore;
    }

    private onQueryResultTableRefUpdated = (ref) => {
        this.widgetStore.setQueryResultTableRef(ref);
    }

    private onQueryResultTableDataSelected = (selectedDataIndex: number) => {
        const widgetsStore = this.widgetStore;
    }

    private handleQuery = () => {
        return;
    };

    private handlePlot = () => {
        return;
    };

    render() {
        const appStore = AppStore.Instance;
        const widgetStore = this.widgetStore;

        const inputByRange = (
            <React.Fragment>
                <FormGroup label="From" inline={true}>
                    <SafeNumericInput
                        value={widgetStore.redshiftSpeed}
                        buttonPosition="none"
                        onValueChange={val => widgetStore.setRedshiftSpeed(val)}
                    />
                </FormGroup>
                <FormGroup label="To" inline={true}>
                    <SafeNumericInput
                        value={widgetStore.redshiftSpeed}
                        buttonPosition="none"
                        onValueChange={val => widgetStore.setRedshiftSpeed(val)}
                    />
                </FormGroup>
            </React.Fragment>
        );

        const inputByCenter = (
            <React.Fragment>
                <FormGroup inline={true}>
                    <SafeNumericInput
                        value={widgetStore.redshiftSpeed}
                        buttonPosition="none"
                        onValueChange={val => widgetStore.setRedshiftSpeed(val)}
                    />
                </FormGroup>
                <FormGroup label="±" inline={true}>
                    <SafeNumericInput
                        value={widgetStore.redshiftSpeed}
                        buttonPosition="none"
                        onValueChange={val => widgetStore.setRedshiftSpeed(val)}
                    />
                </FormGroup>
            </React.Fragment>
        );

        const queryPanel = (
            <div className="query-panel">
                <FormGroup inline={true}>
                    <HTMLSelect options={[SpectralLineQueryRangeType.Range, SpectralLineQueryRangeType.Center]} value={widgetStore.queryRangeType} onChange={(ev) => widgetStore.setQueryRangeType(ev.currentTarget.value as SpectralLineQueryRangeType)}/>
                </FormGroup>
                <Divider/>
                {widgetStore.queryRangeType === SpectralLineQueryRangeType.Range ? inputByRange : inputByCenter}
                <FormGroup inline={true}>
                    <HTMLSelect options={["GHz", "MHz", "cm", "mm"]} value={"GHz"} onChange={() => {}}/>
                </FormGroup>
                <Divider/>
                <Button intent="success" small={true} onClick={this.handleQuery}>Query</Button>
            </div>
        );

        const redshiftPanel = (
            <div className="redshift-panel">
                <FormGroup inline={true}>
                    <HTMLSelect options={[RedshiftType.V, RedshiftType.Z]} value={widgetStore.redshiftType} onChange={(ev) => widgetStore.setRedshiftType(ev.currentTarget.value as RedshiftType)}/>
                </FormGroup>
                <FormGroup label="Redshift" labelInfo={widgetStore.redshiftType === RedshiftType.V ? "(km/s)" : ""} inline={true}>
                    <SafeNumericInput
                        value={widgetStore.redshiftSpeed}
                        buttonPosition="none"
                        onValueChange={val => widgetStore.setRedshiftSpeed(val)}
                    />
                </FormGroup>
            </div>
        );

        const queryResultTableProps: TableComponentProps = {
            type: TableType.ColumnFilter,
            dataset: widgetStore.queryResult,
            columnHeaders: widgetStore.displayedColumnHeaders,
            numVisibleRows: widgetStore.numVisibleRows,
            upTableRef: this.onQueryResultTableRefUpdated,
            updateByInfiniteScroll: this.updateByInfiniteScroll,
            updateTableColumnWidth: this.setQueryResultTableColumnWidth,
            updateSelectedRow: this.onQueryResultTableDataSelected
        };

        let className = "spectral-line-overlay-widget";
        if (appStore.darkTheme) {
            className += " dark-theme";
        }

        return (
            <div className={className}>
                {queryPanel}
                <div className="header-table">
                    {this.createHeaderTable()}
                </div>
                <Divider/>
                {redshiftPanel}
                <div className={"query-result-table"}>
                    <TableComponent {...queryResultTableProps}/>
                </div>
                <div className="spectral-line-plot">
                    <Button intent="success" onClick={this.handlePlot}>Plot</Button>
                </div>
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} refreshMode={"throttle"} refreshRate={33}/>
            </div>
        );
    }
}
