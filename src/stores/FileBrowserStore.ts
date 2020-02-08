import {action, computed, observable} from "mobx";
import {TabId} from "@blueprintjs/core";
import {CARTA} from "carta-protobuf";
import {BackendService} from "services";
import { AppStore } from "stores";
import {FileInfoType} from "components";

export enum BrowserMode {
    File,
    RegionImport,
    RegionExport,
    Catalog
}

export type RegionFileType = CARTA.FileType.CRTF | CARTA.FileType.REG;
export type ImageFileType = CARTA.FileType.CASA | CARTA.FileType.FITS | CARTA.FileType.HDF5 | CARTA.FileType.MIRIAD;
export type CatalogFileType = CARTA.CatalogFileType.VOTable;

export class FileBrowserStore {
    private readonly appStore: AppStore;

    @observable browserMode: BrowserMode = BrowserMode.File;
    @observable appendingFrame = false;
    @observable fileList: CARTA.IFileListResponse;
    @observable selectedFile: CARTA.IFileInfo| CARTA.ICatalogFileInfo;
    @observable selectedHDU: string;
    @observable fileInfoExtended: CARTA.IFileInfoExtended;
    @observable regionFileInfo: string[];
    @observable selectedTab: TabId = FileInfoType.IMAGE_FILE;
    @observable loadingList = false;
    @observable loadingInfo = false;
    @observable fileInfoResp = false;
    @observable responseErrorMessage: string = "";
    @observable startingDirectory: string = "$BASE";
    @observable exportFilename: string;
    @observable exportCoordinateType: CARTA.CoordinateType;
    @observable exportFileType: RegionFileType;

    @observable catalogFileList: CARTA.ICatalogListResponse;
    @observable selectedCatalogFile: CARTA.ICatalogFileInfo;
    @observable catalogFileInfor: CARTA.ICatalogFileInfo;
    @observable catalogHeaders: Array<CARTA.ICatalogHeader>;

    @action showFileBrowser = (mode: BrowserMode, append = false) => {
        this.appendingFrame = append;
        this.browserMode = mode;
        this.appStore.dialogStore.showFileBrowserDialog();
        this.fileList = null;
        this.selectedTab = (BrowserMode.File === mode) ? FileInfoType.IMAGE_FILE : FileInfoType.REGION_FILE;
        this.responseErrorMessage = "";
        this.exportFilename = "";
        this.catalogFileList = null;
        this.getFileList(this.startingDirectory);
    };

    @action hideFileBrowser = () => {
        this.appStore.dialogStore.hideFileBrowserDialog();
    };

    @action getFileList = (directory: string) => {
        this.loadingList = true;
        this.selectedFile = null;
        this.selectedHDU = null;
        this.fileInfoExtended = null;
        this.regionFileInfo = null;

        if (this.browserMode === BrowserMode.File) {
            this.backendService.getFileList(directory).subscribe(res => {
                this.fileList = res;
            }, err => {
                console.log(err);
                this.loadingList = false;
            });
        } else if (this.browserMode === BrowserMode.Catalog) {
            this.backendService.getCatalogList(directory).subscribe(res => {
                this.catalogFileList = res;
            }, err => {
                console.log(err);
                this.loadingList = false;
            });
        } else {
            this.backendService.getRegionList(directory).subscribe(res => {
                this.fileList = res;
            }, err => {
                console.log(err);
                this.loadingList = false;
            });
        }
    };

    @action getFileInfo = (directory: string, file: string, hdu: string) => {
        this.loadingInfo = true;
        this.fileInfoResp = false;
        this.fileInfoExtended = null;
        this.responseErrorMessage = "";
        this.backendService.getFileInfo(directory, file, hdu).subscribe((res: CARTA.FileInfoResponse) => {
            if (res.fileInfo && this.selectedFile && res.fileInfo.name === this.selectedFile.name) {
                this.fileInfoExtended = res.fileInfoExtended;
                this.loadingInfo = false;
            }
            this.fileInfoResp = true;
        }, err => {
            console.log(err);
            this.responseErrorMessage = err;
            this.fileInfoResp = false;
            this.fileInfoExtended = null;
            this.loadingInfo = false;
        });
    };

    @action getRegionFileInfo = (directory: string, file: string) => {
        this.loadingInfo = true;
        this.fileInfoResp = false;
        this.regionFileInfo = null;
        this.responseErrorMessage = "";
        this.backendService.getRegionFileInfo(directory, file).subscribe((res: CARTA.IRegionFileInfoResponse) => {
            if (res.fileInfo && this.selectedFile && res.fileInfo.name === this.selectedFile.name) {
                this.loadingInfo = false;
                this.regionFileInfo = res.contents;
            }
            this.fileInfoResp = true;
        }, err => {
            console.log(err);
            this.responseErrorMessage = err;
            this.fileInfoResp = false;
            this.regionFileInfo = null;
            this.loadingInfo = false;
        });
    };

