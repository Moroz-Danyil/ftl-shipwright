/** Thrown by the readers when a file cannot be turned into the model. */
export class ShipFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShipFormatError";
  }
}
