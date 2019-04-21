import {Injectable} from "@angular/core";
import {CouchDBConf, DBValueWithLog, Logger, PouchDBWrapper, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage, PouchWikiPageGenerator} from "./PouchWikiPage";
import {ActivatedRoute, ParamMap} from "@angular/router";
import {switchMap} from "rxjs/internal/operators/switchMap";
import {of} from "rxjs/internal/observable/of";
import {concatMap} from "rxjs/internal/operators/concatMap";
import {Observable, throwError} from "rxjs";
import {catchError} from "rxjs/operators";

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

    getPage(name: string, log: Logger) {
        log.logMessage(LOG_NAME, "getPage " + name, {name});
        return this.db.getDocument(name, log);
    }

    getPageFromRoute(route: ActivatedRoute, log: Logger): Observable<ValueWithLogger> {
        log.logMessage(LOG_NAME, "getPageTextFromRoute");
        let currentPage;
        return route.paramMap.pipe(
            switchMap((params: ParamMap) => {
                currentPage = params.get("id");
                // currentPage = PouchWikiPageToHtmlRenderer.sanitizeName(currentPage);
                // console.log("currentPage", currentPage);
                return of(currentPage);
            }),
            concatMap((pageName: string) => {
               return this.getPage(pageName, log);
            }),
            catchError(() => {
                return throwError(currentPage);
            })
        );
    }
}
