import {Component, NgZone} from "@angular/core";
import {
    AuthenticationError,
    AuthorizationError,
    CredentialsWithUrl,
    DBNotReachableError,
    LoginCredentialsAreNullError,
    LoginService
} from "../login.service";
import {LoggingService} from "../logging.service";
import {BehaviorSubject} from "rxjs";
import {ObservableComponent} from "../ObservableComponent";

const LOG_NAME = "LoginComponent";

export interface ShowErrorValue {
    showError: boolean;
    message: string;
}

class MessageForError {
    type: any;
    message: string;

    constructor(type: any, message: string) {
        this.type = type;
        this.message = message;
    }

    isErrorOfType(error: any) {
        return error instanceof this.type;
    }
}

@Component({
    selector: "app-login",
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.sass"]
})
export class LoginComponent extends ObservableComponent {

    showError$ = new BehaviorSubject<ShowErrorValue>({showError: false, message: null});

    private errorToMessageMappings: MessageForError[] = [];

    constructor(
        private loginService: LoginService,
        private loggingService: LoggingService,
        private ngZone: NgZone) {
        super();
        this.setupErrorToMessageMappings();
    }

    private setupErrorToMessageMappings() {
        this.errorToMessageMappings.push(new MessageForError(DBNotReachableError, "URL cannot be reached"));
        this.errorToMessageMappings.push(new MessageForError(AuthenticationError, "Wrong username or password"));
        this.errorToMessageMappings.push(new MessageForError(AuthorizationError, "You are not authorized"));
        this.errorToMessageMappings.push(new MessageForError(LoginCredentialsAreNullError, "Given login credentials were null"));
    }

    login(username: string, password: string, url: string, db: string) {
        const credentials: CredentialsWithUrl = this.getCredentials(username, password, url, db);
        let log = this.loggingService.getLogger();
        log = log.start(LOG_NAME, "login", {username: username, url: url});
        this.loginService.login(credentials, log).subscribe((next) => {
            this.showError$.next({showError: false, message: null});
        }, error => this.handleLoginError(error, log));
    }

    private handleLoginError(error, log) {
        let message = error + "";
        message = this.determineErrorMessage(error, message);
        log.logError(LOG_NAME, "received error upon login", message);
        return this.showError$.next({showError: true, message: message});
    }

    private determineErrorMessage(error, message) {
        this.errorToMessageMappings.some(mapping => {
            if (mapping.isErrorOfType(error)) {
                message = mapping.message;
                return true;
            }
        });
        return message;
    }

    private getCredentials(username: string, password: string, url: string, db: string) {
        return {
            username: username,
            password: password,
            url: url,
            db: db
        };
    }
}
