import {Component, OnInit} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {PageService} from "../page.service";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage} from "../PouchWikiPage";
import {ActivatedRoute, NavigationStart, Router} from "@angular/router";
import {filter} from "rxjs/operators";

const LOG_NAME = "PageComponent";

@Component({
    selector: "app-page",
    templateUrl: "./page.component.html",
    styleUrls: ["./page.component.sass"]
})
export class PageComponent implements OnInit {

    html$: BehaviorSubject<string> = new BehaviorSubject("Loading...");
    pageName$: BehaviorSubject<string> = new BehaviorSubject("");
    pageExists = false;

    constructor(private pageService: PageService,
                private route: ActivatedRoute,
                private router: Router) {
    }

    private getLogger() {
        return Logger.getLoggerTrace();
    }

    ngOnInit() {
        const log = Logger.getLoggerTrace();
        log.logMessage(LOG_NAME, "ngOnInit");
        this.pageService.getPageFromRoute(this.route, log).subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.pageName$.next(page.getName());
            this.html$.next(page.toHtml());
            this.pageExists = true;
        }, pageName => {
            this.pageExists = false;
            this.pageName$.next(pageName);
            this.html$.next("page not found");
        });
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
                window.location.reload();
            }
        });
    }
}
