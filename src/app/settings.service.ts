import {Injectable} from "@angular/core";
import {
    DBValueWithLog,
    Logger,
    PouchDBDocument,
    PouchDBDocumentGenerator,
    PouchDBDocumentJSON,
    PouchDBWrapper,
    ValueWithLogger
} from "@gorlug/pouchdb-rxjs";
import {AppVersion} from "./app.version";
import {BehaviorSubject, of} from "rxjs";
import {LoggingService} from "./logging.service";
import {catchError, concatMap, tap} from "rxjs/operators";

const LOG_NAME = "SettingsService";

@Injectable({
    providedIn: "root"
})
export class SettingsService {

    static readonly DB_NAME = "settings";
    db: PouchDBWrapper;
    settings$: BehaviorSubject<Settings>;

    constructor(private loggingService: LoggingService) {
        const log = loggingService.getLogger();
        const startLog = log.start(LOG_NAME, "constructor");
        this.createEmptySettings();
        this.loadLocalSettings(log).subscribe(() => startLog.complete());
    }

    private createEmptySettings() {
        const settings = new Settings();
        this.settings$ = new BehaviorSubject<Settings>(settings);
    }

    private loadLocalSettings(log: Logger) {
        return PouchDBWrapper.loadLocalDB(SettingsService.DB_NAME, new SettingsGenerator(), log).pipe(
            concatMap((result: DBValueWithLog) => {
                this.db = result.value;
                return this.db.getDocument(Settings.DOC_ID, log);
            }),
            tap((result: ValueWithLogger) => {
                const settings: Settings = result.value;
                result.log.logMessage(LOG_NAME, "found existing settings")
                this.settings$.next(settings);
            }),
            catchError(() => {
                log.logMessage(LOG_NAME, "settings do not exist yet");
                return log.addTo(of(false));
            })
        );
    }

    saveSettings(settings: Settings, log: Logger) {
        return this.db.saveDocument(settings, log).pipe(
            tap((result: ValueWithLogger) => {
                settings = result.value;
                this.settings$.next(settings);
            })
        );
    }
}

interface SettingsDocument extends PouchDBDocumentJSON {
    darkTheme: boolean;
}

export class Settings extends PouchDBDocument<SettingsDocument> {

    static readonly DOC_ID = "settings";

    darkTheme = false;

    constructor() {
        super();
        this._id = Settings.DOC_ID;
        this.docVersion = AppVersion.VERSION;
    }

    protected addValuesToJSONDocument(json: SettingsDocument): any {
        json.darkTheme = this.darkTheme;
    }

    protected getNameOfDoc(): string {
        return "Settings";
    }

}

class SettingsGenerator extends PouchDBDocumentGenerator<Settings> {

    protected createDocument(json: SettingsDocument): Settings {
        const settings = new Settings();
        settings.darkTheme = json.darkTheme;
        return settings;
    }

}
