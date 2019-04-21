import {Component, OnInit} from "@angular/core";
import {PageService} from "../page.service";
import {PouchWikiPageList} from "../PouchWikiPage";
import {Logger} from "@gorlug/pouchdb-rxjs";

const LOG_NAME = "IndexComponent";

@Component({
    selector: "app-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.sass"]
})
export class IndexComponent implements OnInit {

    list: PouchWikiPageList;

    constructor(private pageService: PageService) {
        const log = this.getLogger();
        log.logMessage(LOG_NAME, "constructor");
        this.list = new PouchWikiPageList();
        this.list.subscribeTo(pageService.db, log).subscribe(() => {});
    }

    getLogger() {
        return Logger.getLoggerTrace();
    }

    ngOnInit() {
    }

}
