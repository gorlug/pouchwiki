import {Component, OnInit} from "@angular/core";
import {LoginService} from "./login.service";
import {LoggingService} from "./logging.service";
import {PageService} from "./page.service";
import {ActivatedRoute} from "@angular/router";

const LOG_NAME = "AppComponent";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.sass"]
})
export class AppComponent implements OnInit {
    title = "pouchwiki";

    // pageTitle$ = new BehaviorSubject("Home");

    constructor(public loginService: LoginService,
                private loggingService: LoggingService,
                private pageService: PageService,
                private route: ActivatedRoute) {
    }

    ngOnInit(): void {
        // const log = this.loggingService.getLogger();
        // const startLog = log.start(LOG_NAME, "ngOnInit");
        // this.pageService.getPageFromRoute(this.route, log).subscribe((result: ValueWithLogger) => {
        //     const page: PouchWikiPage = result.value;
        //     this.pageTitle$.next(page.getName());
        //     startLog.complete();
        // });
    }
}
