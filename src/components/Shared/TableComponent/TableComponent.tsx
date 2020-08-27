import * as React from "react";
import {observer} from "mobx-react";
import {Cell, Column, Table, SelectionModes, RenderMode, ColumnHeaderCell, IRegion} from "@blueprintjs/table";
import {Checkbox, Popover, PopoverInteractionKind, InputGroup, Icon, Label} from "@blueprintjs/core";
import {IconName} from "@blueprintjs/icons";
import {IRowIndices} from "@blueprintjs/table/lib/esm/common/grid";
import {CARTA} from "carta-protobuf";
import {ControlHeader} from "stores";
import {SpectralLineHeaders} from "stores/widgets";
import {ProcessedColumnData} from "models";
import "./TableComponent.css";

export type ColumnFilter = { index: number, columnFilter: string };

export enum TableType {
    Normal,
    ColumnFilter
}

export interface ManualSelectionProps {
    isSelectingAll: boolean;
    isSelectingIndeterminated: boolean;
    selectAllLines: () => void;
    selectSingleLine: (rowIndex: number) => void;
}

export class TableComponentProps {
    dataset: Map<number, ProcessedColumnData>;
    filter?: Map<string, ControlHeader>;
    columnHeaders: Array<CARTA.CatalogHeader>;
    numVisibleRows: number;
    columnWidths?: Array<number>;
    type: TableType;
    loadingCell?: boolean;
    selectedDataIndex?: number[];
    showSelectedData?: boolean;
    manualSelectionProps?: ManualSelectionProps;
    manualSelectionData?: boolean[];
    updateTableRef?: (ref: Table) => void;
    updateColumnFilter?: (value: string, columnName: string) => void;
    updateByInfiniteScroll?: (rowIndexEnd: number) => void;
    updateTableColumnWidth?: (width: number, columnName: string) => void;
    updateSelectedRow?: (dataIndex: number[]) => void;
    updateSortRequest?: (columnName: string, sortingType: CARTA.SortingType) => void;
    sortingInfo?: {columnName: string, sortingType: CARTA.SortingType};
    disable?: boolean; // disable sort, TODO: rename to disableSort
    darkTheme?: boolean;
}

const MANUAL_SELECTION_COLUMN_WIDTH = 50;
const DEFAULT_COLUMN_WIDTH = 150;

@observer
export class TableComponent extends React.Component<TableComponentProps> {
    private readonly SortingTypelinkedList = {
        head: {
            value: null,
            next: {
                value: CARTA.SortingType.Ascending,                                             
                next: {
                    value: CARTA.SortingType.Descending,
                    next: null
                }
            }
        }
    };

