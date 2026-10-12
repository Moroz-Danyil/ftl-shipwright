import { describe, expect, it } from "vitest";
import { ShipFormatError } from "./errors";
import { parseLayoutXml, writeLayoutXml } from "./layoutXml";
import type { ShipLayoutXml } from "./model";

const SAMPLE = `
<!-- Copyright -->
<FTL>
<!-- 4 + 3-->
<img x="-59" y="-103" w="652" h="418"/>
<!--<img x="1" y="1" w="1" h="1"/>-->
<offsets>
	<floor x="45" y="93"/>
	<cloak x="19" y="19"/>
</offsets>
<weaponMounts>
	<mount x="540" y="155" rotate="true" mirror="true" gib="6" slide="up"/>
	<mount x="390" y="294" rotate="false" mirror="false" gib="5"/>
</weaponMounts>
<explosion>
	<!--<glowOffset x="28" y="25"/> <!- global setting -->
	<gib2>
		<velocity min="0" max="0.4"/>
		<direction min="0" max="90"/>
		<angular min="-0.4" max="0"/>
		<x>25</x>
		<y>23</y>
	</gib2>
	<gib1>
		<velocity min="0.6" max="1"/>
		<direction min="60" max="120"/>
		<angular min="-0.4" max="-0.1"/>
		<glowOffset x="28" y="26"/> <!-- ipad -->
		<x>-5</x>
		<y>114</y>
	</gib1>
</explosion>
</FTL>
`;

const SAMPLE_MODEL: ShipLayoutXml = {
  img: { x: -59, y: -103, w: 652, h: 418 },
  floorOffset: { x: 45, y: 93 },
  cloakOffset: { x: 19, y: 19 },
  mounts: [
    { x: 540, y: 155, rotate: true, mirror: true, gib: 6, slide: "up" },
    { x: 390, y: 294, rotate: false, mirror: false, gib: 5 },
  ],
  gibs: [
    {
      velocity: { min: 0.6, max: 1 },
      direction: { min: 60, max: 120 },
      angular: { min: -0.4, max: -0.1 },
      x: -5,
      y: 114,
      glowOffset: { x: 28, y: 26 },
    },
    {
      velocity: { min: 0, max: 0.4 },
      direction: { min: 0, max: 90 },
      angular: { min: -0.4, max: 0 },
      x: 25,
      y: 23,
    },
  ],
};

