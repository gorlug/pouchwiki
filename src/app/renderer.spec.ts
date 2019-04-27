import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {PouchWikiPage} from "./PouchWikiPage";

function createRenderer() {
    const renderer = new PouchWikiPageToHtmlRenderer(undefined,
        new PouchWikiPage("name"), undefined);
    return renderer;
}

describe("renderer", () => {

    it("should convert a single [Link] to [Link](/#/page/link)", () => {
        const renderer = createRenderer();
        const text = renderer.convertPageLinks("some text [Link] some more text");
        expect(text).toBe("some text [Link](/#/page/Link) some more text");
    });

    it("should not change links of type [Link](http://google.com)", () => {
        const renderer = createRenderer();
        const input = "some text [Link](http://google.com) some more text";
        const text = renderer.convertPageLinks(input);
        expect(input).toBe(text);
    });

    it("should sanitze page link with spaces to camel case", () => {
        const renderer = createRenderer();
        const text = renderer.convertPageLinks("some text [link with spaces] some more text");
        expect(text).toBe("some text [link with spaces](/#/page/LinkWithSpaces) some more text");
    });
});
