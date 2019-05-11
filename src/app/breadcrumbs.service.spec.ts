import {TestBed} from "@angular/core/testing";

import {BreadcrumbsService} from "./breadcrumbs.service";
import {TestLoggingService} from "./login.service.spec";
import {Util} from "./util";
import {TestUtil, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {concatMap} from "rxjs/operators";
import {of, zip} from "rxjs";
import {PouchWikiPage} from "./PouchWikiPage";

const LOG_NAME = "BreadrcumbsServiceTest"

describe("BreadcrumbsService", () => {
    let loggingService: TestLoggingService;

    beforeAll(complete => {
        Util.loadLogDB().subscribe(result => {
            loggingService = new TestLoggingService(result.value);
            complete();
        });
    });
    beforeEach(() => TestBed.configureTestingModule({}));

    function getService() {
        const service: BreadcrumbsService = TestBed.get(BreadcrumbsService);
        return service;
    }

    function runTest(name: string, callback: () => any[]) {
        it(name, complete => {
            const log = loggingService.getLogger();
            const startLog = log.start(LOG_NAME, name);
            const steps = callback();
            const observable = TestUtil.operatorsToObservable(steps, log);
            TestUtil.testComplete(startLog, observable, complete);
        });
    }

    function addPageToBreadcrumbs(service, page) {
        return concatMap((result: ValueWithLogger) => {
            return service.addPage(page, result.log);
        });
    }

    function expectBreadcrumbs_length_toBe(service: BreadcrumbsService, expected = 0) {
        return concatMap((result: ValueWithLogger) => {
            const breadcrumbs: string[] = service.breadcrumbs$.getValue();
            expect(breadcrumbs.length).toBe(expected);
            return of(result);
        });
    }

    runTest("adding pages to the breadcrumbs should fill the breadcrumbs observable", () => {
        const service = getService();
        const page = new PouchWikiPage("some name");
        const page2 = new PouchWikiPage("another page");
        const steps = [
            initialBreadcrumbs_shouldBeEmpty(),
            addPageToBreadcrumbs(service, page),
            breadrcumbs_shoudContain_thatPage(),
            addASecondPage(),
            bothPages_shouldBe_inTheBreadcrumbs()
        ];

        return steps;


        function initialBreadcrumbs_shouldBeEmpty() {
            return expectBreadcrumbs_length_toBe(service);
        }


        function breadrcumbs_shoudContain_thatPage() {
            return [
                expectBreadcrumbs_length_toBe(service, 1),
                concatMap((result: ValueWithLogger) => {
                    const breadcrumbs: string[] = service.breadcrumbs$.getValue();
                    expect(breadcrumbs[0]).toBe(page.getName());
                    return of(result);
                })
            ];
        }

        function addASecondPage() {
            return addPageToBreadcrumbs(service, page2);
        }

        function bothPages_shouldBe_inTheBreadcrumbs() {
            return [
                expectBreadcrumbs_length_toBe(service, 2),
                concatMap((result: ValueWithLogger) => {
                    const breadcrumbs: string[] = service.breadcrumbs$.getValue();
                    expect(breadcrumbs[0]).toBe(page.getName());
                    expect(breadcrumbs[1]).toBe(page2.getName());
                    return of(result);
                })
            ];
        }

    });

    runTest("do not add the same page twice", () => {
        const service = getService();
        const page = new PouchWikiPage("some name");
        return [
            addPageToBreadcrumbs(service, page),
            addPageToBreadcrumbs(service, page),
            expectBreadcrumbs_length_toBe(service, 1)
        ];
    });

    runTest("breadcrumbs size should not go over a defined limit", () => {
        const service = getService();
        return [
            addThisManyPages(service.LIMIT + 2),
            thereShouldOnlyBe_theLastLimitPages()
        ];

        function addThisManyPages(size: number) {
            return concatMap((result: ValueWithLogger) => {
                const promises = [];
                for (let i = 1; i <= size; i++) {
                    promises.push(
                        service.addPage(
                            new PouchWikiPage("name" + i), result.log));
                }
                const promise = zip.apply(undefined, promises);
                return result.log.addTo(promise);
            });
        }

        function thereShouldOnlyBe_theLastLimitPages() {
            return [
                expectBreadcrumbs_length_toBe(service, service.LIMIT),
                concatMap((result: ValueWithLogger) => {
                    const breadcrumbs = service.breadcrumbs$.getValue();
                    expect(breadcrumbs[service.LIMIT - 1]).toBe("Name" + (service.LIMIT + 2));
                    return of(result);
                })
            ];
        }
    });
});
