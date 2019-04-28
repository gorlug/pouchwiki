import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {PageComponent} from "./page/page.component";
import {RouterModule, Routes} from "@angular/router";
import {ContentComponent} from "./content/content.component";
import {EditorComponent} from "./editor/editor.component";
import {IndexComponent} from "./index/index.component";
import {LoginComponent} from "./login/login.component";
import {MatButtonModule, MatFormFieldModule, MatInputModule, MatMenuModule, MatToolbarModule} from "@angular/material";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ServiceWorkerModule} from "@angular/service-worker";
import {environment} from "../environments/environment";
import {AttachmentsComponent} from "./attachments/attachments.component";
import {SearchComponent} from "./search/search.component";
import {SettingsComponent} from "./settings/settings.component";

const appRoutes: Routes = [
    {path: "page/:id", component: ContentComponent},
    {path: "edit/:id", component: EditorComponent},
    {path: "index", component: IndexComponent},
    {path: "attachments/:id", component: AttachmentsComponent},
    {path: "search", component: SearchComponent},
    {path: "settings", component: SettingsComponent},
    {path: "", redirectTo: "/page/Home", pathMatch: "full"},
];

@NgModule({
    declarations: [
        AppComponent,
        PageComponent,
        ContentComponent,
        EditorComponent,
        IndexComponent,
        LoginComponent,
        AttachmentsComponent,
        SearchComponent,
        SettingsComponent
    ],
    imports: [
        RouterModule.forRoot(appRoutes, {useHash: true}),
        BrowserModule,
        MatFormFieldModule, MatInputModule, BrowserAnimationsModule, MatToolbarModule, MatMenuModule,
        ServiceWorkerModule.register("ngsw-worker.js", {enabled: environment.production}), MatButtonModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
