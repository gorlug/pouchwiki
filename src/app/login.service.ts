import {Injectable} from "@angular/core";

import {OnlineService} from "./online.service";
import {BehaviorSubject, Observable, of, Subject, throwError} from "rxjs";
import {LoggingService} from "./logging.service";
import {
    CouchDBConf,
    Credentials,
    DBValueWithLog,
    Logger,
    PouchDBDocument,
    PouchDBDocumentGenerator,
    PouchDBDocumentJSON,
    PouchDBWrapper,
    RxjsUtil,
    ValueWithLogger
} from "@gorlug/pouchdb-rxjs";
import {catchError, concatMap} from "rxjs/operators";
import {ajax, AjaxRequest} from "rxjs/ajax";
import {AppVersion} from "./app.version";

/*
import pouchdbDebug from "pouchdb-debug";
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable("*");
*/

export interface CredentialsWithUrl extends Credentials {
    url: string;
    db: string;
}

export interface LoginCredentialsDoc extends PouchDBDocumentJSON, CredentialsWithUrl {
}

export class LoginCredentials extends PouchDBDocument<LoginCredentialsDoc> {
    static readonly DOC_ID: string = "credentials";

    username: string;
    password: string;
    url: string;
    db: string;

    constructor() {
        super();
        this._id = LoginCredentials.DOC_ID;
        this.docVersion = AppVersion.VERSION;
        this.setSamenessChecks();
    }

    setCredentials(credentials: CredentialsWithUrl) {
        this.username = credentials.username;
        this.password = credentials.password;
        this.url = credentials.url;
        this.db = credentials.db;
    }

    getCouchDBCredentails(): Credentials {
        return {
            username: this.username,
            password: this.password
        };
    }

    protected addValuesToJSONDocument(json: LoginCredentialsDoc) {
        json.username = this.username;
        json.password = this.password;
        json.url = this.url;
        json.db = this.db;
    }

    protected getNameOfDoc(): string {
        return "LoginCredentials";
    }

    private setSamenessChecks() {
        this.samenessChecks = [
            (other: LoginCredentials) => {
                return this.username === other.username;
            },
            (other: LoginCredentials) => {
                return this.password === other.password;
            },
            (other: LoginCredentials) => {
                return this.url === other.url;
            },
            (other: LoginCredentials) => {
                return this.db === other.db;
            }
        ];
    }

    getDebugInfo() {
        const debugInfo: any = super.getDebugInfo();
        debugInfo.username = this.username;
        debugInfo.url = this.url;
        debugInfo.db = this.db;
        return debugInfo;
    }
}

export class CredentialsGenerator extends PouchDBDocumentGenerator<LoginCredentials> {

    protected createDocument(json: LoginCredentialsDoc): LoginCredentials {
        const credentials = new LoginCredentials();
        credentials.username = json.username;
        credentials.password = json.password;
        credentials.url = json.url;
        credentials.db = json.db;
        return credentials;
    }

}

export interface LoginResultWithLogger {
    value: boolean;
    log: Logger;
}

export interface LoginCredentialsWithLogger {
    value: LoginCredentials;
    log: Logger;
}

const LOG_NAME = "LoginService";

interface InitialValues {
    isOnline: boolean;
    authorized: boolean;
}

interface InitialValuesWithLogger {
    value: InitialValues;
    log: Logger;
}

const INITIAL_LOG_NAME = "InitialLoginValuesLoader";

class InitialLoginValuesLoader {

    private isOnline = false;
    private hasCredentials = false;
    private authorized = false;

    private loginService: LoginService;
    private onlineService: OnlineService;

    constructor(loginService: LoginService, onlineService: OnlineService) {
        this.loginService = loginService;
        this.onlineService = onlineService;
    }

    getInitialValues(log: Logger): Observable<InitialValuesWithLogger> {
        const startLog = log.start(INITIAL_LOG_NAME, "get initial values");
        const steps = [
            this.getValuesRequiredForAuthorizationCheck(),
            this.isAuthorizationCheckNecessary(),
            this.catchInvalidLoginError(log),
            this.returnInitialValues()
        ];
        return RxjsUtil.operatorsToObservableAndEndStartLog(steps, log, startLog);
    }

    catchInvalidLoginError(log: Logger) {
        return catchError(error => {
            if (error instanceof InvalidLoginError) {
                return log.addTo(of(true));
            }
            return throwError(error);
        });
    }

    private getValuesRequiredForAuthorizationCheck() {
        let isOnline = false;
        return [
            this.checkOnlineStatus(),
            concatMap((result: {value: boolean, log: Logger}) => {
               isOnline = result.value;
               return this.loginService.getSavedCredentials(result.log);
            }),
            concatMap((result: ValueWithLogger) => {
                this.hasCredentials = result.value !== null;
                return result.log.addTo(of(result.value));
            })
        ];
    }

