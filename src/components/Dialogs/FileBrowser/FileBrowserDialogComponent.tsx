import * as React from "react";
import {observer} from "mobx-react";
import {action, computed, observable} from "mobx";
import {Alert, AnchorButton, Breadcrumb, Breadcrumbs, Button, IBreadcrumbProps, Icon, IDialogProps, InputGroup, Intent, Menu, MenuItem, NonIdealState, Popover, Position, Pre, Spinner, Tab, TabId, Tabs, Tooltip, Text} from "@blueprintjs/core";
import {CARTA} from "carta-protobuf";
import {FileListComponent} from "./FileList/FileListComponent";
import {DraggableDialogComponent} from "components/Dialogs";
import {TableComponent, TableComponentProps, TableType} from "components/Shared";
import {AppStore, BrowserMode, FileInfoTabs} from "stores";
import {CatalogOverlayWidgetStore} from "stores/widgets";
import "./FileBrowserDialogComponent.css";

@observer
export class FileBrowserDialogComponent extends React.Component<{ appStore: AppStore }> {
    @observable overwriteExistingFileAlertVisible: boolean;

    private handleTabChange = (newId: TabId) => {
        this.props.appStore.fileBrowserStore.setSelectedTab(newId);
    };

    private loadSelectedFile = () => {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        this.loadFile(fileBrowserStore.selectedFile, fileBrowserStore.selectedHDU);
    };

    private loadFile = (fileInfo: CARTA.IFileInfo | CARTA.ICatalogFileInfo, hdu?: string) => {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;

        // Ignore load if in export mode
        if (fileBrowserStore.browserMode === BrowserMode.RegionExport) {
            return;
        }

        if (fileBrowserStore.browserMode === BrowserMode.File) {
            const frames = this.props.appStore.frames;
            if (!fileBrowserStore.appendingFrame || !frames.length) {
                this.props.appStore.openFile(fileBrowserStore.fileList.directory, fileInfo.name, hdu);
            } else {
                this.props.appStore.appendFile(fileBrowserStore.fileList.directory, fileInfo.name, hdu);
            }
        } else if (fileBrowserStore.browserMode === BrowserMode.Catalog) {
            this.props.appStore.appendCatalog(fileBrowserStore.catalogFileList.directory, fileInfo.name, CatalogOverlayWidgetStore.InitTableRows, CARTA.CatalogFileType.VOTable);
        } else {
            this.props.appStore.importRegion(fileBrowserStore.fileList.directory, fileInfo.name, fileInfo.type);
        }

        fileBrowserStore.saveStartingDirectory();
    };

    private handleExportRegionsClicked = () => {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        const filename = fileBrowserStore.exportFilename.trim();
        if (fileBrowserStore.fileList && fileBrowserStore.fileList.files && fileBrowserStore.fileList.files.find(f => f.name.trim() === filename)) {
            // Existing file being replaced. Alert the user
            this.overwriteExistingFileAlertVisible = true;
        } else {
            this.exportRegion(fileBrowserStore.fileList.directory, filename);
        }
    };

    private exportRegion(directory: string, filename: string) {
        if (!filename || !directory) {
            return;
        }

        filename = filename.trim();
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        this.props.appStore.exportRegions(directory, filename, fileBrowserStore.exportCoordinateType, fileBrowserStore.exportFileType);
        console.log(`Exporting all regions to ${directory}/${filename}`);
    }

    private handleOverwriteAlertConfirmed = () => {
        this.overwriteExistingFileAlertVisible = false;
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        const filename = this.props.appStore.fileBrowserStore.exportFilename.trim();
        this.exportRegion(fileBrowserStore.fileList.directory, filename);
    };

    private handleOverwriteAlertDismissed = () => {
        this.overwriteExistingFileAlertVisible = false;
    };

