/* tslint:disable:variable-name */
import {TestBed} from "@angular/core/testing";

import {
    AuthenticationError,
    AuthorizationError,
    CredentialsFactory,
    CredentialsGenerator,
    CredentialsWithUrl,
    DBNotReachableError,
    ExternalDBUrlValidator,
    LoginCredentials,
    LoginCredentialsAreNullError,
    LoginCredentialsChecker,
    LoginCredentialsWithLogger,
    LoginFailedError,
    LoginResultWithLogger,
    LoginService
} from "./login.service";
import {BehaviorSubject, Observable, of} from "rxjs";
import {OnlineService} from "./online.service";
import {catchError, concatMap, skipWhile} from "rxjs/operators";
import {fromPromise} from "rxjs/internal-compatibility";
import {
    CouchDBConf,
    CouchDBWrapper,
    Credentials,
    DBValueWithLog,
    Logger,
    PouchDBWrapper,
    TestUtil,
    ValueWithLogger
} from "@gorlug/pouchdb-rxjs";
import {LoggingService} from "./logging.service";
import {Util} from "./util";

export class MockOnlineService extends OnlineService {
    public online$: BehaviorSubject<boolean> = new BehaviorSubject(false);
}

export class TestLoggingService extends LoggingService {

    db: PouchDBWrapper;
    trace: string;

    constructor(db: PouchDBWrapper) {
        super();
        this.db = db;
    }

    getLogger(name = "") {
        const log = Logger.getLoggerTraceWithDB(this.db, name);
        if (this.trace !== undefined) {
            log.setTrace(this.trace);
        }
        return log;
    }

    newTrace() {
        this.trace = Logger.generateTrace();
    }

}

let times_CredentialsAreValid_wasCalled = 0;

class LoginCredentialsCheckerSpy extends LoginCredentialsChecker {

    areCredentialsValid(loginCredentials: LoginCredentials, log: Logger): Observable<any> {
        times_CredentialsAreValid_wasCalled++;
        return super.areCredentialsValid(loginCredentials, log);
    }

}

CredentialsFactory.createCredentialsChecker = () => {
    return new LoginCredentialsCheckerSpy();
};

const LOCAL_COUCHDB_CREDENTIALS: Credentials = {
    username: "admin",
    password: "admin"
};
const COUCHDB_CONF = new CouchDBConf();
COUCHDB_CONF.setHost("couchdb-test");
COUCHDB_CONF.setHttp();
COUCHDB_CONF.setPort(5984);
COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);

const TEST_USER_CREDENTIALS: CredentialsWithUrl = {
    username: "testuser",
    password: "somepassword",
    url: COUCHDB_CONF.toBaseUrl()
};

const LOG_NAME = "LoginServiceTest";

let loggingService: TestLoggingService;

function createStartLog(dsc: string) {
    loggingService.newTrace();
    const log = loggingService.getLogger();
    const startLog = log.start(LOG_NAME, dsc);
    return {log, startLog};
}

function createLoginCredentials() {
    const loginCredentials = new LoginCredentials();
    loginCredentials.setCredentials(TEST_USER_CREDENTIALS);
    return loginCredentials;
}