    private returnInitialValues() {
        return concatMap((result: ValueWithLogger) => {
            const initialValues: InitialValues = {
                isOnline: this.isOnline,
                authorized: this.authorized
            };
            return result.log.addTo(of(initialValues));
        });
    }

    private isAuthorizationCheckNecessary() {
        return concatMap((result: ValueWithLogger) => {
            if (!this.isOnline || !this.hasCredentials) {
                return this.skipAuthorizationCheck(result);
            }
            return this.doAuthorizationCheck(result);
        });
    }

    private doAuthorizationCheck(result: ValueWithLogger) {
        result.log.logMessage(INITIAL_LOG_NAME, "online and saved credentials, check authorization");
        return RxjsUtil.operatorsToObservable([
            this.loadLocalCredentials(),
            this.checkLocalCredentialsAuthorization()
        ], result.log);
    }

    private skipAuthorizationCheck(result: ValueWithLogger) {
        result.log.logMessage(INITIAL_LOG_NAME, "skip auhtorization check", {
            isOnline: this.isOnline,
            hasCredentials: this.hasCredentials
        });
        return result.log.addTo(of(result.value));
    }

    private loadLocalCredentials() {
        return concatMap((result: ValueWithLogger) => {
            return this.loginService.getSavedCredentials(result.log);
        });
    }

    private checkLocalCredentialsAuthorization() {
        return [
            concatMap((result: LoginCredentialsWithLogger) => {
                return CredentialsFactory.createCredentialsChecker().areCredentialsValid(result.value, result.log);
            }),
            concatMap((result: { value: boolean, log: Logger }) => {
                this.authorized = result.value;
                return result.log.addTo(of(this.authorized));
            })
        ];
    }

    private checkOnlineStatus() {
        return concatMap((result: ValueWithLogger) => {
            return this.onlineService.online$.pipe(
                concatMap((isOnline: boolean) => {
                    this.isOnline = isOnline;
                    return result.log.addTo(of(isOnline));
                })
            );
        });
    }
}

export interface AppStatus {
    online: boolean;
    name: string;
    color: string;
}

@Injectable({
    providedIn: "root"
})
export class LoginService {

    static readonly DB_NAME = "login";

    showLogin$: BehaviorSubject<LoginResultWithLogger>;
    initialized$: BehaviorSubject<LoginResultWithLogger>;
    doExternalAuthentication$: BehaviorSubject<LoginResultWithLogger>;
    logout$: Subject<{value: boolean, log: Logger}> = new Subject();
    private db: PouchDBWrapper;

    status$: BehaviorSubject<AppStatus>;

    constructor(private onlineService: OnlineService,
                private loggingService: LoggingService) {
        const log = loggingService.getLogger();
        this.setSubjectsDefaultValue(log);
        this.initStatus();
        const initialSteps = [
            this.loadLocalDB(),
            this.loadInitialValues()
        ];
        const observable = RxjsUtil.operatorsToObservable(initialSteps, log);
        observable.subscribe((next: InitialValuesWithLogger) => this.triggerSubjectsInitial(next));

    }

    private setSubjectsDefaultValue(log) {
        this.showLogin$ = new BehaviorSubject({value: true, log: log});
        this.initialized$ = new BehaviorSubject({value: false, log: log});
        this.doExternalAuthentication$ = new BehaviorSubject({value: false, log: log});
    }

    private triggerSubjectsInitial(next: InitialValuesWithLogger) {
        const initialValues = next.value;
        const log = next.log;

        this.showLogin$.next({value: this.showLogin(initialValues), log: log});
        this.doExternalAuthentication$.next({value: this.doExternalAuthentication(initialValues), log: log});
        this.initialized$.next({value: true, log: log});
    }

    private showLogin(initial: InitialValues): boolean {
        return initial.isOnline && !initial.authorized;
    }

    private doExternalAuthentication(initialValues) {
        return initialValues.isOnline && initialValues.authorized;
    }

    protected loadLocalDB() {
        return [
            concatMap((result: ValueWithLogger) => {
                result.log.logMessage(LOG_NAME, "load local db");
                return PouchDBWrapper.loadLocalDB(LoginService.DB_NAME, new CredentialsGenerator(), result.log);
            }),
            concatMap((result: DBValueWithLog) => {
                this.db = result.value;
                return result.log.addTo(of(result.value));
            })
        ];
    }

    protected loadInitialValues() {
        return concatMap((result: ValueWithLogger) => {
            return new InitialLoginValuesLoader(this, this.onlineService).getInitialValues(result.log);
        });
    }

