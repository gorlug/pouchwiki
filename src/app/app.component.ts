import {Component} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {PageService} from "./page.service";
import {ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPage} from "./PouchWikiPage";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.sass"]
})
export class AppComponent {
    title = "pouchwiki";

    html$: BehaviorSubject<string> = new BehaviorSubject("Loading...");

    constructor(private pageService: PageService) {
        pageService.getPage("Home").subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.html$.next(page.toHtml());
        });
    }
}
