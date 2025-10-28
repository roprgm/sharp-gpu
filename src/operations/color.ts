import { COLOR } from "../programs";
import { ProgramOperation } from "./base";
import { Vec4 } from "../utils/vector";

export class ColorOperation extends ProgramOperation<{ color: Vec4 }> {
  color: Vec4;
  constructor(color: Vec4) {
    super(COLOR);
    this.color = color;
  }

  getProps() {
    return { color: this.color };
  }
}
