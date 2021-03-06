import {Component, OnInit} from "@angular/core";
import {PageService} from "../page.service";
import {PouchWikiPageList} from "../PouchWikiPage";
import {LoggingService} from "../logging.service";

const LOG_NAME = "IndexComponent";

@Component({
    selector: "app-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.sass"]
})
export class IndexComponent implements OnInit {

    list: PouchWikiPageList;

    constructor(private pageService: PageService,
                private loggingService: LoggingService) {
        const log = this.getLogger();
        log.logMessage(LOG_NAME, "constructor");
        this.list = new PouchWikiPageList();
        this.list.subscribeTo(pageService.getDB(), log).subscribe(() => {});
        pageService.pageTitle$.next("Page index");
    }

    getLogger() {
        return this.loggingService.getLogger();
    }

    ngOnInit() {
    }

}
