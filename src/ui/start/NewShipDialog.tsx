/**
 * Starts a new ship: an empty hull or a copy of a game ship, under a new name
 * (and new file names, so the original is never overwritten), in a slot of
 * the game's hangar or under an own blueprint name. In steps: how to start,
 * the base ship (for a copy only), then the name and the hangar slot. Back
 * keeps what was chosen; Enter goes on once a step is complete.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isValidId } from "../../app/details/rules";
import {
  DEFAULT_SLOT,
  LAYOUT_LETTERS,
  hangarTypeName,
  slotImg,
  slotName,
  slotOf,
  type HangarSlot,
} from "../../app/hangar";
import { createNewShip, newShipIds } from "../../app/ships";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";
import { HangarSlotPicker } from "../common/HangarSlotPicker";
import { Help } from "../common/Help";
import { ShipIcon } from "../common/ShipIcon";
import { HullIcon } from "../common/icons";
import { ShipPicker } from "./ShipPicker";
import { ShipPreview } from "./ShipPreview";

type StepId = "start" | "base" | "name";

/** Moves the focus into a step when it opens: to its element marked `data-autofocus`. */
function useStepFocus(step: StepId) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [step]);
  return body;
}

export function NewShipDialog() {
  const texts = useTexts();
  const catalogs = useEditor((s) => s.game.data?.catalogs);
  const ships = catalogs?.ships ?? [];
  const close = () => useEditor.getState().openDialog(null);
  const [step, setStep] = useState<StepId>("start");
  const [copy, setCopy] = useState(false);
  const [source, setSource] = useState<string>();
  const [typedName, setTypedName] = useState<string>();
  const [chosenSlot, setChosenSlot] = useState<HangarSlot>();
  const [own, setOwn] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);
  const [ownName, setOwnName] = useState<string>();
  const [busy, setBusy] = useState(false);
  const body = useStepFocus(step);

  const sourceShip = copy ? ships.find((s) => s.name === source) : undefined;
  // Until the name or the slot is chosen they follow the base ship: a copy is
  // called after it and starts on its slot when it has one.
  const name =
    typedName ??
    (sourceShip ? texts.newShip.copyName(sourceShip.displayName) : texts.newShip.defaultName);
  const slot = chosenSlot ?? (sourceShip && slotOf(sourceShip.name)) ?? DEFAULT_SLOT;

  const trimmed = name.trim();
  const ids = newShipIds(trimmed || texts.newShip.defaultName, ships);
  const ownValue = ownName ?? ids.name;
  const ownValid = isValidId(ownValue);
  const blueprint = own ? ownValue : slotName(slot);
  const ready = trimmed !== "" && (!copy || source !== undefined) && (!own || ownValid) && !busy;

  const steps: StepId[] = copy ? ["start", "base", "name"] : ["start", "name"];
  const index = steps.indexOf(step);
  const last = index === steps.length - 1;
  const complete = step === "start" || (step === "base" ? source !== undefined : ready);

  const create = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await createNewShip(texts, {
      name: trimmed,
      copyOf: copy ? source : undefined,
      blueprint,
    });
    setBusy(false);
    if (!ok) close();
  };
  const next = () => {
    if (!complete) return;
    if (last) void create();
    else setStep(steps[index + 1]);
  };
  const back = () => index > 0 && setStep(steps[index - 1]);
  // Choosing how to start by a double click (or Enter on a card) goes on at once.
  const startWith = (asCopy: boolean) => {
    setCopy(asCopy);
    setStep(asCopy ? "base" : "name");
  };
  const chooseShip = (shipName: string) => {
    setSource(shipName);
    setStep("name");
  };
  // Enter goes on, except where a button or the list handles it itself.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, summary, textarea")) return;
    e.preventDefault();
    next();
  };

  const typeName = hangarTypeName(catalogs, slot.type, texts.hangarSlot.typeNames[slot.type]);
  const summary = own
    ? texts.newShip.savedAs(blueprint, ids.layout)
    : texts.newShip.takesPlace(typeName, LAYOUT_LETTERS[slot.layout], ids.layout);

  return (
    <Dialog
      title={texts.newShip.title}
      onClose={close}
      size="large"
      actions={
        <>
          <button type="button" className="btn ns-cancel" onClick={close}>
            {texts.common.cancel}
          </button>
          <button type="button" className="btn" disabled={index === 0} onClick={back}>
            {texts.newShip.back}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!complete || busy}
            onClick={next}
          >
            {last ? texts.newShip.create : texts.newShip.next}
          </button>
        </>
      }
    >
      <div className="ns-head">
        <span className="eyebrow">{texts.newShip.step(index + 1, steps.length)}</span>
        <h3 className="ns-step-title">{texts.newShip.steps[step]}</h3>
      </div>
      <div ref={body} className="ns-step" onKeyDown={onKeyDown}>
        {step === "start" && (
          <div className="ns-cards" role="radiogroup" aria-label={texts.newShip.steps.start}>
            {[false, true].map((asCopy) => (
              <button
                key={String(asCopy)}
                type="button"
                role="radio"
                className="choice ns-card"
                aria-checked={copy === asCopy}
                data-autofocus={copy === asCopy ? "" : undefined}
                onClick={() => setCopy(asCopy)}
                onDoubleClick={() => startWith(asCopy)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    startWith(asCopy);
                  }
                }}
              >
                <span className="ns-card-pic" aria-hidden="true">
                  {asCopy ? <ShipIcon img={slotImg(catalogs, DEFAULT_SLOT)} /> : <HullIcon />}
                </span>
                <span className="choice-title">
                  {asCopy ? texts.newShip.copy : texts.newShip.empty}
                </span>
                <span className="choice-hint">
                  {asCopy ? texts.newShip.copyHint : texts.newShip.emptyHint}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "base" && (
          <div className="ns-base">
            <ShipPicker
              ships={ships}
              selected={source}
              onSelect={setSource}
              onChoose={chooseShip}
            />
            <ShipPreview ship={sourceShip} />
          </div>
        )}

        {step === "name" && (
          <div className="ns-name">
            <label className="field">
              {texts.newShip.name}
              <input
                className="input"
                value={name}
                data-autofocus=""
                onChange={(e) => setTypedName(e.target.value)}
              />
            </label>
            <div className="field ns-slot" role="group" aria-label={texts.hangarSlot.label}>
              <Help topic="newShipSlot">
                <span className="ns-legend field-label" tabIndex={0}>
                  {texts.hangarSlot.label}
                </span>
              </Help>
              <HangarSlotPicker
                slot={own ? undefined : slot}
                onPick={setChosenSlot}
                disabled={own}
                named
                summary={false}
              />
            </div>
            <span className="ns-summary">{summary}</span>
            <details
              className="ns-own"
              open={ownOpen}
              onToggle={(e) => setOwnOpen(e.currentTarget.open)}
            >
              <summary>
                {texts.newShip.ownNameFold}
                <span className="ns-own-tag">{texts.newShip.notInGame}</span>
              </summary>
              <div className="ns-own-body">
                <label className="ed-choice">
                  <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} />
                  {texts.newShip.useOwnName}
                </label>
                {own && (
                  <>
                    <input
                      className="input mono"
                      aria-label={texts.newShip.ownName}
                      autoFocus
                      value={ownValue}
                      onChange={(e) => setOwnName(e.target.value)}
                    />
                    <span className="hs-note">
                      {ownValid ? texts.newShip.ownNameHint : texts.hangar.invalidId}
                    </span>
                  </>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </Dialog>
  );
}
