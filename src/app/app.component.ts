import {Component, OnInit} from "@angular/core";
import {LoginService} from "./login.service";
import {LoggingService} from "./logging.service";
import {PageService} from "./page.service";
import {BehaviorSubject} from "rxjs";
import {SettingsService} from "./settings.service";

const LOG_NAME = "AppComponent";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.sass"]
})
export class AppComponent implements OnInit {
    title = "pouchwiki";

    isDarkTheme$ = new BehaviorSubject(false);

    constructor(public loginService: LoginService,
                private loggingService: LoggingService,
                private pageService: PageService,
                private settingsService: SettingsService) {
        this.subscribeToSettings(settingsService);
    }

    ngOnInit(): void {
    }

    private subscribeToSettings(settingsService: SettingsService) {
        this.settingsService.settings$.subscribe(settings => {
            this.isDarkTheme$.next(settings.darkTheme);
        });
    }
}
