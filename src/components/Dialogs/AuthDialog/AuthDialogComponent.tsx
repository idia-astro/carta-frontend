import * as React from "react";
import {observer} from "mobx-react";
import {computed, observable} from "mobx";
import {AnchorButton, Classes, Dialog, FormGroup, InputGroup, Intent} from "@blueprintjs/core";
import {AppStore} from "stores";
import "./AuthDialogComponent.css";

const KEYCODE_ENTER = 13;

@observer
export class AuthDialogComponent extends React.Component<{ appStore: AppStore }> {
    @observable username: string = "";
    @observable password: string = "";
    @observable isAuthenticating: boolean;
    @observable errorString: string;

    @computed get signInEnabled() {
        return this.username && this.password && !this.isAuthenticating;
    }

    public render() {
        const appStore = this.props.appStore;
        let className = "auth-dialog";
        if (appStore.darkTheme) {
            className += " bp3-dark";
        }

        return (
            <Dialog icon="key" className={className} canEscapeKeyClose={false} canOutsideClickClose={false} isOpen={appStore.authDialogVisible} isCloseButtonShown={false} title="Sign In">
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup helperText={this.errorString} intent={this.errorString ? "danger" : "none"}>
                        <InputGroup placeholder="Username" value={this.username} onChange={this.handleUsernameInput} onKeyDown={this.handleKeyDown} autoFocus={true}/>
                        <InputGroup placeholder="Password" value={this.password} onChange={this.handlePasswordInput} onKeyDown={this.handleKeyDown} type="password"/>
                    </FormGroup>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <AnchorButton intent={Intent.PRIMARY} onClick={this.onSignInClicked} disabled={!this.signInEnabled} text="Sign In"/>
                        <AnchorButton intent={Intent.WARNING} onClick={this.onAnonymousSignInClicked} disabled={this.isAuthenticating} text="Anonymous User"/>
                    </div>
                </div>
            </Dialog>
        );
    }

    private handleKeyDown = (ev) => {
        if (ev.keyCode === KEYCODE_ENTER && this.signInEnabled) {
            this.onSignInClicked();
        }
    };

    handleUsernameInput = (ev: React.FormEvent<HTMLInputElement>) => {
        this.username = ev.currentTarget.value;
    };

    handlePasswordInput = (ev: React.FormEvent<HTMLInputElement>) => {
        this.password = ev.currentTarget.value;
    };

    onSignInClicked = () => {
        this.isAuthenticating = true;
        const appStore = this.props.appStore;
        appStore.backendService.authenticate(this.username, this.password).then(res => {
            this.isAuthenticating = false;
            if (res.ok) {
                res.json().then(responseData => {
                    if (responseData && responseData.username && responseData.token && responseData.socket) {
                        // Add delay to allow backend server to start listening
                        setInterval(() => {
                            appStore.backendService.setAuthToken(responseData.token);
                            appStore.setUsername(responseData.username);
                            appStore.connectToServer(responseData.socket);
                            appStore.hideAuthDialog();
                        }, 50);
                    }
                }, parseError => {
                    this.errorString = parseError;
                });
            } else {
                if (res.status === 403) {
                    this.errorString = "Invalid user/password combination";
                } else {
                    this.errorString = `Authentication error: ${res.status}: ${res.statusText}`;
                }
            }
        }, err => {
            this.errorString = "Failed to connect to authentication service";
            this.isAuthenticating = false;
        });
    };

    onAnonymousSignInClicked = () => {
        const appStore = this.props.appStore;
        appStore.backendService.setAuthToken("");
        appStore.setUsername("");
        appStore.connectToServer();
        appStore.hideAuthDialog();
    };
}