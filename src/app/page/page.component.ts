import {AfterViewInit, Component, OnInit} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {PageService} from "../page.service";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage} from "../PouchWikiPage";
import {ActivatedRoute, NavigationStart, Router} from "@angular/router";
import {filter} from "rxjs/operators";
import {LoggingService} from "../logging.service";

const LOG_NAME = "PageComponent";

@Component({
    selector: "app-page",
    templateUrl: "./page.component.html",
    styleUrls: ["./page.component.sass"]
})
export class PageComponent implements OnInit, AfterViewInit {

    html$: BehaviorSubject<string> = new BehaviorSubject("Loading...");
    pageName$: BehaviorSubject<string> = new BehaviorSubject("");
    pageExists = false;
    currentPage: PouchWikiPage;

    constructor(private pageService: PageService,
                private route: ActivatedRoute,
                private router: Router,
                private loggingService: LoggingService) {
    }

    private getLogger() {
        return this.loggingService.getLogger();
    }

    ngOnInit() {
        this.listenForBackButton();
    }

    private listenForBackButton() {
        this.router.events.pipe(
            filter(event => {
                return (event instanceof NavigationStart);
            })
        ).subscribe((event: NavigationStart) => {
            console.log(event, this.pageExists);
            if (event.restoredState !== null && !this.pageExists) {
                this.refresh();
            }
        });
    }

    private refresh() {
        window.location.reload();
    }

    delete() {
        const log = this.getLogger();
        const pageName = this.pageName$.getValue();
        log.logMessage(LOG_NAME, "delete", {pageName});
        if (confirm(`Delete page ${pageName}?`)) {
            this.pageService.getDB().deleteDocument(this.currentPage, log).subscribe(() => {
                this.refresh();
            });
        } else {
            log.logMessage(LOG_NAME, "delete canceled", {pageName});
        }
    }

    ngAfterViewInit(): void {
        const log = Logger.getLoggerTrace();
        log.logMessage(LOG_NAME, "ngAfterViewInit");
        this.pageService.getPageFromRoute(this.route, log).subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.currentPage = page;
            this.pageName$.next(page.getName());
            this.html$.next(page.toHtml());
            this.pageExists = true;
        }, pageName => {
            this.pageExists = false;
            this.pageName$.next(pageName);
            this.html$.next("page not found");
        });
    }
}
