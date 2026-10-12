/**
 * A tiny synthetic game tree for unit tests that must not depend on the real
 * game data.
 */
import { memorySource, type FileSource } from "../data/sources";

export const MINI_SHIP_BLUEPRINT = `<shipBlueprint name="PLAYER_SHIP_MINI" layout="mini" img="mini">
	<class id="ship_MINI_class"/>
	<name id="ship_MINI_name"/>
	<systemList>
		<pilot power="1" room="0" start="true" img="room_pilot"/>
		<shields power="2" room="1" start="true" img="room_shields_9"/>
	</systemList>
	<weaponSlots>2</weaponSlots>
	<weaponList count="1" missiles="0"><weapon name="GUN"/></weaponList>
	<health amount="10"/>
	<maxPower amount="5"/>
	<crewCount amount="1" class="human"/>
</shipBlueprint>`;

export const MINI_LAYOUT_TXT =
  "X_OFFSET 1 Y_OFFSET 1 VERTICAL 0 ELLIPSE 100 50 0 0 ROOM 0 0 0 2 1 ROOM 1 2 0 2 1 DOOR 2 0 0 1 1 DOOR 0 0 0 -1 1";

export const MINI_LAYOUT_XML = `<FTL><img x="-10" y="-10" w="160" h="60"/><offsets><floor x="4" y="4"/><cloak x="0" y="0"/></offsets>
<weaponMounts><mount x="50" y="5" rotate="false" mirror="false" gib="1" slide="up"/></weaponMounts>
<explosion><gib1><velocity min="0" max="1"/><direction min="0" max="1"/><angular min="0" max="1"/><x>0</x><y>0</y></gib1>
<gib2><velocity min="0" max="1"/><direction min="0" max="1"/><angular min="0" max="1"/><x>80</x><y>0</y></gib2></explosion></FTL>`;

export function miniGame(): FileSource {
  return memorySource({
    "data/blueprints.xml": `<FTL>
<!-- <shipBlueprint name="COMMENTED" layout="mini" img="mini"/> -->
${MINI_SHIP_BLUEPRINT}
<shipBlueprint name="ENEMY_NO_LAYOUT" layout="missing" img="x"/>
<weaponBlueprint name="GUN"><type>LASER</type><title id="weapon_GUN_title"/><damage>1</damage><cost>20</cost><weaponArt>gun_art</weaponArt><iconImage>laser</iconImage></weaponBlueprint>
<droneBlueprint name="BOT"><type>COMBAT</type><title>Bot</title><power>2</power><weaponBlueprint>DRONE_GUN</weaponBlueprint></droneBlueprint>
<augBlueprint name="AUG"><title id="aug_title"/><cost>30</cost><stackable>false</stackable><value>0.5</value></augBlueprint>
<crewBlueprint name="human"><title>Human</title><cost>45</cost><powerList><power id="p1"/><power>Fast</power></powerList></crewBlueprint>
<systemBlueprint name="shields"><type>shields</type><title id="sys_shields"/><startPower>2</startPower><maxPower>8</maxPower><cost>125</cost></systemBlueprint>
</FTL>`,
    "data/dlcBlueprints.xml": `<FTL><weaponBlueprint name="GUN"><type>BEAM</type><damage>2</damage><weaponArt>gun_art</weaponArt></weaponBlueprint></FTL>`,
    "data/mini.txt": MINI_LAYOUT_TXT,
    "data/mini.xml": MINI_LAYOUT_XML,
    "data/text_blueprints.xml":
      '<FTL><text name="ship_MINI_name">The Mini</text><text name="ship_MINI_class">Mini Cruiser</text><text name="weapon_GUN_title">Gun</text></FTL>',
    "data/text_misc.xml":
      '<FTL><text name="weapon_GUN_title">Gun (misc)</text><text name="only_en">English only</text></FTL>',
    "data/text-de.xml": '<FTL><text name="ship_MINI_name">Das Mini</text></FTL>',
    "data/animations.xml": `<FTL>
<animSheet name="gun_sheet" w="60" h="40" fw="20" fh="20">weapons/gun_strip.png</animSheet>
<weaponAnim name="gun_art"><sheet>gun_sheet</sheet><desc length="3" x="0" y="1"/><chargedFrame>1</chargedFrame><fireFrame>2</fireFrame><firePoint x="3" y="4"/><mountPoint x="5" y="6"/></weaponAnim>
<animSheet name="human" w="70" h="105" fw="35" fh="35">people/human_base.png</animSheet>
<anim name="human_walk_down"><sheet>human</sheet><desc length="2" x="0" y="2"/><time>1.0</time></anim>
</FTL>`,
    "data/dlcAnimations.xml": `<FTL><animSheet name="rock" w="35" h="35" fw="35" fh="35">people/rock_base.png</animSheet>
<anim name="rock_walk_down"><sheet>rock</sheet><desc length="1" x="0" y="0"/></anim></FTL>`,
    "img/ship/mini_base.png": new Uint8Array([1]),
    "img/ship/mini_floor.png": new Uint8Array([2]),
    "img/ship/mini_gib1.png": new Uint8Array([3]),
    "img/ship/mini_shields1.png": new Uint8Array([4]),
    "img/ship/interior/room_pilot.png": new Uint8Array([5]),
    "img/ship/interior/room_pilot_glow.png": new Uint8Array([6]),
    "img/ship/interior/glow_pilot.png": new Uint8Array([6]),
    "img/ships_glow/enemy_base.png": new Uint8Array([7]),
    "img/ships_glow/enemy_gib2.png": new Uint8Array([7]),
    "img/customizeUI/miniship_mini.png": new Uint8Array([8]),
    "img/customizeUI/other.png": new Uint8Array([8]),
  });
}
