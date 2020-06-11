import {action, autorun, computed, observable} from "mobx";
import {NumberRange} from "@blueprintjs/core";
import {Table} from "@blueprintjs/table";
import {CARTA} from "carta-protobuf";
import {RegionWidgetStore, RegionsType} from "./RegionWidgetStore";
import {ProcessedColumnData} from "models";
import {ControlHeader} from "stores/widgets";
import {wavelengthToFrequency, SPEED_OF_LIGHT} from "utilities";

export enum SpectralLineQueryRangeType {
    Range = "Range",
    Center = "Center"
}

export enum SpectralLineQueryUnit {
    GHz = "GHz",
    MHz = "MHz",
    CM = "cm",
    MM = "mm"
}

export enum SpectralLineHeaders {
    Species = "Species",
    ChemicalName = "Chemical Name",
    RestFrequency = "Rest Frequency",
    RedshiftedFrequency = "Redshifted Frequency",
    FreqMHz = "Freq-MHz(rest frame,redshifted)",
    FreqErr = "Freq Err(rest frame,redshifted)",
    MeasFreqMHz = "Meas Freq-MHz(rest frame,redshifted)",
    MeasFreqErr = "Meas Freq Err(rest frame,redshifted)",
    QuantumNumber = "Resolved QNs",
    IntensityCDMS = "CDMS/JPL Intensity",
    IntensityLovas = "Lovas/AST Intensity",
    E_L = "E_L (cm^-1)",
    LineList = "Linelist"
}

const SPECTRAL_LINE_DESCRIPTION = new Map<SpectralLineHeaders, string>([
    [SpectralLineHeaders.Species, "Name of the Species"],
    [SpectralLineHeaders.QuantumNumber, "Resolved Quantum Number"],
    [SpectralLineHeaders.IntensityCDMS, "Intensity(for JPL/CDMS)"],
    [SpectralLineHeaders.IntensityLovas, "Intensity(for Lovas/AST)"]
]);

export interface SpectralLineHeader {
    name: SpectralLineHeaders;
    desc: string;
}

export enum RedshiftType {
    V = "V",
    Z = "Z"
}

const FREQUENCY_COLUMN_INDEX = 2;

export class SpectralLineOverlayWidgetStore extends RegionWidgetStore {
    private static readonly initDisplayedColumnSize = 6;

    @observable queryRangeType: SpectralLineQueryRangeType;
    @observable queryRange: NumberRange;
    @observable queryRangeByCenter: NumberRange;
    @observable queryUnit: SpectralLineQueryUnit;
    @observable isQuerying: boolean;
    @observable queryHeaders: Array<CARTA.CatalogHeader>;
    @observable headerDisplay: Map<SpectralLineHeaders, boolean>;
    @observable redshiftType: RedshiftType;
    @observable redshiftInput: number;
    @observable queryResultTableRef: Table;
    @observable controlHeader: Map<string, ControlHeader>;
    @observable queryResult: Map<number, ProcessedColumnData>;
    @observable originalFreqColumn: ProcessedColumnData;
    @observable numDataRows: number;

    @action setQueryRangeType = (queryRangeType: SpectralLineQueryRangeType) => {
        this.queryRangeType = queryRangeType;
    };

    @action setQueryRange = (queryRange: NumberRange) => {
        this.queryRange = queryRange;
    };

    @action setQueryRangeByCenter = (queryRange: NumberRange) => {
        this.queryRangeByCenter = queryRange;
    };

    @action setQueryUnit = (queryUnit: SpectralLineQueryUnit) => {
        this.queryUnit = queryUnit;
    };

    @action setHeaderDisplay = (header: SpectralLineHeaders) => {
        this.headerDisplay.set(header, !this.headerDisplay.get(header));
    };

    @action setRedshiftType = (redshiftType: RedshiftType) => {
        this.redshiftType = redshiftType;
     };

    @action setRedshiftInput = (input: number) => {
        if (isFinite(input)) {
            this.redshiftInput = input;
        }
    };

    @action setQueryResultTableRef(ref: Table) {
        this.queryResultTableRef = ref;
    }

