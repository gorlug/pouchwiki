import {Component, OnInit} from "@angular/core";
import {LoggingService} from "../logging.service";
import {LoginCredentials, LoginService} from "../login.service";
import {BehaviorSubject} from "rxjs";
import {ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {concatMap} from "rxjs/operators";
import {Router} from "@angular/router";
import {SettingsService} from "../settings.service";

const LOG_NAME = "SettingsComponent";

@Component({
    selector: "app-settings",
    templateUrl: "./settings.component.html",
    styleUrls: ["./settings.component.sass"]
})
export class SettingsComponent implements OnInit {

    credentials$: BehaviorSubject<LoginCredentials>;
    darkThemeToggled$ = new BehaviorSubject(false);

    constructor(private loggingService: LoggingService,
                public loginService: LoginService,
                private router: Router,
                private settingsService: SettingsService) {
        this.subscribeToSettings();
    }

    ngOnInit() {
        this.initCredentials();
    }

    showLogin() {
        const log = this.loggingService.getLogger();
        log.logMessage(LOG_NAME, "showLogin");
        this.loginService.showLogin$.next({value: true, log: log});
    }

    private initCredentials() {
        this.credentials$ = new BehaviorSubject(new LoginCredentials());
        this.loginService.doExternalAuthentication$.pipe(
            concatMap((result: ValueWithLogger) => {
                return this.loginService.getSavedCredentials(result.log);
            })
        ).subscribe((next: ValueWithLogger) => {
            this.credentials$.next(next.value);
        });
    }

    logout() {
        const log = this.loggingService.getLogger();
        const startLog = log.start(LOG_NAME, "logout");
        this.loginService.logout(log).subscribe(() => {
            this.router.navigateByUrl("/page/Home");
            startLog.complete();
        });
    }

    toggleDarkTheme() {
        const log = this.loggingService.getLogger();
        const settings = this.settingsService.settings$.getValue();
        const startLog = log.start(LOG_NAME, "toggleDarkTheme darkTheme is: " + settings.darkTheme,
            {darkTheme: settings.darkTheme});
        settings.darkTheme = !settings.darkTheme;
        this.settingsService.saveSettings(settings, log).subscribe(() => startLog.complete());
    }

    private subscribeToSettings() {
        this.settingsService.settings$.subscribe(settings => {
            this.darkThemeToggled$.next(settings.darkTheme);
        });
    }
}
