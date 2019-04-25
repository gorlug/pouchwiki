import {Component} from "@angular/core";
import {LoginService} from "./login.service";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.sass"]
})
export class AppComponent {
    title = "pouchwiki";


    constructor(public loginService: LoginService) {
    }
}
