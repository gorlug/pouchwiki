import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON} from "@gorlug/pouchdb-rxjs";
import * as marked from "marked";

export interface PouchWikiDocument extends PouchDBDocumentJSON {
    text: string;
}

export class PouchWikiPage extends PouchDBDocument<PouchWikiDocument> {

    text: string;

    constructor(name: string) {
        super();
        this.setId(name);
    }

    getName() {
        return this.getId();
    }

    getText() {
        return this.getText();
    }

    toHtml() {
        return marked(this.text);
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