describe("LoginService", () => {
    // beforeEach(() => TestBed.configureTestingModule({}));

    beforeAll(complete => {
        Util.loadLogDB().subscribe(result => {
            loggingService = new TestLoggingService(result.value);
            complete();
        });
    });

    interface LoginServiceWithLogger {
        value: LoginService;
        log: Logger;
    }

    function createLoginService(isOnline: boolean) {
        let log: Logger;
        return [
            concatMap((result: ValueWithLogger) => {
                log = result.log;
                result.log.logMessage(LOG_NAME, "create login service");
                const mockOnlineService = new MockOnlineService();
                mockOnlineService.online$.next(isOnline);
                TestBed.configureTestingModule({
                    providers: [
                        { provide: OnlineService, useValue: mockOnlineService },
                        { provide: LoggingService, useValue: loggingService}
                    ]
                });
                const loginService = TestBed.get(LoginService);
                return result.log.addTo(of(loginService));
            })
        ];
    }

    function getLocalDB() {
        return concatMap((result: ValueWithLogger) => {
            return PouchDBWrapper.loadLocalDB(LoginService.DB_NAME, new CredentialsGenerator(), result.log);
        });
    }

    function saveLocalCredentials() {
        return concatMap((result: DBValueWithLog) => {
            result.log.logMessage(LOG_NAME, "save local credentials");
            const loginCredentials = createLoginCredentials();
            return result.value.saveDocument(loginCredentials, result.log);
        });
    }

    function createCouchDBCredentialsDB() {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(LOG_NAME, "create couchdb credentials db");
            COUCHDB_CONF.setDBName(LoginService.DB_NAME);
            COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
            return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        });
    }

    function deleteCouchDBCredentialsDB() {
        let log: Logger;
        return [
            concatMap((result: ValueWithLogger) => {
                log = result.log;
                log.logMessage(LOG_NAME, "delete couchdb credentials db");
                COUCHDB_CONF.setDBName(LoginService.DB_NAME);
                return CouchDBWrapper.deleteCouchDBDatabase(COUCHDB_CONF, log);
            }),
            catchError(error => {
                log.logError(LOG_NAME, "delete couchdb credentials db error", "" + error,
                    {error: error});
                return log.addTo(of("some error"));
            }),
        ];
    }

    function createTestUser() {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(LOG_NAME, "create test user");
            return CouchDBWrapper.createUser(COUCHDB_CONF, TEST_USER_CREDENTIALS, result.log);
        });
    }

    function deleteTestUser() {
        let log;
        return [
            concatMap((result: ValueWithLogger) => {
                log = result.log;
                log.logMessage(LOG_NAME, "delete test user");
                return CouchDBWrapper.deleteUser(COUCHDB_CONF, TEST_USER_CREDENTIALS.username, result.log);
            }),
            catchError(error => {
                log.logError(LOG_NAME, "delete test user error", "" + error, {error: error});
                return log.addTo(of("some error"));
            }),
        ];
    }

    function authorizeTestUserForDB() {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(LOG_NAME, "auhtorize test user for db");
            COUCHDB_CONF.setDBName(LoginService.DB_NAME);
            return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [TEST_USER_CREDENTIALS.username], result.log);
        });
    }

    function authorizeAdminForDB() {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(LOG_NAME, "authorize admin for db");
            COUCHDB_CONF.setDBName(LoginService.DB_NAME);
            return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [LOCAL_COUCHDB_CREDENTIALS.username],
                result.log);
        });
    }

    function destroyLocalDB() {
        let log: Logger;
        return [
            concatMap((result: DBValueWithLog) => {
                log = result.log;
                log.logMessage(LOG_NAME, "destroy local db");
                return log.addTo(fromPromise(result.value.getPouchDB().destroy()));
            }),
            catchError(error => {
                log.logError(LOG_NAME, "delete local pouchdb error", error + "", {error: error});
                return log.addTo(of("some error"));
            })
        ];
    }

    function dbCleanup(complete: DoneFn, log: Logger) {
        const startLog: Logger = log.start(LOG_NAME, "cleaning up db and users");

        const steps = [
            deleteCouchDBCredentialsDB(),
            deleteTestUser(),
            getLocalDB(),
            destroyLocalDB()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    }

    function waitForInitialized() {
        let loginService: LoginService;
        return [
            concatMap((result: LoginServiceWithLogger) => {
                result.log.logMessage(LOG_NAME, "wait for initialized returning the initialized observable");
                loginService = result.value;
                return result.value.initialized$;
            }),
            skipWhile((result: LoginResultWithLogger) => {
                result.log.logMessage(LOG_NAME, "wait for service initialized skipwhile");
                const value = result.value;
                result.log.logMessage(LOG_NAME, "wait for service initialized skipWhile value: " + value,
                    {value: value});
                return !value;
            }),
            concatMap((result: ValueWithLogger) => {
                return result.log.addTo(of(loginService));
            })

        ];
    }

    function showLogin_shouldBe(expectedValue: boolean) {
        return concatMap((result: LoginServiceWithLogger) => {
            const showLoginResult = result.value.showLogin$.getValue();
            const value = showLoginResult.value;
            result.log.logMessage(LOG_NAME, `show login should be ${expectedValue} and is ${value}`,
                {expectedValue: expectedValue, value: value});
            expect(value === expectedValue).toBeTruthy("show login");
            return result.log.addTo(of(result.value));
        });
    }

    function externalAuthentication_shouldBe(expectedValue: boolean) {
        return concatMap((result: LoginServiceWithLogger) => {
            const external = result.value.doExternalAuthentication$.getValue();
            const value = external.value;
            result.log.logMessage(LOG_NAME, `external authentication should be ${expectedValue} and is ${value}`,
                {expectedValue: expectedValue, value: value});
            expect(value === expectedValue).toBeTruthy("external authentication");
            return result.log.addTo(of(value));
        });
    }

    function credentialsAreValid_wasCalled_onlyAsMuchAs(times: number) {
        return concatMap((result: ValueWithLogger) => {
            expect(times_CredentialsAreValid_wasCalled).toBe(times);
            return result.log.addTo(of(result.value));
        });
    }

    beforeEach(complete => {
        times_CredentialsAreValid_wasCalled = 0;
        loggingService.newTrace();
        dbCleanup(complete, loggingService.getLogger());
    });

    const showLoginIsTrue_ifOnline_and_noSavedCredentials = `should emit a showLogin true event if online and
 no saved credentials. external authentication event should be false`;
    it(showLoginIsTrue_ifOnline_and_noSavedCredentials, complete => {
        const {log, startLog} = createStartLog(showLoginIsTrue_ifOnline_and_noSavedCredentials);

        const steps = [
            createLoginService(true),
            waitForInitialized(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false),
            credentialsAreValid_wasCalled_onlyAsMuchAs(0)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });

    const ifOffline_showLoginFalseEvent_and_externalLoginFalse = "should emit a showLogin false event if offline and external login false";
    it(ifOffline_showLoginFalseEvent_and_externalLoginFalse, complete => {
        const {log, startLog} = createStartLog(ifOnline_andSavedCredentialsAreValid_showLoginFalse_and_externalAuthenticationTrue);

        const steps = [
            createLoginService(false),
            waitForInitialized(),
            showLogin_shouldBe(false),
            externalAuthentication_shouldBe(false),
            credentialsAreValid_wasCalled_onlyAsMuchAs(0)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });

    function areLoginCredentialsValid(credentials: CredentialsWithUrl, expected: boolean) {
        return [
            concatMap((result: ValueWithLogger) => {
                const loginCredentials = new LoginCredentials();
                loginCredentials.setCredentials(credentials);
                return new LoginCredentialsChecker().areCredentialsValid(loginCredentials, result.log);
            }),
            concatMap((result: {value: boolean, log: Logger}) => {
                const valid: boolean = result.value;
                result.log.logMessage(LOG_NAME, `expecting login credentials to be valid: ${expected} and are ${valid}`,
                    {valid: valid});
                expect(valid === expected).toBeTruthy();
                return result.log.addTo(of(result.value));
            })
        ];
    }

    function runAreCredentialsValid(credentials: CredentialsWithUrl) {
        return concatMap((result: ValueWithLogger) => {
            const loginCredentials = new LoginCredentials();
            loginCredentials.setCredentials(credentials);
            return new LoginCredentialsChecker().areCredentialsValid(loginCredentials, result.log);
        });
    }

    function expect_LoginFailedError(log: Logger) {
        return catchError(error => {
            expect(error instanceof LoginFailedError).toBeTruthy();
            return log.addTo(of(true));
        });
    }

    const loginCredentials_shouldBe_valid = "login credentials should be valid";
    it(loginCredentials_shouldBe_valid, complete => {
        const {log, startLog} = createStartLog(loginCredentials_shouldBe_valid);

        const steps = [
            createCouchDBCredentialsDB(),
            createTestUser(),
            authorizeTestUserForDB(),
            areLoginCredentialsValid(TEST_USER_CREDENTIALS, true)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

    });

    function thereShouldBe_no_normalReturn() {
        return concatMap((result: ValueWithLogger) => {
            fail("this should not be called");
            return result.log.addTo(of(result.value));
        });
    }

    const loginCredentials_shouldThrow_AuthorizationError_becausePermissionAreMissing = "login credentials should throw " +
        "AuthorizationError because of missing permission";
    it(loginCredentials_shouldThrow_AuthorizationError_becausePermissionAreMissing, complete => {
        const {log, startLog} = createStartLog(loginCredentials_shouldThrow_AuthorizationError_becausePermissionAreMissing);

        const steps = [
            createCouchDBCredentialsDB(),
            // if the db has no permissions at all set than everyone can write
            authorizeAdminForDB(),
            createTestUser(),
            runAreCredentialsValid(TEST_USER_CREDENTIALS),
            thereShouldBe_no_normalReturn(),
            expect_AuthorizationError()
            // expect_LoginFailedError(log)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function expect_AuthorizationError() {
            return catchError(error => {
                expect(error instanceof AuthorizationError).toBeTruthy();
                return log.addTo(of(true));
            });
        }
    });

    const loginCredentials_shouldThrow_AuthenticationError_becauseOf_missingUser = "login credentials should throw AuthenticationError " +
        "because of missing user";
    it(loginCredentials_shouldThrow_AuthenticationError_becauseOf_missingUser, complete => {
        const {log, startLog} = createStartLog(loginCredentials_shouldThrow_AuthenticationError_becauseOf_missingUser);

        const steps = [
            createCouchDBCredentialsDB(),
            authorizeAdminForDB(),
            createLoginService(true),
            runAreCredentialsValid(TEST_USER_CREDENTIALS),
            thereShouldBe_no_normalReturn(),
            expect_AuthenticationError()
            // expect_LoginFailedError(log)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function expect_AuthenticationError() {
            return catchError(error => {
                expect(error instanceof AuthenticationError).toBeTruthy();
                return log.addTo(of(true));
            });
        }
    });

    const validating_nullCredentials_shouldThrow_LoginCredentialsAreNullError = "validating null credentials should throw " +
        "LoginCredentialsAreNullError";
    it(validating_nullCredentials_shouldThrow_LoginCredentialsAreNullError, complete => {
        const {log, startLog} = createStartLog(validating_nullCredentials_shouldThrow_LoginCredentialsAreNullError);

        const steps = [
            tryTo_validate_nullCredentials(),
            thereShouldBe_no_normalReturn(),
            LoginCredentialsAreNullError_shouldBeThrown()
        ];

        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function tryTo_validate_nullCredentials() {
            return concatMap((result: LoginServiceWithLogger) => {
                return new LoginCredentialsChecker().areCredentialsValid(null, result.log);
            });
        }

        function LoginCredentialsAreNullError_shouldBeThrown() {
            return catchError(error => {
                expect(error instanceof LoginCredentialsAreNullError).toBeTruthy();
                return log.addTo(of(true));
            });
        }
    });

    const validatingCredentials_shouldThrow_dbNotReachableError = "validating credentials should throw DBNotReachableError";
    it(validatingCredentials_shouldThrow_dbNotReachableError, complete => {
        const {log, startLog} = createStartLog(validatingCredentials_shouldThrow_dbNotReachableError);

        const steps = [
            checkCredentials_with_unreachableDB(),
            shouldNotBeCalled(),
            expectDBNotReachableError()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function checkCredentials_with_unreachableDB() {
            return concatMap((result: ValueWithLogger) => {
                const credentials: CredentialsWithUrl = {
                    username: "something",
                    password: "something",
                    url: "http://not-reachable:5984"
                };
                const loginCredentials = new LoginCredentials();
                loginCredentials.setCredentials(credentials);
                return new LoginCredentialsChecker().areCredentialsValid(loginCredentials, result.log);
            });
        }

        function shouldNotBeCalled() {
            return concatMap((result: ValueWithLogger) => {
                fail("should not be called, error is expected");
                return result.log.addTo(of(result.value));
            });
        }

        function expectDBNotReachableError() {
            return catchError(error => {
                expect(error instanceof DBNotReachableError).toBeTruthy();
                return log.addTo(of(true));
            });
        }
    });

    const loadingSavedCredentials_shouldFail = "loading saved credentials should fail";
    it(loadingSavedCredentials_shouldFail, complete => {
        const {log, startLog} = createStartLog(loadingSavedCredentials_shouldFail);

        const steps = [
            createLoginService(true),
            thereShouldBe_noSavedCredentials()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function thereShouldBe_noSavedCredentials() {
            return [
                concatMap((result: LoginServiceWithLogger) => {
                    result.log.logMessage(LOG_NAME, `there should be no saved credentials`);
                    return result.value.getSavedCredentials(result.log);
                }),
                concatMap((result: LoginCredentialsWithLogger) => {
                    expect(result.value).toBeNull();
                    return result.log.addTo(of(result.value));
                }),
            ];
        }
    });

    const loadingSavedCredentials_shouldWork = "loading saved credentials should work";
    it(loadingSavedCredentials_shouldWork, complete => {
        const {log, startLog} = createStartLog(loadingSavedCredentials_shouldWork);

        const steps = [
            getLocalDB(),
            saveLocalCredentials(),
            createLoginService(false),
            areLoadedCredentials_fromService_theSame_asSaved()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function areLoadedCredentials_fromService_theSame_asSaved() {
            return [
                concatMap((result: LoginServiceWithLogger) => {
                    return result.value.getSavedCredentials(result.log);
                }),
                concatMap((result: LoginCredentialsWithLogger) => {
                    const savedCredentials = result.value;
                    const loginCredentials = createLoginCredentials();
                    result.log.logMessage(LOG_NAME, `expecting saved credentials to be the same`,
                        {savedCredentials: savedCredentials, loginCredentials: loginCredentials});
                    expect(loginCredentials.isThisTheSame(savedCredentials)).toBeTruthy();
                    return result.log.addTo(of(result.value));
                })
            ];
        }
    });

    const ifOnline_andSavedCredentialsAreValid_showLoginFalse_and_externalAuthenticationTrue =
        `should emit a showLogin false event if online and saved credentials and credentials are valid.
 should emit an external authentication event`;
    it(ifOnline_andSavedCredentialsAreValid_showLoginFalse_and_externalAuthenticationTrue, complete => {
        const {log, startLog} = createStartLog(ifOnline_andSavedCredentialsAreValid_showLoginFalse_and_externalAuthenticationTrue);

        const steps = [
            createCouchDBCredentialsDB(),
            createTestUser(),
            authorizeTestUserForDB(),
            getLocalDB(),
            saveLocalCredentials(),
            createLoginService(true),
            waitForInitialized(),
            showLogin_shouldBe(false),
            externalAuthentication_shouldBe(true)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });

    const ifOnline_andSavedCredentials_areInvalid_showLoginTrue_and_externalAuthenticationFalse =
        "if online and saved credentials are invalid show login true and external authentication false";
    it(ifOnline_andSavedCredentials_areInvalid_showLoginTrue_and_externalAuthenticationFalse, complete => {
        const {log, startLog} = createStartLog(ifOnline_andSavedCredentials_areInvalid_showLoginTrue_and_externalAuthenticationFalse);

        const steps = [
            createCouchDBCredentialsDB(),
            getLocalDB(),
            saveLocalCredentials(),
            createLoginService(true),
            waitForInitialized(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });

    function doLoginWithValidCredentials() {
        let loginService: LoginService;
        return [
            concatMap((result: LoginServiceWithLogger) => {
                loginService = result.value;
                result.log.logMessage(LOG_NAME, "login with valid credentials");
                return loginService.login(TEST_USER_CREDENTIALS, result.log);
            }),
            concatMap((result: ValueWithLogger) => {
                result.log.complete();
                return result.log.addTo((of(loginService)));
            })
        ];
    }

    function credentials_shouldHaveBeen_stored() {
        let log: Logger = loggingService.getLogger();
        return [
            getLocalDB(),
            concatMap((result: DBValueWithLog) => {
                log = result.log;
                return result.value.getDocument(LoginCredentials.DOC_ID, result.log);
            }),
            checkTheSavedCredentials(),
            catchError(error => {
                log.logError(LOG_NAME, "error during credentials save check", error + "", {
                    error: error
                });
                fail("LoginCredentials were not saved");
                return log.addTo(of(error));
            })
        ];
    }

    function checkTheSavedCredentials() {
        return concatMap((result: ValueWithLogger) => {
            const loginCredentials: LoginCredentials = result.value;
            const expected: LoginCredentials = new LoginCredentials();
            expected.setCredentials(TEST_USER_CREDENTIALS);
            [loginCredentials, expected].forEach(object => object.setDebug(true));
            expect(loginCredentials.isThisTheSame(expected)).toBeTruthy(
                "LoginCredentials should have been saved");
            result.log.logMessage(LOG_NAME, "check the saved credentials", {
                expected: expected.getDebugInfo(),
                loginCredentials: loginCredentials.getDebugInfo()
            });
            return result.log.addTo(of(result.value));
        });
    }

    const ifOnline_and_onValidLogin_showLoginIsFalse_and_doExternalTrue =
        "if online and on valid login show login is false and to external authentication is true";
    it(ifOnline_and_onValidLogin_showLoginIsFalse_and_doExternalTrue, complete => {
        const {log, startLog} = createStartLog(ifOnline_and_onValidLogin_showLoginIsFalse_and_doExternalTrue);

        let loginService: LoginService;
        const steps = [
            createCouchDBCredentialsDB(),
            createTestUser(),
            authorizeTestUserForDB(),
            createLoginService(true),
            saveLoginService_inVariable(),
            waitForInitialized(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false),
            returnLoginService(),
            doLoginWithValidCredentials(),
            showLogin_shouldBe(false),
            externalAuthentication_shouldBe(true),
            credentials_shouldHaveBeen_stored()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function saveLoginService_inVariable() {
            return concatMap((result: LoginServiceWithLogger) => {
                loginService = result.value;
                return result.log.addTo(of(loginService));
            });
        }

        function returnLoginService() {
            return concatMap((result: ValueWithLogger) => {
                return result.log.addTo(of(loginService));
            });
        }

    });

    const loggingIn_withAValidLogin_shouldOverwrite_previous_invalidLogin =
        "logging in with a valid login should overwrite previous invalid login";
    it(loggingIn_withAValidLogin_shouldOverwrite_previous_invalidLogin, complete => {
        const {log, startLog} = createStartLog(loggingIn_withAValidLogin_shouldOverwrite_previous_invalidLogin);

        let loginService;

        const steps = [
            createCouchDBCredentialsDB(),
            getLocalDB(),
            saveLocalCredentials(),
            createLoginService(true),
            saveLoginService_inVariable(),
            waitForInitialized(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false),
            createTestUser(),
            authorizeTestUserForDB(),
            loadLoginService_intoVariable(),
            doLoginWithValidCredentials(),
            credentials_shouldHaveBeen_stored()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function saveLoginService_inVariable() {
            return concatMap((result: LoginServiceWithLogger) => {
                loginService = result.value;
                return result.log.addTo(of(loginService));
            });
        }

        function loadLoginService_intoVariable() {
            return concatMap((result: ValueWithLogger) => {
                return result.log.addTo(of(loginService));
            });
        }
    });

    function doLoginWithInValidCredentials() {
        let loginService;
        return [
            concatMap((result: LoginServiceWithLogger) => {
                result.log.logMessage(LOG_NAME, "login with valid credentials");
                loginService = result.value;
                const credentials: CredentialsWithUrl = {
                    username: "someuser",
                    password: "wrong password",
                    url: TEST_USER_CREDENTIALS.url
                };
                return loginService.login(credentials, result.log);
            }),
            concatMap((result: ValueWithLogger) => {
                result.log.complete();
                return result.log.addTo((of(loginService)));
            })
        ];
    }

    const loginFails_because_credentialsInvalid = "login fails because of invalid credentials";
    it(loginFails_because_credentialsInvalid, complete => {
        const {log, startLog} = createStartLog(loginFails_because_credentialsInvalid);

        let loginService: LoginService;
        const steps = [
            createCouchDBCredentialsDB(),
            createLoginService(true),
            saveLoginService_inVariable(),
            waitForInitialized(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false),
            saveLoginService_inVariable(),
            doLoginWithInValidCredentials(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false),
            credentials_should_not_haveBeen_stored()
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function saveLoginService_inVariable() {
            return concatMap((result: LoginServiceWithLogger) => {
                loginService = result.value;
                return result.log.addTo(of(loginService));
            });
        }

        function credentials_should_not_haveBeen_stored() {
            return [
                getLocalDB(),
                concatMap((result: DBValueWithLog) => {
                    return result.value.getDocument(LoginCredentials.DOC_ID, result.log);
                }),
                concatMap((result: ValueWithLogger) => {
                    fail("LoginCredentials should not be saved");
                    return result.log.addTo((result.value));
                }),
                catchError(error => {
                    // all good, error is expected
                    return log.addTo(of(error));
                })
            ];
        }
    });

    const logout_shouldShowLogin_and_externalLoginFalse = "logout should show the login and set externalLogin to false";
    it(logout_shouldShowLogin_and_externalLoginFalse, complete => {
        const {log, startLog} = createStartLog(logout_shouldShowLogin_and_externalLoginFalse);

        let loginService: LoginService = null;
        let logoutSubject: BehaviorSubject<{value: boolean, log: Logger}> = null;
        const steps = [
            createCouchDBCredentialsDB(),
            createTestUser(),
            authorizeTestUserForDB(),
            createLoginService(true),
            saveLoginService_inVariable(),
            waitForInitialized(),
            doLoginWithValidCredentials(),
            showLogin_shouldBe(false),
            externalAuthentication_shouldBe(true),
            subscribeToLogout(),
            doLogout(),
            waitFor_logoutObservable_toFireTrue(),
            credentials_should_be_removed(),
            showLogin_shouldBe(true),
            externalAuthentication_shouldBe(false)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function saveLoginService_inVariable() {
            return concatMap((result: LoginServiceWithLogger) => {
                loginService = result.value;
                return result.log.addTo(of(loginService));
            });
        }

        function subscribeToLogout() {
            return concatMap((result: ValueWithLogger) => {
                logoutSubject = new BehaviorSubject({value: false, log: result.log});
                loginService.logout$.subscribe((next: {value: boolean, log: Logger}) => {
                    logoutSubject.next({value: next.value, log: next.log});
                });
                return result.log.addTo(of(loginService));
            });
        }

        function doLogout() {
            return concatMap((result: ValueWithLogger) => {
                return loginService.logout(result.log);
            });
        }

        function waitFor_logoutObservable_toFireTrue() {
            return [
                concatMap((result: ValueWithLogger) => {
                    return logoutSubject;
                }),
                skipWhile((result: {value: boolean, log: Logger}) => {
                    return !result.value;
                })
            ];
        }

        function credentials_should_be_removed() {
            return [
                getLocalDB(),
                concatMap((result: DBValueWithLog) => {
                    return result.value.getDocument(LoginCredentials.DOC_ID, result.log);
                }),
                concatMap((result: ValueWithLogger) => {
                    fail("LoginCredentials should have been removed");
                    return result.log.addTo((result.value));
                }),
                catchError(error => {
                    log.logError(LOG_NAME, "expected error on getDocument", error + "", {error: error});
                    expect(error + "").toContain("was not found");
                    return log.addTo(of(loginService));
                })
            ];
        }
    });

    const couchDB_shouldReturn_asReachable = "CouchDB should return as reachable";
    it(couchDB_shouldReturn_asReachable, complete => {
        const {log, startLog} = createStartLog(couchDB_shouldReturn_asReachable);

        const validUrl = "http://couchdb-test:5984";

        const steps = [
            runUrlValidationCheck(validUrl),
            validation_should_returnTrue()
        ];

        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function runUrlValidationCheck(url: string) {
            return concatMap((result: ValueWithLogger) => {
                const validator = new ExternalDBUrlValidator();
                return validator.validate(url, result.log);
            });
        }

        function validation_should_returnTrue() {
            return concatMap((result: {value: boolean, log: Logger}) => {
                expect(result.value).toBeTruthy();
                return result.log.addTo(of(result.value));
            });
        }
    });

    const couchDB_shouldReturn_asNotReachable = "CouchDB should return as not reachable";
    it(couchDB_shouldReturn_asNotReachable, complete => {
        const {log, startLog} = createStartLog(couchDB_shouldReturn_asNotReachable);

        const invalidUrl = "http://not-reachable:5984";

        const steps = [
            runUrlValidationCheck(invalidUrl),
            validation_should_returnFalse()
        ];

        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function runUrlValidationCheck(url: string) {
            return concatMap((result: ValueWithLogger) => {
                const validator = new ExternalDBUrlValidator();
                return validator.validate(url, result.log);
            });
        }

        function validation_should_returnFalse() {
            return concatMap((result: {value: boolean, log: Logger}) => {
                expect(result.value).toBeFalsy();
                return result.log.addTo(of(result.value));
            });
        }
    });

    const shouldThrowAnError_if_theCouchDB_cannotBeReached = "should throw an error if the CouchDB cannot be reached";
    it(shouldThrowAnError_if_theCouchDB_cannotBeReached, complete => {
        const {log, startLog} = createStartLog(shouldThrowAnError_if_theCouchDB_cannotBeReached);

        let loginService: LoginService;
        const steps = [
            createLoginService(true),
            saveLoginService_inVariable(),
            waitForInitialized(),
            /* doLogin_with_unreachableDatabase(),
            thisPart_shouldNotBeCalled(),
            anError_shouldHaveBeenThrown(),
            credentials_should_not_haveBeen_stored()*/
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function saveLoginService_inVariable() {
            return concatMap((result: LoginServiceWithLogger) => {
                loginService = result.value;
                return result.log.addTo(of(loginService));
            });
        }

        function doLogin_with_unreachableDatabase() {
            return concatMap((result: ValueWithLogger) => {
                result.log.logMessage(LOG_NAME, "login with unreachable database");
                const credentials: CredentialsWithUrl = {
                    username: "someuser",
                    password: "wrong password",
                    url: "http://does-not-exist:5984/"
                };
                return loginService.login(credentials, result.log);
            });
        }

        function thisPart_shouldNotBeCalled() {
            return concatMap((result: ValueWithLogger) => {
                fail("should not be called");
                return result.log.addTo(of(result.value));
            });
        }

        function anError_shouldHaveBeenThrown() {
            return catchError(error => {
                console.log(error);
                return log.addTo(of(false));
            });
        }

        function credentials_should_not_haveBeen_stored() {
            return [
                getLocalDB(),
                concatMap((result: DBValueWithLog) => {
                    return result.value.getDocument(LoginCredentials.DOC_ID, result.log);
                }),
                concatMap((result: ValueWithLogger) => {
                    fail("LoginCredentials should not be saved");
                    return result.log.addTo((result.value));
                }),
                catchError(error => {
                    // all good, error is expected
                    return log.addTo(of(error));
                })
            ];
        }
    });

    /*

    it(`should when online and executing login with a valid login send showLogin false and do external
 authentication true`, complete => {
    });
    */
});
