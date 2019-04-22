import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {PageComponent} from "./page/page.component";
import {RouterModule, Routes} from "@angular/router";
import {ContentComponent} from "./content/content.component";
import {EditorComponent} from "./editor/editor.component";
import {IndexComponent} from "./index/index.component";
import {LoginComponent} from "./login/login.component";
import {MatFormFieldModule, MatInputModule} from "@angular/material";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ServiceWorkerModule} from "@angular/service-worker";
import {environment} from "../environments/environment";

const appRoutes: Routes = [
    {path: "page/:id", component: ContentComponent},
    {path: "edit/:id", component: EditorComponent},
    {path: "index", component: IndexComponent},
    {path: "", redirectTo: "/page/Home", pathMatch: "full"}
];

@NgModule({
    declarations: [
        AppComponent,
        PageComponent,
        ContentComponent,
        EditorComponent,
        IndexComponent,
        LoginComponent
    ],
    imports: [
        RouterModule.forRoot(appRoutes, {useHash: true}),
        BrowserModule,
        MatFormFieldModule, MatInputModule, BrowserAnimationsModule,
        ServiceWorkerModule.register("ngsw-worker.js", {enabled: environment.production})
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