    login(credentials: CredentialsWithUrl, log: Logger) {
        const startLog = log.start(LOG_NAME, "login", {username: credentials.username, url: credentials.url});
        const loginCredentials = new LoginCredentials();
        loginCredentials.setCredentials(credentials);
        return RxjsUtil.operatorsToObservableAndEndStartLog([
            this.checkGivenCredentialsViaLogin(loginCredentials)
        ], log, startLog);
    }

    private checkGivenCredentialsViaLogin(loginCredentials: LoginCredentials) {
        return [
            concatMap((result: ValueWithLogger) => {
                return CredentialsFactory.createCredentialsChecker().areCredentialsValid(loginCredentials, result.log);
            }),
            concatMap((result: {value: boolean, log: Logger}) => {
                if (result.value) {
                    return this.triggerSuccessfulLogin(loginCredentials, result.log);
                }
                return result.log.addTo(of(result.value));
            })
        ];
    }

    private triggerSuccessfulLogin(loginCredentials: LoginCredentials, log: Logger) {
        return RxjsUtil.operatorsToObservable([
            concatMap((result: ValueWithLogger) => {
                this.showLogin$.next({value: false, log: result.log});
                this.doExternalAuthentication$.next({value: true, log: result.log});
                return this.saveCredentials(loginCredentials, result.log);
            })
        ], log);
    }

    getSavedCredentials(log: Logger): Observable<LoginCredentialsWithLogger> {
        const startLog = log.start(LOG_NAME, "get saved credentials");
        return RxjsUtil.operatorsToObservableAndEndStartLog([this.getSavedCredentialsOperator()],
            log, startLog);
    }

    private getSavedCredentialsOperator() {
        let log: Logger;
        return  [
            concatMap((result: ValueWithLogger) => {
                log = result.log;
                log.logMessage(LOG_NAME, "get saved credentials");
                return this.db.getDocument(LoginCredentials.DOC_ID, result.log);
            }),
            catchError(() => {
                log.logMessage(LOG_NAME, "there are no saved credentials");
                return log.addTo(of(null));
            })
        ];
    }

    logout(log: Logger) {
        const startLog = log.start(LOG_NAME, "logout");
        return RxjsUtil.operatorsToObservableAndEndStartLog([
            this.getSavedCredentialsOperator(),
            concatMap((result: LoginCredentialsWithLogger) => {
                this.showLogin$.next({value: true, log: result.log});
                this.doExternalAuthentication$.next({value: false, log: result.log});
                this.logout$.next({value: true, log: result.log});
                return this.db.deleteDocument(result.value, result .log);
            })
        ], log, startLog);
    }

    private saveCredentials(loginCredentials: LoginCredentials, log: Logger) {
        log.logMessage(LOG_NAME, "saving the credentials", {loginCredentials: loginCredentials});
        return this.getSavedCredentials(log).pipe(
            concatMap((result: LoginCredentialsWithLogger) => {
                return this.db.deleteDocument(result.value, result.log);
            }),
            catchError(error => {
                log.logMessage(LOG_NAME, "ignoring delete error, document probably was not saved in the first place",
                    error + "");
                return log.addTo(of(true));
            }),
            concatMap((result: ValueWithLogger) => {
                return this.db.saveDocument(loginCredentials, result.log);
            })
        );
    }

    private initStatus() {
        this.status$ = new BehaviorSubject(this.getOfflineStatus());
        this.doExternalAuthentication$.subscribe((next: LoginResultWithLogger) => {
            if (next.value) {
                this.status$.next(this.getOnlineStatus());
            } else {
                this.status$.next(this.getOfflineStatus());
            }
        });
    }

    private getOfflineStatus(): AppStatus {
        return {online: false, name: "Offline", color: "red"};
    }

    private getOnlineStatus(): AppStatus {
        return {online: true, name: "Online", color: "green"};
    }
}

const CHECKER_LOG_NAME = "LoginCredentialsChecker";

export class InvalidLoginError {
    log: Logger;

    constructor(log: Logger) {
        this.log = log;
    }
}

export class DBNotReachableError extends InvalidLoginError {}
export class LoginCredentialsAreNullError extends InvalidLoginError {}
export class AuthorizationError extends InvalidLoginError {}
export class AuthenticationError extends InvalidLoginError {}
export class LoginFailedError extends InvalidLoginError {}

export class LoginCredentialsChecker {

    private db: PouchDBWrapper;
    private testObject: LoginCredentials;

