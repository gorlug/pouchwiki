import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {PageComponent} from "./page/page.component";
import {RouterModule, Routes} from "@angular/router";
import {ContentComponent} from "./content/content.component";

const appRoutes: Routes = [
    {path: "page/:id", component: ContentComponent},
    {path: "", redirectTo: "/page/Home", pathMatch: "full"}
];

@NgModule({
    declarations: [
        AppComponent,
        PageComponent,
        ContentComponent
    ],
    imports: [
        RouterModule.forRoot(appRoutes, {useHash: true}),
        BrowserModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
