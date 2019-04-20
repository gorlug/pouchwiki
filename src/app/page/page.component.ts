import {Component, OnInit} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {PageService} from "../page.service";
import {ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage} from "../PouchWikiPage";
import {ActivatedRoute, ParamMap} from "@angular/router";
import {switchMap} from "rxjs/operators";
import {of} from "rxjs/internal/observable/of";

@Component({
    selector: "app-page",
    templateUrl: "./page.component.html",
    styleUrls: ["./page.component.sass"]
})
export class PageComponent implements OnInit {

    html$: BehaviorSubject<string> = new BehaviorSubject("Loading...");

    constructor(private pageService: PageService,
                private route: ActivatedRoute) {
        // this.loadPage();
    }

    private loadPage(pageName = "Home") {
        this.pageService.getPage(pageName).subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.html$.next(page.toHtml());
        });
    }

    ngOnInit() {
        this.route.paramMap.pipe(
            switchMap((params: ParamMap) => {
                const pageName = params.get("id");
                return of(pageName);
            })
        ).subscribe((pageName: string) => {
            console.log("pageName", pageName);
            if (pageName !== null) {
                this.loadPage(pageName);
            }
        });
    }

}
