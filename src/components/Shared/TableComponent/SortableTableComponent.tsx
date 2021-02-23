import {SelectionModes, RenderMode, Table} from "@blueprintjs/table";
import {SpectralLineHeaders} from "stores/widgets";
import {TableComponent} from "./TableComponent";

export class SortableTableComponent extends TableComponent {
    render() {
        const table = this.props;
        const tableColumns = [];
        const tableData = table.dataset;

        table.columnHeaders?.forEach(header => {
            const columnIndex = header.columnIndex;
            let dataArray = tableData.get(columnIndex)?.data;
            const column = (header.name === SpectralLineHeaders.LineSelection && this.props.flipRowSelection) ?
                this.renderCheckboxColumn(header, dataArray) :
                this.renderDataColumnWithFilter(header, dataArray);
            tableColumns.push(column); 
        });

        return (
            <Table
                className={"column-filter-table"}
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
    }
}