    private handleExportInputChanged = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        fileBrowserStore.setExportFilename(ev.target.value);
    };

    private static ValidateFilename(filename: string) {
        const forbiddenRegex = /(\.\.)|(\\)+/gm;
        return (filename && filename.length && !filename.match(forbiddenRegex));
    }

    private renderInfoPanel = () => {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        const fileBrowserMode = fileBrowserStore.browserMode;
        const respStatus =  fileBrowserStore.fileInfoResp;

        if (fileBrowserStore.selectedFile) {
            if (fileBrowserStore.loadingInfo) {
                return <NonIdealState className="non-ideal-state-file" icon={<Spinner className="astLoadingSpinner"/>} title="Loading file info..."/>;
            } else {
                if (fileBrowserMode === BrowserMode.File && respStatus) {
                    if (fileBrowserStore.selectedTab === FileInfoTabs.INFO) {
                        return <Pre className="file-info-pre">{fileBrowserStore.fileInfo}</Pre>;
                    } else if (fileBrowserStore.selectedTab === FileInfoTabs.HEADER) {
                        return <Pre className="file-info-pre">{fileBrowserStore.headers}</Pre>;
                    } // probably more tabs will be added in the future
                } else if ((fileBrowserMode === BrowserMode.RegionImport || fileBrowserMode === BrowserMode.RegionExport) && fileBrowserStore.regionFileInfo) {
                    return <Pre className="file-info-pre">{fileBrowserStore.regionFileInfo.join("\n")}</Pre>;
                } else if (fileBrowserMode === BrowserMode.Catalog && respStatus && fileBrowserStore.catalogFileInfor) {
                    if (fileBrowserStore.selectedTab === FileInfoTabs.INFO) {
                        return (
                            <Pre className="file-info-pre">
                                <Text>{fileBrowserStore.catalogFileInfor.description}</Text>
                            </Pre>
                        );
                    } else if (fileBrowserStore.selectedTab === FileInfoTabs.HEADER) {
                        const table = fileBrowserStore.catalogHeaderDataset;
                        const tableProps: TableComponentProps = {
                            type: TableType.Normal,
                            dataset: table.columnsData,
                            columnHeaders: table.columnHeaders,
                            numVisibleRows: fileBrowserStore.catalogHeaders.length
                        };
                        return (
                            <Pre className="file-header-pre-table">
                                <TableComponent {... tableProps}/>
                            </Pre>);
                    }
                } 
                else {
                    return <NonIdealState className="non-ideal-state-file" icon="document" title="Cannot open file!" description={fileBrowserStore.responseErrorMessage + " Select another file from the list on the left"}/>;
                }
            }
        }
        return <NonIdealState className="non-ideal-state-file" icon="document" title="No file selected" description="Select a file from the list on the left"/>;
    };

    private renderActionButton(browserMode: BrowserMode, appending: boolean) {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;

        if (browserMode === BrowserMode.File) {
            if (appending) {
                return (
                    <Tooltip content={"Append this file as a new frame"}>
                        <AnchorButton
                            intent={Intent.PRIMARY}
                            disabled={this.props.appStore.fileLoading || !fileBrowserStore.selectedFile || !fileBrowserStore.fileInfoResp || fileBrowserStore.loadingInfo}
                            onClick={this.loadSelectedFile}
                            text="Append"
                        />
                    </Tooltip>);
            } else {
                return (
                    <Tooltip content={"Close any existing frames and load this file"}>
                        <AnchorButton
                            intent={Intent.PRIMARY}
                            disabled={this.props.appStore.fileLoading || !fileBrowserStore.selectedFile || !fileBrowserStore.fileInfoResp || fileBrowserStore.loadingInfo}
                            onClick={this.loadSelectedFile}
                            text="Load"
                        />
                    </Tooltip>
                );
            }
        } else if (browserMode === BrowserMode.RegionImport) {
            return (
                <Tooltip content={"Load a region file for the currently active frame"}>
                    <AnchorButton
                        intent={Intent.PRIMARY}
                        disabled={this.props.appStore.fileLoading || !fileBrowserStore.selectedFile || !fileBrowserStore.fileInfoResp || fileBrowserStore.loadingInfo || !this.props.appStore.activeFrame}
                        onClick={this.loadSelectedFile}
                        text="Load Region"
                    />
                </Tooltip>
            );
        } else if (browserMode === BrowserMode.Catalog) {
            return (
                <Tooltip content={"Load a catalog file for the currently active frame"}>
                    <AnchorButton
                        intent={Intent.PRIMARY}
                        disabled={this.props.appStore.fileLoading || !fileBrowserStore.selectedFile || !fileBrowserStore.fileInfoResp || fileBrowserStore.loadingInfo || !this.props.appStore.activeFrame}
                        onClick={this.loadSelectedFile}
                        text="Load Catalog"
                    />
                </Tooltip>
            );
        } else {
            const frame = this.props.appStore.activeFrame;
            return (
                <Tooltip content={"Export all regions for the currently active frame"}>
                    <AnchorButton
                        intent={Intent.PRIMARY}
                        disabled={!FileBrowserDialogComponent.ValidateFilename(fileBrowserStore.exportFilename) || !frame || frame.regionSet.regions.length <= 1}
                        onClick={this.handleExportRegionsClicked}
                        text="Export Regions"
                    />
                </Tooltip>
            );
        }
    }

    private renderExportFilenameInput() {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;

        const coordinateTypeMenu = (
            <Popover
                content={
                    <Menu>
                        <MenuItem text="World Coordinates" onClick={() => fileBrowserStore.setExportCoordinateType(CARTA.CoordinateType.WORLD)}/>
                        <MenuItem text="Pixel Coordinates" onClick={() => fileBrowserStore.setExportCoordinateType(CARTA.CoordinateType.PIXEL)}/>
                    </Menu>
                }
                position={Position.BOTTOM_RIGHT}
            >
                <Button minimal={true} rightIcon="caret-down">
                    {fileBrowserStore.exportCoordinateType === CARTA.CoordinateType.WORLD ? "World" : "Pixel"}
                </Button>
            </Popover>
        );

        const fileTypeMenu = (
            <Popover
                content={
                    <Menu>
                        <MenuItem text="CRTF Region File" onClick={() => fileBrowserStore.setExportFileType(CARTA.FileType.CRTF)}/>
                        <MenuItem text="DS9 Region File" onClick={() => fileBrowserStore.setExportFileType(CARTA.FileType.REG)}/>
                    </Menu>
                }
                position={Position.BOTTOM_RIGHT}
            >
                <Button minimal={true} rightIcon="caret-down">
                    {fileBrowserStore.exportFileType === CARTA.FileType.CRTF ? "CRTF" : "DS9"}
                </Button>
            </Popover>
        );

        let sideMenu = (
            <div>
                {fileTypeMenu}
                {coordinateTypeMenu}
            </div>
        );
        return <InputGroup autoFocus={true} placeholder="Enter file name" value={fileBrowserStore.exportFilename} onChange={this.handleExportInputChanged} rightElement={sideMenu}/>;
    }

    // Refresh file list to trigger the Breadcrumb re-rendering
    @action
    private refreshFileList() {
        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        switch (fileBrowserStore.browserMode) {
            case BrowserMode.Catalog:
                fileBrowserStore.catalogFileList = {...fileBrowserStore.catalogFileList};
                break;
            default:
                fileBrowserStore.fileList = {...fileBrowserStore.fileList};
                break;
        }
    }

    public render() {
        let className = "file-browser-dialog";
        if (this.props.appStore.darkTheme) {
            className += " bp3-dark";
        }

        const fileBrowserStore = this.props.appStore.fileBrowserStore;
        // console.log(fileBrowserStore)
        const dialogProps: IDialogProps = {
            icon: "folder-open",
            className: className,
            backdropClassName: "minimal-dialog-backdrop",
            canOutsideClickClose: false,
            lazy: true,
            isOpen: fileBrowserStore.fileBrowserDialogVisible,
            onClose: fileBrowserStore.hideFileBrowser,
            onOpened: () => this.refreshFileList(),
            title: "File Browser",
        };

        const actionButton = this.renderActionButton(fileBrowserStore.browserMode, fileBrowserStore.appendingFrame);

        let exportFileInput: React.ReactNode;
        let paneClassName = "file-panes";

        if (fileBrowserStore.browserMode === BrowserMode.RegionExport) {
            exportFileInput = this.renderExportFilenameInput();
        } else {
            paneClassName += " extended";
        }

        return (
            <DraggableDialogComponent dialogProps={dialogProps} minWidth={400} minHeight={400} defaultWidth={1200} defaultHeight={600} enableResizing={true}>
                <div className="file-path">
                    {this.pathItems &&
                    <Breadcrumbs
                        breadcrumbRenderer={this.renderBreadcrumb}
                        items={this.pathItems}
                    />
                    }
                </div>
                <div className="bp3-dialog-body">
                    <div className={paneClassName}>
                        <div className="file-list">
                            <FileListComponent
                                darkTheme={this.props.appStore.darkTheme}
                                files={fileBrowserStore.getfileListByMode}
                                fileBrowserMode={fileBrowserStore.browserMode}
                                selectedFile={fileBrowserStore.selectedFile}
                                selectedHDU={fileBrowserStore.selectedHDU}
                                onFileClicked={fileBrowserStore.selectFile}
                                onFileDoubleClicked={this.loadFile}
                                onFolderClicked={fileBrowserStore.selectFolder}
                            />
                        </div>
                        <div className="file-info-pane">
                            <Tabs id="info-tabs" onChange={this.handleTabChange} selectedTabId={fileBrowserStore.selectedTab}>
                                <Tab id={FileInfoTabs.INFO} title="File Information"/>
                                {(fileBrowserStore.browserMode === BrowserMode.File || fileBrowserStore.browserMode === BrowserMode.Catalog) &&
                                <Tab id={FileInfoTabs.HEADER} title="Header"/>
                                }
                            </Tabs>
                            {this.renderInfoPanel()}
                        </div>
                    </div>
                    {exportFileInput}
                </div>
                <div className="bp3-dialog-footer">
                    <div className="bp3-dialog-footer-actions">
                        <AnchorButton intent={Intent.NONE} onClick={fileBrowserStore.hideFileBrowser} disabled={this.props.appStore.fileLoading} text="Close"/>
                        {actionButton}
                    </div>
                </div>
                <Alert
                    isOpen={this.overwriteExistingFileAlertVisible}
                    confirmButtonText="Yes"
                    cancelButtonText="Cancel"
                    intent={Intent.DANGER}
                    onConfirm={this.handleOverwriteAlertConfirmed}
                    onCancel={this.handleOverwriteAlertDismissed}
                    canEscapeKeyCancel={true}
                >
                    This file exists. Are you sure to overwrite it?
                </Alert>
            </DraggableDialogComponent>
        );
    }

    private renderBreadcrumb = (props: IBreadcrumbProps) => {
        return (
            <Breadcrumb onClick={() => this.props.appStore.fileBrowserStore.selectFolder(props.target, true)}>
                {props.icon &&
                <Icon icon={props.icon}/>
                }
                {props.text}
            </Breadcrumb>
        );
    };

    @computed get pathItems() {
        // catalog file list root formate "/."
        let pathItems: IBreadcrumbProps[] = [{icon: "desktop", target: "."}];
        const fileList = this.props.appStore.fileBrowserStore.getfileListByMode;
        // console.log(fileList);
        if (fileList) {
            // console.log(fileList.directory)
            const path = fileList.directory;
            if (path && path !== ".") {
                const dirNames = path.split("/");
                let parentPath = "";
                if (dirNames.length) {
                    for (const dirName of dirNames) {
                        if (!dirName) {
                            continue;
                        }
                        if (dirName !== ".") {
                            parentPath += `/${dirName}`;
                            pathItems.push({
                                text: dirName,
                                target: parentPath
                            });
                        }
                    }
                }
            }
        }
        return pathItems;
    }
}
