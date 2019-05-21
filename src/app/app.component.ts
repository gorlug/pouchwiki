import {Component, OnInit} from "@angular/core";
import {LoginService} from "./login.service";
import {LoggingService} from "./logging.service";
import {PageService} from "./page.service";
import {ActivatedRoute} from "@angular/router";
import {BehaviorSubject} from "rxjs";

const LOG_NAME = "AppComponent";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.sass"]
})
export class AppComponent implements OnInit {
    title = "pouchwiki";

    isDarkTheme = new BehaviorSubject(true);

    constructor(public loginService: LoginService,
                private loggingService: LoggingService,
                private pageService: PageService,
                private route: ActivatedRoute) {
    }

    ngOnInit(): void {
    }
}
