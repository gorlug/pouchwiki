import {Injectable} from "@angular/core";
import {Logger, PouchDBDocumentGenerator, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiAttachment, PouchWikiPage, PouchWikiPageGenerator} from "./PouchWikiPage";
import {ActivatedRoute, ParamMap} from "@angular/router";
import {switchMap} from "rxjs/internal/operators/switchMap";
import {of} from "rxjs/internal/observable/of";
import {concatMap} from "rxjs/internal/operators/concatMap";
import {Observable, throwError} from "rxjs";
import {catchError, tap} from "rxjs/operators";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {AbstractPouchDBService} from "./AbstractPouchDBService";
import {LoggingService} from "./logging.service";
import {LoginCredentials, LoginService} from "./login.service";
import {fromPromise} from "rxjs/internal-compatibility";

const LOG_NAME = "PageService";

@Injectable({
    providedIn: "root"
})
export class PageService extends AbstractPouchDBService {

    constructor(protected loggingService: LoggingService,
                protected loginService: LoginService) {
        super(loggingService, loginService);
    }

    private getLogger() {
        return this.loggingService.getLogger();
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
                currentPage = PouchWikiPageToHtmlRenderer.sanitizeName(currentPage);
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

    getDBName(): string {
        return "pouchwiki";
    }

    getExternalDBName(credentials: LoginCredentials): string {
        return credentials.db;
    }

    getGenerator(): PouchDBDocumentGenerator<any> {
        return new PouchWikiPageGenerator();
    }

    getAttachmentData(page: PouchWikiPage, name: string, log: Logger): Observable<ValueWithLogger> {
        const startLog = log.start(LOG_NAME, "getAttachmentData of page " + page.getName()
            + " and name " + name,
            {page: page.getName(), name: name});
        return fromPromise(this.getDB().getPouchDB().getAttachment(page.getId(), name)).pipe(
            concatMap(blob => {
                const url = URL.createObjectURL(blob);
                startLog.complete();
                return log.addTo(of(url));
            })
        );
    }

    openAttachment(page: PouchWikiPage, name: string, log: Logger) {
        const startLog = this.logStart(log, page, name);
        return this.getAttachmentData(page, name, log).pipe(
            tap((result: ValueWithLogger) => {
                window.open(result.value);
                startLog.complete();
            })
        );
    }

    private logStart(log: Logger, page: PouchWikiPage, name: string,
                     dsc = "openAttachment") {
        return log.start(LOG_NAME, dsc,
            {page: page.getName(), attachment: name});
    }

    saveAttachment(page: PouchWikiPage, attachment: PouchWikiAttachment, log: Logger) {
        const startLog = this.logStart(log, page, attachment.name, "saveAttachment");
        return fromPromise(this.getDB().getPouchDB().putAttachment(
            page.getId(), attachment.name, page.getRev(), attachment.data, attachment.content_type
        )).pipe(
            concatMap(() => {
                startLog.complete();
                return this.getPage(page.getName(), log);
            })
        );
    }

    deleteAttachment(page: PouchWikiPage, name: string, log: Logger):
            Observable<ValueWithLogger> {
        const startLog = this.logStart(log, page, name, "deleteAttachment");
        return fromPromise(this.getDB().getPouchDB().removeAttachment(page.getId(), name,
            page.getRev())).pipe(
                concatMap(() => {
                    startLog.complete();
                    return this.getDB().getDocument(page.getId(), log);
                }),
        );
    }
}
