import {Component, OnInit} from "@angular/core";
import {LoggingService} from "../logging.service";
import {PageService} from "../page.service";
import {Subject} from "rxjs";
import {ValueWithLogger} from "@gorlug/pouchdb-rxjs";

const LOG_NAME = "SearchComponent";

@Component({
    selector: "app-search",
    templateUrl: "./search.component.html",
    styleUrls: ["./search.component.sass"]
})
export class SearchComponent implements OnInit {

    searchResults$: Subject<string[]> = new Subject();

    constructor(private loggingService: LoggingService,
                private pageService: PageService) {
        this.pageService.pageTitle$.next("Search");
    }

    ngOnInit() {
        const log = this.loggingService.getLogger();
        this.pageService.search("some", log).subscribe(result => {
            console.log(result);
        });
    }

    search(query: string) {
        const log = this.loggingService.getLogger();
        const startLog = log.start(LOG_NAME, "search for " + query, {query});
        if (query.length === 0) {
            return;
        }
        this.pageService.search(query, log).subscribe((result: ValueWithLogger) => {
            this.searchResults$.next(result.value);
            startLog.complete();
        });
    }
}
