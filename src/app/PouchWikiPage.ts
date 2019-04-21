import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON, PouchDBDocumentList} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {AppVersion} from "./app.version";

export interface PouchWikiDocument extends PouchDBDocumentJSON {
    text: string;
}

export class PouchWikiPage extends PouchDBDocument<PouchWikiDocument> {

    text: string;
    renderer = new PouchWikiPageToHtmlRenderer();

    constructor(name: string) {
        super();
        name = PouchWikiPageToHtmlRenderer.sanitizeName(name);
        this.docVersion = AppVersion.VERSION;
        this.setId(name);
    }

    getName() {
        return this.getId();
    }

    getText() {
        return this.text;
    }

    setText(text: string) {
        this.text = text;
    }

    toHtml() {
        return this.renderer.render(this.text);
    }

    protected addValuesToJSONDocument(json: PouchWikiDocument): any {
        json.text = this.text;
    }

    protected getNameOfDoc(): string {
        return "PouchWikiPage";
    }

}

export class PouchWikiPageGenerator extends PouchDBDocumentGenerator<PouchWikiPage> {

    protected createDocument(json: PouchWikiDocument): PouchWikiPage {
        const page = new PouchWikiPage(json._id);
        page.text = json.text;
        return page;
    }

}

export class PouchWikiPageList extends PouchDBDocumentList<PouchWikiPage> {

    protected sort(): void {
        super.sort();
        this.items.sort((a: PouchWikiPage, b: PouchWikiPage) => {
            return a.getName().localeCompare(b.getName());
        });
    }
}
