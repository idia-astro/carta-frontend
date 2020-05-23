import * as AST from "ast_wrapper";
import {action, observable, ObservableMap} from "mobx";
import {Colors} from "@blueprintjs/core";
import {SystemType} from "stores";
import {CatalogOverlayShape} from "stores/widgets";

type CatalogDataInfo = {
    fileId: number,
    xImageCoords: Array<number>,
    yImageCoords: Array<number>,
    showSelectedData: boolean;
};

export class CatalogStore {
    private static staticInstance: CatalogStore;

    static get Instance() {
        if (!CatalogStore.staticInstance) {
            CatalogStore.staticInstance = new CatalogStore();
        }
        return CatalogStore.staticInstance;
    }

    private static readonly DegreeUnits = ["deg", "degrees"];
    private static readonly ArcsecUnits = ["arcsec", "arcsecond"];
    private static readonly ArcminUnits = ["arcmin", "arcminute"];

    @observable catalogData: ObservableMap<string, CatalogDataInfo>;
    @observable catalogColor: ObservableMap<string, string>;
    @observable catalogSize: ObservableMap<string, number>;
    @observable catalogShape: ObservableMap<string, CatalogOverlayShape>;

    private constructor() {
        this.catalogData = new ObservableMap();
        this.catalogColor = new ObservableMap();
        this.catalogSize = new ObservableMap();
        this.catalogShape = new ObservableMap();
    }

    @action addCatalog(widgetId: string, fileId: number) {
        // init catalog data
        this.catalogData.set(widgetId, {
            fileId: fileId,
            xImageCoords: [],
            yImageCoords: [],
            showSelectedData: false
        });
        this.catalogColor.set(widgetId, Colors.TURQUOISE3);
        this.catalogSize.set(widgetId, 5);
        this.catalogShape.set(widgetId, CatalogOverlayShape.Circle);
    }

    @action updateCatalogData(widgetId: string, xWcsData: Array<number>, yWcsData: Array<number>, wcsInfo: number, xUnit: string, yUnit: string, catalogFrame: SystemType) {
        const pixelData = CatalogStore.TransformCatalogData(xWcsData, yWcsData, wcsInfo, xUnit, yUnit, catalogFrame);
        const catalogDataInfo = this.catalogData.get(widgetId);
        if (catalogDataInfo) {
            for (let i = 0; i < pixelData.xImageCoords.length; i++) {
                catalogDataInfo.xImageCoords.push(pixelData.xImageCoords[i]);
                catalogDataInfo.yImageCoords.push(pixelData.yImageCoords[i]);
            }
            this.catalogData.set(widgetId,
                {
                    fileId: catalogDataInfo.fileId,
                    xImageCoords: catalogDataInfo.xImageCoords,
                    yImageCoords: catalogDataInfo.yImageCoords,
                    showSelectedData: catalogDataInfo.showSelectedData
                });
        }
    }

    @action updateCatalogSize(widgetId: string, size: number) {
        this.catalogSize.set(widgetId, size);
    }

    @action updateCatalogColor(widgetId: string, color: string) {
        this.catalogColor.set(widgetId, color);
    }

    @action updateCatalogShape(widgetId: string, shape: CatalogOverlayShape) {
        this.catalogShape.set(widgetId, shape);
    }

    @action clearData(widgetId: string) {
        const catalogData = this.catalogData.get(widgetId);
        if (catalogData) {
            catalogData.xImageCoords = [];
            catalogData.yImageCoords = [];
            catalogData.showSelectedData = false;
        }
    }

    @action removeCatalog(widgetId: string) {
        this.catalogData.delete(widgetId);
        this.catalogColor.delete(widgetId);
        this.catalogSize.delete(widgetId);
        this.catalogShape.delete(widgetId);
    }

    @action updateShowSelectedData(widgetId: string, val: boolean) {
        const catalog = this.catalogData.get(widgetId);
        if (catalog) {
            catalog.showSelectedData = val;
        }
    }

    private static GetFractionFromUnit(unit: string): number {
        if (CatalogStore.ArcminUnits.includes(unit)) {
            return Math.PI / 10800.0;
        } else if (CatalogStore.ArcsecUnits.includes(unit)) {
            return Math.PI / 648000.0;
        } else {
            // if unit is null, using deg as default
            return Math.PI / 180.0;
        }
    }

    private static TransformCatalogData(xWcsData: Array<number>, yWcsData: Array<number>, wcsInfo: number, xUnit: string, yUnit: string, catalogFrame: SystemType): { xImageCoords: Float64Array, yImageCoords: Float64Array } {
        if (xWcsData.length === yWcsData.length) {
            const N = xWcsData.length;

            let xFraction = CatalogStore.GetFractionFromUnit(xUnit.toLocaleLowerCase());
            let yFraction = CatalogStore.GetFractionFromUnit(yUnit.toLocaleLowerCase());

            let wcsCopy = AST.copy(wcsInfo);
            let system = "System=" + catalogFrame;
            AST.set(wcsCopy, system);
            if (catalogFrame === SystemType.FK4) {
                AST.set(wcsCopy, "Epoch=B1950");
                AST.set(wcsCopy, "Equinox=1950");
            }

            if (catalogFrame === SystemType.FK5) {
                AST.set(wcsCopy, "Epoch=J2000");
                AST.set(wcsCopy, "Equinox=2000");
            }

            const xWCSValues = new Float64Array(N);
            const yWCSValues = new Float64Array(N);

            for (let i = 0; i < N; i++) {
                xWCSValues[i] = xWcsData[i] * xFraction;
                yWCSValues[i] = yWcsData[i] * yFraction;
            }

            const results = AST.transformPointArrays(wcsCopy, xWCSValues, yWCSValues, 0);
            AST.delete(wcsCopy);
            return {xImageCoords: results.x, yImageCoords: results.y};
        }
        return {xImageCoords: new Float64Array(0), yImageCoords: new Float64Array(0)};
    }
}