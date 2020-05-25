import {action, computed, observable} from "mobx";
import {CARTA} from "carta-protobuf";
import {AppStore} from "stores";
import {RegionWidgetStore, RegionsType} from "./RegionWidgetStore";

export enum SpectralLineOptions {
    Formula = "FORMULA",
    Name = "NAME",
    Frequency = "FREQ",
    RedshiftedFrequency = "REDSHIFTED_FREQ",
    QuantumNumber = "QN",
    Intensity = "I",
    AstroFilter = "ASTRO"
}

export const SPECTRAL_LINE_OPTION_DESCRIPTIONS = new Map<SpectralLineOptions, string>([
    [SpectralLineOptions.Formula, "Chemical formula of the Species"],
    [SpectralLineOptions.Name, "Name of the Species"],
    [SpectralLineOptions.Frequency, "Rest Frequency (MHz)"],
    [SpectralLineOptions.RedshiftedFrequency, "Redshifted Frequency (MHz)(generated by box on the right)"],
    [SpectralLineOptions.QuantumNumber, "Resolved Quantum Number"],
    [SpectralLineOptions.Intensity, "Intensity(for JPL/CDMS)"],
    [SpectralLineOptions.AstroFilter, "Astronomical Filter(Dark Cloud, Extragalatic, ...)"]
]);

export enum RedshiftGroup {
    V = "V",
    Z = "Z"
}

export class SpectralLineOverlayWidgetStore extends RegionWidgetStore {
    @observable optionsDisplay: Map<SpectralLineOptions, boolean>;
    @observable optionsLabel: Map<SpectralLineOptions, boolean>;
    @observable redshiftSpeed: number;
    @observable redshiftGroup: RedshiftGroup;

    @action setOptionsDisplay = (option: SpectralLineOptions) => {
        this.optionsDisplay.set(option, !this.optionsDisplay.get(option));
    };

    @action setOptionsLabel = (option: SpectralLineOptions) => {
        this.optionsLabel.set(option, !this.optionsLabel.get(option));
    };

    @action setRedshiftSpeed = (speed: number) => {
        if (isFinite(speed)) {
            this.redshiftSpeed = speed;
        }
    };

    @action setRedshiftGroup = (redshiftGroup: RedshiftGroup) => {
       this.redshiftGroup = redshiftGroup;
    };

    constructor() {
        super(RegionsType.CLOSED);
        this.optionsDisplay = new Map<SpectralLineOptions, boolean>();
        Object.values(SpectralLineOptions).forEach(option => this.optionsDisplay.set(option, false));
        this.optionsLabel = new Map<SpectralLineOptions, boolean>();
        Object.values(SpectralLineOptions).forEach(option => this.optionsLabel.set(option, false));
        this.redshiftSpeed = 0;
        this.redshiftGroup = RedshiftGroup.V;
    }
}
