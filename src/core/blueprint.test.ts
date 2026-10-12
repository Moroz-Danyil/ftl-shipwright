import { describe, expect, it } from "vitest";
import {
  findShipBlueprints,
  parseShipBlueprint,
  replaceShipBlueprint,
  writeShipBlueprint,
} from "./blueprint";
import { ShipFormatError } from "./errors";
import type { ShipBlueprint } from "./model";

const PLAYER = `
<shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral">
	<class id="ship_PLAYER_SHIP_KESTREL_class"/>
	<name id="ship_name"/>
	<desc id="ship_desc"/>
	<unlock id="ship_unlock"/>
	<systemList>
		<pilot power="1" room="0" start="true" img="room_pilot">
			<slot><direction>right</direction><number>0</number></slot>
		</pilot>
		<medbay power="1" room="4" start="true"><slot><number>1</number></slot></medbay>
		<clonebay power="1" room="4" start="false"> <!-- same room as medbay -->
			<slot><number>-2</number></slot>
		</clonebay>
		<artillery power="1" room="7" weapon="ARTILLERY_FED"/>
	</systemList>
	<weaponSlots>4</weaponSlots>
	<droneSlots> 2 </droneSlots>
	<weaponList count="2" missiles="8"> <weapon name="MISSILES_2_PLAYER"/> <weapon name="LASER_BURST_3"/> </weaponList>
	<droneList count="1" drones="2"> <drone name="COMBAT_1"/> </droneList>
	<aug name="SCRAP_COLLECTOR"/>
	<health amount="30"/>
	<maxPower amount="8"/>
	<crewCount amount="2" class="human"/>
	<crewCount amount="1" class="engi" max="3"/>
	<shieldImage>kestral</shieldImage>
	<cloakImage>kestral_c</cloakImage>
	<floorImage>kestral_f</floorImage>
</shipBlueprint>`;

const PLAYER_MODEL: ShipBlueprint = {
  name: "PLAYER_SHIP_HARD",
  layout: "kestral",
  img: "kestral",
  texts: {
    class: { kind: "id", id: "ship_PLAYER_SHIP_KESTREL_class" },
    name: { kind: "id", id: "ship_name" },
    desc: { kind: "id", id: "ship_desc" },
    unlock: { kind: "id", id: "ship_unlock" },
  },
  systems: [
    {
      system: "pilot",
      power: 1,
      room: 0,
      start: true,
      img: "room_pilot",
      slot: { direction: "right", number: 0 },
    },
    { system: "medbay", power: 1, room: 4, start: true, slot: { number: 1 } },
    { system: "clonebay", power: 1, room: 4, start: false, slot: { number: -2 } },
    { system: "artillery", power: 1, room: 7, weapon: "ARTILLERY_FED" },
  ],
  weaponSlots: 4,
  droneSlots: 2,
  weaponList: { count: 2, missiles: 8, items: ["MISSILES_2_PLAYER", "LASER_BURST_3"] },
  droneList: { count: 1, drones: 2, items: ["COMBAT_1"] },
  augments: ["SCRAP_COLLECTOR"],
  health: 30,
  maxPower: 8,
  crew: [
    { amount: 2, race: "human" },
    { amount: 1, race: "engi", max: 3 },
  ],
  shieldImage: "kestral",
  cloakImage: "kestral_c",
  floorImage: "kestral_f",
  extraElements: [],
};

const ENEMY = `<shipBlueprint name="JELLY_TRUFFLE_P" layout="jelly_truffle_pirate" img="jelly_truffle_pirate">
	<class id="ship_class"/>
	<minSector>4</minSector>
	<systemList>
		<pilot power="1" max="3" room="0"/>
		<cloaking power="1" max="1" room="2" start="false"/>
	</systemList>
	<weaponList missiles="14" load="WEAPONS_JELLY"/>
	<droneList count="0" missiles="3"/>
	<health amount="11"/>
	<maxPower amount="10"/>
	<crewCount amount="4" max="7" class="random"/> <!--CHANGED was 4/6-->
	<boardingAI>sabotage</boardingAI>
	<cloakImage>jelly_truffle</cloakImage>
</shipBlueprint>`;