    private getfilterSyntax = (dataType: CARTA.ColumnType) => {
        switch (dataType) {
            case CARTA.ColumnType.String:
                return (
                    <div className={"column-filter-popover-content"}>
                        <small>Filter by substring</small><br/>
                        <small>e.g. gal (no quotation, entries contain the "gal" string)</small>
                    </div>
                );
            case CARTA.ColumnType.Bool:
                return (
                    <div className={"column-filter-popover-content"}>
                        <small>Filter by boolean value</small><br/>
                        <small>e.g. "True" or "T", "False" or "F", case insensitive</small>
                    </div>
                );
            case CARTA.ColumnType.Double:
            default:
                return (
                    <div className={"column-filter-popover-content"}>
                        <small>Operators: {">"}, {">="}, {"<"}, {"<="}, {"=="}, {"!="}, {".."}, {"..."}</small><br/>
                        <small>e.g. {"<"} 10 (everything less than 10) </small><br/>
                        <small>e.g. == 1.23 (entries equal to 1.23) </small><br/>
                        <small>e.g. 10..50 (everything between 10 and 50, exclusive)) </small><br/>
                        <small>e.g. 10...50 (everything between 10 and 50, inclusive) </small>
                    </div>
                );
        }
    }

    private renderLineSelectionrColumnHeaderCell = (columnIndex: number, columnHeader: CARTA.CatalogHeader) => {
        const controlheader = this.props.filter?.get(columnHeader.name);
        const filterSyntax = this.getfilterSyntax(columnHeader.dataType);
        return (
            <ColumnHeaderCell>
                <ColumnHeaderCell>
                    <React.Fragment>
                        <Checkbox
                            indeterminate={this.props.manualSelectionProps.isSelectingIndeterminated}
                            checked={this.props.manualSelectionProps.isSelectingAll}
                            inline={true}
                            onChange={this.props.manualSelectionProps.selectAllLines}
                        />
                    </React.Fragment>
                </ColumnHeaderCell>
                <ColumnHeaderCell isActive={controlheader?.filter !== ""}>
                    <Popover
                        hoverOpenDelay={250}
                        hoverCloseDelay={0}
                        className={"column-filter"}
                        popoverClassName={this.props.darkTheme ? "column-filter-popover-dark" : "column-filter-popover"}
                        content={filterSyntax}
                        interactionKind={PopoverInteractionKind.HOVER}
                    >
                        <InputGroup
                            key={"column-filter-" + columnIndex}
                            small={true}
                            placeholder="Click to filter"
                            value={controlheader?.filter ? controlheader.filter : ""}
                            onChange={ev => this.props.updateColumnFilter(ev.currentTarget.value, columnHeader.name)}
                        />
                    </Popover>
                </ColumnHeaderCell>
            </ColumnHeaderCell>
        );
    };

    private renderLineSelectionColumn = (columnHeader: CARTA.CatalogHeader) => {
        return (
            <Column
                key={"line-select"}
                name={"line-select"}
                columnHeaderCellRenderer={(columnIndex: number) => this.renderLineSelectionrColumnHeaderCell(columnIndex, columnHeader)}
                cellRenderer={(rowIndex, columnIndex) => {
                    return (
                        <Cell key={`cell_${columnIndex}_${rowIndex}`} interactive={false}>
                            <React.Fragment>
                                <Checkbox
                                    checked={this.props.manualSelectionData[rowIndex] || false}
                                    onChange={() => this.props.manualSelectionProps.selectSingleLine(rowIndex)}
                                />
                            </React.Fragment>
                        </Cell>
                    );
                }}
            />
        );
    };

    private renderDataColumnWithFilter = (columnHeader: CARTA.CatalogHeader, columnData: any) => {
        return (
            <Column
                key={columnHeader.name}
                name={columnHeader.name}
                columnHeaderCellRenderer={(columnIndex: number) => this.renderColumnHeaderCell(columnIndex, columnHeader)}
                cellRenderer={columnData?.length ? (rowIndex, columnIndex) => this.renderCell(rowIndex, columnIndex, columnData) : undefined}
            />
        );
    };

    private renderCell = (rowIndex: number, columnIndex: number, columnData: any) => {
        const dataIndex = this.props.selectedDataIndex;
        if (dataIndex && dataIndex.includes(rowIndex) && !this.props.showSelectedData) {
            return <Cell key={`cell_${columnIndex}_${rowIndex}`} intent={"danger"} loading={this.isLoading(rowIndex)} interactive={false}>{columnData[rowIndex]}</Cell>;
        } else {
            return <Cell key={`cell_${columnIndex}_${rowIndex}`} loading={this.isLoading(rowIndex)} interactive={false}>{columnData[rowIndex]}</Cell>;
        }
    };

    private getNextSortingType = () => {
        const sortingInfo = this.props.sortingInfo;
        let currentNode = this.SortingTypelinkedList.head;
        while (currentNode.next) {
            if (currentNode.value === sortingInfo.sortingType) {
                return currentNode.next.value;
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    private renderColumnHeaderCell = (columnIndex: number, column: CARTA.CatalogHeader) => {
        if (!isFinite(columnIndex) || !column) {
            return null;
        }
        const controlheader = this.props.filter?.get(column.name);
        const filterSyntax = this.getfilterSyntax(column.dataType);
        const sortingInfo = this.props.sortingInfo;
        const disable = this.props.disable;

        const nameRenderer = () => {
            // sharing css with fileList table
            let sortIcon = "sort";
            let iconClass = "sort-icon inactive";
            let nextSortType = 0;
            if (sortingInfo?.columnName === column.name) {
                nextSortType = this.getNextSortingType();
                if (sortingInfo?.sortingType === CARTA.SortingType.Descending) {
                    sortIcon = "sort-desc";
                    iconClass = "sort-icon";
                } else if (sortingInfo?.sortingType === CARTA.SortingType.Ascending) {
                    sortIcon = "sort-asc";
                    iconClass = "sort-icon";
                }
            }
            return (
                <div className="sort-label" onClick={() => disable ? null : this.props.updateSortRequest(column.name, nextSortType)}>
                    <Label disabled={disable} className="bp3-inline label">
                        <Icon className={iconClass} icon={sortIcon as IconName}/>
                        {column.name}
                    </Label>
                </div>
            );
        };

        return (
            <ColumnHeaderCell>
                <ColumnHeaderCell className={"column-name"} nameRenderer={nameRenderer}/>
                <ColumnHeaderCell isActive={controlheader?.filter !== ""}>
                    <Popover
                        hoverOpenDelay={250}
                        hoverCloseDelay={0}
                        className={"column-filter"}
                        popoverClassName={this.props.darkTheme ? "column-filter-popover-dark" : "column-filter-popover"}
                        content={filterSyntax}
                        interactionKind={PopoverInteractionKind.HOVER}
                    >
                        <InputGroup
                            key={"column-filter-" + columnIndex}
                            small={true}
                            placeholder="Click to filter"
                            value={controlheader?.filter ? controlheader.filter : ""}
                            onChange={ev => this.props.updateColumnFilter(ev.currentTarget.value, column.name)}
                        />
                    </Popover>
                </ColumnHeaderCell>
            </ColumnHeaderCell>
        );
    };

    private isLoading(rowIndex: number): boolean {
        if (this.props.loadingCell && rowIndex + 4 > this.props.numVisibleRows) {
            return true;
        }
        return false;
    }

    private infiniteScroll = (rowIndices: IRowIndices) => {
        // rowIndices offset around 5 form blueprintjs tabel
        const currentIndex = rowIndices.rowIndexEnd + 1;
        if (rowIndices.rowIndexEnd > 0 && currentIndex >= this.props.numVisibleRows && !this.props.loadingCell && !this.props.showSelectedData) {
            this.props.updateByInfiniteScroll?.(rowIndices.rowIndexEnd);
        }
    };

    private renderDataColumn(columnName: string, columnData: any) {
        return (
            <Column
                key={columnName}
                name={columnName}
                cellRenderer={(rowIndex, columnIndex) => (
                    <Cell key={`cell_${columnIndex}_${rowIndex}`} interactive={true}>{rowIndex < columnData?.length ? columnData[rowIndex] : undefined}</Cell>
                )}
            />
        );
    }

    private updateTableColumnWidth = (index: number, size: number) => {
        const header = this.props.columnHeaders[index];
        if (header && this.props.updateTableColumnWidth) {
            this.props.updateTableColumnWidth(size, header.name);
        }
    };

    private onRowIndexSelection = (selectedRegions: IRegion[]) => {
        if (selectedRegions.length > 0) {
            let selectedDataIndex = [];
            for (let i = 0; i < selectedRegions.length; i++) {
                const region = selectedRegions[i];
                const start = region.rows[0];
                const end = region.rows[1];
                if (start === end) {
                    selectedDataIndex.push(start);
                } else {
                    for (let j = start; j <= end; j++) {
                        selectedDataIndex.push(j);
                    }
                } 
            }
            this.props.updateSelectedRow?.(selectedDataIndex);
        }
    };

    render() {
        const table = this.props;
        const tableColumns = [];
        const tableData = table.dataset;

        table.columnHeaders?.forEach(header => {
            const columnIndex = header.columnIndex;
            let dataArray = tableData.get(columnIndex)?.data;
            if (table.type === TableType.ColumnFilter) {
                // TODO: create SpectralLineTableComponent inherited from TableComponent
                const column = header.name === SpectralLineHeaders.LineSelection ?
                this.renderLineSelectionColumn(header) :
                this.renderDataColumnWithFilter(header, dataArray);
                tableColumns.push(column);
            } else if (table.type === TableType.Normal) {
                const column = this.renderDataColumn(header.name, dataArray);
                tableColumns.push(column);
            }
        });

        if (table.type === TableType.ColumnFilter) {
            return (
                <Table
                    className={"column-filter"}
                    ref={table.updateTableRef ? (ref) => table.updateTableRef(ref) : null}
                    numRows={table.numVisibleRows}
                    renderMode={RenderMode.BATCH}
                    enableRowReordering={false}
                    selectionModes={SelectionModes.ROWS_AND_CELLS}
                    onVisibleCellsChange={this.infiniteScroll}
                    onColumnWidthChanged={this.updateTableColumnWidth}
                    enableGhostCells={true}
                    onSelection={this.onRowIndexSelection}
                    enableMultipleSelection={true}
                    enableRowResizing={false}
                    columnWidths={table.columnWidths}
                >
                    {tableColumns}
                </Table>
            );
        } else {
            return (
                <Table
                    ref={table.updateTableRef ? (ref) => table.updateTableRef(ref) : null}
                    numRows={table.numVisibleRows}
                    renderMode={RenderMode.NONE}
                    enableRowReordering={false}
                    selectionModes={SelectionModes.NONE}
                    enableGhostCells={true}
                    enableRowResizing={false}
                    columnWidths={table.columnWidths}
                >
                    {tableColumns}
                </Table>
            );
        }
    }
}
