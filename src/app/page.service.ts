import {Injectable} from "@angular/core";
import {CouchDBConf, DBValueWithLog, Logger, PouchDBWrapper} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage, PouchWikiPageGenerator} from "./PouchWikiPage";

const LOG_NAME = "PouchWikiPage";

@Injectable({
    providedIn: "root"
})
export class PageService {

    db: PouchDBWrapper;

    constructor() {
        this.initDB();
    }

    private initDB() {
        const log = this.getLogger();
        const startLog = log.start(LOG_NAME, "init db");
        const conf = new CouchDBConf();
        conf.setBaseUrl("http://couchdb-test:5984");
        conf.setCredentials({
            username: "admin",
            password: "admin"
        });
        conf.setDBName("pouchwiki")
        conf.setGenerator(new PouchWikiPageGenerator());
        PouchDBWrapper.loadExternalDB(conf, log).subscribe((result: DBValueWithLog) => {
            this.db = result.value;
            result.log.complete();
            startLog.complete();
        });
    }

    private getLogger() {
        return Logger.getLoggerTrace();
    }

    getPage(name: string) {
        const log = this.getLogger();
        log.logMessage(LOG_NAME, "getPage " + name, {name});
        return this.db.getDocument(name, log);
    }
}
