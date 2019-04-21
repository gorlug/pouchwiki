import {PouchWikiPageToHtmlRenderer} from "./renderer";

describe("renderer", () => {

    it("should convert a single [Link] to [Link](/#/page/link)", () => {
        const renderer = new PouchWikiPageToHtmlRenderer();
        const text = renderer.convertPageLinks("some text [Link] some more text");
        expect(text).toBe("some text [Link](/#/page/Link) some more text");
    });

    it("should not change links of type [Link](http://google.com)", () => {
        const renderer = new PouchWikiPageToHtmlRenderer();
        const input = "some text [Link](http://google.com) some more text";
        const text = renderer.convertPageLinks(input);
        expect(input).toBe(text);
    });

    it("should sanitze page link with spaces to camel case", () => {
        const renderer = new PouchWikiPageToHtmlRenderer();
        const text = renderer.convertPageLinks("some text [link with spaces] some more text");
        expect(text).toBe("some text [link with spaces](/#/page/LinkWithSpaces) some more text");
    });
});
