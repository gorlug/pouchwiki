import {Component, OnInit} from "@angular/core";
import {AppVersion} from "../app.version";

@Component({
    selector: "app-about",
    templateUrl: "./about.component.html",
    styleUrls: ["./about.component.sass"]
})
export class AboutComponent implements OnInit {

    version = AppVersion.VERSION;

    constructor() {
    }

    ngOnInit() {
    }

}