describe("parseShipBlueprint", () => {
  it("reads every modelled field", () => {
    expect(parseShipBlueprint(PLAYER)).toEqual(PLAYER_MODEL);
  });

  it("reads enemy ships: max, absent start, list load, unknown elements and attributes", () => {
    const bp = parseShipBlueprint(ENEMY);
    expect(bp.systems[0]).toEqual({ system: "pilot", power: 1, max: 3, room: 0 });
    expect("start" in bp.systems[0]).toBe(false);
    expect(bp.systems[1].start).toBe(false);
    expect(bp.weaponList).toEqual({ missiles: 14, load: "WEAPONS_JELLY", items: [] });
    expect(bp.droneList).toEqual({ count: 0, items: [], extraAttributes: { missiles: "3" } });
    expect(bp.crew).toEqual([{ amount: 4, race: "random", max: 7 }]);
    expect(bp.extraElements).toEqual([
      "<minSector>4</minSector>",
      "<boardingAI>sabotage</boardingAI>",
    ]);
    expect(bp.weaponSlots).toBeUndefined();
  });

  it("reads inline texts and keeps extra blueprint attributes", () => {
    const bp = parseShipBlueprint(
      '<shipBlueprint NOLOC="1" img="k" layout="k" name="E"><class>Kestrel</class><name> The &amp; Kestrel </name></shipBlueprint>'
    );
    expect(bp.texts).toEqual({
      class: { kind: "text", text: "Kestrel" },
      name: { kind: "text", text: "The & Kestrel" },
    });
    expect(bp.extraAttributes).toEqual({ NOLOC: "1" });
    expect(bp.systems).toEqual([]);
  });

  it("keeps repeats of single elements and unknown system children verbatim", () => {
    const bp = parseShipBlueprint(
      '<shipBlueprint name="A" layout="a" img="a"><health amount="1"/><health amount="2"/><systemList><pilot power="1" room="0" foo="bar"><glow x="1"/></pilot></systemList></shipBlueprint>'
    );
    expect(bp.health).toBe(1);
    expect(bp.extraElements).toEqual(['<health amount="2"/>']);
    expect(bp.systems[0]).toEqual({
      system: "pilot",
      power: 1,
      room: 0,
      extraAttributes: { foo: "bar" },
      extraElements: ['<glow x="1"/>'],
    });
  });

  it("accepts unknown (modded) system names", () => {
    const bp = parseShipBlueprint(
      '<shipBlueprint name="A" layout="a" img="a"><systemList><temporal power="1" room="2"/></systemList></shipBlueprint>'
    );
    expect(bp.systems[0].system).toBe("temporal");
  });

  it("throws ShipFormatError on missing data", () => {
    expect(() => parseShipBlueprint('<weaponBlueprint name="X"/>')).toThrow(ShipFormatError);
    expect(() => parseShipBlueprint('<shipBlueprint layout="a" img="a"/>')).toThrow(/name/);
    expect(() =>
      parseShipBlueprint(
        '<shipBlueprint name="A" layout="a" img="a"><systemList><pilot power="1"/></systemList></shipBlueprint>'
      )
    ).toThrow(/room/);
    expect(() =>
      parseShipBlueprint(
        '<shipBlueprint name="A" layout="a" img="a"><health amount="lots"/></shipBlueprint>'
      )
    ).toThrow(/not a number/);
    expect(() =>
      parseShipBlueprint(
        '<shipBlueprint name="A" layout="a" img="a"><systemList><pilot power="1" room="0" start="maybe"/></systemList></shipBlueprint>'
      )
    ).toThrow(/true\/false/);
  });
});

