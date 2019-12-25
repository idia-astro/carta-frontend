import * as React from "react";
import {observer} from "mobx-react";
import {IDialogProps} from "@blueprintjs/core";
import {DraggableDialogComponent} from "components/Dialogs";
import {FileInfoComponent, FileInfoType} from "components/FileInfo/FileInfoComponent";
import {AppStore} from "stores";
import "./FileInfoDialogComponent.css";

@observer
export class FileInfoDialogComponent extends React.Component<{ appStore: AppStore }> {

    render() {
        let className = "file-info-dialog";
        if (this.props.appStore.darkTheme) {
            className += " bp3-dark";
        }

        const appStore = this.props.appStore;

        const dialogProps: IDialogProps = {
            icon: "info-sign",
            className: className,
            backdropClassName: "minimal-dialog-backdrop",
            canOutsideClickClose: false,
            lazy: true,
            isOpen: appStore.fileInfoDialogVisible,
            onClose: appStore.hideFileInfoDialog,
            title: "File Info",
        };

        return (
            <DraggableDialogComponent dialogProps={dialogProps} minWidth={400} minHeight={400} defaultWidth={800} defaultHeight={600} enableResizing={true}>
                <div className="bp3-dialog-body">
                    <FileInfoComponent
                        infoTypes={[FileInfoType.IMAGE_FILE, FileInfoType.IMAGE_HEADER]}
                        fileInfoExtended={appStore.activeFrame ? appStore.activeFrame.frameInfo.fileInfoExtended : null}
                        regionFileInfo={""}
                        selectedTab={appStore.selectedFileInfoTab as FileInfoType}
                        handleTabChange={appStore.setSelectedFileInfoTab}
                        isLoading={false}
                        errorMessage={""}
                    />
                </div>
            </DraggableDialogComponent>
        );
    }
}
