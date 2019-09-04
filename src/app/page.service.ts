import {Injectable} from "@angular/core";
import {Logger, PouchDBDocumentGenerator, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiAttachment, PouchWikiPage, PouchWikiPageGenerator} from "./PouchWikiPage";
import {ActivatedRoute, ParamMap} from "@angular/router";
import {of} from "rxjs/internal/observable/of";
import {concatMap} from "rxjs/internal/operators/concatMap";
import {BehaviorSubject, Observable, throwError, zip} from "rxjs";
import {catchError, mergeMap, tap} from "rxjs/operators";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {AbstractPouchDBService} from "./AbstractPouchDBService";
import {LoggingService} from "./logging.service";
import {LoginCredentials, LoginService} from "./login.service";
import {fromPromise} from "rxjs/internal-compatibility";
// @ts-ignore
import PouchDB from "pouchdb-core";
// @ts-ignore
import pouchdb_find from "pouchdb-find";
import {Content} from "@angular/compiler/src/render3/r3_ast";
import * as moment from "moment";
import FindRequest = PouchDB.Find.FindRequest;

PouchDB.plugin(pouchdb_find);

const LOG_NAME = "PageService";

@Injectable({
    providedIn: "root"
})
export class PageService extends AbstractPouchDBService {

    pageTitle$ = new BehaviorSubject("Home");

    constructor(protected loggingService: LoggingService,
                protected loginService: LoginService) {
        super(loggingService, loginService);
    }

    private getLogger() {
        return this.loggingService.getLogger();
    }

    getPage(name: string, log: Logger) {
        const dbLoaded = this.dbLoaded$.getValue();
        log.logMessage(LOG_NAME, "getPage " + name + ", dbLoaded: " + dbLoaded, {name, dbLoaded});
        return this.waitForDBLoaded().pipe(
            concatMap(() => {
                return this.db.getDocument(name, log);
            })
        );
    }

    savePage(page: PouchWikiPage, log: Logger) {
        log.logMessage(LOG_NAME, "savePage");
        page.lastModified = moment();
        return this.waitForDBLoaded().pipe(
            concatMap(() => {
                return this.db.saveDocument(page, log);
            })
        );
    }

    getPageFromRoute(route: ActivatedRoute, log: Logger): Observable<ValueWithLogger> {
        log.logMessage(LOG_NAME, "getPageTextFromRoute");
        let currentPage;
        return route.paramMap.pipe(
            mergeMap((params: ParamMap) => {
                currentPage = this.determinePageFromRoute(params);
                return this.getPage(currentPage, log);
            }),
            catchError(() => {
                return throwError(currentPage);
            })
        );
    }

    private determinePageFromRoute(params: ParamMap) {
        let currentPage = params.get("id");
        currentPage = PouchWikiPageToHtmlRenderer.sanitizeName(currentPage);
        this.pageTitle$.next(currentPage);
        return currentPage;
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

    search(query: string, log: Logger) {
        const startLog = log.start(LOG_NAME, "search for query " + query, {query: query});
        const queries = [
            this.createPageNameQuery(query, log),
            this.createTextQuery(query, log)
        ];
        return zip.apply(undefined, queries).pipe(
            concatMap((results: []) => {
                const pages = this.collectPages(results).sort();
                return log.addTo(of(pages));
            })
        );
    }

    private createPageNameQuery(query: string, log: Logger) {
        return this.createQueryObservable({
            selector: {
                _id: {
                    // @ts-ignore
                    $regex: RegExp(query, "i"),
                },
            },
        });
    }

    private createTextQuery(query: string, log: Logger) {
        return this.createQueryObservable({
            selector: {
                text: {
                    // @ts-ignore
                    $regex: RegExp(query, "i"),
                },
            },
        });
    }

    private createQueryObservable(request: FindRequest<Content>) {
        return fromPromise(this.getDB().getPouchDB().find(request));
    }

    private collectPages(results: []) {
        const uniquePages = {};
        results.forEach((result: any) => {
            result.docs.forEach(doc => {
                uniquePages[doc._id] = true;
            });
        });
        return Object.keys(uniquePages);
    }

    rename(page: PouchWikiPage, newName: string, log: Logger) {
        newName = PouchWikiPageToHtmlRenderer.sanitizeName(newName);
        const startLog = log.start(LOG_NAME, `rename ${page.getName()} to ${newName}`,
            {page: page.getName(), newName});
        return this.checkIfPageAlreadyExists(newName, log).pipe(
            concatMap((result: ValueWithLogger) => {
                return this.copyPage(page, newName, log);
            }),
            concatMap((result: ValueWithLogger) => {
                startLog.complete();
                return this.getDB().deleteDocument(page, log);
            })
        );
    }

    private checkIfPageAlreadyExists(newName: string, log: Logger) {
        return this.getPage(newName, log).pipe(
            concatMap((result: ValueWithLogger) => {
                return throwError({exists: true});
            }),
            catchError(error => {
                if (error.exists) {
                    return throwError(`Page ${newName} already exists`);
                }
                return log.addTo(of(true));
            })
        );
    }

    private copyPage(page: PouchWikiPage, newName: string, log: Logger) {
        const startLog = log.start(LOG_NAME, `copy ${page.getName()} to ${newName}`,
            {page: page.getName(), newName});
        const newPage = page.copyToNewPage(newName);
        return this.savePage(newPage, log).pipe(
            tap(() => startLog.complete())
        );
    }
}
