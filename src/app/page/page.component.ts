import {AfterViewInit, Component, OnInit} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {PageService} from "../page.service";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage} from "../PouchWikiPage";
import {ActivatedRoute, NavigationStart, Router} from "@angular/router";
import {concatMap, filter} from "rxjs/operators";
import {LoggingService} from "../logging.service";
import {PouchWikiPageToHtmlRenderer} from "../renderer";
import {DomSanitizer} from "@angular/platform-browser";
import {fromPromise} from "rxjs/internal-compatibility";
import {Location} from "@angular/common";
import {BreadcrumbsService} from "../breadcrumbs.service";

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
    doesNotExist$ = new BehaviorSubject(false);

    constructor(private pageService: PageService,
                private route: ActivatedRoute,
                private router: Router,
                private loggingService: LoggingService,
                private sanitizer: DomSanitizer,
                private location: Location,
                public breadcrumbsService: BreadcrumbsService) {
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
            if (event.restoredState !== null) {
                const log = this.loggingService.getLogger();
                log.logMessage(LOG_NAME, "backButton");
                fromPromise(this.router.navigateByUrl(window.location.hash.substring(1))).subscribe(() => {
                    this.loadPageFromRoute(log);
                });
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
        this.loadPageFromRoute(log);
    }

    private loadPageFromRoute(log) {
        const observable = this.pageService.getPageFromRoute(this.route, log);
        this.loadPageFromObservable(observable, log);
    }

    private loadPageFromObservable(observable, log) {
        observable.subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.currentPage = page;
            this.breadcrumbsService.addPage(page, log);
            this.pageName$.next(page.getName());
            this.renderPage(page, log);
            this.pageExists = true;
            this.doesNotExist$.next(false);
        }, pageName => {
            this.pageExists = false;
            this.pageName$.next(pageName);
            this.html$.next("page not found");
            this.doesNotExist$.next(true);
        });
    }

    private renderPage(page: PouchWikiPage, log: Logger) {
        const renderer = new PouchWikiPageToHtmlRenderer(this.pageService, page, this.sanitizer);
        renderer.render(this.html$, log);
    }

    rename() {
        const pageName = this.currentPage.getName();
        let newName = window.prompt("Enter new name for page " + pageName);
        const log = this.loggingService.getLogger();
        const startLog = log.start(LOG_NAME, `rename ${pageName} to ${newName}`,
            {page: pageName, newName}
        );
        if (newName === null || newName.length === 0) {
            startLog.complete();
            return;
        }
        newName = PouchWikiPageToHtmlRenderer.sanitizeName(newName);
        this.pageService.rename(this.currentPage, newName, log).pipe(
            concatMap((result: ValueWithLogger) => {
                return result.log.addTo(
                    fromPromise(this.router.navigateByUrl("/page/" + newName))
                );
            })
        ).subscribe(next => {
            startLog.complete();
        }, error => {
            startLog.complete();
            window.alert(error);
        });
    }

    goBack() {
        const log = this.loggingService.getLogger();
        log.logMessage(LOG_NAME, "goBack");
        // fromPromise(this.router.navigateByUrl("/page/Home")).subscribe(() => {
        //     this.loadPageFromRoute(log);
        // });
        window.history.back();
    }
}