    @action getCatalogFileInfo = (directory: string, filename: string) => {
        this.loadingInfo = true;
        this.fileInfoResp = false;
        this.catalogFileInfor = null;
        this.catalogHeaders = [];
        this.backendService.getCatalogFileInfo(directory, filename).subscribe((res: CARTA.ICatalogFileInfoResponse) => {
            if (res.fileInfo && this.selectedFile && res.fileInfo.name === this.selectedFile.name) {
                this.loadingInfo = false;
                this.catalogFileInfor = res.fileInfo;
                this.catalogHeaders = res.headers.sort((a, b) => { return a.columnIndex - b.columnIndex; });
            }
            this.fileInfoResp = res.success;
        }, err => {
            console.log(err);
            this.responseErrorMessage = err;
            this.fileInfoResp = false;
            this.catalogFileInfor = null;
            this.loadingInfo = false;
        });
    };

    @action selectFile = (file: CARTA.IFileInfo | CARTA.ICatalogFileInfo, hdu?: string) => {
        const fileList = this.getfileListByMode;
        this.selectedFile = file;

        if (hdu) {
            this.selectedHDU = hdu;   
        }

        if (this.browserMode === BrowserMode.File) {
            this.getFileInfo(fileList.directory, file.name, hdu);
        } else if (this.browserMode === BrowserMode.Catalog) {
            this.getCatalogFileInfo(fileList.directory, file.name);
        } else {
            this.setExportFilename(file.name);
            this.getRegionFileInfo(fileList.directory, file.name);
        }
    };

    @action selectFolder = (folder: string, absolutePath: boolean) => {
        if (absolutePath) {
            this.getFileList(folder);
            return;
        }
        const fileList = this.getfileListByMode;
        if (folder === "..") {
            this.selectParent();
        } else if (fileList) {
            const currentDir = fileList.directory;
            let newFolder = folder;
            if (currentDir.length && !(currentDir.length === 1 && currentDir[0] === "/")) {
                newFolder = `${currentDir}/${folder}`;
            }
            this.getFileList(newFolder);
        }
    };

    @action selectParent() {
        const fileList = this.getfileListByMode;
        if (fileList && fileList.parent) {
            this.getFileList(fileList.parent);
        }
    }

    @action setSelectedTab(newId: TabId) {
        this.selectedTab = newId;
    }

    @action saveStartingDirectory() {
        if (this.browserMode === BrowserMode.Catalog) {
            this.startingDirectory = this.catalogFileList.directory;
        } else {
            this.startingDirectory = this.fileList.directory;
        }
    }

    @action setExportFilename = (filename: string) => {
        this.exportFilename = filename;
    };

    @action setExportCoordinateType = (coordType: CARTA.CoordinateType) => {
        this.exportCoordinateType = coordType;
    };

    @action setExportFileType = (fileType: RegionFileType) => {
        this.exportFileType = fileType;
    };

    @computed get fileInfo() {
        let fileInfo = "";
        if (this.fileInfoExtended && this.fileInfoExtended.computedEntries) {
            this.fileInfoExtended.computedEntries.forEach(header => {
                fileInfo += `${header.name} = ${header.value}\n`;
            });
        }
        return fileInfo;
    }

    @computed get headers() {
        let headers = "";
        if (this.fileInfoExtended && this.fileInfoExtended.headerEntries) {
            this.fileInfoExtended.headerEntries.forEach(header => {
                if (header.name === "END") {
                    headers += `${header.name}\n`;
                } else {
                    headers += `${header.name} = ${header.value}\n`;
                }
            });
        }
        return headers;
    }

    @computed get getfileListByMode(): CARTA.IFileListResponse | CARTA.ICatalogListResponse {
        switch (this.browserMode) {
            case BrowserMode.Catalog:
                return this.catalogFileList;
            default:
                return this.fileList;
        }
    }

    @computed get catalogHeaderDataset(): {columnHeaders: Array<CARTA.CatalogHeader>, columnsData: CARTA.CatalogColumnsData} {
        let columnsData = new CARTA.CatalogColumnsData();
        columnsData.stringColumn[0] = new CARTA.StringColumn();
        columnsData.stringColumn[1] = new CARTA.StringColumn();
        columnsData.stringColumn[2] = new CARTA.StringColumn();

        let columnHeaders: Array<CARTA.CatalogHeader> = [];
        for (let index = 0; index < this.catalogHeaders.length; index++) {
            const catalogHeader = this.catalogHeaders[index];
            columnsData.stringColumn[0].stringColumn.push(catalogHeader.name);
            columnsData.stringColumn[1].stringColumn.push(catalogHeader.description);
            columnsData.stringColumn[2].stringColumn.push(catalogHeader.units);
        }
        const stringType = CARTA.EntryType.STRING;
        columnHeaders[0] = new CARTA.CatalogHeader({name: "Name", dataType: stringType, columnIndex: 0, dataTypeIndex: 0});
        columnHeaders[1] = new CARTA.CatalogHeader({name: "Description", dataType: stringType, columnIndex: 1, dataTypeIndex: 1});
        columnHeaders[2] = new CARTA.CatalogHeader({name: "Unit", dataType: stringType, columnIndex: 2, dataTypeIndex: 2});

        return {columnHeaders: columnHeaders, columnsData: columnsData};
    }

    private backendService: BackendService;

    constructor(appStore: AppStore, backendService: BackendService) {
        this.appStore = appStore;
        this.backendService = backendService;
        this.exportCoordinateType = CARTA.CoordinateType.WORLD;
        this.exportFileType = CARTA.FileType.CRTF;
    }
}