    @action query = () => {
        let valueMin = 0;
        let valueMax = 0;
        if (this.queryRangeType === SpectralLineQueryRangeType.Range) {
            valueMin = this.queryRange[0];
            valueMax = this.queryRange[1];
        } else {
            valueMin = this.queryRangeByCenter[0] - this.queryRangeByCenter[1];
            valueMax = this.queryRangeByCenter[0] + this.queryRangeByCenter[1];
        }

        const freqMHzFrom = this.calculateFreqMHz(valueMin, this.queryUnit);
        const freqMHzTo = this.calculateFreqMHz(valueMax, this.queryUnit);

        if (isFinite(freqMHzFrom) && isFinite(freqMHzTo)) {
            this.isQuerying = true;
            const corsProxy = "https://cors-anywhere.herokuapp.com/";
            const queryLink = "https://www.cv.nrao.edu/php/splat/c_export.php?submit=Search&chemical_name=&sid%5B%5D=1154&calcIn=&data_version=v3.0&redshift=&freqfile=&energy_range_from=&energy_range_to=&lill=on&displayJPL=displayJPL&displayCDMS=displayCDMS&displayLovas=displayLovas&displaySLAIM=displaySLAIM&displayToyaMA=displayToyaMA&displayOSU=displayOSU&displayRecomb=displayRecomb&displayLisa=displayLisa&displayRFI=displayRFI&ls1=ls1&ls5=ls5&el1=el1&export_type=current&export_delimiter=tab&offset=0&limit=501&range=on&submit=Export";
            const freqRange = `&frequency_units=MHz&from=${freqMHzFrom}&to=${freqMHzTo}`;

            fetch(`${corsProxy}${queryLink}${freqRange}`, {
            }).then(response => {
                return response.text();
            }).then(data => {
                this.parsingQueryResponse(data);
                this.isQuerying = false;
            }).catch((err) => {
                this.isQuerying = false;
                console.log(err);
            });
        }
    };

    @action.bound setColumnFilter(filter: string, columnName: string) {
        this.controlHeader.get(columnName).filter = filter;
    }

    @action clearData() {
        this.queryResult.clear();
    }

    @computed get formalizedHeaders(): SpectralLineHeader[] {
        let formalizedHeaders: SpectralLineHeader[] = [];
        this.queryHeaders.forEach(header => {
            if ((<any> Object).values(SpectralLineHeaders).includes(header.name)) {
                formalizedHeaders.push({name: header.name as SpectralLineHeaders, desc: SPECTRAL_LINE_DESCRIPTION.get(header.name as SpectralLineHeaders)});
            }
        });
        return formalizedHeaders;
    }

    @computed get initControlHeader() {
        const controlHeaders = new Map<string, ControlHeader>();
        if (this.queryHeaders.length) {
            for (let columnIndex = 0; columnIndex < this.queryHeaders.length; columnIndex++) {
                const header = this.queryHeaders[columnIndex];
                let controlHeader: ControlHeader = {
                    columnIndex: columnIndex,
                    dataIndex: columnIndex,
                    display: columnIndex < SpectralLineOverlayWidgetStore.initDisplayedColumnSize ? true : false,
                    representAs: undefined,
                    filter: undefined,
                    columnWidth: null
                };
                controlHeaders.set(header.name, controlHeader);
            }
        }
        return controlHeaders;
    }

    @computed get redshiftFactor() {
        return this.redshiftType === RedshiftType.V ? Math.sqrt((1 - this.redshiftInput / SPEED_OF_LIGHT) / (1 + this.redshiftInput / SPEED_OF_LIGHT)) : 1 / (this.redshiftInput + 1);
    }

    private calculateFreqMHz = (value: number, unit: SpectralLineQueryUnit): number => {
        if (!isFinite(value) || !unit) {
            return null;
        }
        if (unit === SpectralLineQueryUnit.CM) {
            return wavelengthToFrequency(value / 10) / 1e6;
        } else if (unit === SpectralLineQueryUnit.MM) {
            return wavelengthToFrequency(value / 100) / 1e6;
        } else if (unit === SpectralLineQueryUnit.GHz) {
            return value * 1000;
        } else if (unit === SpectralLineQueryUnit.MHz) {
            return value;
        } else {
            return null;
        }
    };

