import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {PageComponent} from "./page/page.component";
import {RouterModule, Routes} from "@angular/router";
import {ContentComponent} from "./content/content.component";
import {EditorComponent} from "./editor/editor.component";
import {IndexComponent} from "./index/index.component";
import {LoginComponent} from "./login/login.component";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatToolbarModule} from "@angular/material/toolbar";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ServiceWorkerModule} from "@angular/service-worker";
import {environment} from "../environments/environment";
import {AttachmentsComponent} from "./attachments/attachments.component";
import {SearchComponent} from "./search/search.component";
import {SettingsComponent} from "./settings/settings.component";
import {AboutComponent} from "./about/about.component";

const appRoutes: Routes = [
    {path: "page/:id", component: ContentComponent},
    {path: "edit/:id", component: EditorComponent},
    {path: "index", component: IndexComponent},
    {path: "attachments/:id", component: AttachmentsComponent},
    {path: "search", component: SearchComponent},
    {path: "settings", component: SettingsComponent},
    {path: "about", component: AboutComponent},
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
        SettingsComponent,
        AboutComponent
    ],
    imports: [
        RouterModule.forRoot(appRoutes, {useHash: true}),
        BrowserModule,
        MatFormFieldModule, MatInputModule, BrowserAnimationsModule, MatToolbarModule, MatMenuModule,
        ServiceWorkerModule.register("ngsw-worker.js", {enabled: environment.production}), MatButtonModule, MatExpansionModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
