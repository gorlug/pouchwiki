import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {LoginComponent} from "./login.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {
    AuthenticationError,
    AuthorizationError,
    CredentialsWithUrl,
    DBNotReachableError,
    LoginCredentialsAreNullError,
    LoginService
} from "../login.service";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {Observable, of, throwError} from "rxjs";
import {LoggingService} from "../logging.service";
import {MockOnlineService, TestLoggingService} from "../login.service.spec";
import {concatMap, skipWhile} from "rxjs/operators";
import {By} from "@angular/platform-browser";
import {Util} from "../util";

export class MockLoginService extends LoginService {

    credentials: CredentialsWithUrl;
    toBeThrown: any;

    login(credentials: CredentialsWithUrl, log: Logger): Observable<any> {
        this.credentials = credentials;
        if (this.toBeThrown !== undefined) {
            return throwError(this.toBeThrown);
        }
        return log.addTo(of(credentials));
    }

    throwErrorUponLogin(error: any) {
        this.toBeThrown = error;
    }

    // @ts-ignore
    protected loadLocalDB() {
        return concatMap((result: ValueWithLogger) => {
            return result.log.addTo(of(true));
        });
    }

    protected loadInitialValues() {
        return concatMap((result: ValueWithLogger) => {
            return result.log.addTo(of(true));
        });
    }
}

describe("LoginComponent", () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let loginService: MockLoginService;
    let loggingService: LoggingService;
    let onlineService: MockOnlineService;

    beforeAll(complete => {
        Util.loadLogDB().subscribe(result => {
            loggingService = new TestLoggingService(result.value);
            complete();
        });
    });

    beforeEach(async(() => {
        onlineService = new MockOnlineService();
        onlineService.online$.next(true);
        loginService = new MockLoginService(onlineService, loggingService);
        TestBed.configureTestingModule({
            declarations: [LoginComponent],
            imports: [MatFormFieldModule, MatInputModule, BrowserAnimationsModule],
            providers: [
                {provide: LoggingService, useValue: loggingService},
                {provide: LoginService, useValue: loginService}
            ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    function loadComponent() {
        return [
            concatMap((result: ValueWithLogger) => {
                fixture = TestBed.createComponent(LoginComponent);
                fixture.detectChanges();
                return fixture.componentInstance.afterViewInit$;
            }),
            skipWhile((result: ValueWithLogger) => {
                return !result.value;
            })
        ];
    }

    it("should create", () => {
        expect(component).toBeTruthy();
    });

    it("should create a credentials with url object on login", () => {
        const name = "user";
        const password = "password";
        const url = "http://example.com";
        const db = "db";
        component.login(name, password, url, db);
        const credentials: CredentialsWithUrl = loginService.credentials;
        expect(credentials.username).toBe(name);
        expect(credentials.password).toBe(password);
        expect(credentials.url).toBe(url);
        expect(credentials.db).toBe(db);
    });

    function getErrorElement() {
        return fixture.debugElement.query(By.css(".error"));
    }

    function getErrorText() {
        const errorElement = getErrorElement();
        return errorElement.nativeElement.textContent;
    }

    function expectShowingLoginError(message: string) {
        fixture.detectChanges();
        const errorText = getErrorText();
        expect(errorText).toBe(message);
    }

    it("should display a DBNotReachableError upon login", complete => {
        loginService.throwErrorUponLogin(new DBNotReachableError(loggingService.getLogger()));
        component.login("does not", "matter", "http://not-reachable", "db");
        expectShowingLoginError("URL cannot be reached");
        complete();
    });

    it("should display an AuthorizationError upon login", complete => {
        loginService.throwErrorUponLogin(new AuthorizationError(loggingService.getLogger()));
        component.login("not", "authorized", "http://db", "db");
        expectShowingLoginError("You are not authorized");
        complete();
    });

    it("should display an AuthenticationError upon login", complete => {
        loginService.throwErrorUponLogin(new AuthenticationError(loggingService.getLogger()));
        component.login("wrong", "password", "http://db", "db");
        expectShowingLoginError("Wrong username or password");
        complete();
    });

    it("should display an LoginCredentialsAreNull upon login", complete => {
        loginService.throwErrorUponLogin(new LoginCredentialsAreNullError(loggingService.getLogger()));
        component.login(null, null, "http://db", "db");
        expectShowingLoginError("Given login credentials were null");
        complete();
    });

    it("should display the error itself if no instance of the error is found", complete => {
        const message = "some random error";
        loginService.throwErrorUponLogin(message);
        component.login(null, null, "http://db", "db");
        expectShowingLoginError(message);
        complete();
    });

    it("the login error should disappear upon successful login", complete => {
        loginService.throwErrorUponLogin(new AuthenticationError(loggingService.getLogger()));
        component.login("wrong", "password", "http://db", "db");
        expectShowingLoginError("Wrong username or password");

        loginService.throwErrorUponLogin(undefined);
        component.login("right", "password", "http://db", "db");
        fixture.detectChanges();
        const errorElement = getErrorElement();
        expect(errorElement).toBeFalsy();

        complete();
    });
});