describe("writeShipBlueprint", () => {
  it("writes readable, indented XML", () => {
    const text = writeShipBlueprint(PLAYER_MODEL);
    expect(text).toBe(
      [
        '<shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral">',
        '\t<class id="ship_PLAYER_SHIP_KESTREL_class"/>',
        '\t<name id="ship_name"/>',
        '\t<desc id="ship_desc"/>',
        '\t<unlock id="ship_unlock"/>',
        "\t<systemList>",
        '\t\t<pilot power="1" room="0" start="true" img="room_pilot">',
        "\t\t\t<slot>",
        "\t\t\t\t<direction>right</direction>",
        "\t\t\t\t<number>0</number>",
        "\t\t\t</slot>",
        "\t\t</pilot>",
        '\t\t<medbay power="1" room="4" start="true">',
        "\t\t\t<slot>",
        "\t\t\t\t<number>1</number>",
        "\t\t\t</slot>",
        "\t\t</medbay>",
        '\t\t<clonebay power="1" room="4" start="false">',
        "\t\t\t<slot>",
        "\t\t\t\t<number>-2</number>",
        "\t\t\t</slot>",
        "\t\t</clonebay>",
        '\t\t<artillery power="1" room="7" weapon="ARTILLERY_FED"/>',
        "\t</systemList>",
        "\t<weaponSlots>4</weaponSlots>",
        "\t<droneSlots>2</droneSlots>",
        '\t<weaponList count="2" missiles="8">',
        '\t\t<weapon name="MISSILES_2_PLAYER"/>',
        '\t\t<weapon name="LASER_BURST_3"/>',
        "\t</weaponList>",
        '\t<droneList count="1" drones="2">',
        '\t\t<drone name="COMBAT_1"/>',
        "\t</droneList>",
        '\t<aug name="SCRAP_COLLECTOR"/>',
        '\t<health amount="30"/>',
        '\t<maxPower amount="8"/>',
        '\t<crewCount amount="2" class="human"/>',
        '\t<crewCount amount="1" max="3" class="engi"/>',
        "\t<shieldImage>kestral</shieldImage>",
        "\t<cloakImage>kestral_c</cloakImage>",
        "\t<floorImage>kestral_f</floorImage>",
        "</shipBlueprint>",
        "",
      ].join("\n")
    );
  });

  it("writes inline text escaped and unknown elements verbatim at the end", () => {
    const bp = parseShipBlueprint(ENEMY);
    const text = writeShipBlueprint(
      { ...bp, texts: { class: { kind: "text", text: "A < B" } } },
      { baseLevel: 1, indent: "  " }
    );
    expect(text).toContain("    <class>A &lt; B</class>\n");
    expect(text.startsWith("  <shipBlueprint ")).toBe(true);
    expect(text).toContain(
      "    <minSector>4</minSector>\n    <boardingAI>sabotage</boardingAI>\n  </shipBlueprint>\n"
    );
  });

  it("round-trips", () => {
    for (const src of [PLAYER, ENEMY]) {
      const model = parseShipBlueprint(src);
      expect(parseShipBlueprint(writeShipBlueprint(model))).toEqual(model);
    }
  });
});

describe("findShipBlueprints", () => {
  const FILE = `<!-- header -->
<FTL>
<blueprintList name="X"><name>A</name></blueprintList>
<!--
<shipBlueprint name="COMMENTED" layout="c" img="c"></shipBlueprint>
-->
  <shipBlueprint   name="ONE"
     layout="one" img="one_img"  >  <!-- trailing note -->
	<class id="c1"/>
</shipBlueprint>
<weaponBlueprint name="W"/>
<shipBlueprint img="two" layout="two" name="TWO"/>
</FTL>`;

  it("finds every blueprint, skipping commented ones", () => {
    const found = findShipBlueprints(FILE);
    expect(found.map((f) => [f.name, f.layout, f.img])).toEqual([
      ["ONE", "one", "one_img"],
      ["TWO", "two", "two"],
    ]);
    expect(found[0].xml.startsWith("<shipBlueprint")).toBe(true);
    expect(found[0].xml.endsWith("</shipBlueprint>")).toBe(true);
    expect(FILE.slice(found[1].start, found[1].end)).toBe(
      '<shipBlueprint img="two" layout="two" name="TWO"/>'
    );
    expect(parseShipBlueprint(found[0].xml).texts.class).toEqual({ kind: "id", id: "c1" });
  });

  it("works without a root element", () => {
    expect(
      findShipBlueprints(
        '<shipBlueprint name="A" layout="a" img="a"/>\n<shipBlueprint name="B" layout="b" img="b"/>'
      )
    ).toHaveLength(2);
  });

  it("replaceShipBlueprint swaps one element and checks the location", () => {
    const [one] = findShipBlueprints(FILE);
    const replaced = replaceShipBlueprint(
      FILE,
      one,
      '<shipBlueprint name="NEW" layout="n" img="n"/>'
    );
    expect(findShipBlueprints(replaced).map((f) => f.name)).toEqual(["NEW", "TWO"]);
    expect(() => replaceShipBlueprint(replaced, one, "")).toThrow(ShipFormatError);
  });
});
