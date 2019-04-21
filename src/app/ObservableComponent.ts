import {AfterContentChecked, AfterViewInit, OnInit} from "@angular/core";
import {BehaviorSubject, Subject} from "rxjs";
import {Logger} from "@gorlug/pouchdb-rxjs";

export class ObservableComponent implements AfterViewInit, AfterContentChecked, OnInit {

    afterViewInit$ = new BehaviorSubject({value: false, log: Logger.getLoggerTrace()});
    afterContentChecked$ = new Subject();
    afterNgOnInit$ = new BehaviorSubject({value: false, log: Logger.getLoggerTrace()});
    listenToAfterContentChecked = false;

    ngAfterViewInit(): void {
        this.afterViewInit$.next({value: true, log: Logger.getLoggerTrace()});
    }

    ngAfterContentChecked(): void {
        if (this.listenToAfterContentChecked) {
            console.log("after content checked");
            this.afterContentChecked$.next({value: true, log: Logger.getLoggerTrace()});
        }
    }

    ngOnInit(): void {
        this.afterNgOnInit$.next({value: true, log: Logger.getLoggerTrace()});
    }
}
