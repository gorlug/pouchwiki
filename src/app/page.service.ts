import {Injectable} from "@angular/core";
import {Logger, PouchDBDocument, PouchDBDocumentGenerator, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage, PouchWikiPageGenerator} from "./PouchWikiPage";
import {ActivatedRoute, ParamMap} from "@angular/router";
import {switchMap} from "rxjs/internal/operators/switchMap";
import {of} from "rxjs/internal/observable/of";
import {concatMap} from "rxjs/internal/operators/concatMap";
import {Observable, throwError} from "rxjs";
import {catchError} from "rxjs/operators";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {AbstractPouchDBService} from "./AbstractPouchDBService";
import {LoggingService} from "./logging.service";
import {LoginCredentials, LoginService} from "./login.service";
import {fromPromise} from "rxjs/internal-compatibility";
import {Log} from "@angular/core/testing/src/logger";

const LOG_NAME = "PouchWikiPage";

// export interface AttachmentValues {
//     name: string;
//     type: string;
//     data: string;
// }

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

    // storeAttachment(document: PouchDBDocument<any>, values: AttachmentValues, log: Logger) {
    //     log.logMessage(LOG_NAME, "storeAttachment", {name: values.name, type: values.type});
    //     return log.addTo(fromPromise(this.db.getPouchDB().putAttachment(document.getId(),
    //         values.name, values.data, values.type)));
    // }

    getAttachmentData(page: PouchWikiPage, name: string, log: Logger): Observable<ValueWithLogger> {
        log.logMessage(LOG_NAME, "getAttachmentData of page " + page.getName() + " and name " + name,
            {page: page.getName(), name: name});
        // return fromPromise(this.getDB().getPouchDB().get(page.getId(), {attachments: true})).pipe(
        //     concatMap((result: any) => {
        //         const attachmentValue = result._attachments[name].data;
        //         const url = URL.createObjectURL(attachmentValue);
        //         return log.addTo(of(url));
        //     })
        // );
        return fromPromise(this.getDB().getPouchDB().getAttachment(page.getId(), name)).pipe(
            concatMap(blob => {
                const url = URL.createObjectURL(blob);
                return log.addTo(of(url));
            })
        );
    }
}