    private parsingQueryResponse = (response: string) => {
        if (!response) {
            return;
        }
        const lines = response.replace(/\n$/, "").split(/\r?\n/);
        if (lines && lines.length > 1) {
            const spectralLineInfo = [];
            lines.forEach(line => {
                spectralLineInfo.push(line.split(/\t/));
            });

            // find headers: spectralLineInfo[0], and insert redshifted column [0, 1, redshifted, rest freq, ...]
            const headers = spectralLineInfo[0];
            if (headers && headers.length > 0) {
                for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
                    if (columnIndex < FREQUENCY_COLUMN_INDEX) {
                        this.queryHeaders.push(new CARTA.CatalogHeader({name: headers[columnIndex], dataType: CARTA.ColumnType.String, columnIndex: columnIndex}));
                    } else if (columnIndex === FREQUENCY_COLUMN_INDEX) {
                        this.queryHeaders.push(new CARTA.CatalogHeader({name: SpectralLineHeaders.RedshiftedFrequency, dataType: CARTA.ColumnType.Double, columnIndex: columnIndex}));
                        this.queryHeaders.push(new CARTA.CatalogHeader({name: SpectralLineHeaders.RestFrequency, dataType: CARTA.ColumnType.Double, columnIndex: columnIndex + 1}));
                    } else {
                        this.queryHeaders.push(new CARTA.CatalogHeader({name: headers[columnIndex], dataType: CARTA.ColumnType.String, columnIndex: columnIndex + 1}));
                    }
                }
            }

            // find column data: spectralLineInfo[1] ~ spectralLineInfo[lines.length - 1]
            const numDataRows = lines.length - 1;
            const numHeaders = this.queryHeaders.length;
            if (numHeaders > 0) {
                for (let columnIndex = 0; columnIndex < numHeaders; columnIndex++) {
                    const columnData = [];
                    for (let row = 0; row < numDataRows; row++) {
                        const valString = spectralLineInfo[row + 1][columnIndex];
                        columnData.push(columnIndex === FREQUENCY_COLUMN_INDEX ? Number(valString) : valString);
                    }
                    if (columnIndex === FREQUENCY_COLUMN_INDEX) {
                        this.queryResult.set(FREQUENCY_COLUMN_INDEX, {dataType: CARTA.ColumnType.Double, data: columnData.map(val => val * this.redshiftFactor)});
                        this.queryResult.set(FREQUENCY_COLUMN_INDEX + 1, {dataType: CARTA.ColumnType.Double, data: columnData});
                        this.originalFreqColumn = this.queryResult.get(FREQUENCY_COLUMN_INDEX + 1);
                    } else {
                        this.queryResult.set(columnIndex < FREQUENCY_COLUMN_INDEX ? columnIndex : columnIndex + 1, {dataType: CARTA.ColumnType.String, data: columnData});
                    }
                }
            }

            // update numDataRows
            this.numDataRows = numDataRows;
        }
    };

    constructor() {
        super(RegionsType.CLOSED);
        this.queryRangeType = SpectralLineQueryRangeType.Range;
        this.queryRange = [0, 0];
        this.queryRangeByCenter = [0, 0];
        this.queryUnit = SpectralLineQueryUnit.MHz;
        this.isQuerying = false;
        this.queryHeaders = [];
        this.headerDisplay = new Map<SpectralLineHeaders, boolean>();
        Object.values(SpectralLineHeaders).forEach(header => this.headerDisplay.set(header, true));
        this.redshiftType = RedshiftType.V;
        this.redshiftInput = 0;
        this.queryResultTableRef = undefined;
        this.controlHeader = this.initControlHeader;
        this.queryResult = new Map<number, ProcessedColumnData>();
        this.originalFreqColumn = undefined;
        this.numDataRows = 1;

        // update frequency column when redshift changes
        autorun(() => {
            if (this.queryResult.size > 0 && this.originalFreqColumn && this.originalFreqColumn.data) {
                this.queryResult.set(FREQUENCY_COLUMN_INDEX, {
                    dataType: CARTA.ColumnType.Double,
                    data: (this.originalFreqColumn.data as Array<number>).map(val => val * this.redshiftFactor)
                });
            }
        });
    }
}
