import {Injectable} from "@angular/core";
import {BehaviorSubject, of} from "rxjs";
import {LoggingService} from "./logging.service";
import {PouchWikiPage} from "./PouchWikiPage";
import {Logger} from "@gorlug/pouchdb-rxjs";

const LOG_NAME = "BreadcrumbsService";

@Injectable({
    providedIn: "root"
})
export class BreadcrumbsService {

    readonly LIMIT = 10;

    breadcrumbs$: BehaviorSubject<string[]> = new BehaviorSubject([]);

    constructor(private loggingService: LoggingService) {
    }

    addPage(page: PouchWikiPage, log: Logger) {
        const name = page.getName();
        log.logMessage(LOG_NAME, "add page " + name, {page: name});
        let breadcrumbs = this.breadcrumbs$.getValue();
        if (this.isPageAlreadyInBreadcrumbs(breadcrumbs, name)) {
            return log.addTo(of(false));
        }
        breadcrumbs = this.limitBreadcrumbsLength(breadcrumbs);
        breadcrumbs.push(name);
        this.breadcrumbs$.next(breadcrumbs);
        return log.addTo(of(name));
    }

    private limitBreadcrumbsLength(breadcrumbs) {
        if (breadcrumbs.length < this.LIMIT) {
            return breadcrumbs;
        }
        breadcrumbs = breadcrumbs.splice(1, this.LIMIT);
        return breadcrumbs;
    }

    private isPageAlreadyInBreadcrumbs(breadcrumbs: string[], name: string) {
        const filtered = breadcrumbs.filter(page => page === name);
        return filtered.length > 0;
    }
}