    areCredentialsValid(loginCredentials: LoginCredentials, log: Logger) {
        if (loginCredentials === null) {
            return throwError(new LoginCredentialsAreNullError(log));
        }
        const startLog = log.start(CHECKER_LOG_NAME, "are credentials valid",
            {loginCredentials: loginCredentials.getDebugInfo()});
        const couchDBConf = this.createCouchDBConf(loginCredentials);
        this.testObject = new LoginCredentials();
        const steps = [
            this.checkIfDBIsReachable(loginCredentials),
            this.loadExternalLoginDB(couchDBConf),
            this.tryToSaveADocument(),
            this.tryToDeleteADocument(),
            this.ifThereIs_noError_returnTrue(),
            this.ifThereIs_anError_throwTheAppropriateError(log)
        ];

        return RxjsUtil.operatorsToObservableAndEndStartLog(steps, log, startLog);
    }

    private checkIfDBIsReachable(loginCredentials: LoginCredentials) {
        return [
            concatMap((result: ValueWithLogger) => {
                const validator = CredentialsFactory.getExternalDBUrlValidator();
                return validator.validate(loginCredentials.url, result.log);
            }),
            concatMap((result: {value: boolean, log: Logger}) => {
                if (result.value) {
                    return result.log.addTo(of(result.value));
                }
                result.log.logMessage(CHECKER_LOG_NAME, "db is not reachable, throw DBNotReachableError");
                return throwError(new DBNotReachableError(result.log));
            })
        ];
    }

    private createCouchDBConf(loginCredentials: LoginCredentials) {
        const couchDBConf = new CouchDBConf();
        couchDBConf.setBaseUrl(loginCredentials.url);
        couchDBConf.setDBName(loginCredentials.db);
        couchDBConf.setCredentials(loginCredentials.getCouchDBCredentails());
        couchDBConf.setGenerator(new CredentialsGenerator());
        return couchDBConf;
    }

    private loadExternalLoginDB(conf: CouchDBConf) {
        return concatMap((result: ValueWithLogger) => {
            return PouchDBWrapper.loadExternalDB(conf, result.log);
        });
    }

    private tryToSaveADocument() {
        return concatMap((result: DBValueWithLog) => {
            this.db = result.value;
            return this.db.saveDocument(this.testObject, result.log);
        });
    }

    private tryToDeleteADocument() {
        return concatMap((result: ValueWithLogger) => {
            result.log.complete();
            return this.db.deleteDocument(this.testObject, result.log);
        });
    }

    private ifThereIs_noError_returnTrue() {
        return concatMap((result: ValueWithLogger) => {
                result.log.logMessage(CHECKER_LOG_NAME, "there was no error saving, getting and deleting a document, " +
                    "credentials must be valid");
                return result.log.addTo(of(true));
        });
    }

    private ifThereIs_anError_throwTheAppropriateError(log: Logger) {
        return catchError(error => {
            log.logMessage(CHECKER_LOG_NAME, "saving the document failed, credentials are not valid", {error: error});
            if (error instanceof DBNotReachableError) {
                return throwError(error);
            } else if (error.toString().includes("is incorrect")) {
                return throwError(new AuthenticationError(log));
            }
            return throwError(new AuthorizationError(log));
        });
    }

}

export const CredentialsFactory = {
    createCredentialsChecker: (): LoginCredentialsChecker => {
        return new LoginCredentialsChecker();
    },

    getExternalDBUrlValidator: (): ExternalDBUrlValidator => {
        return new ExternalDBUrlValidator();
    }
};

const VALIDATOR_LOG_NAME = "ExternalDBUrlValidator";

export class ExternalDBUrlValidator {

    validate(url: string, log: Logger): Observable<{value: boolean, log: Logger}> {
        const startLog = log.start(VALIDATOR_LOG_NAME, "validate",
            {url: url});
        const steps = [
            this.createRequest(url),
            this.ifRequestWasSuccessful_ReturnTrue(),
            this.ifRequestFailed_ReturnFalse(log)
        ];

        return RxjsUtil.operatorsToObservableAndEndStartLog(steps, log, startLog);
    }

    private createRequest(url: string) {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(VALIDATOR_LOG_NAME, "creating ajax request", {url: url});
            const request: AjaxRequest = {
                url: url,
                crossDomain: true,
            };
            const request$ = ajax(request);
            return result.log.addTo(request$);
        });
    }

    private ifRequestWasSuccessful_ReturnTrue() {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(VALIDATOR_LOG_NAME, "request was successful");
            return result.log.addTo(of(true));
        });
    }

    private ifRequestFailed_ReturnFalse(log: Logger) {
        return catchError(error => {
            log.logError(VALIDATOR_LOG_NAME, "request failed, url is not valid", error + "", {error : error});
            return log.addTo(of(false));
        });
    }
}