describe("parseLayoutXml", () => {
  it("reads the vanilla structure, ignoring comments and sorting gibs by number", () => {
    expect(parseLayoutXml(SAMPLE)).toEqual(SAMPLE_MODEL);
  });

  it("keeps slide absent when the attribute is missing", () => {
    const model = parseLayoutXml(SAMPLE);
    expect("slide" in model.mounts[1]).toBe(false);
  });

  it("reads files without a root element and without offsets", () => {
    const model = parseLayoutXml('<img x="1" y="2" w="3" h="4"/><weaponMounts/><explosion/>');
    expect(model).toEqual({ img: { x: 1, y: 2, w: 3, h: 4 }, mounts: [], gibs: [] });
  });

  it("reads a cloak offset without a floor offset", () => {
    const model = parseLayoutXml(
      '<FTL><img x="0" y="0" w="1" h="1"/><offsets><cloak x="-10" y="-12"/></offsets></FTL>'
    );
    expect(model.floorOffset).toBeUndefined();
    expect(model.cloakOffset).toEqual({ x: -10, y: -12 });
  });

  it("reads the top-level glowOffset and keeps unknown elements verbatim", () => {
    const model = parseLayoutXml(
      '<FTL><img x="0" y="0" w="1" h="1"/><glowOffset x="28" y="25"/><custom a="1"><b/></custom></FTL>'
    );
    expect(model.glowOffset).toEqual({ x: 28, y: 25 });
    expect(model.extraElements).toEqual(['<custom a="1"><b/></custom>']);
  });

  it("keeps unknown attributes and children inside offsets, mounts and gibs (mods)", () => {
    const src = `<FTL><img x="0" y="0" w="1" h="1"/>
<offsets mode="m"><floor x="1" y="2" layer="3"/><cloak x="4" y="5"/><shadow x="6" y="7"/></offsets>
<weaponMounts><mount x="1" y="2" rotate="true" mirror="false" gib="1" slide="up" hidden="1"><extra a="b">t</extra></mount><note/></weaponMounts>
<explosion><gib1 sound="crash"><velocity min="0" max="1"/><direction min="0" max="1"/><angular min="0" max="1"/><x>1</x><y>2</y><x>9</x><spin v="1"/></gib1><debris/></explosion></FTL>`;
    const model = parseLayoutXml(src);
    expect(model.offsetsExtraAttributes).toEqual({ mode: "m" });
    expect(model.floorOffset).toEqual({ x: 1, y: 2, extraAttributes: { layer: "3" } });
    expect(model.cloakOffset).toEqual({ x: 4, y: 5 });
    expect(model.offsetsExtraElements).toEqual(['<shadow x="6" y="7"/>']);
    expect(model.mounts[0].extraAttributes).toEqual({ hidden: "1" });
    expect(model.mounts[0].extraElements).toEqual(['<extra a="b">t</extra>']);
    expect(model.weaponMountsExtraElements).toEqual(["<note/>"]);
    expect(model.gibs[0].x).toBe(1);
    expect(model.gibs[0].extraAttributes).toEqual({ sound: "crash" });
    expect(model.gibs[0].extraElements).toEqual(["<x>9</x>", '<spin v="1"/>']);
    expect(model.explosionExtraElements).toEqual(["<debris/>"]);

    const written = writeLayoutXml(model);
    expect(written).toContain('<offsets mode="m">');
    expect(written).toContain('\t<floor x="1" y="2" layer="3"/>');
    expect(written).toContain(
      '\t<mount x="1" y="2" rotate="true" mirror="false" gib="1" slide="up" hidden="1">\n\t\t<extra a="b">t</extra>\n\t</mount>'
    );
    expect(written).toContain('\t<gib1 sound="crash">');
    expect(parseLayoutXml(written)).toStrictEqual(model);
  });

  it("writes <offsets> when it only has unknown content", () => {
    const model = parseLayoutXml('<img x="0" y="0" w="1" h="1"/><offsets><shadow/></offsets>');
    expect(model.floorOffset).toBeUndefined();
    expect(parseLayoutXml(writeLayoutXml(model))).toStrictEqual(model);
  });

  it("keeps unknown mount attributes", () => {
    const model = parseLayoutXml(
      '<img x="0" y="0" w="1" h="1"/><weaponMounts><mount x="1" y="2" rotate="TRUE" mirror="0" gib="1" extra="z"/></weaponMounts>'
    );
    expect(model.mounts[0]).toEqual({
      x: 1,
      y: 2,
      rotate: true,
      mirror: false,
      gib: 1,
      extraAttributes: { extra: "z" },
    });
  });

  it("throws ShipFormatError without <img> or with a bad number", () => {
    expect(() => parseLayoutXml("<FTL></FTL>")).toThrow(ShipFormatError);
    expect(() => parseLayoutXml('<img x="a" y="0" w="1" h="1"/>')).toThrow(/not a number/);
    expect(() => parseLayoutXml('<img y="0" w="1" h="1"/>')).toThrow(/missing attribute "x"/);
  });
});

describe("writeLayoutXml", () => {
  it("writes the vanilla layout", () => {
    expect(writeLayoutXml(SAMPLE_MODEL)).toBe(
      [
        "<FTL>",
        '<img x="-59" y="-103" w="652" h="418"/>',
        "",
        "<offsets>",
        '\t<floor x="45" y="93"/>',
        '\t<cloak x="19" y="19"/>',
        "</offsets>",
        "",
        "<weaponMounts>",
        '\t<mount x="540" y="155" rotate="true" mirror="true" gib="6" slide="up"/>',
        '\t<mount x="390" y="294" rotate="false" mirror="false" gib="5"/>',
        "</weaponMounts>",
        "",
        "<explosion>",
        "\t<gib1>",
        '\t\t<velocity min="0.6" max="1"/>',
        '\t\t<direction min="60" max="120"/>',
        '\t\t<angular min="-0.4" max="-0.1"/>',
        '\t\t<glowOffset x="28" y="26"/>',
        "\t\t<x>-5</x>",
        "\t\t<y>114</y>",
        "\t</gib1>",
        "\t<gib2>",
        '\t\t<velocity min="0" max="0.4"/>',
        '\t\t<direction min="0" max="90"/>',
        '\t\t<angular min="-0.4" max="0"/>',
        "\t\t<x>25</x>",
        "\t\t<y>23</y>",
        "\t</gib2>",
        "</explosion>",
        "</FTL>",
        "",
      ].join("\n")
    );
  });

  it("omits <offsets> when there are none and writes extras at the end", () => {
    const text = writeLayoutXml(
      { img: { x: 0, y: 0, w: 1, h: 1 }, mounts: [], gibs: [], extraElements: ["<custom/>"] },
      { indent: "  ", lineEnding: "\r\n" }
    );
    expect(text).not.toContain("offsets");
    expect(text).toContain("\r\n<custom/>\r\n</FTL>\r\n");
  });

  it("round-trips", () => {
    const withExtras: ShipLayoutXml = {
      ...SAMPLE_MODEL,
      glowOffset: { x: 1, y: 2 },
      extraElements: ['<a x="1">\n\t<b/>\n</a>'],
    };
    expect(parseLayoutXml(writeLayoutXml(withExtras))).toEqual(withExtras);
  });
});
