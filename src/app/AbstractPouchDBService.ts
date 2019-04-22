import {CouchDBConf, DBValueWithLog, Logger, PouchDBDocumentGenerator, PouchDBWrapper} from "@gorlug/pouchdb-rxjs";
import {LoginCredentials, LoginCredentialsWithLogger, LoginResultWithLogger, LoginService} from "./login.service";
import {LoggingService} from "./logging.service";
import {concatMap} from "rxjs/operators";

const LOG_NAME = "AbstractPouchDBService";

export abstract class AbstractPouchDBService {

    protected db: PouchDBWrapper;

    constructor(protected loggingService: LoggingService, protected loginService: LoginService) {
        const log = loggingService.getLogger();
        log.logMessage(LOG_NAME, "constructor");
        this.loadLocalDB(log);
        this.subscribeToDoExternalAuthentication(loginService, log);
    }

    public abstract getDBName(): string;

    public abstract getGenerator(): PouchDBDocumentGenerator<any>;

    public abstract getExternalDBName(credentials: LoginCredentials): string;

    private subscribeToDoExternalAuthentication(loginService: LoginService, log: Logger) {
        log.logMessage(LOG_NAME, "subscribeToDoExternalAuthentication");
        loginService.doExternalAuthentication$.subscribe((next: LoginResultWithLogger) => {
            next.log.logMessage(LOG_NAME, "doExternalAuthenticationResult", {value: next.value});
            if (!next.value) {
               return;
            }
            this.loadExternalDB(next.log);
        });
    }

    private loadExternalDB(log: Logger) {
        const start = log.start(LOG_NAME, "loadExternalDB");
        this.loginService.getSavedCredentials(log).pipe(
            concatMap((result: LoginCredentialsWithLogger) => {
                const conf = new CouchDBConf();
                conf.setCredentials(result.value.getCouchDBCredentails());
                conf.setBaseUrl(result.value.url);
                conf.setDBName(this.getExternalDBName(result.value));
                conf.setGenerator(this.getGenerator());
                return PouchDBWrapper.loadExternalDB(conf, log);
            })
        ).subscribe((result: DBValueWithLog) => {
            PouchDBWrapper.syncDBs(this.db, result.value, result.log);
            start.complete();
        });
    }

    private loadLocalDB(log: Logger) {
        log.logMessage(LOG_NAME, "loadLocalDB");
        PouchDBWrapper.loadLocalDB(this.getDBName(),
            this.getGenerator(), log).subscribe((result: DBValueWithLog) => {
                this.db = result.value;
        });
    }

    getDB(): PouchDBWrapper {
        return this.db;
    }

}
