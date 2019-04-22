import {Injectable} from "@angular/core";
import {Logger, PouchDBDocumentGenerator, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
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

const LOG_NAME = "PouchWikiPage";

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
}
