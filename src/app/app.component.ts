import {Component} from "@angular/core";
import * as marked from "marked";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.sass"]
})
export class AppComponent {
    title = "pouchwiki";

    html: string;

    constructor() {
        this.html = marked(`# Welcome to PouchWiki!

Rendered with marked.

* item1
* item2

[link](http://google.com)
`);
    }
}
