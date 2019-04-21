import {Component, OnInit} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {PageService} from "../page.service";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage} from "../PouchWikiPage";
import {ActivatedRoute} from "@angular/router";

const LOG_NAME = "PageComponent";

@Component({
    selector: "app-page",
    templateUrl: "./page.component.html",
    styleUrls: ["./page.component.sass"]
})
export class PageComponent implements OnInit {

    html$: BehaviorSubject<string> = new BehaviorSubject("Loading...");
    pageName$: BehaviorSubject<string> = new BehaviorSubject("");

    constructor(private pageService: PageService,
                private route: ActivatedRoute) {
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
        }, error => {
            this.html$.next("page not found");
        });
    }

}
